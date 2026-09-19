"use client";

import React from "react";
import { AlertCircle, Crosshair, Timer, ShieldCheck, Download } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { DetectionBox, ORAL_CLASSES } from "../engine/config";

interface LesionInspectorProps {
  boxes: DetectionBox[];
  totalRawCandidates: number;
  inferenceTime: string;
  selectedBoxIndex: number | null;
  hoveredBoxIndex: number | null;
  onSelectBox: (idx: number | null) => void;
  onHoverBox: (idx: number | null) => void;
  onExport: () => void;
  disabled?: boolean;
}

export default function LesionInspector({
  boxes,
  totalRawCandidates,
  inferenceTime,
  selectedBoxIndex,
  hoveredBoxIndex,
  onSelectBox,
  onHoverBox,
  onExport,
  disabled,
}: LesionInspectorProps) {
  const counts = {
    erythroplakia: boxes.filter((b) => b.class_idx === 0).length,
    leukoplakia: boxes.filter((b) => b.class_idx === 1).length,
    oralCancer: boxes.filter((b) => b.class_idx === 2).length,
  };

  const hasMalignancy = counts.oralCancer > 0;
  const hasPrecancer = counts.erythroplakia > 0 || counts.leukoplakia > 0;

  return (
    <Card className="border-border/60 shadow-xs bg-card rounded-2xl overflow-hidden flex flex-col h-full">
      {/* Header */}
      <CardHeader className="p-3.5 sm:p-4 border-b border-border/50 flex flex-row items-center justify-between pb-3 bg-muted/20">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-sky-500" />
          <CardTitle className="text-xs font-bold tracking-tight uppercase text-muted-foreground">
            Clinical Findings
          </CardTitle>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
          <Timer className="w-3 h-3 text-sky-500" />
          <span>{inferenceTime}ms</span>
        </div>
      </CardHeader>

      <CardContent className="p-3.5 sm:p-4 space-y-3.5 flex-1 overflow-auto flex flex-col">
        {/* Clinical Alert Banner */}
        {boxes.length > 0 ? (
          <div
            className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${hasMalignancy
              ? "bg-purple-500/10 border-purple-500/30 text-foreground"
              : hasPrecancer
                ? "bg-amber-500/10 border-amber-500/30 text-amber-500 dark:text-amber-300"
                : "bg-muted/40 border-border/60 text-muted-foreground"
              }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">
                {hasMalignancy
                  ? "Malignancy Finding: "
                  : "Precancerous Lesion: "}
              </span>
              {boxes.length} finding{boxes.length === 1 ? "" : "s"} identified. Correlate with clinical inspection and histopathology.
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span className="font-semibold">No Lesions Exceeding Confidence Threshold</span>
          </div>
        )}

        {/* Pathology Summary Pills */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          <div className="p-1.5 sm:p-2.5 rounded-xl border border-red-500/20 bg-red-500/5 flex flex-col">
            <span className="text-[9px] sm:text-[10px] font-bold text-red-500 uppercase tracking-tight truncate">
              Erythroplakia
            </span>
            <span className="text-sm sm:text-base font-bold text-red-500 font-mono mt-0.5">
              {counts.erythroplakia}
            </span>
          </div>

          <div className="p-1.5 sm:p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 flex flex-col">
            <span className="text-[9px] sm:text-[10px] font-bold text-amber-500 uppercase tracking-tight truncate">
              Leukoplakia
            </span>
            <span className="text-sm sm:text-base font-bold text-amber-500 font-mono mt-0.5">
              {counts.leukoplakia}
            </span>
          </div>

          <div className="p-1.5 sm:p-2.5 rounded-xl border border-purple-500/20 bg-purple-500/5 flex flex-col">
            <span className="text-[9px] sm:text-[10px] font-bold text-purple-500 uppercase tracking-tight truncate">
              Oral Cancer
            </span>
            <span className="text-sm sm:text-base font-bold text-purple-500 font-mono mt-0.5">
              {counts.oralCancer}
            </span>
          </div>
        </div>

        {/* Detailed Findings List */}
        <div className="flex-1 overflow-auto rounded-xl border border-border/50 bg-background/40 min-h-[130px] max-h-[320px] sm:max-h-[400px] -webkit-overflow-scrolling-touch">
          <div className="divide-y divide-border/40">
            {boxes.map((box, index) => {
              const classDef = ORAL_CLASSES[box.class_idx] || ORAL_CLASSES[0];
              const isSelected = selectedBoxIndex === index;
              const isHovered = hoveredBoxIndex === index;

              return (
                <div
                  key={index}
                  onClick={() => onSelectBox(isSelected ? null : index)}
                  onMouseEnter={() => onHoverBox(index)}
                  onMouseLeave={() => onHoverBox(null)}
                  className={`p-2.5 sm:p-3 transition-all cursor-pointer flex flex-col gap-2 touch-manipulation active:scale-[0.99] ${isSelected
                    ? "bg-sky-500/10 border-l-4 border-l-sky-500"
                    : isHovered
                      ? "bg-muted/50"
                      : "hover:bg-muted/30"
                    }`}
                >
                  {/* Top row: Label & Risk Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: classDef.color }}
                      />
                      <span className="font-bold text-xs text-foreground">{classDef.label}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">#{index + 1}</span>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0 h-4 sm:h-4.5 border ${classDef.badgeClass}`}
                    >
                      {classDef.riskLevel} Risk
                    </Badge>
                  </div>

                  {/* Confidence Row with clean non-overlapping layout */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11px] leading-tight">
                      <span className="text-muted-foreground">Confidence</span>
                      <span className="font-mono font-bold" style={{ color: classDef.color }}>
                        {(box.score * 100).toFixed(1)}%
                      </span>
                    </div>
                    {/* Progress Track */}
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.max(0, box.score * 100))}%`,
                          backgroundColor: classDef.color,
                        }}
                      />
                    </div>
                  </div>

                  {/* Segmented Area Row */}
                  {box.areaPixels ? (
                    <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-muted-foreground font-mono pt-0.5">
                      <span>Segmented Area</span>
                      <span className="font-semibold text-foreground">{box.areaPixels.toLocaleString()} px</span>
                    </div>
                  ) : null}
                </div>
              );
            })}

            {boxes.length === 0 && (
              <div className="p-6 text-center text-muted-foreground italic text-xs">
                No active detections. Adjust confidence threshold or upload a new picture.
              </div>
            )}
          </div>
        </div>

        {/* ── Export Diagnostic Report Button (Moved into Findings tab) ── */}
        <div className="pt-1">
          <Button
            onClick={onExport}
            disabled={disabled || boxes.length === 0}
            className="w-full bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-semibold text-xs sm:text-sm gap-2 rounded-xl h-10 shadow-xs cursor-pointer touch-manipulation active:scale-[0.99]"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Export Diagnostic Report (PNG)</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
