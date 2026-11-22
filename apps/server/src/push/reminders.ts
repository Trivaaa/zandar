/**
 * Podsjetnici neaktivnim igračima (SPEC_PUSH_V2, dio B) — ČISTE odluke.
 *
 * Planer (`scheduler.ts`) svakih 15 minuta grupiše uređaje po igraču i za
 * svaku grupu pita `decideReminder`: da li je neki korak (d1/d3/d7) na redu,
 * da li je sad pravo lokalno vrijeme i koji je razlog tačan. Ovdje nema mreže,
 * sata ni slučajnosti — sve to ulazi kao argument, pa se testira bez servera.
 *
 * Pravila teksta su ista kao u `messages.ts` (PRD §51.1): istina u trenutku
 * slanja, rodno neutralno, bez nadimaka, bez broja ljudi i bez „neko te čeka"
 * (HARD RULE 5). „Sto se postavlja za par sekundi" je istina zato što Brza
 * igra popunjava sto odmah — ako se to ikad promijeni, mijenja se i tekst.
 *
 * Sve brojke su CONFIG (HARD RULE 7): `DEFAULT_REMINDER_CONFIG`.
 */

import type { GameId } from "@zandar/shared-types";

import type {
  DeviceRecord,
  PlayStats,
  ReminderArm,
  ReminderState,
  ReminderStep,
} from "./devices";
import { localParts } from "./localTime";
import type { PushMessage } from "./messages";

export const REMINDERS_CHANNEL_ID = "podsjetnici";

export type ReminderReason =
  | "new_game"
  | "rematch"
  | "win_again"
  | "first_match"
  | "usual_time"
  | "default"
  | "last_call";

export type ReminderConfig = {
  /**
   * Korak je na redu od `day`-tog lokalnog dana poslije zadnjeg viđenja, i to
   * samo taj i sljedeći dan (`graceDays`). Bez gornje granice bi prvi deploy
   * poslao „posljednji podsjetnik" svakome ko je otišao prije mjesec dana.
   */
  steps: readonly { step: ReminderStep; day: number; needsFinishedMatch: boolean }[];
  graceDays: number;
  /** d1 nikad prije ovoga (igrač koji je igrao u ponoć ne dobija poruku u 10 h). */
  minInactiveMs: number;
  /** Najviše jedan podsjetnik dnevno po igraču. */
  minGapMs: number;
  /** Lični sat je u ovim granicama (uključivo). */
  personalHourMin: number;
  personalHourMax: number;
  /** Bez istorije igranja. */
  defaultHour: number;
  /** Tiho vrijeme: od `quietFrom` do `quietUntil` (lokalno) se ne šalje. */
  quietFrom: number;
  quietUntil: number;
  /**
   * Kontrolna grupa: `initialShare` dok obje grupe nemaju `switchAtPerArm`
   * igrača, zatim `laterShare`. Dodijeljena grupa se nikad ne mijenja.
   */
  holdout: { initialShare: number; laterShare: number; switchAtPerArm: number };
  ttlMs: number;
  /** Kad je igra izašla na produkciji (`new_game`). Bez datuma = nije izašla. */
  releasedAt: Partial<Record<GameId, number>>;
  /**
   * Samo staging i testovi: dužina „dana" u ms, mjerena od zadnjeg viđenja, bez
   * ličnog sata i tihog vremena. `null` = pravi lokalni kalendar.
   */
  dayMs: number | null;
};

export const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  steps: [
    { step: "d1", day: 1, needsFinishedMatch: false },
    { step: "d3", day: 3, needsFinishedMatch: true },
    { step: "d7", day: 7, needsFinishedMatch: true },
  ],
  graceDays: 1,
  minInactiveMs: 16 * 60 * 60 * 1000,
  minGapMs: 20 * 60 * 60 * 1000,
  personalHourMin: 10,
  personalHourMax: 22,
  defaultHour: 20,
  quietFrom: 23,
  quietUntil: 9,
  holdout: { initialShare: 0.5, laterShare: 0.1, switchAtPerArm: 100 },
  ttlMs: 6 * 60 * 60 * 1000,
  // Poker i Raub u aplikaciji od 1.4.1 (15.11.2026); Bela još nije izašla.
  releasedAt: {
    poker: Date.UTC(2026, 10, 15),
    raub: Date.UTC(2026, 10, 15),
  },
  dayMs: null,
};

