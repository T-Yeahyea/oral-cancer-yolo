/**
 * Canvas Rendering Engine for Oral Cancer Diagnostic Overlays.
 * Handles high-resolution multi-layer compositing (image + masks + boxes).
 */

import { DetectionBox, ORAL_CLASSES } from "../engine/config";

export interface RenderOptions {
  showMasks: boolean;
  showBoxes: boolean;
  showLabels: boolean;
  maskOpacity: number; // 0.0 to 1.0
  scoreThreshold: number;
  activeClassIds: number[]; // e.g. [0, 1, 2]
  selectedBoxIndex: number | null;
  hoveredBoxIndex: number | null;
}

/**
 * Renders the full prediction overlay onto the display canvas.
 */
export function renderCanvasOverlay(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  maskPixels: Uint8ClampedArray | null,
  boxes: DetectionBox[],
  options: RenderOptions
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  // Clear canvas
  ctx.clearRect(0, 0, w, h);

  // 1. Draw Base Image
  ctx.drawImage(image, 0, 0, w, h);

  // 2. Draw Instance Segmentation Masks (if available and enabled)
  if (options.showMasks && maskPixels && options.maskOpacity > 0) {
    // Create an offscreen buffer for mask blending
    const offscreen = document.createElement("canvas");
    offscreen.width = w;
    offscreen.height = h;
    const offCtx = offscreen.getContext("2d");

    if (offCtx) {
      const imgData = new ImageData(
        new Uint8ClampedArray(maskPixels) as Uint8ClampedArray<ArrayBuffer>,
        w,
        h
      );
      offCtx.putImageData(imgData, 0, 0);

      // Blend onto main canvas with user's selected opacity
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, options.maskOpacity));
      ctx.drawImage(offscreen, 0, 0);
      ctx.restore();
    }
  }

  // 3. Draw Bounding Boxes and Clinical Labels
  const diagonal = Math.sqrt(w * w + h * h);
  const lineWidth = Math.max(2, Math.round(diagonal / 300));
  const fontSize = Math.max(12, Math.round(diagonal / 70));
  const padding = Math.round(fontSize * 0.35);

  boxes.forEach((box, index) => {
    // Filter check
    if (box.score < options.scoreThreshold) return;
    if (!options.activeClassIds.includes(box.class_idx)) return;

    const classDef = ORAL_CLASSES[box.class_idx] || ORAL_CLASSES[0];
    const isSelected = options.selectedBoxIndex === index;
    const isHovered = options.hoveredBoxIndex === index;

    const [bx, by, bw, bh] = box.bbox;

    if (options.showBoxes) {
      ctx.save();

      // Highlight styling
      if (isSelected || isHovered) {
        ctx.lineWidth = lineWidth * 1.8;
        ctx.strokeStyle = "#FFFFFF";
        ctx.strokeRect(bx - 1, by - 1, bw + 2, bh + 2);
        ctx.strokeStyle = classDef.color;
        ctx.shadowColor = classDef.color;
        ctx.shadowBlur = 12;
      } else {
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = classDef.color;
        ctx.shadowBlur = 0;
      }

      ctx.strokeRect(bx, by, bw, bh);
      ctx.restore();
    }

    if (options.showLabels) {
      ctx.save();
      ctx.font = `bold ${fontSize}px sans-serif`;

      const labelText = `${classDef.label} ${(box.score * 100).toFixed(1)}%`;
      const textMetrics = ctx.measureText(labelText);
      const textWidth = textMetrics.width;
      const boxHeight = fontSize + padding * 2;
      const boxWidth = textWidth + padding * 2;

      let labelX = bx;
      let labelY = by - boxHeight;

      // Avoid drawing off-screen
      if (labelY < 0) {
        labelY = by + 2;
      }
      if (labelX + boxWidth > w) {
        labelX = w - boxWidth - 2;
      }

      // Label background pill
      ctx.fillStyle = classDef.color;
      ctx.beginPath();
      ctx.roundRect(labelX, labelY, boxWidth, boxHeight, 4);
      ctx.fill();

      // Label text
      ctx.fillStyle = "#FFFFFF";
      ctx.textBaseline = "middle";
      ctx.fillText(labelText, labelX + padding, labelY + boxHeight / 2);
      ctx.restore();
    }
  });
}

/**
 * Exports the annotated canvas as a high-resolution PNG file.
 */
export function exportAnnotatedImage(
  canvas: HTMLCanvasElement,
  filenamePrefix: string = "oral-cancer-diagnosis"
) {
  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  a.href = dataUrl;
  a.download = `${filenamePrefix}-${timestamp}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
