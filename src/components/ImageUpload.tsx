"use client";

import React, { useRef, useState, useEffect } from "react";
import { UploadCloud, Sparkles, FileImage } from "lucide-react";
import { Button } from "./ui/button";
import { assetPath } from "../lib/utils";

interface ImageUploadProps {
  onImageSelect: (src: string, name: string) => void;
  disabled?: boolean;
}

const SAMPLE_IMAGES = [
  { id: 1, label: "Sample 1", src: assetPath("/samples/ex1.jpg") },
  { id: 2, label: "Sample 2", src: assetPath("/samples/ex2.jpg") },
  { id: 3, label: "Sample 3", src: assetPath("/samples/ex3.jpg") },
];

export default function ImageUpload({ onImageSelect, disabled }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      onImageSelect(url, file.name);
    }
  };

  // Handle Standard File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onImageSelect(url, file.name);
      e.target.value = "";
    }
  };

  // Handle Clipboard Paste (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            const url = URL.createObjectURL(file);
            onImageSelect(url, `pasted-image-${Date.now()}`);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [onImageSelect]);

  return (
    <div className="flex flex-col gap-3.5 w-full">
      {/* Upload Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-4 sm:p-8 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer select-none group touch-manipulation active:scale-[0.99] ${isDragging
          ? "border-sky-500 bg-sky-500/5 shadow-inner scale-[0.99]"
          : "border-border/60 hover:border-sky-500/50 hover:bg-muted/40 bg-card"
          } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500 mb-2 sm:mb-3 group-hover:scale-110 transition-transform duration-300">
          <UploadCloud className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>

        <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-1">
          <span className="hidden sm:inline">Tap or drop oral picture here, or <span className="text-sky-600 dark:text-sky-400 underline underline-offset-2">browse</span></span>
          <span className="sm:hidden">Tap to choose oral picture or <span className="text-sky-600 dark:text-sky-400 underline underline-offset-2">browse</span></span>
        </h3>
        <p className="text-[10px] sm:text-[11px] text-muted-foreground max-w-sm">
          Supports JPG, PNG, WEBP.
          <span className="hidden sm:inline"> On desktop, paste directly with <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono border">Ctrl+V</kbd>.</span>
        </p>
      </div>

      {/* Quick Test Samples (Fluid Scroll on Mobile) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-center gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-muted-foreground font-semibold shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Quick Test Cases:</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 -webkit-overflow-scrolling-touch">
          {SAMPLE_IMAGES.map((sample) => (
            <Button
              key={sample.id}
              variant="outline"
              size="sm"
              onClick={() => onImageSelect(sample.src, sample.label)}
              className="h-7 text-[10px] sm:text-[11px] gap-1.5 rounded-lg border-border/60 hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400 hover:border-sky-500/30 active:scale-[0.98] transition-all shrink-0 whitespace-nowrap touch-manipulation"
            >
              <FileImage className="w-3 h-3 opacity-70" />
              <span>{sample.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
