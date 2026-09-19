/**
 * Web Worker Inference Pipeline for Oral Cancer Instance Segmentation & Detection.
 * Operates purely in worker memory with no DOM dependencies.
 */

import * as ort from "onnxruntime-web";
import cv from "@techstark/opencv-js";
import { DetectionBox, PipelineResult, ORAL_CLASSES } from "../engine/config";
import { ensurePrecision, hydratePrecision } from "../engine/precision";

/**
 * Pre-process raw RGBA pixels into an ONNX-ready normalized tensor blob.
 */
function preProcessPixels(
  pixels: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  modelW: number,
  modelH: number
): cv.Mat {
  const srcMat = cv.matFromArray(srcHeight, srcWidth, cv.CV_8UC4, pixels);
  cv.cvtColor(srcMat, srcMat, cv.COLOR_RGBA2RGB);
  cv.resize(srcMat, srcMat, new cv.Size(modelW, modelH));

  const blob = cv.blobFromImage(
    srcMat,
    1 / 255.0,
    new cv.Size(modelW, modelH),
    new cv.Scalar(0, 0, 0),
    false,
    false
  );

  srcMat.delete();
  return blob;
}

/**
 * Calculates Intersection Over Union (IoU) of two bounding boxes [x, y, w, h].
 */
function calculateIOU(box1: number[], box2: number[]): number {
  const [x1, y1, w1, h1] = box1;
  const [x2, y2, w2, h2] = box2;

  const intersectX1 = Math.max(x1, x2);
  const intersectY1 = Math.max(y1, y2);
  const intersectX2 = Math.min(x1 + w1, x2 + w2);
  const intersectY2 = Math.min(y1 + h1, y2 + h2);

  if (intersectX2 <= intersectX1 || intersectY2 <= intersectY1) {
    return 0.0;
  }

  const intersection = (intersectX2 - intersectX1) * (intersectY2 - intersectY1);
  const union = w1 * h1 + w2 * h2 - intersection;
  return union > 0 ? intersection / union : 0.0;
}

/**
 * Applies Non-Maximum Suppression (NMS) to eliminate redundant overlapping boxes.
 */
function applyNMS(boxes: DetectionBox[], iouThreshold: number): number[] {
  const picked: number[] = [];
  const indices = Array.from(Array(boxes.length).keys());

  // Sort descending by confidence score
  indices.sort((a, b) => boxes[b].score - boxes[a].score);

  while (indices.length > 0) {
    const current = indices[0];
    picked.push(current);

    const rest = indices.slice(1);
    indices.length = 0;

    for (const idx of rest) {
      // Only suppress if same class or high general overlap
      const iou = calculateIOU(boxes[current].bbox, boxes[idx].bbox);
      if (iou <= iouThreshold) {
        indices.push(idx);
      }
    }
  }

  return picked;
}

/**
 * Generates RGBA mask overlay from model prototype masks and box mask weights.
 */
