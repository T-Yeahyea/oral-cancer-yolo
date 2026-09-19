"use client";

import React from "react";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";
import { Button } from "./ui/button";
import { ORAL_CLASSES } from "../engine/config";

interface PredictionControlsProps {
  scoreThreshold: number;
  onScoreThresholdChange: (val: number) => void;
  maskOpacity: number;
  onMaskOpacityChange: (val: number) => void;
  showMasks: boolean;
  onToggleMasks: (val: boolean) => void;
  showBoxes: boolean;
  onToggleBoxes: (val: boolean) => void;
  showLabels: boolean;
  onToggleLabels: (val: boolean) => void;
  activeClassIds: number[];
  onToggleClassFilter: (classId: number) => void;
  onReset: () => void;
  disabled?: boolean;
}

export default function PredictionControls({
  scoreThreshold,
  onScoreThresholdChange,
  maskOpacity,
  onMaskOpacityChange,
  showMasks,
  onToggleMasks,
  showBoxes,
  onToggleBoxes,
  showLabels,
  onToggleLabels,
  activeClassIds,
  onToggleClassFilter,
  onReset,
  disabled,
}: PredictionControlsProps) {
  return (
    <Card className="border-border/60 shadow-xs bg-card rounded-2xl overflow-hidden flex flex-col">
      <CardHeader className="p-3.5 sm:p-4 border-b border-border/50 flex flex-row items-center justify-between pb-3 bg-muted/20">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-sky-500" />
          <CardTitle className="text-xs font-bold tracking-tight uppercase text-muted-foreground">
            Prediction Controls
          </CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
          title="Reset to defaults"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </Button>
      </CardHeader>

      <CardContent className="p-3.5 sm:p-4 space-y-4">
        {/* ── 1. Numerical Sliders (Confidence & Opacity) ── */}
        <div className="space-y-3.5">
          {/* Confidence Score Threshold */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">Confidence Threshold</span>
              <span className="font-mono text-sky-600 dark:text-sky-400 font-bold px-1.5 py-0.5 rounded bg-sky-500/10 text-[11px]">
                {(scoreThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              value={[scoreThreshold]}
              min={0.05}
              max={0.95}
              step={0.05}
              disabled={disabled}
              onValueChange={(val) => onScoreThresholdChange(val[0])}
            />
            <p className="text-[10px] text-muted-foreground">
              Filter out candidate detections below this confidence score.
            </p>
          </div>

          {/* Mask Opacity Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">Mask Opacity</span>
              <span className="font-mono text-sky-600 dark:text-sky-400 font-bold px-1.5 py-0.5 rounded bg-sky-500/10 text-[11px]">
                {(maskOpacity * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              value={[maskOpacity]}
              min={0.0}
              max={1.0}
              step={0.05}
              disabled={disabled || !showMasks}
              onValueChange={(val) => onMaskOpacityChange(val[0])}
            />
            <p className="text-[10px] text-muted-foreground">
              Adjust transparency of the segmented lesion area overlay.
            </p>
          </div>
        </div>

        <div className="h-px bg-border/50" />

        {/* ── 2. Layer Display Switches ── */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Display Layers
          </span>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between p-2.5 sm:p-2 rounded-xl border border-border/50 bg-muted/20 active:bg-muted/40 transition-colors">
              <span className="text-xs font-medium text-foreground">Segmentation Masks</span>
              <Switch checked={showMasks} onCheckedChange={onToggleMasks} disabled={disabled} />
            </div>

            <div className="flex items-center justify-between p-2.5 sm:p-2 rounded-xl border border-border/50 bg-muted/20 active:bg-muted/40 transition-colors">
              <span className="text-xs font-medium text-foreground">Bounding Boxes</span>
              <Switch checked={showBoxes} onCheckedChange={onToggleBoxes} disabled={disabled} />
            </div>

            <div className="flex items-center justify-between p-2.5 sm:p-2 rounded-xl border border-border/50 bg-muted/20 active:bg-muted/40 transition-colors">
              <span className="text-xs font-medium text-foreground">Labels & Confidence</span>
              <Switch checked={showLabels} onCheckedChange={onToggleLabels} disabled={disabled} />
            </div>
          </div>
        </div>

        <div className="h-px bg-border/50" />

        {/* ── 3. Pathology Isolation Filters ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Class Isolation
            </span>
            <span className="text-[10px] text-muted-foreground">Filter view</span>
          </div>

          <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
            {ORAL_CLASSES.map((cls) => {
              const isActive = activeClassIds.includes(cls.id);
              return (
                <button
                  key={cls.id}
                  onClick={() => onToggleClassFilter(cls.id)}
                  disabled={disabled}
                  title={`Toggle ${cls.label}`}
                  className={`flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-2 sm:py-1.5 rounded-lg border text-[10px] sm:text-[11px] font-semibold transition-all cursor-pointer touch-manipulation active:scale-[0.98] ${
                    isActive
                      ? "border-sky-500/40 bg-sky-500/10 text-foreground shadow-2xs"
                      : "border-border/40 opacity-40 hover:opacity-80 bg-transparent text-muted-foreground"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: cls.color }}
                  />
                  <span className="truncate">{cls.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
