// OWNER: Sunny (AI). Frame -> Gemini inline image part.
import type { Frame } from "@/lib/types";

/** Accepts a data URL ("data:image/jpeg;base64,...") or raw base64. */
export function imagePart(image: string): { inlineData: { mimeType: string; data: string } } | null {
  if (!image) return null;
  const m = image.match(/^data:(image\/[a-z+.-]+);base64,(.+)$/i);
  if (m) return { inlineData: { mimeType: m[1], data: m[2] } };
  if (/^[A-Za-z0-9+/=\s]+$/.test(image.slice(0, 200))) return { inlineData: { mimeType: "image/jpeg", data: image } };
  return null; // storage URLs: TODO fetch and inline once frames move to Supabase
}

export const frameParts = (frames: Frame[]) => frames.map((f) => imagePart(f.image)).filter((p) => p !== null);
