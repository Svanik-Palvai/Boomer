// Agent marks. Each is built from the Boomer hard hat: the dome (a half circle) and the brim (a line).
// One stroke weight, 24px grid, currentColor. Human roles share one mark so people read apart from software.
import type { AgentId } from "./data";

const P = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "square" as const,
  strokeLinejoin: "miter" as const,
};

const DOME = "M5 15a7 7 0 0 1 14 0";
const BRIM = "M3 15h18";

const marks: Record<AgentId | "human", JSX.Element> = {
  // Voice: the dome, with two arcs of sound above it.
  guide: (
    <>
      <path d={DOME} {...P} />
      <path d={BRIM} {...P} />
      <path d="M8.5 6.2a6 6 0 0 1 7 0" {...P} />
      <path d="M6.6 3.6a9.5 9.5 0 0 1 10.8 0" {...P} />
    </>
  ),
  // Vision: a lens under the dome.
  look: (
    <>
      <path d={DOME} {...P} />
      <path d={BRIM} {...P} />
      <circle cx="12" cy="11.2" r="1.6" fill="currentColor" />
      <path d="M12 18v3" {...P} />
    </>
  ),
  // Rules: the brim, then steps of decreasing length.
  plan: (
    <>
      <path d="M3 5h18M3 10h13M3 15h9M3 20h5" {...P} />
    </>
  ),
  // Panel of three: three small domes on one brim.
  checker: (
    <>
      <path d="M3.5 15a2.75 2.75 0 0 1 5.5 0M9.25 15a2.75 2.75 0 0 1 5.5 0M15 15a2.75 2.75 0 0 1 5.5 0" {...P} />
      <path d={BRIM} {...P} />
      <path d="M8.5 19.5l2.3 2 4.7-4.6" {...P} />
    </>
  ),
  // Spoken gate: a gate bar across the brim.
  judge: (
    <>
      <path d="M5 21V8M19 21V8M5 12h14M5 16.5h14" {...P} />
      <path d="M8 4.5a5.5 5.5 0 0 1 8 0" {...P} />
    </>
  ),
  // Record: a sheet with the dome stamped at its head.
  recorder: (
    <>
      <path d="M5 3h14v18H5z" {...P} />
      <path d="M8.5 10a3.5 3.5 0 0 1 7 0M7.5 10h9M8 14h8M8 17.5h5" {...P} />
    </>
  ),
  // Share: the dome sending an arrow out.
  share: (
    <>
      <path d="M3 17a6 6 0 0 1 12 0M2 17h14" {...P} />
      <path d="M14 7h7M17.5 3.5L21 7l-3.5 3.5" {...P} />
    </>
  ),
  // Sign-up: the dome with a plus.
  signup: (
    <>
      <path d={DOME} {...P} />
      <path d={BRIM} {...P} />
      <path d="M12 3v6M9 6h6" {...P} />
    </>
  ),
  // Memory: stacked brims, one store.
  memory: (
    <>
      <path d="M4 5h16v14H4z" {...P} />
      <path d="M4 9.7h16M4 14.3h16" {...P} />
      <path d="M7 7.3h2M7 12h2M7 16.7h2" {...P} />
    </>
  ),
  // Lesson: a film strip with a freeze mark.
  lesson: (
    <>
      <path d="M3 5h18v14H3z" {...P} />
      <path d="M7 5v14M17 5v14" {...P} />
      <path d="M10.5 9.5v5M13.5 9.5v5" {...P} />
    </>
  ),
  // A person. Workers, supervisors and reviewing electricians.
  human: (
    <>
      <circle cx="12" cy="7.5" r="3.5" {...P} />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" {...P} />
    </>
  ),
};

export function Glyph({ id, size = 24, className }: { id: AgentId | "human"; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={className}>
      {marks[id]}
    </svg>
  );
}
