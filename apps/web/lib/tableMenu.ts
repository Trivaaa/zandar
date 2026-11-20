/**
 * Meni za stolom (tabla „UI · Gdje je dugme za meni", M1/M6/M7, i „UI · Meni
 * za stolom", M): naslov i red stanja ispod naslova. Čiste funkcije, bez
 * Reacta, da se testiraju u `node:test`.
 */

import { sr } from "@/lib/sr";

/** Izgled karata u Raubu (M7). Sve osim "french" (i prazno/staro) = mađarice. */
export type RaubDeck = "hungarian" | "french";

export function parseRaubDeck(raw: string | null | undefined): RaubDeck {
  return raw === "french" ? "french" : "hungarian";
}

/** Žandar: „4 igrača · do 21". */
export function zandarMenuLine(players: number, targetScore: number): string {
  return `${sr.menu.players(players)} · ${sr.menu.playTo(targetScore)}`;
}

/** Raub: „4 igrača · od 21 do 0". */
export function raubMenuLine(players: number, startScore: number): string {
  return `${sr.menu.players(players)} · ${sr.menu.countDown(startScore)}`;
}

/** Poker: „Blindovi 1/2 · sljedeći nivo 2/4 za 5 ruku". */
export function pokerMenuLine(v: {
  smallBlind: number;
  bigBlind: number;
  nextSmallBlind: number;
  nextBigBlind: number;
  handsUntilNextLevel: number;
}): string {
  return `${sr.poker.blinds} ${v.smallBlind}/${v.bigBlind} · ${sr.menu.nextBlinds(
    v.nextSmallBlind,
    v.nextBigBlind,
    v.handsUntilNextLevel,
  )}`;
}
