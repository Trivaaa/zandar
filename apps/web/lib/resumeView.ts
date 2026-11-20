import type { ActiveTable } from "@zandar/shared-types";

import { sr } from "./sr";

/**
 * Tekst i ton trake „Vrati se za sto" (tabla `UI_VratiSe`) — čisto, bez
 * skladišta, da web, aplikacija i `/dev/home` crtaju isto.
 *
 * - `turn`: „NA POTEZU SI", zlatno, tačka treperi.
 * - `away`: „IGRA SE BEZ TEBE" — sto ne staje, razlog da se vrati odmah.
 * - `waiting`: „STO TE ČEKA" — lobi, ili Žandar stoji zbog tvog odsustva.
 * - `done`: „PARTIJA ZAVRŠENA" (V6), traka sa Rezultat i X.
 */
export type ResumeTone = "turn" | "away" | "waiting" | "done";

export type ResumeView = {
  tone: ResumeTone;
  top: string;
  detail: string;
};

export function resumeView(t: ActiveTable): ResumeView {
  const r = sr.homeResume;
  if (t.phase === "finished") {
    const res = t.result;
    const detail = !res
      ? ""
      : res.kind === "score"
        ? `${res.won ? r.won : r.lost} · ${res.mine} : ${res.theirs}`
        : res.won
          ? r.won
          : r.place(res.place);
    return { tone: "done", top: r.finished, detail };
  }
  const s = t.state;
  const detail =
    s.kind === "seats"
      ? r.seats(s.taken, s.total)
      : s.kind === "chips"
        ? r.chips(s.stack)
        : s.kind === "toZero"
          ? r.toZero(s.score)
          : s.team
            ? r.team(s.mine, s.theirs)
            : r.duel(s.mine, s.theirs, s.opponentName);
  if (t.phase === "lobby") return { tone: "waiting", top: r.waiting, detail };
  if (t.myTurn) return { tone: "turn", top: r.myTurn, detail };
  if (t.waitingForMe) return { tone: "waiting", top: r.waiting, detail };
  return { tone: "away", top: r.away, detail };
}

/** Ključ zatvorene trake V6: revanš u istoj sobi je nova partija, nova traka. */
export function dismissKey(t: Pick<ActiveTable, "roomId" | "matchId">): string {
  return `${t.roomId}:${t.matchId}`;
}

/** Traka se ne crta: završena partija koju je igrač već vidio ili zatvorio. */
export function isHidden(t: ActiveTable, dismissed: ReadonlySet<string>): boolean {
  return t.phase === "finished" && dismissed.has(dismissKey(t));
}

/**
 * List „Već igraš X" (V5) samo dok partija traje — lobi i završen sto ne
 * smetaju novom stolu.
 */
export function blocksNewTable(t: ActiveTable | null): boolean {
  return t !== null && t.phase === "playing";
}
