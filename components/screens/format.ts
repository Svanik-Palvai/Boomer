// OWNER: Andy (screens). Dates as people say them: "Nov 14, 2026".
export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
