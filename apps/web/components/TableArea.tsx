"use client";

import { getCaptureOptions } from "@zandar/game-core";
import type { Card as CardType, CaptureOption } from "@zandar/shared-types";
import { Card } from "@/components/Card";

/**
 * TableArea (Sto) — karte na stolu + capture/trail interakcija (DS §4, B4).
 *
 * Bez confirm dugmeta. Destinacijski tap JE potvrda:
 *  - Selektuješ kartu u ruci (B3) → ovdje zasvijetle validne grupe.
 *  - Jednoznačan capture (1 opcija): tap grupe na stolu → izvrši odmah.
 *  - Više opcija: svaka grupa je zasebno tapabilna → tap izvrši taj capture.
 *  - Trail: tap prazan/sto kad NEMA capture-a → spusti kartu.
 *  - Force capture: kad capture postoji, trail je blokiran (inline poruka).
 *  - NEMA undo.
 *
 * Karte se prelamaju u više redova (flex-wrap) po potrebi (DS §1.2).
 */

const REASON_LABEL: Record<CaptureOption["reason"], string> = {
  rank_match: "Isti rank",
  sum_match: "Zbir",
  jack_clear: "Žandar — kupi sve",
};

type TableAreaProps = {
  table: CardType[];
  /** Selektovana karta iz ruke, ili null. */
  selectedCard: CardType | null;
  onCapture: (option: CaptureOption) => void;
  onTrail: () => void;
  /** Bez vlastite felt-kutije/padding-a (roditelj je play-zona, full-felt). */
  bare?: boolean;
};

function TableCards({
  table,
  highlightIds,
  tappableIds,
  onTap,
}: {
  table: CardType[];
  highlightIds: Set<string>;
  tappableIds?: Set<string>;
  onTap?: () => void;
}) {
  if (table.length === 0) {
    return (
      <span className="text-muted italic self-center text-sm">Sto je prazan</span>
    );
  }
  return (
    <>
      {table.map((card) => {
        const tappable = tappableIds?.has(card.id);
        return (
          <div key={card.id} className="animate-card-in">
            <Card
              card={card}
              selected={highlightIds.has(card.id)}
              onClick={tappable ? onTap : undefined}
            />
          </div>
        );
      })}
    </>
  );
}

export function TableArea({
  table,
  selectedCard,
  onCapture,
  onTrail,
  bare = false,
}: TableAreaProps) {
  const options = selectedCard ? getCaptureOptions(selectedCard, table) : [];
  const captureIds = new Set(options.flatMap((o) => o.cardIds));

  const canTrail = !!selectedCard && options.length === 0;
  const mustCapture = options.length > 0;
  const multi = options.length > 1;

  // Single capture: tap bilo koje karte iz grupe izvršava taj capture.
  const singleOption = options.length === 1 ? options[0] : undefined;

  return (
    <div className={bare ? "" : "rounded-token-lg bg-felt border border-white/5 p-3"}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wide text-muted">
          Sto · {table.length}
        </span>
        {mustCapture && (
          <span className="text-[10px] font-bold text-warn">
            Moraš kupiti — trail blokiran
          </span>
        )}
        {canTrail && (
          <span className="text-[10px] font-bold text-accent">
            Tapni sto da spustiš kartu
          </span>
        )}
      </div>

      {canTrail ? (
        // TRAIL: cijeli sto je drop-target (tap = spusti kartu)
        <button
          type="button"
          onClick={onTrail}
          className="w-full rounded-token-md border-2 border-dashed border-accent/50 p-2 active:bg-white/5 transition-colors"
        >
          <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 min-h-[5rem]">
            {table.length === 0 ? (
              <span className="text-accent/80 italic self-center text-sm">
                Spusti prvu kartu
              </span>
            ) : (
              <TableCards table={table} highlightIds={captureIds} />
            )}
          </div>
        </button>
      ) : (
        <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 min-h-[5rem]">
          <TableCards
            table={table}
            highlightIds={captureIds}
            tappableIds={singleOption ? new Set(singleOption.cardIds) : undefined}
            onTap={singleOption ? () => onCapture(singleOption) : undefined}
          />
        </div>
      )}

      {multi && (
        // VIŠE OPCIJA: svaka grupa zasebno tapabilna (bez confirm-a)
        <div className="mt-3 space-y-1.5">
          <span className="text-[10px] text-muted">Izaberi šta kupiš:</span>
          <div className="flex flex-wrap gap-2">
            {options.map((opt) => (
              <button
                key={opt.optionId}
                type="button"
                onClick={() => onCapture(opt)}
                className="rounded-token-md border border-accent/40 bg-surface-raised p-1.5 active:bg-surface transition-colors flex flex-col items-center gap-1"
              >
                <div className="flex gap-1">
                  {opt.cardIds.map((id) => {
                    const cc = table.find((c) => c.id === id);
                    return cc ? <Card key={id} card={cc} size="sm" /> : null;
                  })}
                </div>
                <span className="text-[9px] text-muted">
                  {REASON_LABEL[opt.reason]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
