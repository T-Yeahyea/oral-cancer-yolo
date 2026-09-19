"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { DetectionBox } from "../engine/config";
import {
  DEFAULT_SCORE_THRESHOLD,
  DEFAULT_IOU_THRESHOLD,
  DEFAULT_MASK_OPACITY,
} from "../engine/config";
import { renderCanvasOverlay, exportAnnotatedImage } from "../utils/canvasRenderer";

interface UseInferenceProps {
  workerRef: React.MutableRefObject<Worker | null>;
  isModelReady: boolean;
}

export function useInference({ workerRef, isModelReady }: UseInferenceProps) {
  // Image State
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgName, setImgName] = useState<string>("uploaded-image");
  const [isInferring, setIsInferring] = useState<boolean>(false);
  const [inferenceTime, setInferenceTime] = useState<string>("0");

  // Raw Inference Results (kept in memory for instant re-filtering)
  const [rawBoxes, setRawBoxes] = useState<DetectionBox[]>([]);
  const maskPixelsRef = useRef<Uint8ClampedArray | null>(null);

  // Canvas and Image DOM References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Prediction Controls State
  const [scoreThreshold, setScoreThreshold] = useState<number>(DEFAULT_SCORE_THRESHOLD);
  const [iouThreshold, setIouThreshold] = useState<number>(DEFAULT_IOU_THRESHOLD);
  const [maskOpacity, setMaskOpacity] = useState<number>(DEFAULT_MASK_OPACITY);
  const [showMasks, setShowMasks] = useState<boolean>(true);
  const [showBoxes, setShowBoxes] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [activeClassIds, setActiveClassIds] = useState<number[]>([0, 1, 2]);

  // Inspection Selection State
  const [selectedBoxIndex, setSelectedBoxIndex] = useState<number | null>(null);
  const [hoveredBoxIndex, setHoveredBoxIndex] = useState<number | null>(null);

  /**
   * Re-draws the canvas with current control settings.
   * Instant (<1ms) operation using pre-computed masks & boxes.
   */
  const redraw = useCallback(() => {
    if (!canvasRef.current || !imageRef.current) return;
    renderCanvasOverlay(
      canvasRef.current,
      imageRef.current,
      maskPixelsRef.current,
      rawBoxes,
      {
        showMasks,
        showBoxes,
        showLabels,
        maskOpacity,
        scoreThreshold,
        activeClassIds,
        selectedBoxIndex,
        hoveredBoxIndex,
      }
    );
  }, [
    rawBoxes,
    showMasks,
    showBoxes,
    showLabels,
    maskOpacity,
    scoreThreshold,
    activeClassIds,
    selectedBoxIndex,
    hoveredBoxIndex,
  ]);

  // Trigger instant redraw when visual controls change
  useEffect(() => {
    redraw();
  }, [redraw]);

  /**
   * Executes inference on the current loaded image.
   */
  const runInferenceOnImage = useCallback(
    (img: HTMLImageElement) => {
      const worker = workerRef.current;
      if (!worker || !isModelReady) return;

      const natW = img.naturalWidth;
      const natH = img.naturalHeight;

      if (natW === 0 || natH === 0) return;

      // Prepare canvas to match native image dimensions
      if (canvasRef.current) {
        canvasRef.current.width = natW;
        canvasRef.current.height = natH;
      }

      // Draw image to temporary offscreen canvas to extract raw pixels
      const offscreen = document.createElement("canvas");
      offscreen.width = natW;
      offscreen.height = natH;
      const offCtx = offscreen.getContext("2d");
      if (!offCtx) return;

      offCtx.drawImage(img, 0, 0, natW, natH);
      const imgData = offCtx.getImageData(0, 0, natW, natH);

      setIsInferring(true);
      const instanceId = Math.random().toString(36).slice(2);

      const handleResult = (e: MessageEvent) => {
        const msg = e.data;
        if (msg.type !== "inference-result") return;
        if (msg.instanceId && msg.instanceId !== instanceId) return;

        worker.removeEventListener("message", handleResult);
        setIsInferring(false);

        if (msg.error) {
          console.error("[useInference] Inference error:", msg.error);
          return;
        }

        setInferenceTime(msg.inferenceTime);
        setRawBoxes(msg.boxes || []);
        maskPixelsRef.current = msg.maskPixels || null;

        // Render initial prediction
        if (canvasRef.current && imageRef.current) {
          renderCanvasOverlay(
            canvasRef.current,
            imageRef.current,
            msg.maskPixels,
            msg.boxes || [],
            {
              showMasks,
              showBoxes,
              showLabels,
              maskOpacity,
              scoreThreshold,
              activeClassIds,
              selectedBoxIndex: null,
              hoveredBoxIndex: null,
            }
          );
        }
      };

      worker.addEventListener("message", handleResult);

      worker.postMessage(
        {
          type: "run-inference",
          pixels: imgData.data,
          srcWidth: natW,
          srcHeight: natH,
          overlayWidth: natW,
          overlayHeight: natH,
          scoreThreshold: 0.10, // Retrieve broad candidates so slider can filter client-side!
          iouThreshold,
          instanceId,
        },
        [imgData.data.buffer]
      );
    },
    [workerRef, isModelReady, iouThreshold, showMasks, showBoxes, showLabels, maskOpacity, scoreThreshold, activeClassIds]
  );

  /**
   * Set new image source and automatically trigger inference on image load.
   */
  const handleImageSelect = useCallback(
    (src: string, name: string = "oral-lesion-sample") => {
      setImgSrc(src);
      setImgName(name);
      setRawBoxes([]);
      maskPixelsRef.current = null;
      setSelectedBoxIndex(null);
      setHoveredBoxIndex(null);

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        imageRef.current = img;
        if (isModelReady) {
          runInferenceOnImage(img);
        }
      };
      img.src = src;
    },
    [isModelReady, runInferenceOnImage]
  );

  /**
   * Class filter toggle helper.
   */
  const toggleClassFilter = useCallback((classId: number) => {
    setActiveClassIds((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId]
    );
  }, []);

  /**
   * Reset prediction controls to default medical values.
   */
  const resetControls = useCallback(() => {
    setScoreThreshold(DEFAULT_SCORE_THRESHOLD);
    setIouThreshold(DEFAULT_IOU_THRESHOLD);
    setMaskOpacity(DEFAULT_MASK_OPACITY);
    setShowMasks(true);
    setShowBoxes(true);
    setShowLabels(true);
    setActiveClassIds([0, 1, 2]);
    setSelectedBoxIndex(null);
    setHoveredBoxIndex(null);
  }, []);

  /**
   * Export annotated canvas to PNG.
   */
  const exportImage = useCallback(() => {
    if (!canvasRef.current) return;
    exportAnnotatedImage(canvasRef.current, `diagnosis-${imgName}`);
  }, [imgName]);

  // Filtered visible boxes based on current thresholds
  const visibleBoxes = rawBoxes.filter(
    (box) => box.score >= scoreThreshold && activeClassIds.includes(box.class_idx)
  );

  return {
    imgSrc,
    imgName,
    isInferring,
    inferenceTime,
    rawBoxes,
    visibleBoxes,
    canvasRef,
    imageRef,
    // Controls State & Setters
    scoreThreshold,
    setScoreThreshold,
    iouThreshold,
    setIouThreshold,
    maskOpacity,
    setMaskOpacity,
    showMasks,
    setShowMasks,
    showBoxes,
    setShowBoxes,
    showLabels,
    setShowLabels,
    activeClassIds,
    toggleClassFilter,
    selectedBoxIndex,
    setSelectedBoxIndex,
    hoveredBoxIndex,
    setHoveredBoxIndex,
    // Actions
    handleImageSelect,
    resetControls,
    exportImage,
  };
}
