import type {
  AnalyticsEvents,
  AnalyticsPlatform,
  MatchEndReason,
  MatchMode,
} from "@zandar/shared-types";

/**
 * Čiste odluke za analitiku mečeva (docs/analytics.md). Bez PostHog-a, bez
 * socket-a — stanje unutra, lista događaja napolje; `index.ts` ih samo šalje.
 *
 * Ljudi se broje iz `players`, NIKAD iz živih socketa: čovjek koji je pao s
 * veze prije kraja je i dalje igrao taj meč. Brojanje po socketima ga je tiho
 * izbacivalo iz stope završetka i win-rate-a.
 */

type PlayerLike = {
  id: string;
  teamId?: number | undefined;
  isBot?: boolean | undefined;
  guestId?: string | undefined;
  platform?: AnalyticsPlatform | undefined;
};

type MatchLike = {
  matchId: string;
  players: readonly PlayerLike[];
  matchScore: Record<string, number>;
  handScores: readonly unknown[];
  targetScore: number;
};

export type Capture<E extends keyof AnalyticsEvents> = {
  distinctId: string;
  event: E;
  properties: AnalyticsEvents[E];
};

/** guestId iz tijela zahtjeva — string razumne dužine, inače ništa. */
export function parseGuestId(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 && value.length <= 64
    ? value
    : undefined;
}

/** `native` je zatečena vrijednost klijenta (prijave) — to je APK, dakle Android. */
export function parsePlatform(value: unknown): AnalyticsPlatform | undefined {
  if (value === "android" || value === "native") return "android";
  if (value === "web") return "web";
  return undefined;
}

/** Sastav stola: ljudi vs botovi. Ide samo u PostHog, nikad klijentu (HARD RULE 3). */
export function tableComposition(players: readonly { isBot?: boolean | undefined }[]): {
  humansAtTable: number;
  botsAtTable: number;
  botSeatShare: number;
} {
  const total = players.length;
  const botsAtTable = players.filter((p) => p.isBot).length;
  return {
    humansAtTable: total - botsAtTable,
    botsAtTable,
    botSeatShare: total > 0 ? botsAtTable / total : 0,
  };
}

/** Da li je pile (igrač u 2P/3P, tim u 4P) datog igrača pobjednik meča. */
export function isMatchWinner(
  gs: Pick<MatchLike, "players" | "matchScore">,
  playerId: string,
): boolean {
  const me = gs.players.find((p) => p.id === playerId);
  const myPile = me?.teamId != null ? `team-${me.teamId}` : playerId;
  const entries = Object.entries(gs.matchScore);
  if (entries.length === 0) return false;
  const top = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  return top[0] === myPile;
}

/** Revanš dobija novi matchId sa ovim sufiksom (`game:rematch`). */
export function isRematch(matchId: string): boolean {
  return matchId.includes("-rematch-");
}

/** Ljudi za koje znamo distinctId — jedini koji smiju u analitiku. */
export function trackedHumans<P extends PlayerLike>(
  players: readonly P[],
): (P & { guestId: string })[] {
  return players.filter(
    (p): p is P & { guestId: string } => !p.isBot && typeof p.guestId === "string" && p.guestId.length > 0,
  );
}

type JoinRequestLike = {
  createdAt: number;
  guestId?: string | undefined;
  platform?: AnalyticsPlatform | undefined;
};

/** Primljen zahtjev za ulazak. Stari klijent bez guestId-a nema kome da se pripiše. */
export function joinRequestedEvent(
  roomId: string,
  req: JoinRequestLike,
): Capture<"join_requested"> | null {
  if (!req.guestId) return null;
  return {
    distinctId: req.guestId,
    event: "join_requested",
    properties: { room_id: roomId, ...(req.platform ? { platform: req.platform } : {}) },
  };
}

/** Odobren ulazak; ide GOSTU, da lijevak ostane na jednoj osobi. */
export function joinApprovedEvent(
  roomId: string,
  req: JoinRequestLike,
  now: number,
): Capture<"join_approved"> | null {
  if (!req.guestId) return null;
  return {
    distinctId: req.guestId,
    event: "join_approved",
    properties: {
      room_id: roomId,
      wait_ms: Math.max(0, now - req.createdAt),
      ...(req.platform ? { platform: req.platform } : {}),
    },
  };
}

