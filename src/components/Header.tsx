"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu,
  FolderUp,
  Activity,
  AlertCircle,
  RefreshCw,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "./ui/button";
import { ModelStatus } from "../hooks/useOralModel";

interface HeaderProps {
  modelName: string;
  status: ModelStatus;
  statusMessage: string;
  device: "webgpu" | "wasm";
  warmupTime: string;
  onOpenModelDialog: () => void;
  onSwitchDevice: (dev: "webgpu" | "wasm") => void;
}

export default function Header({
  modelName,
  status,
  statusMessage,
  device,
  warmupTime,
  onOpenModelDialog,
  onSwitchDevice,
}: HeaderProps) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (typeof document !== "undefined") {
      setIsDark(document.documentElement.classList.contains("dark"));
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <header className="border-b border-border/50 bg-card/85 backdrop-blur-md sticky top-0 z-40 px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Brand & Clinic Title */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-xs shadow-sky-500/25 shrink-0">
            <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-xs sm:text-sm md:text-base font-bold tracking-tight text-foreground whitespace-nowrap">
                DentalVision AI
              </h1>
            </div>
            <p className="text-[10px] text-muted-foreground hidden md:block leading-none mt-0.5">
              Oral Lesion & Cancer Instance Segmentation
            </p>
          </div>
        </div>

        {/* Status Pills, Device & Settings (Fluid & Mobile Optimized) */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Status Indicator */}
          <div
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-medium border border-border/60 bg-muted/40 shadow-2xs shrink-0"
            title={statusMessage}
          >
            {status === "ready" && (
              <>
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
                <span className="text-foreground font-semibold">Ready</span>
                <span className="text-[10px] text-muted-foreground font-mono hidden md:inline">
                  ({warmupTime}ms)
                </span>
              </>
            )}
            {status === "loading" && (
              <>
                <RefreshCw className="w-3 h-3 text-amber-500 animate-spin" />
                <span className="text-muted-foreground">Loading</span>
              </>
            )}
            {status === "error" && (
              <>
                <AlertCircle className="w-3 h-3 text-destructive" />
                <span className="text-destructive font-semibold">Error</span>
              </>
            )}
            {status === "idle" && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                <span className="text-muted-foreground">Init</span>
              </>
            )}
          </div>

          {/* WebGPU / WASM Device Toggle */}
          <button
            onClick={() => onSwitchDevice(device === "webgpu" ? "wasm" : "webgpu")}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border border-border/60 bg-muted/40 hover:bg-muted active:bg-muted/70 text-foreground transition-all cursor-pointer shadow-2xs touch-manipulation shrink-0"
            title={`Hardware Engine: ${device.toUpperCase()}. Tap to toggle.`}
            aria-label="Toggle inference engine"
          >
            <Cpu className="w-3 h-3 text-sky-500" />
            <span>{device}</span>
          </button>

          {/* Model Selector Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenModelDialog}
            className="h-7 px-2 sm:px-2.5 text-[10px] sm:text-[11px] font-medium gap-1 rounded-full border-border/60 hover:bg-muted shadow-2xs touch-manipulation shrink-0"
            title={`Active Model: ${modelName}. Tap to change.`}
          >
            <FolderUp className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="font-mono text-foreground truncate max-w-[52px] sm:max-w-[110px]">
              {modelName}
            </span>
          </Button>

          {/* Dark / Light Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-full border border-border/60 bg-muted/40 hover:bg-muted active:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0 touch-manipulation"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </header>
  );
}
