import type { TranscriptTurn } from "./types";
// Original subtitle files are evidence, not instructions. Preserve their wording.
export function parseTranscript(source: string): TranscriptTurn[] {
  const text = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  if (text.startsWith("[")) return JSON.parse(text);
  const stamp = (s: string) => {
    const parts = s.replace(",", ".").split(":").map(Number);
    if (parts.some(n => !Number.isFinite(n)) || parts.length < 2 || parts.length > 3)
      throw new Error("Invalid subtitle timestamp");
    return parts.reduce((sum, n) => sum * 60 + n, 0);
  };
  const turns: TranscriptTurn[] = [];
  for (const block of text.split(/\n\s*\n/)) {
    const lines = block.split("\n"), index = lines.findIndex(l => l.includes("-->"));
    if (index < 0) continue;
    const match = lines[index].match(/^(\S+)\s+-->\s+(\S+)/);
    if (!match) throw new Error("Invalid subtitle timing line");
    const words = lines.slice(index + 1).join("\n").replace(/<[^>]*>/g, "").trim();
    if (words) turns.push({ role: "Speaker", text: words, start: stamp(match[1]), end: stamp(match[2]) });
  }
  if (!turns.length) throw new Error("Upload a WebVTT or SRT transcript with timestamped speech.");
  return turns;
}
