"use client";

import type { ReactNode } from "react";
import type { ConnectionStatus } from "@zandar/shared-types";

/**
 * SeatChip — kompaktni prikaz igrača za stolom (DS §1.4, B1).
 *
 * Zamjenjuje stare velike panele: ~56px visine umjesto ~150px.
 *
 * ════════════════════════════════════════════════════════════════
 *  ZLATNO PRAVILO (DS §7.1): komponenta NE zna i NE prima `isBot`.
 *  Renderuje SVAKOG igrača identično — čovjeka i bota. Bilo kakvo
 *  grananje po botu ovdje bi bilo leak vektor. Props dolaze iz
 *  `PublicPlayer` (koji namjerno NEMA isBot/botProfile) + count-ova
 *  iz `PrivateGameStateView`.
 * ════════════════════════════════════════════════════════════════
 *
 * Sadrži (DS §1.4):
 *  - Avatar (krug) — emoji/glyph ako je dat, inače inicijal
 *  - Ime (truncate)
 *  - Badge broja karata u ruci (npr. `4`) — NIKAD 4 velike poleđine
 *  - Brojač kupljenih karata (mali)
 *  - Turn ring + timer slot kad je na potezu
 *  - Connection status (connected / reconnecting / abandoned)
 *  - Auto-play indikator (missedTurns, npr. `1/3`)
 *  - 4P: suptilni team-color border
 *
 * Glatka zamjena identiteta (DS §7.5): kad se promijeni displayName/avatar
 * (bot→čovjek), avatar+ime se mekano fade-uju (opacity), bez hard cut-a.
 */

type SeatChipProps = {
  displayName: string;
  /** Emoji/glyph avatar; ako nije dat — koristi se inicijal imena. */
  avatar?: string;
  /** Broj karata u ruci → badge. NE renderujemo poleđine. */
  cardCount: number;
  /** Broj kupljenih karata (mali brojač). */
  capturedCount?: number;
  isCurrentTurn?: boolean;
  connectionStatus: ConnectionStatus;
  /** 4P: 0 → tim A, 1 → tim B (team-color border). undefined u 2P/3P. */
  teamId?: number;
  /** Uzastopni auto-play potezi → prikaz `n/limit`. 0/undefined = sakriveno. */
  missedTurns?: number;
  /** Prag za abandon (DS §5); određuje nazivnik auto-play indikatora. */
  autoPlayLimit?: number;
  /** Lokalni igrač → "(ti)" oznaka. */
  isMe?: boolean;
  /** "full" (gore/centar) ili "compact" (4P bočni protivnik, bez imena). */
  variant?: "full" | "compact";
  /** TurnTimer ide ovdje kad je sjedište aktivno (B5 ga popunjava). */
  timer?: ReactNode;
};

/** Team border klasa za 4P. Tokeni: --color-team-a / --color-team-b. */
function teamBorderClass(teamId?: number): string {
  if (teamId === 0) return "border-team-a";
  if (teamId === 1) return "border-team-b";
  return "border-white/10";
}

/** Status dot boja + (opcioni) blink za reconnecting. */
function StatusDot({ status }: { status: ConnectionStatus }) {
  if (status === "connected") {
    return (
      <span
        className="w-2 h-2 rounded-full bg-success shrink-0"
        aria-hidden
      />
    );
  }
  if (status === "reconnecting") {
    return (
      <span
        className="w-2 h-2 rounded-full bg-warn shrink-0 animate-status-blink"
        aria-hidden
      />
    );
  }
  // abandoned
  return (
    <span className="w-2 h-2 rounded-full bg-danger shrink-0" aria-hidden />
  );
}

function statusLabel(status: ConnectionStatus): string | null {
  if (status === "reconnecting") return "veza…";
  if (status === "abandoned") return "otišao";
  return null;
}

/**
 * Avatar krug. Keyed po identitetu spolja → na promjeni se remountuje i
 * odsvira identity-fade (meka zamjena, DS §7.5).
 */
