import type { GameId, TableTheme } from "@zandar/shared-types";

import { webHomeOrder, type GameConfig, type GameSlug, type HomeHistory, type HomeLayout } from "@/lib/games";
import type { BelaQuickTarget } from "@/lib/belaTarget";
import type { QuickPlayPrefs } from "@/lib/quickPlayPrefs";
import type { RaubDeck } from "@/lib/settings";
import { sr } from "@/lib/sr";

/**
 * Profil i Postavke (docs/Specs/SPEC_PROFIL_POSTAVKE.md v0.3). Čista pravila:
 * redoslijed „Moje igre", pločica „najviše igraš", opis ispod igre i koje
 * opcije list igre nudi. Bez skladišta i bez Reacta.
 */

/**
 * „Moje igre" idu istim redom kao početna (D12): aplikacija `homeLayout`
 * (zakačena → zadnja igrana → Žandar), web `webHomeOrder`. Samo žive igre —
 * lažna vrata i najavljene nemaju podešavanja.
 */
export function profileGames(layout: HomeLayout, history: HomeHistory, native: boolean): GameConfig[] {
  const games = native ? [layout.main, ...layout.more] : webHomeOrder(layout, history);
  return games.filter((g) => g.status === "live");
}

/**
 * Pločica „najviše igraš" (D8): igra sa najviše završenih partija na serveru.
 * Nerješeno → zadnja pokrenuta na ovom uređaju, pa redoslijed iz `games`.
 * Bez ijedne partije → `null` („—"). Igra koja više nije živa se ne nudi.
 */
export function mostPlayedGame(
  byGame: Partial<Record<GameId, number>> | undefined,
  played: HomeHistory["played"],
  games: readonly GameConfig[],
): GameSlug | null {
  let best: GameSlug | null = null;
  let bestCount = 0;
  let bestAt = 0;
  for (const g of games) {
    if (g.status !== "live") continue;
    const count = byGame?.[g.slug as GameId] ?? 0;
    if (!(count > 0)) continue;
    const at = played[g.slug] ?? 0;
    // Strogo „>": kod potpunog nerješenog ostaje ranija u `games`.
    if (best === null || count > bestCount || (count === bestCount && at > bestAt)) {
      best = g.slug;
      bestCount = count;
      bestAt = at;
    }
  }
  return best;
}

/** Koje opcije list igre nudi — samo ono što server stvarno sluša (§5). */
export type GameSettingsShape = {
  /** Žandar: 2 ili 4 igrača. */
  players: boolean;
  /** Žandar „igra se do", Raub „kreće se od" — oboje 11 / 21. */
  target: "to" | "from" | null;
  /** Raub: mađarice ili francuske (samo izgled, kod ovog igrača). */
  deck: boolean;
  /** Bela: brza igra do 501 ili 1001 (od 1.5.2, `lib/belaTarget.ts`). */
  belaTarget: boolean;
};

export function gameSettingsShape(slug: GameSlug): GameSettingsShape {
  if (slug === "zandar") return { players: true, target: "to", deck: false, belaTarget: false };
  if (slug === "raub") return { players: false, target: "from", deck: true, belaTarget: false };
  // Bela: 2 na 2, cilj 501 ili 1001 (od 1.5.2) i sto.
  if (slug === "bela") return { players: false, target: null, deck: false, belaTarget: true };
  // Poker: brza igra je fiksna (4 mjesta) — samo sto.
  return { players: false, target: null, deck: false, belaTarget: false };
}

export type GameChoice = { prefs: QuickPlayPrefs; tableTheme: TableTheme; deck: RaubDeck; belaTarget?: BelaQuickTarget };

/**
 * Opis ispod igre u „Moje igre" — pravi se iz istog izbora koji ide serveru,
 * i samo od onoga što se bira („Red = istina", §5).
 */
export function gameSettingsSummary(slug: GameSlug, choice: GameChoice): string {
  const t = sr.profileGames;
  const theme = sr.tableTheme.names[choice.tableTheme];
  const shape = gameSettingsShape(slug);
  if (shape.players) return `${t.players(choice.prefs.playerCount)} · ${t.to(choice.prefs.targetScore)} · ${theme}`;
  if (shape.target === "from") return `${t.from(choice.prefs.targetScore)} · ${t.deckShort[choice.deck]} · ${theme}`;
  if (shape.belaTarget) return `${t.to(choice.belaTarget ?? 501)} · ${theme}`;
  return t.tableOnly(theme);
}

/** Tekst u dugmetu „Igraj" lista — izbor se vidi prije starta (G1/G2). */
export function gamePlayHint(slug: GameSlug, prefs: QuickPlayPrefs, belaTarget?: BelaQuickTarget): string | null {
  const t = sr.profileGames;
  const shape = gameSettingsShape(slug);
  if (shape.players) return `${t.players(prefs.playerCount)} · ${t.to(prefs.targetScore)}`;
  if (shape.target === "from") return t.from(prefs.targetScore).toLocaleLowerCase("sr-Latn");
  if (shape.belaTarget) return t.to(belaTarget ?? 501);
  return null;
}

/** „jaca@primjer.com" → „jaca@…": nalog bez cijele adrese na ekranu (A2). */
export function shortEmail(email: string): string {
  const at = email.indexOf("@");
  return at > 0 ? `${email.slice(0, at)}@…` : email;
}