// ─── grupisanje ─────────────────────────────────────────────────────────────

export type PlayerGroup = { key: string; devices: DeviceRecord[] };

/**
 * Jedan igrač = svi uređaji jednog naloga (`uid`), a gost = jedan uređaj.
 * Igrač sa dva telefona ne smije dobiti podsjetnik na jednom dok igra na drugom.
 */
export function groupByPlayer(devices: readonly DeviceRecord[]): PlayerGroup[] {
  const groups = new Map<string, DeviceRecord[]>();
  for (const d of devices) {
    const key = d.uid ? `uid:${d.uid}` : `dev:${d.idHash}`;
    const list = groups.get(key);
    if (list) list.push(d);
    else groups.set(key, [d]);
  }
  return [...groups].map(([key, list]) => ({ key, devices: list }));
}

/** Statistika igrača sa svih uređaja; „zadnja partija" je najnovija bilo gdje. */
export function mergePlay(devices: readonly DeviceRecord[]): PlayStats | undefined {
  let out: PlayStats | undefined;
  for (const d of devices) {
    const p = d.play;
    if (!p) continue;
    if (!out) {
      out = { ...p, games: [...p.games], hourCounts: [...p.hourCounts] };
      continue;
    }
    const newer = p.lastMatchEndedAt > out.lastMatchEndedAt;
    out = {
      matchesFinished: out.matchesFinished + p.matchesFinished,
      lastMatchEndedAt: newer ? p.lastMatchEndedAt : out.lastMatchEndedAt,
      lastGame: newer ? p.lastGame : out.lastGame,
      lastResult: newer ? p.lastResult : out.lastResult,
      games: [...new Set([...out.games, ...p.games])],
      hourCounts: out.hourCounts.map((n, h) => n + (p.hourCounts[h] ?? 0)),
    };
  }
  return out;
}

/** Sat u kojem igrač najčešće počinje partiju, u granicama; bez istorije podrazumijevani. */
export function personalHour(play: PlayStats | undefined, cfg: ReminderConfig): number {
  let best = -1;
  let bestCount = 0;
  for (let h = 0; h < 24; h++) {
    const n = play?.hourCounts[h] ?? 0;
    if (n > bestCount) {
      best = h;
      bestCount = n;
    }
  }
  if (best < 0) return cfg.defaultHour;
  return Math.min(cfg.personalHourMax, Math.max(cfg.personalHourMin, best));
}

// ─── razlog ─────────────────────────────────────────────────────────────────

type ReasonRule = {
  reason: ReminderReason;
  steps: readonly ReminderStep[];
  game?: (ctx: ReasonContext) => GameId | null;
  when: (ctx: ReasonContext) => boolean;
};

type ReasonContext = {
  play: PlayStats | undefined;
  /** Sat slanja (lični sat igrača) — `usual_time` ga provjerava u istoriji. */
  usualHour?: number | undefined;
  lastSeenAt: number;
  now: number;
  releasedAt: Partial<Record<GameId, number>>;
};

function newGame(ctx: ReasonContext): GameId | null {
  let best: GameId | null = null;
  let bestAt = -Infinity;
  for (const [game, at] of Object.entries(ctx.releasedAt) as [GameId, number][]) {
    if (at > ctx.lastSeenAt && at <= ctx.now && !ctx.play?.games.includes(game) && at > bestAt) {
      best = game;
      bestAt = at;
    }
  }
  return best;
}

export const USUAL_TIME_MIN_MATCHES = 3;

