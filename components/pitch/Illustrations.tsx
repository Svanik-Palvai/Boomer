// OWNER: Pitch presentation. Original SVG diagrams of an inert demonstration, not camera evidence.
import s from "./pitch.module.css";
export function Harness({ beat = 0 }: { beat?: number }) {
  return (
    <svg
      viewBox="0 0 600 620"
      role="img"
      aria-label="Illustration of a phone secured to a chest harness, sharing a view of an inert outlet"
      className={s.harness}
    >
      <path
        d="M80 540V290q0-65 90-85l70-30h120l70 30q90 20 90 85v250"
        fill="#525B3E"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M240 175q60 80 120 0M180 220l65 320M420 220l-65 320"
        fill="none"
        stroke="#171914"
        strokeWidth="34"
      />
      <path
        d="M180 220l65 320M420 220l-65 320"
        fill="none"
        stroke="#8e9876"
        strokeWidth="2"
        strokeDasharray="4 7"
      />
      <path d="M180 398h240" stroke="#171914" strokeWidth="46" />
      <rect
        x="232"
        y="254"
        width="136"
        height="238"
        rx="17"
        fill="#171914"
        stroke="#F1EBDD"
        strokeWidth="3"
      />
      <rect x="241" y="275" width="118" height="186" rx="5" fill="#F1EBDD" />
      <rect x="283" y="263" width="34" height="4" rx="2" fill="#F1EBDD" />
      <rect
        x="274"
        y="316"
        width="52"
        height="88"
        rx="3"
        fill="#d8d2c4"
        stroke="#171914"
        strokeWidth="2"
      />
      <path
        d="M288 330v14m22-14v14m-22 38v12m22-12v12"
        stroke="#171914"
        strokeWidth="4"
      />
      <rect x="287" y="355" width="24" height="8" fill="#171914" />
      <path
        d="M251 294h13m-13 0v13m85-13h13v13m-98 135h13m-13 0v-13m85 13h13v-13"
        fill="none"
        stroke="#525B3E"
        strokeWidth="2"
      />
      <text x="250" y="452" fontSize="9" fontFamily="monospace" fill="#171914">
        INERT DEMO · FRAME {beat + 1}
      </text>
      <circle cx="300" cy="477" r="5" fill="#F4C430" />
      <path
        d="M368 306h74l28-45h70M232 416h-84l-30 42H48"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <text
        x="441"
        y="247"
        fontSize="11"
        fontFamily="monospace"
        fill="currentColor"
      >
        PHONE / CAMERA
      </text>
      <text
        x="45"
        y="478"
        fontSize="11"
        fontFamily="monospace"
        fill="currentColor"
      >
        CHEST HARNESS
      </text>
      <text
        x="300"
        y="592"
        textAnchor="middle"
        fontSize="12"
        fontFamily="monospace"
        fill="currentColor"
      >
        HANDS ON THE JOB. BOOMER ON THE CALL.
      </text>
      <path d="M80 560h440" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
export function Outlet({
  connected,
  correct,
}: {
  connected: boolean;
  correct: boolean;
}) {
  const y = correct ? 200 : 345;
  return (
    <svg
      viewBox="0 0 560 500"
      role="img"
      aria-label={`Inert GFCI diagram: ${!connected ? "incoming pair not connected" : correct ? "incoming pair connected to LINE" : "staged mistake, incoming pair connected to LOAD"}`}
      className={s.outlet}
    >
      <path
        d="M20 30h32m-32 0v32m488-32h32v32M20 470h32m-32 0v-32m488 32h32v-32"
        stroke="#74786b"
        strokeWidth="1.5"
        fill="none"
      />
      <rect
        x="170"
        y="72"
        width="220"
        height="360"
        rx="9"
        fill="#dcd7c9"
        stroke="#171914"
        strokeWidth="3"
      />
      <path
        d="M218 72V50h124v22m-124 360v22h124v-22"
        fill="none"
        stroke="#dcd7c9"
        strokeWidth="12"
      />
      <rect x="204" y="109" width="152" height="54" fill="#171914" />
      <text
        x="280"
        y="131"
        textAnchor="middle"
        fontSize="13"
        fontFamily="monospace"
        fill="#F1EBDD"
      >
        GFCI / BACK VIEW
      </text>
      <text
        x="280"
        y="150"
        textAnchor="middle"
        fontSize="10"
        fontFamily="monospace"
        fill="#F4C430"
      >
        INERT PROP
      </text>
      <rect
        x="199"
        y="174"
        width="162"
        height="62"
        fill={correct ? "#c6d2b1" : "#ece7db"}
        stroke="#171914"
      />
      <text
        x="280"
        y="204"
        textAnchor="middle"
        fontSize="22"
        fontWeight="bold"
        fontFamily="monospace"
        fill="#171914"
      >
        LINE
      </text>
      <text
        x="280"
        y="223"
        textAnchor="middle"
        fontSize="10"
        fontFamily="monospace"
        fill="#171914"
      >
        INCOMING POWER
      </text>
      <rect
        x="199"
        y="317"
        width="162"
        height="62"
        fill={connected && !correct ? "#d97842" : "#ece7db"}
        stroke="#171914"
      />
      <text
        x="280"
        y="350"
        textAnchor="middle"
        fontSize="22"
        fontWeight="bold"
        fontFamily="monospace"
        fill="#171914"
      >
        LOAD
      </text>
      <text
        x="280"
        y="368"
        textAnchor="middle"
        fontSize="10"
        fontFamily="monospace"
        fill="#171914"
      >
        DOWNSTREAM
      </text>
      {[200, 345].map((cy) => (
        <g key={cy}>
          <circle
            cx="184"
            cy={cy}
            r="10"
            fill="#b18c3e"
            stroke="#171914"
            strokeWidth="2"
          />
          <path d={`M178 ${cy}h12`} stroke="#171914" strokeWidth="2" />
          <circle
            cx="376"
            cy={cy}
            r="10"
            fill="#a7a7a0"
            stroke="#171914"
            strokeWidth="2"
          />
          <path d={`M370 ${cy}h12`} stroke="#171914" strokeWidth="2" />
        </g>
      ))}
      <path
        d={
          connected
            ? `M65 470V${y + 30}q0-30 30-30h89`
            : "M65 470V282q0-30 30-30h28"
        }
        stroke="#F4C430"
        strokeWidth="11"
        fill="none"
      />
      <path
        d={
          connected
            ? `M495 470V${y + 30}q0-30-30-30h-89`
            : "M495 470V282q0-30-30-30h-28"
        }
        stroke="#F1EBDD"
        strokeWidth="11"
        fill="none"
      />
      <text
        x="280"
        y="278"
        textAnchor="middle"
        fontFamily="monospace"
        fontSize="11"
        fill="#171914"
      >
        ILLUSTRATION ONLY
      </text>
      <text
        x="280"
        y="296"
        textAnchor="middle"
        fontFamily="monospace"
        fontSize="10"
        fill="#171914"
      >
        NOT A WIRING DIAGRAM
      </text>
    </svg>
  );
}
