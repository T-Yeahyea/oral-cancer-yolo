"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { assetPath } from "../lib/utils";

export type ModelStatus = "idle" | "loading" | "ready" | "error";

export function useOralModel() {
  const [status, setStatus] = useState<ModelStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string>("Initializing worker...");
  const [device, setDevice] = useState<"webgpu" | "wasm">("webgpu");
  const [warmupTime, setWarmupTime] = useState<string>("0");
  const [modelName, setModelName] = useState<string>("best.onnx");

  const workerRef = useRef<Worker | null>(null);

  // Initialize shared worker
  useEffect(() => {
    if (typeof window === "undefined") return;

    const worker = new Worker(
      new URL("../workers/inferenceWorker.ts", import.meta.url),
      { type: "module" }
    );
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === "status") {
        setStatus(msg.status as ModelStatus);
        setStatusMessage(msg.message);
        if (msg.device) setDevice(msg.device);
        if (msg.warmupTime) setWarmupTime(msg.warmupTime);
      }
    };

    worker.onerror = (err) => {
      console.error("[useOralModel] Worker error:", err);
      setStatus("error");
      setStatusMessage("Worker execution failed.");
    };

    // Auto-load default model
    worker.postMessage({
      type: "load-model",
      device: "webgpu",
      modelPath: assetPath("/models/best.onnx"),
    });

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  /**
   * Load a custom model from an ArrayBuffer uploaded by user.
   */
  const loadCustomModelBuffer = useCallback((buffer: ArrayBuffer, name: string) => {
    if (!workerRef.current) return;
    setModelName(name);
    setStatus("loading");
    setStatusMessage(`Loading custom model: ${name}...`);

    workerRef.current.postMessage(
      {
        type: "load-model",
        device,
        modelBuffer: buffer,
      },
      [buffer]
    );
  }, [device]);

  /**
   * Switch execution provider (WebGPU vs WASM).
   */
  const switchDevice = useCallback((newDevice: "webgpu" | "wasm") => {
    if (!workerRef.current) return;
    setDevice(newDevice);
    setStatus("loading");
    setStatusMessage(`Switching to ${newDevice.toUpperCase()}...`);

    workerRef.current.postMessage({
      type: "load-model",
      device: newDevice,
      modelPath: assetPath("/models/best.onnx"),
    });
  }, []);

  return {
    workerRef,
    status,
    statusMessage,
    device,
    warmupTime,
    modelName,
    loadCustomModelBuffer,
    switchDevice,
  };
}
