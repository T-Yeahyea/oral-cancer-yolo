"use client";

import React, { useRef, useState } from "react";
import { UploadCloud, CheckCircle2, FileBox, Info, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { ORAL_CLASSES } from "../engine/config";

interface ModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeModelName: string;
  onLoadCustomModel: (buffer: ArrayBuffer, name: string) => void;
}

export default function ModelDialog({
  open,
  onOpenChange,
  activeModelName,
  onLoadCustomModel,
}: ModelDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".onnx")) {
        setError("Please select a valid .onnx model file.");
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleApply = async () => {
    if (!selectedFile) return;
    try {
      const buffer = await selectedFile.arrayBuffer();
      onLoadCustomModel(buffer, selectedFile.name);
      onOpenChange(false);
      setSelectedFile(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to read model file: ${msg}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-[480px] p-4 sm:p-6 bg-card border-border/50 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <FileBox className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-sm sm:text-base font-bold">Manage Model (best.onnx)</DialogTitle>
              <DialogDescription className="text-[11px] sm:text-xs text-muted-foreground">
                Active model: <span className="font-mono font-semibold text-foreground">{activeModelName}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3.5 sm:space-y-4 py-2">
          {/* Default bundled model location note */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-muted/40 border border-border/40 flex items-start gap-2.5 text-[11px] sm:text-xs text-muted-foreground">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-medium text-foreground">Default Model Location: </span>
              Place your trained weights at <code className="px-1 py-0.5 rounded bg-muted font-mono text-[10px] sm:text-[11px] text-foreground">public/models/best.onnx</code>.
            </div>
          </div>

          {/* Direct browser upload */}
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-[11px] sm:text-xs font-semibold text-foreground">
              Or Load .onnx Directly in Browser Session:
            </label>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border/60 hover:border-primary/50 hover:bg-muted/30 rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors touch-manipulation active:scale-[0.99]"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".onnx"
                onChange={handleFileChange}
                className="hidden"
              />
              <UploadCloud className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground mb-1.5" />
              {selectedFile ? (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
                </div>
              ) : (
                <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                  Click to select <code className="font-mono text-foreground">best.onnx</code>
                </span>
              )}
            </div>
          </div>

          {/* Expected Classes checklist */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] sm:text-xs font-semibold text-foreground">Model Classes (3 Classes):</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
              {ORAL_CLASSES.map((cls) => (
                <div
                  key={cls.id}
                  className="p-1.5 sm:p-2 rounded-lg border border-border/40 bg-background/50 flex items-center gap-1.5 text-[10px] sm:text-[11px]"
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cls.color }} />
                  <span className="font-medium truncate">{cls.label}</span>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border/40 pt-3 flex flex-row justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs touch-manipulation">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleApply}
            disabled={!selectedFile}
            className="h-8 text-xs bg-primary text-primary-foreground font-medium touch-manipulation"
          >
            Load Model
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
