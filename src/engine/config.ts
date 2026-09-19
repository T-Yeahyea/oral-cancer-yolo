/**
 * Clinical configuration and metadata for Oral Cancer & Precancerous Lesion Detection.
 */

export interface OralClass {
  id: number;
  name: string;
  label: string;
  description: string;
  color: string;           // Hex color for bounding boxes & text
  rgbaColor: [number, number, number]; // RGB array for mask blending
  badgeClass: string;      // Tailwind styling classes
  riskLevel: "High" | "Moderate" | "Severe";
}

export const ORAL_CLASSES: OralClass[] = [
  {
    id: 0,
    name: "erythroplakia",
    label: "Erythroplakia",
    description: "Fiery red patch on oral mucosa; high risk of malignant transformation.",
    color: "#EF4444",
    rgbaColor: [239, 68, 68],
    badgeClass: "bg-red-500/10 text-red-500 border-red-500/20",
    riskLevel: "High",
  },
  {
    id: 1,
    name: "leukoplakia",
    label: "Leukoplakia",
    description: "Precancerous white plaque/patch that cannot be scraped away.",
    color: "#F59E0B",
    rgbaColor: [245, 158, 11],
    badgeClass: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    riskLevel: "Moderate",
  },
  {
    id: 2,
    name: "oral cancer",
    label: "Oral Cancer",
    description: "Malignant lesion / oral squamous cell carcinoma (OSCC).",
    color: "#A855F7",
    rgbaColor: [168, 85, 247],
    badgeClass: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    riskLevel: "Severe",
  },
];

export const CLASS_NAMES = ORAL_CLASSES.map((c) => c.name);

export const DEFAULT_INPUT_SHAPE: [number, number, number, number] = [1, 3, 640, 640];
export const DEFAULT_SCORE_THRESHOLD = 0.40;
export const DEFAULT_IOU_THRESHOLD = 0.35;
export const DEFAULT_MASK_OPACITY = 0.50;

export interface DetectionBox {
  bbox: [number, number, number, number]; // [x, y, width, height]
  class_idx: number;
  score: number;
  mask_weights?: Float32Array;
  areaPixels?: number;
}

export interface PipelineResult {
  boxes: DetectionBox[];
  inferenceTime: string;
  maskPixels: Uint8ClampedArray | null;
  maskWidth: number;
  maskHeight: number;
  originalBuffer?: ArrayBufferLike;
}