function Avatar({
  displayName,
  avatar,
  size,
}: {
  displayName: string;
  avatar?: string;
  size: "md" | "sm";
}) {
  const dim = size === "md" ? "w-9 h-9 text-base" : "w-8 h-8 text-sm";
  return (
    <div
      className={[
        dim,
        "rounded-full bg-surface border border-white/10",
        "flex items-center justify-center font-bold select-none shrink-0",
        "animate-identity-fade",
      ].join(" ")}
      aria-hidden
    >
      {avatar ? (
        <span className="leading-none">{avatar}</span>
      ) : (
        <span className="text-muted leading-none">
          {displayName.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

/** Badge broja karata u ruci — gornji-desni ugao avatara. */
function CardCountBadge({ count }: { count: number }) {
  return (
    <span
      className={[
        "absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1",
        "rounded-full bg-accent text-accent-contrast",
        "text-[10px] font-bold leading-[18px] text-center",
        "border border-surface",
      ].join(" ")}
      aria-label={`${count} karata u ruci`}
    >
      {count}
    </span>
  );
}

export function SeatChip({
  displayName,
  avatar,
  cardCount,
  capturedCount,
  isCurrentTurn = false,
  connectionStatus,
  teamId,
  missedTurns = 0,
  autoPlayLimit = 3,
  isMe = false,
  variant = "full",
  timer,
}: SeatChipProps) {
  const dimmed = connectionStatus === "abandoned";
  const showAutoPlay = missedTurns > 0;
  const label = statusLabel(connectionStatus);

  // identityKey: remount avatara/imena na promjeni identiteta → fade (DS §7.5).
  const identityKey = `${displayName}|${avatar ?? ""}`;

  // Turn indikator: token --turn-active (=accent). Suptilan puls dok je aktivan.
  const ring = isCurrentTurn
    ? "ring-2 ring-turn animate-turn-pulse"
    : "ring-1 ring-white/5";

  // 4P team-color border; ostalo neutralno.
  const border = teamBorderClass(teamId);

  // ── compact (4P bočni protivnik): avatar + count + turn ring, bez imena ──
  if (variant === "compact") {
    return (
      <div
        className={[
          "relative flex flex-col items-center justify-center gap-1",
          "rounded-token-md bg-surface-raised border px-1.5 py-2 min-h-[56px]",
          border,
          ring,
          dimmed ? "opacity-50" : "",
        ].join(" ")}
        title={displayName}
        data-current-turn={isCurrentTurn}
      >
        <div className="relative">
          <Avatar key={identityKey} displayName={displayName} avatar={avatar} size="sm" />
          <CardCountBadge count={cardCount} />
        </div>
        {showAutoPlay ? (
          <span className="text-[9px] font-bold text-warn leading-none">
            {missedTurns}/{autoPlayLimit}
          </span>
        ) : (
          <StatusDot status={connectionStatus} />
        )}
        {isCurrentTurn && timer ? (
          <div className="text-[10px] leading-none">{timer}</div>
        ) : null}
      </div>
    );
  }

  // ── full (gore-centar / partner) ──
  return (
    <div
      className={[
        "relative flex items-center gap-2",
        "rounded-token-md bg-surface-raised border px-2 py-2 min-h-[56px]",
        border,
        ring,
        dimmed ? "opacity-50" : "",
      ].join(" ")}
      data-current-turn={isCurrentTurn}
    >
      <div className="relative shrink-0">
        <Avatar key={identityKey} displayName={displayName} avatar={avatar} size="md" />
        <CardCountBadge count={cardCount} />
      </div>

      <div
        key={identityKey}
        className="min-w-0 flex-1 animate-identity-fade"
      >
        <div className="flex items-center gap-1">
          <span className="text-sm font-semibold truncate text-white">
            {displayName}
          </span>
          {isMe && (
            <span className="text-[10px] text-muted shrink-0">(ti)</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-muted">
          <StatusDot status={connectionStatus} />
          {label ? (
            <span className="truncate">{label}</span>
          ) : typeof capturedCount === "number" ? (
            <span className="truncate">kupljeno {capturedCount}</span>
          ) : null}
          {showAutoPlay && (
            <span className="font-bold text-warn shrink-0">
              auto {missedTurns}/{autoPlayLimit}
            </span>
          )}
        </div>
      </div>

      {isCurrentTurn && timer ? (
        <div className="shrink-0 text-xs">{timer}</div>
      ) : null}
    </div>
  );
}
