// One stroke weight (2px on a 24 grid), round caps. Decorative by default.
type P = { size?: number; title?: string };

function Svg({ size = 22, title, children }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

export const CameraIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </Svg>
);
export const PhoneIcon = (p: P) => (
  <Svg {...p}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z" />
  </Svg>
);
export const MessageIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 5h16v11H9l-5 4z" />
  </Svg>
);
export const TapIcon = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="M8 12l3 3 5-6" />
  </Svg>
);
export const AppIcon = (p: P) => (
  <Svg {...p}>
    <rect x="6" y="3" width="12" height="18" rx="2" />
    <path d="M10 18h4" />
  </Svg>
);
export const LockIcon = (p: P) => (
  <Svg {...p}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Svg>
);
export const CheckIcon = (p: P) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7" />
  </Svg>
);
export const ChevronIcon = (p: P & { open?: boolean }) => (
  <Svg {...p}>
    <path d={p.open ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} />
  </Svg>
);
export const PlusIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const PencilIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 20l1-4L16 5l3 3L8 19z" />
  </Svg>
);
export const CloseIcon = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);
export const ExternalIcon = (p: P) => (
  <Svg {...p} size={p.size ?? 16}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />
  </Svg>
);
export const SearchIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6" />
    <path d="M20 20l-4.5-4.5" />
  </Svg>
);
