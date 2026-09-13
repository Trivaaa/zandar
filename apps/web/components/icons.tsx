import type { Suit } from "@zandar/shared-types";

/**
 * Ikonice — nacrtane za ovaj projekat, bez biblioteke i bez licence za prenos.
 * Sve su dekoracija (`aria-hidden`): pristupačni naziv uvijek nosi dugme ili
 * link oko njih. Boja je `currentColor`, pa je bira CSS roditelja.
 */
type IconProps = { className?: string };

const stroke = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: false,
} as const;

/** Zupčanik sa 8 zubaca — računat, ne ručno ucrtan, pa su zupci jednaki. */
function gearOutline(teeth = 8, outer = 10, inner = 7.4, c = 12): string {
  const step = (Math.PI * 2) / teeth;
  const at = (r: number, a: number) =>
    `${(c + r * Math.cos(a)).toFixed(2)} ${(c + r * Math.sin(a)).toFixed(2)}`;
  const points: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    points.push(at(inner, a - step * 0.32), at(outer, a - step * 0.17), at(outer, a + step * 0.17), at(inner, a + step * 0.32));
  }
  return `M${points.join("L")}Z`;
}
const GEAR = gearOutline();

export function GearIcon({ className }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <path d={GEAR} />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function BellIcon({ className }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" />
      <path d="M10 21a2.2 2.2 0 0 0 4 0" />
    </svg>
  );
}

export function FriendsIcon({ className }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16.5 14.3a5 5 0 0 1 5 5.2" />
    </svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function ArrowLeftIcon({ className }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

const SUIT_SHAPES: Record<Suit, React.ReactNode> = {
  spades: <path d="M12 3C9 7 4 9.5 4 13.5a4 4 0 0 0 6.6 3L9.6 21h4.8l-1-4.5A4 4 0 0 0 20 13.5C20 9.5 15 7 12 3z" />,
  hearts: <path d="M12 20.5S3.5 15 3.5 9.2A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8.5 2.2C20.5 15 12 20.5 12 20.5z" />,
  diamonds: <path d="M12 2.5 19 12l-7 9.5L5 12z" />,
  clubs: (
    <>
      <circle cx="12" cy="7.4" r="3.6" />
      <circle cx="7.3" cy="13.1" r="3.6" />
      <circle cx="16.7" cy="13.1" r="3.6" />
      <circle cx="12" cy="12.2" r="2.2" />
      <path d="M10.2 21h3.6l-1-6.8h-1.6z" />
    </>
  ),
};

/** Znak karte kao oblik — unicode ♥ na dijelu Androida postaje emoji. */
export function SuitIcon({ suit, className }: IconProps & { suit: Suit }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable={false} className={className}>
      {SUIT_SHAPES[suit]}
    </svg>
  );
}
