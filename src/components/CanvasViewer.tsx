"use client";

import React, { useState, useRef } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  UploadCloud,
  FileImage,
} from "lucide-react";
import { DetectionBox } from "../engine/config";
import { Button } from "./ui/button";
import { assetPath } from "../lib/utils";

interface CanvasViewerProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isInferring: boolean;
  hasImage: boolean;
  imgName: string;
  boxes: DetectionBox[];
  selectedBoxIndex: number | null;
  onSelectBox: (idx: number | null) => void;
  onHoverBox: (idx: number | null) => void;
  showMasks: boolean;
  showBoxes: boolean;
  showLabels: boolean;
  onSetViewPreset: (preset: "all" | "masks" | "boxes" | "original") => void;
  onUploadNew: () => void;
  onSelectSample: (src: string, name: string) => void;
}

const SAMPLE_CASES = [
  { id: 1, label: "Sample 1", src: assetPath("/samples/ex1.jpg") },
  { id: 2, label: "Sample 2", src: assetPath("/samples/ex2.jpg") },
  { id: 3, label: "Sample 3", src: assetPath("/samples/ex3.jpg") },
];

export default function CanvasViewer({
  canvasRef,
  isInferring,
  hasImage,
  imgName,
  boxes,
  selectedBoxIndex,
  onSelectBox,
  onHoverBox,
  showMasks,
  showBoxes,
  showLabels,
  onSetViewPreset,
  onUploadNew,
  onSelectSample,
}: CanvasViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const handleZoomIn = () => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)));
  const handleResetZoom = () => setZoom(1);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Determine current active view preset
  const activePreset: "all" | "masks" | "boxes" | "original" =
    showMasks && showBoxes && showLabels
      ? "all"
      : showMasks && !showBoxes
      ? "masks"
      : !showMasks && showBoxes
      ? "boxes"
      : !showMasks && !showBoxes
      ? "original"
      : "all";

  // Hit-test click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    for (let i = boxes.length - 1; i >= 0; i--) {
      const [bx, by, bw, bh] = boxes[i].bbox;
      if (clickX >= bx && clickX <= bx + bw && clickY >= by && clickY <= by + bh) {
        onSelectBox(selectedBoxIndex === i ? null : i);
        return;
      }
    }
    onSelectBox(null);
  };

  // Hit-test touch (for tablet & mobile tap selection)
  const handleCanvasTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || e.touches.length === 0) return;

    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (touch.clientX - rect.left) * scaleX;
    const clickY = (touch.clientY - rect.top) * scaleY;

    for (let i = boxes.length - 1; i >= 0; i--) {
      const [bx, by, bw, bh] = boxes[i].bbox;
      if (clickX >= bx && clickX <= bx + bw && clickY >= by && clickY <= by + bh) {
        onSelectBox(selectedBoxIndex === i ? null : i);
        return;
      }
    }
    onSelectBox(null);
  };

  // Hit-test mouse move
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    for (let i = boxes.length - 1; i >= 0; i--) {
      const [bx, by, bw, bh] = boxes[i].bbox;
      if (mouseX >= bx && mouseX <= bx + bw && mouseY >= by && mouseY <= by + bh) {
        onHoverBox(i);
        return;
      }
    }
    onHoverBox(null);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-2xl border border-border/60 bg-card shadow-xs overflow-hidden flex flex-col transition-all ${
        isFullscreen ? "h-screen w-screen p-3 sm:p-4 bg-background z-50 fixed inset-0" : ""
      }`}
    >
      {/* ── Top Viewer Action Bar (Clean 2-tier on mobile, 1-tier on tablet/desktop) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 sm:p-2.5 sm:px-3.5 border-b border-border/50 bg-muted/30">
        {/* Tier 1: View Mode Presets (Touch scrollable) */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/60 border border-border/50 text-[10px] sm:text-[11px] font-medium overflow-x-auto scrollbar-none w-full sm:w-auto -webkit-overflow-scrolling-touch">
          <button
            onClick={() => onSetViewPreset("all")}
            className={`px-2 sm:px-2.5 py-1.5 sm:py-1 rounded-md transition-all cursor-pointer whitespace-nowrap shrink-0 touch-manipulation ${
              activePreset === "all"
                ? "bg-background text-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Overlays
          </button>
          <button
            onClick={() => onSetViewPreset("masks")}
            className={`px-2 sm:px-2.5 py-1.5 sm:py-1 rounded-md transition-all cursor-pointer whitespace-nowrap shrink-0 touch-manipulation ${
              activePreset === "masks"
                ? "bg-background text-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Masks Only
          </button>
          <button
            onClick={() => onSetViewPreset("boxes")}
            className={`px-2 sm:px-2.5 py-1.5 sm:py-1 rounded-md transition-all cursor-pointer whitespace-nowrap shrink-0 touch-manipulation ${
              activePreset === "boxes"
                ? "bg-background text-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Boxes Only
          </button>
          <button
            onClick={() => onSetViewPreset("original")}
            className={`px-2 sm:px-2.5 py-1.5 sm:py-1 rounded-md transition-all cursor-pointer whitespace-nowrap shrink-0 touch-manipulation ${
              activePreset === "original"
                ? "bg-background text-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Original Photo
          </button>
        </div>

        {/* Tier 2: Zoom, Fullscreen & Upload Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-1 text-xs shrink-0 w-full sm:w-auto">
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button
              onClick={handleZoomOut}
              className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted active:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors cursor-pointer touch-manipulation"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-1 font-semibold text-muted-foreground select-none min-w-[36px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted active:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors cursor-pointer touch-manipulation"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted active:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors cursor-pointer touch-manipulation"
              title="Reset Zoom"
              aria-label="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-3.5 bg-border/80 mx-0.5 sm:mx-1" />
            <button
              onClick={toggleFullscreen}
              className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted active:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors cursor-pointer touch-manipulation"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              aria-label="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onUploadNew}
            className="h-7 text-xs px-2 sm:px-2.5 gap-1.5 border-border/70 hover:bg-muted active:bg-muted/70 touch-manipulation"
          >
            <UploadCloud className="w-3 h-3 text-sky-500 shrink-0" />
            <span className="hidden sm:inline">Change Image</span>
            <span className="sm:hidden">Change</span>
          </Button>
        </div>
      </div>

      {/* ── Canvas Viewport Area (Responsive Height) ── */}
      <div className="relative flex-1 min-h-[250px] sm:min-h-[340px] md:min-h-[420px] lg:min-h-[480px] max-h-[68vh] flex items-center justify-center p-2 sm:p-4 bg-slate-950/20 dark:bg-black/30 overflow-auto">
        {/* Loading Spinner */}
        {isInferring && (
          <div className="absolute inset-0 z-30 bg-background/50 backdrop-blur-xs flex flex-col items-center justify-center gap-2.5">
            <div className="w-8 h-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
            <span className="text-xs font-semibold text-foreground tracking-wide">
              Segmenting Oral Lesions...
            </span>
          </div>
        )}

        {/* The Diagnostic Canvas */}
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onTouchStart={handleCanvasTouch}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={() => onHoverBox(null)}
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "center center",
            transition: "transform 0.12s ease-out",
            maxHeight: isFullscreen ? "88vh" : "min(58vh, 520px)",
            maxWidth: "100%",
            objectFit: "contain",
            touchAction: "manipulation",
          }}
          className={`rounded-lg shadow-sm border border-border/40 transition-shadow ${
            hasImage ? "cursor-crosshair" : "hidden"
          }`}
        />
      </div>

      {/* ── Bottom Docked Sample Strip (Mobile Touch Scroll) ── */}
      <div className="p-2 sm:px-3.5 border-t border-border/50 bg-muted/20 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium shrink-0">
          <FileImage className="w-3.5 h-3.5 text-sky-500" />
          <span className="text-[11px] font-semibold hidden sm:inline">Cases:</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {SAMPLE_CASES.map((sample) => (
            <button
              key={sample.id}
              onClick={() => onSelectSample(sample.src, sample.label)}
              className="px-2 sm:px-2.5 py-1.5 sm:py-1 rounded-lg text-[10px] sm:text-[11px] font-medium border border-border/50 bg-card hover:bg-sky-500/10 hover:border-sky-500/30 hover:text-sky-600 dark:hover:text-sky-400 active:scale-[0.97] transition-all shrink-0 cursor-pointer shadow-2xs whitespace-nowrap touch-manipulation"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
