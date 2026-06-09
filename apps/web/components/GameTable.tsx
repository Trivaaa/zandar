"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * GameTable — pozicijski grid shell (DS §1.1, §1.5).
 *
 * Sto je uvijek centar i heroj. Ti si uvijek dole (`hand`). Protivnici su
 * raspoređeni oko stola po konvenciji koju igrači znaju (NE vertikalna lista).
 *
 *   2 igrača          3 igrača             4 igrača (2v2)
 *   ┌──────────┐      ┌────┐  ┌────┐       ┌──────────┐
 *   │   opp    │      │oppL│  │oppR│       │  partner │
 *   ├──────────┤      ├──────────┤         ├──┬────┬──┤
 *   │   STO    │      │   STO    │         │L │STO │R │
 *   ├──────────┤      ├──────────┤         ├──┴────┴──┤
 *   │  TVOJA   │      │  TVOJA   │         │  TVOJA   │
 *   └──────────┘      └──────────┘         └──────────┘
 *
 * Named areas: partner, oppL, oppR, table, hand. Isti grid skalira na svim
 * veličinama — mijenja se samo `grid-template-areas` po broju igrača.
 *
 * Slot props su opcioni: ako nisu prosliđeni, renderuje se labeled placeholder
 * (A2 — placeholder blokovi). B2 prosljeđuje prave SeatChip-ove.
 */

type PlayerCount = 2 | 3 | 4;

type Slots = {
  partner?: ReactNode;
  oppL?: ReactNode;
  oppR?: ReactNode;
  table?: ReactNode;
  hand?: ReactNode;
};

type GameTableProps = Slots & {
  playerCount: PlayerCount;
};

type Layout = {
  /** grid-template-areas, jedan red po stringu */
  areas: string;
  columns: string;
  /** Koje su pozicije popunjene za ovaj broj igrača */
  seats: Array<keyof Slots>;
};

// minmax(0,…) sprječava da sadržaj rastegne kolonu preko grid-a (truncate radi)
const LAYOUTS: Record<PlayerCount, Layout> = {
  2: {
    areas: `"partner partner partner" "table table table" "hand hand hand"`,
    columns: "minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)",
    seats: ["partner"], // jedini protivnik ide gore-centar
  },
  3: {
    areas: `"oppL . oppR" "table table table" "hand hand hand"`,
    columns: "minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)",
    seats: ["oppL", "oppR"],
  },
  4: {
    areas: `"partner partner partner" "oppL table oppR" "hand hand hand"`,
    columns: "auto minmax(0,1fr) auto",
    seats: ["partner", "oppL", "oppR"],
  },
};

/** Čitljiv naziv pozicije za placeholder (zavisi od broja igrača). */
function placeholderLabel(area: keyof Slots, playerCount: PlayerCount): string {
  if (area === "table") return "STO";
  if (area === "hand") return "TVOJA RUKA";
  if (area === "partner") return playerCount === 4 ? "Partner" : "Protivnik";
  if (area === "oppL") return "Protivnik";
  if (area === "oppR") return "Protivnik";
  return "";
}

function Placeholder({
  area,
  playerCount,
  variant,
}: {
  area: keyof Slots;
  playerCount: PlayerCount;
  variant: "seat" | "seat-compact" | "table" | "hand";
}) {
  if (variant === "table") {
    // Demonstrira prelom karata u 2 reda na uskim ekranima (flex-wrap)
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 rounded-token-lg bg-felt border border-white/5 p-3">
        <span className="text-xs text-muted uppercase tracking-wide">STO</span>
        <div className="flex flex-wrap justify-center gap-1.5 max-w-full">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="w-8 h-12 rounded-token-sm bg-surface-raised border border-white/10 shrink-0"
            />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "hand") {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-token-lg bg-surface-raised border border-white/5 p-3">
        <span className="text-xs text-muted uppercase tracking-wide">
          TVOJA RUKA
        </span>
        <div className="flex justify-center gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="w-9 h-14 rounded-token-sm bg-accent/80 border border-white/10"
            />
          ))}
        </div>
      </div>
    );
  }

  // 4P bočni protivnik — uža varijanta: samo avatar puck, bez punog imena (DS §1.4)
  if (variant === "seat-compact") {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-token-md bg-surface-raised border border-white/5 px-1.5 py-2 min-h-[56px]">
        <div className="w-9 h-9 rounded-full bg-surface border border-white/10" />
        <span className="text-[10px] text-muted truncate max-w-[3rem]">
          {placeholderLabel(area, playerCount)}
        </span>
      </div>
    );
  }

  // seat placeholder (~56px visine — najavljuje SeatChip iz B1)
  return (
    <div className="flex items-center gap-2 rounded-token-md bg-surface-raised border border-white/5 px-2 py-2 min-h-[56px]">
      <div className="w-9 h-9 rounded-full bg-surface shrink-0 border border-white/10" />
      <span className="text-xs text-muted truncate">
        {placeholderLabel(area, playerCount)}
      </span>
    </div>
  );
}

export function GameTable({
  playerCount,
  partner,
  oppL,
  oppR,
  table,
  hand,
}: GameTableProps) {
  const layout = LAYOUTS[playerCount];

  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateAreas: layout.areas,
    gridTemplateColumns: layout.columns,
    gridTemplateRows: "auto minmax(0,1fr) auto",
  };

  const provided: Slots = { partner, oppL, oppR, table, hand };

  // 4P bočni protivnici su kompaktni; sve ostalo puna varijanta
  const sideVariant = playerCount === 4 ? "seat-compact" : "seat";

  // Renderuj slot: proslijeđeni sadržaj ili placeholder
  function slot(
    area: keyof Slots,
    variant: "seat" | "seat-compact" | "table" | "hand",
  ) {
    const content =
      provided[area] ??
      (area === "table" || layout.seats.includes(area) || area === "hand" ? (
        <Placeholder area={area} playerCount={playerCount} variant={variant} />
      ) : null);

    if (content === null) return null;

    // Grid item stretch (default) → table popunjava srednji red; seat redovi
    // su `auto` pa su prirodne visine. min-w-0 dozvoljava truncate.
    return (
      <div style={{ gridArea: area }} className="min-w-0">
        {content}
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-surface text-white pt-safe-top pb-safe-bottom pl-safe-left pr-safe-right">
      <div style={gridStyle} className="h-full w-full gap-2 p-2 sm:p-3 sm:gap-3">
        {/* partner / opp gore-centar (2P i 4P) */}
        {layout.seats.includes("partner") && slot("partner", "seat")}
        {/* bočni protivnici (kompaktni u 4P) */}
        {layout.seats.includes("oppL") && slot("oppL", sideVariant)}
        {layout.seats.includes("oppR") && slot("oppR", sideVariant)}
        {/* sto */}
        {slot("table", "table")}
        {/* tvoja ruka */}
        {slot("hand", "hand")}
      </div>
    </div>
  );
}