function generateMaskOverlay(
  filtered: DetectionBox[],
  protoMask: Float32Array,
  maskChannels: number,
  maskHeight: number,
  maskWidth: number,
  modelW: number,
  modelH: number,
  overlayW: number,
  overlayH: number,
  xRatio: number,
  yRatio: number
): { pixels: Uint8ClampedArray; boxAreas: number[] } | null {
  if (filtered.length === 0) return null;

  const matsToDelete: cv.Mat[] = [];

  const protoMaskMat = cv.matFromArray(
    maskChannels,
    maskHeight * maskWidth,
    cv.CV_32F,
    protoMask
  );
  matsToDelete.push(protoMaskMat);

  const boxAreas: number[] = new Array(filtered.length).fill(0);

  try {
    const NUM_FILTERED = filtered.length;
    const maskWeightsArr = new Float32Array(NUM_FILTERED * maskChannels);

    for (let i = 0; i < NUM_FILTERED; i++) {
      const weights = filtered[i].mask_weights;
      if (weights) {
        for (let c = 0; c < maskChannels; c++) {
          maskWeightsArr[i * maskChannels + c] = weights[c];
        }
      }
    }

    const maskWeightsMat = cv.matFromArray(
      NUM_FILTERED,
      maskChannels,
      cv.CV_32F,
      maskWeightsArr
    );
    matsToDelete.push(maskWeightsMat);

    // Multiply: weights x protoMask -> [NUM_FILTERED, maskHeight * maskWidth]
    const weightsMulProto = new cv.Mat();
    const emptyMat = new cv.Mat();
    matsToDelete.push(weightsMulProto, emptyMat);
    cv.gemm(maskWeightsMat, protoMaskMat, 1.0, emptyMat, 0.0, weightsMulProto);

    // Sigmoid activation: 1 / (1 + exp(-x))
    const maskSigmoid = new cv.Mat();
    const ones = cv.Mat.ones(weightsMulProto.rows, weightsMulProto.cols, cv.CV_32F);
    const neg = new cv.Mat(
      weightsMulProto.rows,
      weightsMulProto.cols,
      cv.CV_32F,
      new cv.Scalar(-1)
    );
    matsToDelete.push(maskSigmoid, ones, neg);
    cv.multiply(weightsMulProto, neg, maskSigmoid);
    cv.exp(maskSigmoid, maskSigmoid);
    cv.add(maskSigmoid, ones, maskSigmoid);
    cv.divide(ones, maskSigmoid, maskSigmoid);

    // Transparent overlay destination canvas
    const overlayMat = new cv.Mat(
      overlayH,
      overlayW,
      cv.CV_8UC4,
      new cv.Scalar(0, 0, 0, 0)
    );
    matsToDelete.push(overlayMat);

    const maskResized = new cv.Mat();
    const maskBinary = new cv.Mat();
    const maskBinaryU8 = new cv.Mat();
    matsToDelete.push(maskResized, maskBinary, maskBinaryU8);

    const maskScaleX = maskWidth / modelW;
    const maskScaleY = maskHeight / modelH;

    for (let i = 0; i < NUM_FILTERED; i++) {
      const rowMat = maskSigmoid.row(i);
      matsToDelete.push(rowMat);
      const maskMat = cv.matFromArray(maskHeight, maskWidth, cv.CV_32F, rowMat.data32F);
      matsToDelete.push(maskMat);

      const [bx, by, bw, bh] = filtered[i].bbox;

      // Crop from proto mask space
      const mX = Math.floor(Math.max(0, (bx / xRatio) * maskScaleX));
      const mY = Math.floor(Math.max(0, (by / yRatio) * maskScaleY));
      const mW = Math.ceil(Math.min(maskWidth - mX, (bw / xRatio) * maskScaleX));
      const mH = Math.ceil(Math.min(maskHeight - mY, (bh / yRatio) * maskScaleY));

      if (mW <= 0 || mH <= 0) continue;

      const maskRoi = maskMat.roi(new cv.Rect(mX, mY, mW, mH));
      matsToDelete.push(maskRoi);

      const targetX = Math.max(0, Math.floor(bx));
      const targetY = Math.max(0, Math.floor(by));
      const targetW = Math.min(overlayW - targetX, Math.ceil(bw));
      const targetH = Math.min(overlayH - targetY, Math.ceil(bh));

      if (targetW <= 0 || targetH <= 0) continue;

      cv.resize(maskRoi, maskResized, new cv.Size(targetW, targetH), 0, 0, cv.INTER_LINEAR);
      cv.threshold(maskResized, maskBinary, 0.5, 255, cv.THRESH_BINARY);
      maskBinary.convertTo(maskBinaryU8, cv.CV_8U);

      // Estimate surface pixels
      boxAreas[i] = cv.countNonZero(maskBinaryU8);

      // Colorize based on clinical class definition
      const classDef = ORAL_CLASSES[filtered[i].class_idx] || ORAL_CLASSES[0];
      const [r, g, b] = classDef.rgbaColor;
      // Alpha: set solid 255 in maskPixels; opacity is controlled interactively on canvas composite!
      const colorScalar = new cv.Scalar(r, g, b, 255);
      const maskColored = new cv.Mat(targetH, targetW, cv.CV_8UC4, colorScalar);
      matsToDelete.push(maskColored);

      const overlayRoi = overlayMat.roi(new cv.Rect(targetX, targetY, targetW, targetH));
      matsToDelete.push(overlayRoi);
      maskColored.copyTo(overlayRoi, maskBinaryU8);
    }

    const rawData = overlayMat.data;
    const buffer = new ArrayBuffer(rawData.byteLength);
    const pixels = new Uint8ClampedArray(buffer);
    pixels.set(rawData);

    return { pixels, boxAreas };
  } catch (error) {
    console.error("[pipeline] Error generating masks:", error);
    return null;
  } finally {
    matsToDelete.forEach((mat) => {
      if (mat && !mat.isDeleted()) mat.delete();
    });
  }
}

/**
 * Main inference execution pipeline.
 */