/** Prvi tačan red pobjeđuje (SPEC_PUSH_V2 B5). Liga (SPEC_RANG §5.8) dolazi iznad. */
const REASONS: readonly ReasonRule[] = [
  { reason: "new_game", steps: ["d3", "d7"], game: newGame, when: (c) => newGame(c) !== null },
  { reason: "rematch", steps: ["d1", "d3"], when: (c) => c.play?.lastResult === "lost" },
  { reason: "win_again", steps: ["d1", "d3"], when: (c) => c.play?.lastResult === "won" },
  { reason: "first_match", steps: ["d1"], when: (c) => !c.play || c.play.matchesFinished === 0 },
  // „U ovo vrijeme obično igraš" — istina samo uz bar 3 partije počete u tom satu.
  {
    reason: "usual_time",
    steps: ["d1", "d3"],
    when: (c) =>
      c.usualHour !== undefined && (c.play?.hourCounts[c.usualHour] ?? 0) >= USUAL_TIME_MIN_MATCHES,
  },
  { reason: "default", steps: ["d1", "d3"], when: () => true },
  { reason: "last_call", steps: ["d7"], when: () => true },
];

export function pickReason(
  step: ReminderStep,
  ctx: ReasonContext,
): { reason: ReminderReason; game: GameId } {
  for (const rule of REASONS) {
    if (!rule.steps.includes(step) || !rule.when(ctx)) continue;
    return { reason: rule.reason, game: rule.game?.(ctx) ?? ctx.play?.lastGame ?? "zandar" };
  }
  return { reason: "default", game: ctx.play?.lastGame ?? "zandar" };
}

// ─── odluka ─────────────────────────────────────────────────────────────────

export type ReminderDecision = {
  /** Uređaj koji dobija poruku (najskorije viđen sa uključenim podsjetnicima). */
  target: DeviceRecord;
  step: ReminderStep;
  reason: ReminderReason;
  game: GameId;
  /** Niz poslije ovog koraka — planer ga upisuje na `target`. */
  next: ReminderState;
  /** Grupa igrača ako je već dodijeljena (na bilo kom uređaju). */
  arm: ReminderArm | undefined;
};

export function decideReminder(
  group: PlayerGroup,
  now: number,
  cfg: ReminderConfig = DEFAULT_REMINDER_CONFIG,
): ReminderDecision | null {
  if (group.devices.length === 0) return null;
  const lastSeenAt = Math.max(...group.devices.map((d) => d.lastSeenAt));
  const inactive = now - lastSeenAt;
  if (inactive < cfg.minInactiveMs) return null;

  const candidates = group.devices
    .filter((d) => d.prefs.reminders)
    .sort((a, b) => b.lastSeenAt - a.lastSeenAt);
  const target = candidates[0];
  if (!target) return null;

  const play = mergePlay(group.devices);
  const dayIndex =
    cfg.dayMs !== null
      ? Math.floor(inactive / cfg.dayMs)
      : localParts(now, target.tz).day - localParts(lastSeenAt, target.tz).day;

  // Najkasniji korak čiji je dan došao, ako mu rok još nije prošao.
  const due = [...cfg.steps].reverse().find((s) => s.day <= dayIndex);
  if (!due || dayIndex > due.day + cfg.graceDays) return null;

  // Niz pripada ovom periodu neaktivnosti; povratak igrača (novi lastSeenAt) ga briše.
  const states = group.devices.map((d) => d.reminders).filter((r): r is ReminderState => !!r);
  const current = states.find((r) => r.streakStartedAt === lastSeenAt);
  const lastSentAt = Math.max(0, ...states.map((r) => r.lastSentAt));
  if (current?.sentSteps.includes(due.step)) return null;
  if (now - lastSentAt < cfg.minGapMs) return null;
  if (due.needsFinishedMatch && !(play && play.matchesFinished > 0)) return null;

  const usualHour = personalHour(play, cfg);
  if (cfg.dayMs === null) {
    const { hour } = localParts(now, target.tz);
    const quiet = hour >= cfg.quietFrom || hour < cfg.quietUntil;
    if (quiet || hour < usualHour) return null;
  }

  const { reason, game } = pickReason(due.step, {
    play,
    usualHour,
    lastSeenAt,
    now,
    releasedAt: cfg.releasedAt,
  });
  return {
    target,
    step: due.step,
    reason,
    game,
    next: {
      streakStartedAt: lastSeenAt,
      sentSteps: [...(current?.sentSteps ?? []), due.step],
      lastSentAt: now,
    },
    arm: group.devices.find((d) => d.reminderArm)?.reminderArm,
  };
}

