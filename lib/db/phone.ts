// OWNER: Zohaib
/** "+1 (215) 555-0123", "2155550123" -> "+12155550123". US numbers only for now. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits;
}