export async function runInferencePipeline(
  pixels: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  overlayW: number,
  overlayH: number,
  session: ort.InferenceSession,
  scoreThreshold: number,
  iouThreshold: number
): Promise<PipelineResult> {
  const modelW = 640;
  const modelH = 640;

  const blob = preProcessPixels(pixels, srcWidth, srcHeight, modelW, modelH);

  const sessionMeta = (session as unknown as { inputMetadata: Record<string, { type: string }> }).inputMetadata;
  const inputName = session.inputNames[0] || "images";
  const inputType = sessionMeta?.[inputName]?.type || "float32";

  const tensorData = ensurePrecision(blob.data32F, inputType);
  const inputTensor = new ort.Tensor(
    inputType as "float32" | "float16",
    tensorData,
    [1, 3, modelH, modelW]
  );
  blob.delete();

  const start = performance.now();
  let rawOutput0: ort.Tensor | null = null;
  let rawOutput1: ort.Tensor | null = null;

  let predictionsData: Float32Array = new Float32Array(0);
  let protoMask: Float32Array | null = null;
  let MASK_CHANNELS = 0, MASK_HEIGHT = 0, MASK_WIDTH = 0;
  let NUM_PREDICTIONS = 0, NUM_CHANNELS = 0, NUM_MASK_WEIGHTS = 0;
  const NUM_CLASSES = 3; // erythroplakia, leukoplakia, oral cancer

  try {
    const outputs = await session.run({ [inputName]: inputTensor });
    const outputNames = session.outputNames;

    rawOutput0 = (outputs[outputNames[0]] as ort.Tensor) ?? null;
    rawOutput1 = outputNames.length > 1 ? ((outputs[outputNames[1]] as ort.Tensor) ?? null) : null;

    if (!rawOutput0) {
      return {
        boxes: [],
        inferenceTime: "0",
        maskPixels: null,
        maskWidth: overlayW,
        maskHeight: overlayH,
        originalBuffer: pixels.buffer,
      };
    }

    predictionsData = hydratePrecision(
      (rawOutput0.data as Float32Array) || (rawOutput0.data as Uint16Array)
    );

    if (rawOutput1) {
      protoMask = hydratePrecision(
        (rawOutput1.data as Float32Array) || (rawOutput1.data as Uint16Array)
      );
      MASK_CHANNELS = rawOutput1.dims[1];
      MASK_HEIGHT = rawOutput1.dims[2];
      MASK_WIDTH = rawOutput1.dims[3];
    }

    NUM_CHANNELS = rawOutput0.dims[1];
    NUM_PREDICTIONS = rawOutput0.dims[2];
    NUM_MASK_WEIGHTS = Math.max(0, NUM_CHANNELS - (4 + NUM_CLASSES));
  } finally {
    inputTensor.dispose();
    rawOutput0?.dispose();
    rawOutput1?.dispose();
  }

  const end = performance.now();
  const inferenceTime = (end - start).toFixed(1);

  const xRatio = overlayW / modelW;
  const yRatio = overlayH / modelH;

  // Extract raw detections
  const NUM_BBOX_ATTRS = 4;
  const bboxData = predictionsData.subarray(0, numBboxLength(numBboxLength));
  function numBboxLength(_: unknown) { return NUM_PREDICTIONS * NUM_BBOX_ATTRS; }

  const scoresData = predictionsData.subarray(
    NUM_PREDICTIONS * NUM_BBOX_ATTRS,
    NUM_PREDICTIONS * (NUM_BBOX_ATTRS + NUM_CLASSES)
  );
  const maskWeightsData = predictionsData.subarray(
    NUM_PREDICTIONS * (NUM_BBOX_ATTRS + NUM_CLASSES)
  );

  const candidateDetections: DetectionBox[] = [];

  for (let i = 0; i < NUM_PREDICTIONS; i++) {
    // Find best class score among 3 classes
    let maxScore = -Infinity;
    let maxClass = -1;

    for (let c = 0; c < NUM_CLASSES; c++) {
      const score = scoresData[c * NUM_PREDICTIONS + i];
      if (score > maxScore) {
        maxScore = score;
        maxClass = c;
      }
    }

    if (maxScore < scoreThreshold) continue;

    const cx = bboxData[i];
    const cy = bboxData[i + NUM_PREDICTIONS];
    const bw = bboxData[i + NUM_PREDICTIONS * 2];
    const bh = bboxData[i + NUM_PREDICTIONS * 3];

    const w = bw * xRatio;
    const h = bh * yRatio;
    const x = cx * xRatio - 0.5 * w;
    const y = cy * yRatio - 0.5 * h;

    let maskWeights: Float32Array | undefined;
    if (NUM_MASK_WEIGHTS > 0) {
      maskWeights = new Float32Array(NUM_MASK_WEIGHTS);
      for (let c = 0; c < NUM_MASK_WEIGHTS; c++) {
        maskWeights[c] = maskWeightsData[i + c * NUM_PREDICTIONS];
      }
    }

    candidateDetections.push({
      bbox: [x, y, w, h],
      class_idx: maxClass,
      score: maxScore,
      mask_weights: maskWeights,
    });
  }

  // NMS Filtering
  const keptIndices = applyNMS(candidateDetections, iouThreshold);
  const finalBoxes = keptIndices.map((idx) => candidateDetections[idx]);

  // Instance Segmentation Mask generation
  let maskPixels: Uint8ClampedArray | null = null;
  if (protoMask && NUM_MASK_WEIGHTS > 0 && finalBoxes.length > 0) {
    const maskResult = generateMaskOverlay(
      finalBoxes,
      protoMask,
      MASK_CHANNELS,
      MASK_HEIGHT,
      MASK_WIDTH,
      modelW,
      modelH,
      overlayW,
      overlayH,
      xRatio,
      yRatio
    );

    if (maskResult) {
      maskPixels = maskResult.pixels;
      maskResult.boxAreas.forEach((area, idx) => {
        finalBoxes[idx].areaPixels = area;
      });
    }
  }

  return {
    boxes: finalBoxes,
    inferenceTime,
    maskPixels,
    maskWidth: overlayW,
    maskHeight: overlayH,
    originalBuffer: pixels.buffer,
  };
}
