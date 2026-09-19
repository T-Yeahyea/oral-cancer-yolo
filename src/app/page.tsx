"use client";

import React, { useState, useCallback } from "react";
import {
  UploadCloud,
  Image as ImageIcon,
  Sparkles,
  Activity,
  ShieldCheck,
  RefreshCw,
  Crosshair,
  SlidersHorizontal,
} from "lucide-react";
import Header from "../components/Header";
import ImageUpload from "../components/ImageUpload";
import CanvasViewer from "../components/CanvasViewer";
import PredictionControls from "../components/PredictionControls";
import LesionInspector from "../components/LesionInspector";
import ModelDialog from "../components/ModelDialog";
import { useOralModel } from "../hooks/useOralModel";
import { useInference } from "../hooks/useInference";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Button } from "../components/ui/button";

export default function Home() {
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"findings" | "controls">("findings");

  // Model Engine Hook
  const {
    workerRef,
    status,
    statusMessage,
    device,
    warmupTime,
    modelName,
    loadCustomModelBuffer,
    switchDevice,
  } = useOralModel();

  // Inference & Controls Hook
  const {
    imgSrc,
    imgName,
    isInferring,
    inferenceTime,
    rawBoxes,
    visibleBoxes,
    canvasRef,
    scoreThreshold,
    setScoreThreshold,
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
    handleImageSelect,
    resetControls,
    exportImage,
  } = useInference({
    workerRef,
    isModelReady: status === "ready",
  });

  // Quick Preset Helper for the Viewer Toolbar
  const handleSetViewPreset = useCallback(
    (preset: "all" | "masks" | "boxes" | "original") => {
      switch (preset) {
        case "all":
          setShowMasks(true);
          setShowBoxes(true);
          setShowLabels(true);
          break;
        case "masks":
          setShowMasks(true);
          setShowBoxes(false);
          setShowLabels(false);
          break;
        case "boxes":
          setShowMasks(false);
          setShowBoxes(true);
          setShowLabels(true);
          break;
        case "original":
          setShowMasks(false);
          setShowBoxes(false);
          setShowLabels(false);
          break;
      }
    },
    [setShowMasks, setShowBoxes, setShowLabels]
  );

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-sky-500/20 selection:text-sky-600 dark:selection:text-sky-400">
      {/* Dental Top Bar */}
      <Header
        modelName={modelName}
        status={status}
        statusMessage={statusMessage}
        device={device}
        warmupTime={warmupTime}
        onOpenModelDialog={() => setModelDialogOpen(true)}
        onSwitchDevice={switchDevice}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2.5 sm:p-4 lg:p-6 flex flex-col gap-3.5 sm:gap-4">
        {!imgSrc ? (
          /* Empty / Upload State: Minimal Dental Dropzone */
          <div className="flex-1 flex flex-col justify-center items-center max-w-xl mx-auto w-full py-6 sm:py-12 space-y-4 sm:space-y-6 animate-in fade-in duration-300">
            <div className="text-center space-y-1.5 sm:space-y-2 px-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Dental AI Clinical Screening</span>
              </div>
              <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground">
                Oral Cancer & Lesion Segmentation
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                Upload patient picture or pick a sample case to detect and segment{" "}
                <span className="text-red-500 font-semibold">Erythroplakia</span>,{" "}
                <span className="text-amber-500 font-semibold">Leukoplakia</span>, and{" "}
                <span className="text-purple-500 font-semibold">Oral Cancer</span>.
              </p>
            </div>

            <div className="w-full px-1 sm:px-0">
              <ImageUpload
                onImageSelect={handleImageSelect}
                disabled={status !== "ready"}
              />
            </div>

            {status !== "ready" && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-full border border-border/40">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-500" />
                <span>{statusMessage}</span>
              </div>
            )}
          </div>
        ) : (
          /* Active Dental Workspace: 2-Column Responsive Layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-5 items-start">
            {/* Left Column: Dental Canvas Viewer (7 Cols on desktop/tablet landscape) */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-3">
              <CanvasViewer
                canvasRef={canvasRef}
                isInferring={isInferring}
                hasImage={!!imgSrc}
                imgName={imgName}
                boxes={visibleBoxes}
                selectedBoxIndex={selectedBoxIndex}
                onSelectBox={setSelectedBoxIndex}
                onHoverBox={setHoveredBoxIndex}
                showMasks={showMasks}
                showBoxes={showBoxes}
                showLabels={showLabels}
                onSetViewPreset={handleSetViewPreset}
                onUploadNew={() => handleImageSelect("", "")}
                onSelectSample={handleImageSelect}
              />
            </div>

            {/* Right Column: Diagnostic Tabs (Findings vs Controls) (5 Cols on desktop/tablet landscape, sticky) */}
            <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-3 lg:sticky lg:top-16">
              <Tabs
                value={activeTab}
                onValueChange={(val) => setActiveTab(val as "findings" | "controls")}
                className="w-full"
              >
                <TabsList className="grid grid-cols-2 w-full h-10 sm:h-9 bg-muted/60 p-1 border border-border/50 rounded-xl">
                  <TabsTrigger value="findings" className="text-xs font-semibold gap-1.5 h-8 sm:h-7 touch-manipulation">
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>Findings ({visibleBoxes.length})</span>
                  </TabsTrigger>
                  <TabsTrigger value="controls" className="text-xs font-semibold gap-1.5 h-8 sm:h-7 touch-manipulation">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Controls</span>
                  </TabsTrigger>
                </TabsList>

                {/* Tab 1: Findings & Diagnostics (Contains Export Report button) */}
                <TabsContent value="findings" className="mt-2.5">
                  <LesionInspector
                    boxes={visibleBoxes}
                    totalRawCandidates={rawBoxes.length}
                    inferenceTime={inferenceTime}
                    selectedBoxIndex={selectedBoxIndex}
                    hoveredBoxIndex={hoveredBoxIndex}
                    onSelectBox={setSelectedBoxIndex}
                    onHoverBox={setHoveredBoxIndex}
                    onExport={exportImage}
                    disabled={isInferring}
                  />
                </TabsContent>

                {/* Tab 2: Prediction Controls (Confidence & Opacity sliders, Layers, Isolation) */}
                <TabsContent value="controls" className="mt-2.5">
                  <PredictionControls
                    scoreThreshold={scoreThreshold}
                    onScoreThresholdChange={setScoreThreshold}
                    maskOpacity={maskOpacity}
                    onMaskOpacityChange={setMaskOpacity}
                    showMasks={showMasks}
                    onToggleMasks={setShowMasks}
                    showBoxes={showBoxes}
                    onToggleBoxes={setShowBoxes}
                    showLabels={showLabels}
                    onToggleLabels={setShowLabels}
                    activeClassIds={activeClassIds}
                    onToggleClassFilter={toggleClassFilter}
                    onReset={resetControls}
                    disabled={isInferring}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </main>

      {/* Model Loading Modal */}
      <ModelDialog
        open={modelDialogOpen}
        onOpenChange={setModelDialogOpen}
        activeModelName={modelName}
        onLoadCustomModel={loadCustomModelBuffer}
      />
    </div>
  );
}
