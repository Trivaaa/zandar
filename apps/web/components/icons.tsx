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

/** Dvije karte — tab „Igraj". */
export function CardsIcon({ className }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <rect x="9.5" y="3.5" width="10.5" height="15" rx="1.8" />
      <path d="M7.4 6.2 4.3 7.3a1.6 1.6 0 0 0-1 2l3.4 9.5a1.6 1.6 0 0 0 2 1l3.3-1.2" />
    </svg>
  );
}

/** Jedna osoba — tab „Profil". */
export function PersonIcon({ className }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

/** Stubići — „Rezultati ostaju sačuvani". */
export function StatsIcon({ className }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <path d="M5 20V12M12 20V5M19 20v-8" />
    </svg>
  );
}

/** Etiketa — „Nadimak je samo tvoj". */
export function TagIcon({ className }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <path d="M3.5 12.3V5A1.5 1.5 0 0 1 5 3.5h7.3L20.5 12 12 20.5z" />
      <circle cx="8" cy="8" r="1.5" />
    </svg>
  );
}

/** Računar i telefon — „Isti nalog na svakom uređaju". */
export function DevicesIcon({ className }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <rect x="2.5" y="5" width="13" height="9.5" rx="1.5" />
      <path d="M1.5 18h15" />
      <rect x="17.5" y="8" width="5" height="11" rx="1.2" />
    </svg>
  );
}

export function EyeIcon({ className }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon({ className }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <path d="M3 3l18 18" />
      <path d="M10.6 6.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16.5 16.5 0 0 1-2.9 3.7M6.6 6.6A16 16 0 0 0 2.5 12S6 18.5 12 18.5a9 9 0 0 0 4.2-1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

/** „G" za dugme „Nastavi s Googleom" — jednobojno, bez Google logotipa. */
export function GoogleMarkIcon({ className }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <path d="M20 12.2h-8M20 12.2A8 8 0 1 1 17.7 6.6" />
    </svg>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9.5 7V4.5h5V7" />
    </svg>
  );
}

export function LockIcon({ className }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <rect x="5" y="10.5" width="14" height="10" rx="1.8" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function LogoutIcon({ className }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14" />
      <path d="M10 8l-4 4 4 4M6 12h10" />
    </svg>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

/** Zvijezda — zakačena igra. `filled` za oznaku „Zakačeno". */
export function StarIcon({ className, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg {...stroke} className={className} fill={filled ? "currentColor" : "none"}>
      <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
    </svg>
  );
}

/** Otvorena knjižica — pravila. */
export function BookIcon({ className }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <path d="M5 4.5h11a2 2 0 0 1 2 2V20H7a2 2 0 0 1-2-2z" />
      <path d="M5 18a2 2 0 0 1 2-2h11M9 8.5h5" />
    </svg>
  );
}

/** Strelica u ladicu — preuzimanje aplikacije. */
export function DownloadIcon({ className }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" />
    </svg>
  );
}

/** Olovka — izmjena podešavanja. */
export function PencilIcon({ className }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <path d="M15.5 5.5l3 3L9 18H6v-3z" />
      <path d="M13.5 7.5l3 3" />
    </svg>
  );
}

export function RetryIcon({ className }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <path d="M20 12a8 8 0 1 1-2.35-5.65" />
      <path d="M20 4v5h-5" />
    </svg>
  );
}

export function WarningIcon({ className }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <path d="M12 3.5 21.5 20H2.5z" />
      <path d="M12 10v4.5M12 17.4v.1" />
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
