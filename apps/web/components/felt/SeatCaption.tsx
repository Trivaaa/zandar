"use client";

/**
 * SeatCaption — sitan natpis uz sjedište onoga ko je upravo odigrao.
 *
 * Nasljednik `MoveReveal` panela, ali NE nosi istu ulogu: panel je bio jedini
 * zapis poteza, pa je morao da crta i karte — i zato je stajao preko sredine
 * stola i pokrivao upravo ono što imenuje. Otkad potez priča sam sto (karta
 * sleti, grupa zasvijetli, sve odleti u pile kupca), atribuciju nosi POKRET, a
 * natpis je samo potvrda.
 *
 * Čista prezentacija: sat drži `useTableBeat`. Tipografiju drži `felt.css`, pa
 * ovdje NEMA `text-*` utility klase — Tailwind v4 `text-*` nosi i `line-height`
 * iz kasnijeg sloja i tiho bi nadjačao `.seat__caption` (v3.5 zamka).
 */

export type SeatCaptionProps = {
  text: string;
  /** ŽANDAR dobija mesing; sve ostalo je mirno. */
  tone?: "normal" | "sweep";
  /** Druga linija — danas samo "automatski potez". */
  note?: string | undefined;
};

export function SeatCaption({ text, tone = "normal", note }: SeatCaptionProps) {
  return (
    <span className="seat__caption" data-tone={tone} role="status">
      <span className="seat__caption-text font-sans">{text}</span>
      {note ? <span className="seat__caption-note font-sans">{note}</span> : null}
    </span>
  );
}
