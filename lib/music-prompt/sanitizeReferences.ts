import { REFERENCE_MAP } from "./presets";

// Phrasing that asks the model to copy an existing work — removed outright.
const RISKY_PATTERNS: RegExp[] = [
  /\bsound(s)?\s+exactly\s+like\b/gi,
  /\bexactly\s+like\b/gi,
  /\bsame\s+as\b/gi,
  /\bcopy\b/gi,
  /똑같이/g,
  /동일하게/g,
  /그대로/g,
  /가사도\s*동일/g,
];

// Convert artist/song references and risky phrasing into copyright-safe,
// generic musical descriptors. Does NOT append the copyright line — the
// compiler adds that once at the end.
export function sanitizeReferences(text: string): string {
  if (!text || !text.trim()) return "";
  let out = text;
  for (const [pattern, descriptor] of REFERENCE_MAP) {
    out = out.replace(pattern, descriptor);
  }
  for (const risky of RISKY_PATTERNS) {
    out = out.replace(risky, " ");
  }
  return out.replace(/\s+/g, " ").trim();
}
