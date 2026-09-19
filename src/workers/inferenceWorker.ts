/**
 * Web Worker for ONNX Runtime Web Model Inference.
 * Runs completely isolated from the React UI thread.
 */

import * as ort from "onnxruntime-web";
import { runInferencePipeline } from "./pipeline";
import { ensurePrecision } from "../engine/precision";
import { DEFAULT_INPUT_SHAPE } from "../engine/config";

let session: ort.InferenceSession | null = null;
let activeDevice: "webgpu" | "wasm" = "webgpu";
let activeBlobUrl: string | null = null;

export interface LoadModelMessage {
  type: "load-model";
  device?: "webgpu" | "wasm";
  modelPath?: string;
  modelBuffer?: ArrayBuffer;
}

export interface RunInferenceMessage {
  type: "run-inference";
  pixels: Uint8ClampedArray;
  srcWidth: number;
  srcHeight: number;
  overlayWidth: number;
  overlayHeight: number;
  scoreThreshold: number;
  iouThreshold: number;
  instanceId?: string;
}

export interface ReleaseMessage {
  type: "release";
}

export type WorkerMessage = LoadModelMessage | RunInferenceMessage | ReleaseMessage;

const ctx: Worker = self as unknown as Worker;

function cleanupBlobUrl() {
  if (activeBlobUrl) {
    URL.revokeObjectURL(activeBlobUrl);
    activeBlobUrl = null;
  }
}

async function loadSession(
  device: "webgpu" | "wasm",
  modelSource: string | ArrayBuffer
): Promise<ort.InferenceSession> {
  ort.env.logLevel = "error";
  // Static hosts (GitHub Pages) do not supply cross-origin isolation headers;
  // single-thread mode ensures WASM runs without SharedArrayBuffer errors.
  ort.env.wasm.numThreads = 1;

  let blobUrl: string;
  if (typeof modelSource === "string") {
    // If it's a URL path, fetch it first so we can instantiate via blob or URL
    const res = await fetch(modelSource);
    if (!res.ok) throw new Error(`Model fetch failed: HTTP ${res.status}`);
    const buffer = await res.arrayBuffer();
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    blobUrl = URL.createObjectURL(blob);
  } else {
    const blob = new Blob([modelSource], { type: "application/octet-stream" });
    blobUrl = URL.createObjectURL(blob);
  }

  cleanupBlobUrl();
  activeBlobUrl = blobUrl;

  const ep = device === "webgpu" ? {
    name: "webgpu",
    options: {
      forceCpuNodeNames: [
        "/model.11/Resize",
        "/model.14/Resize",
      ],
    }
  } : "wasm";

  const sess = await ort.InferenceSession.create(blobUrl, {
    executionProviders: [ep],
    graphOptimizationLevel: "all",
    logSeverityLevel: 3,
  });

  // Warm up with dummy tensor
  const inputName = sess.inputNames[0] || "images";
  const sessionMeta = (sess as unknown as { inputMetadata: Record<string, { type: string }> }).inputMetadata;
  const inputType = sessionMeta?.[inputName]?.type || "float32";

  const [batch, channels, height, width] = DEFAULT_INPUT_SHAPE;
  const dummySize = batch * channels * height * width;
  const dummyData = ensurePrecision(new Float32Array(dummySize), inputType);
  const dummy = new ort.Tensor(inputType as "float32" | "float16", dummyData, DEFAULT_INPUT_SHAPE);

  try {
    const warmup = await sess.run({ [inputName]: dummy });
    Object.values(warmup).forEach((t) => t.dispose());
  } finally {
    dummy.dispose();
  }

  return sess;
}

ctx.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;

  switch (msg.type) {
    case "load-model": {
      const requestedDevice = msg.device || activeDevice;
      const modelSource = msg.modelBuffer || msg.modelPath || "/models/best.onnx";

      ctx.postMessage({
        type: "status",
        status: "loading",
        message: `Loading model on ${requestedDevice.toUpperCase()}...`,
        device: requestedDevice,
      });

      const start = performance.now();

      try {
        if (session) {
          try { await session.release(); } catch { /* ignore */ }
          session = null;
        }

        session = await loadSession(requestedDevice, modelSource);
        activeDevice = requestedDevice;
        const warmupTime = (performance.now() - start).toFixed(1);

        ctx.postMessage({
          type: "status",
          status: "ready",
          message: "Model loaded successfully",
          device: activeDevice,
          warmupTime,
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`[InferenceWorker] Failed to load on ${requestedDevice}:`, errMsg);

        // Auto fallback to WASM if WebGPU failed
        if (requestedDevice === "webgpu") {
          ctx.postMessage({
            type: "status",
            status: "loading",
            message: "WebGPU unavailable, falling back to WASM (CPU)...",
            device: "wasm",
          });

          try {
            session = await loadSession("wasm", modelSource);
            activeDevice = "wasm";
            const warmupTime = (performance.now() - start).toFixed(1);

            ctx.postMessage({
              type: "status",
              status: "ready",
              message: "Model loaded on WASM (CPU fallback)",
              device: "wasm",
              warmupTime,
            });
          } catch (wasmErr: unknown) {
            const finalErr = wasmErr instanceof Error ? wasmErr.message : String(wasmErr);
            ctx.postMessage({
              type: "status",
              status: "error",
              message: `Failed to load model: ${finalErr}`,
            });
          }
        } else {
          ctx.postMessage({
            type: "status",
            status: "error",
            message: `Failed to load model: ${errMsg}`,
          });
        }
      }
      break;
    }

    case "run-inference": {
      if (!session) {
        ctx.postMessage({
          type: "inference-result",
          error: "Model is not loaded yet.",
          instanceId: msg.instanceId,
        });
        return;
      }

      try {
        const result = await runInferencePipeline(
          msg.pixels,
          msg.srcWidth,
          msg.srcHeight,
          msg.overlayWidth,
          msg.overlayHeight,
          session,
          msg.scoreThreshold,
          msg.iouThreshold
        );

        const transfers: Transferable[] = [];
        if (result.maskPixels) {
          transfers.push(result.maskPixels.buffer);
        }
        if (result.originalBuffer) {
          transfers.push(result.originalBuffer as ArrayBuffer);
        }

        ctx.postMessage(
          {
            type: "inference-result",
            instanceId: msg.instanceId,
            boxes: result.boxes,
            inferenceTime: result.inferenceTime,
            maskPixels: result.maskPixels,
            maskWidth: result.maskWidth,
            maskHeight: result.maskHeight,
            originalBuffer: result.originalBuffer,
          },
          transfers
        );
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        ctx.postMessage({
          type: "inference-result",
          error: errMsg,
          instanceId: msg.instanceId,
        });
      }
      break;
    }

    case "release": {
      if (session) {
        try { await session.release(); } catch { /* ignore */ }
        session = null;
      }
      cleanupBlobUrl();
      break;
    }
  }
};