/** Udio kontrolne grupe za NOVU dodjelu, po broju već dodijeljenih. */
export function holdoutShare(
  counts: Readonly<Record<ReminderArm, number>>,
  cfg: ReminderConfig = DEFAULT_REMINDER_CONFIG,
): number {
  const { initialShare, laterShare, switchAtPerArm } = cfg.holdout;
  return counts.treatment >= switchAtPerArm && counts.holdout >= switchAtPerArm
    ? laterShare
    : initialShare;
}

export function assignArm(share: number, random: number): ReminderArm {
  return random < share ? "holdout" : "treatment";
}

// ─── poruka ─────────────────────────────────────────────────────────────────

/** Padeži su fiksni po igri (imena igara, ne nadimci). `line` = jedan red o igri za `new_game`. */
const GAME_NAME: Record<GameId, { nom: string; gen: string; loc: string; line: string }> = {
  zandar: { nom: "Žandar", gen: "Žandara", loc: "Žandaru", line: "Kupi karte sa stola, žandar nosi sve." },
  poker: { nom: "Poker", gen: "Pokera", loc: "Pokeru", line: "Texas Hold'em, žetoni bez pravog novca." },
  raub: { nom: "Raub", gen: "Rauba", loc: "Raubu", line: "Mađarice, adut i štih." },
  bela: { nom: "Bela", gen: "Bele", loc: "Beli", line: "2 na 2, sa mađaricama." },
};

export function reminderCopy(
  reason: ReminderReason,
  game: GameId,
): { title: string; body: string } {
  const { nom, gen, loc, line } = GAME_NAME[game];
  switch (reason) {
    case "new_game":
      return { title: `Nova igra: ${nom}`, body: `${line} Sto se postavlja za par sekundi.` };
    case "rematch":
      return {
        title: `Revanš u ${loc}?`,
        body: `Zadnja partija ${gen} nije išla tvojim putem. Nova kreće za par sekundi.`,
      };
    case "win_again":
      return { title: `Zadnja partija ${gen} je bila tvoja`, body: "Možeš li opet? Sto se postavlja za par sekundi." };
    case "first_match":
      return { title: `Probaj jednu partiju ${gen}`, body: "Pravila se vide u igri. Sto se postavlja za par sekundi." };
    case "usual_time":
      return { title: "U ovo vrijeme obično igraš", body: `Partija ${gen}? Sto se postavlja za par sekundi.` };
    case "default":
      return { title: `Partija ${gen}?`, body: "Sto se postavlja za par sekundi." };
    case "last_call":
      return {
        title: "Karte su tu kad poželiš",
        body: "Ovo je posljednji podsjetnik. Možeš ih ugasiti u Postavkama.",
      };
  }
}

export function buildReminderPush(
  input: { step: ReminderStep; reason: ReminderReason; game: GameId },
  cfg: ReminderConfig = DEFAULT_REMINDER_CONFIG,
): PushMessage {
  return {
    type: "reminder",
    ...reminderCopy(input.reason, input.game),
    data: { type: "reminder", step: input.step, reason: input.reason, game: input.game },
    ttlMs: cfg.ttlMs,
    // Novi podsjetnik zamjenjuje nepročitan stari.
    tag: "reminder",
    channelId: REMINDERS_CHANNEL_ID,
    priority: "NORMAL",
  };
}