/** Jedan `match_started` po čovjeku. */
export function matchStartedEvents(
  gs: MatchLike,
  mode: MatchMode,
): Capture<"match_started">[] {
  const { humansAtTable, botsAtTable } = tableComposition(gs.players);
  return trackedHumans(gs.players).map((p) => ({
    distinctId: p.guestId,
    event: "match_started" as const,
    properties: {
      mode,
      match_id: gs.matchId,
      game: "zandar" as const,
      player_count: gs.players.length,
      human_count: humansAtTable,
      bot_count: botsAtTable,
      target_score: gs.targetScore,
      is_rematch: isRematch(gs.matchId),
      ...(p.platform ? { platform: p.platform } : {}),
    },
  }));
}

/**
 * Jedan `match_ended` po čovjeku. `is_winner` samo za odigran meč — kod prekida
 * pobjednik ne postoji. `duration_ms` samo kad je start viđen u ovom procesu
 * (restart briše sat); bolje bez broja nego sa lažnim.
 */
export function matchEndedEvents(
  gs: MatchLike,
  opts: {
    mode: MatchMode;
    reason: MatchEndReason;
    startedAt?: number | undefined;
    now: number;
  },
): Capture<"match_ended">[] {
  const { mode, reason, startedAt, now } = opts;
  return trackedHumans(gs.players).map((p) => ({
    distinctId: p.guestId,
    event: "match_ended" as const,
    properties: {
      mode,
      match_id: gs.matchId,
      game: "zandar" as const,
      end_reason: reason,
      hands_played: gs.handScores.length,
      ...(startedAt !== undefined ? { duration_ms: Math.max(0, now - startedAt) } : {}),
      ...(reason === "completed" ? { is_winner: isMatchWinner(gs, p.id) } : {}),
      ...(p.platform ? { platform: p.platform } : {}),
    },
  }));
}

// ── Poker ────────────────────────────────────────────────────────────────────

type PokerMatchLike = {
  matchId: string;
  handNo: number;
  startStack: number;
  seats: readonly { playerId: string; place: number | null }[];
};

/** `match_started` za poker — isti događaj, `game: "poker"`, bez cilja. */
export function pokerMatchStartedEvents(
  state: PokerMatchLike,
  players: readonly PlayerLike[],
  mode: MatchMode,
): Capture<"match_started">[] {
  const atTable = players.filter((p) => state.seats.some((s) => s.playerId === p.id));
  const { humansAtTable, botsAtTable } = tableComposition(atTable);
  return trackedHumans(atTable).map((p) => ({
    distinctId: p.guestId,
    event: "match_started" as const,
    properties: {
      mode,
      match_id: state.matchId,
      game: "poker" as const,
      player_count: atTable.length,
      human_count: humansAtTable,
      bot_count: botsAtTable,
      is_rematch: isRematch(state.matchId),
      ...(p.platform ? { platform: p.platform } : {}),
    },
  }));
}

/**
 * `match_ended` za poker. Pobjednik = 1. mjesto; `placement` se šalje kad je
 * poznat (i igraču koji je napustio meč — on ima najlošiji preostali plasman).
 */
export function pokerMatchEndedEvents(
  state: PokerMatchLike,
  players: readonly PlayerLike[],
  opts: { mode: MatchMode; reason: MatchEndReason; startedAt?: number | undefined; now: number },
): Capture<"match_ended">[] {
  const { mode, reason, startedAt, now } = opts;
  const atTable = players.filter((p) => state.seats.some((s) => s.playerId === p.id));
  return trackedHumans(atTable).map((p) => {
    const place = state.seats.find((s) => s.playerId === p.id)?.place ?? null;
    return {
      distinctId: p.guestId,
      event: "match_ended" as const,
      properties: {
        mode,
        match_id: state.matchId,
        game: "poker" as const,
        end_reason: reason,
        hands_played: state.handNo,
        ...(startedAt !== undefined ? { duration_ms: Math.max(0, now - startedAt) } : {}),
        ...(reason === "completed" ? { is_winner: place === 1 } : {}),
        ...(place !== null ? { placement: place } : {}),
        ...(p.platform ? { platform: p.platform } : {}),
      },
    };
  });
}
