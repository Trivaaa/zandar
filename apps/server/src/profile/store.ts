import {
  applyOutcome,
  GAME_IDS,
  nicknameChangeAllowedAt,
  parseProfileAvatar,
  type GameId,
  type GameStats,
  type PlayerStats,
  type RecordedStats,
  TABLE_SIZES,
  type ProfileAvatar,
} from "@zandar/shared-types";

import { randomUUID } from "node:crypto";

import {
  createFirestore,
  docId,
  FIRESTORE_SCOPE,
  FirestoreConflictError,
  type Firestore,
  type FsFields,
  type FsWrite,
} from "../google/firestore";
import type { MatchResult } from "./outcomes";
import {
  createAccessTokenSource,
  parseServiceAccount,
  type ServiceAccount,
} from "../google/serviceAuth";

/**
 * Trajni podaci igrača (docs/Specs/SPEC_IDENTITET.md §7, Q6): profil,
 * nadimak, avatar i rezultati. Ključ je Firebase `uid` — gost (anonimni nalog)
 * i nalog dijele isti, pa partije odigrane kao gost prelaze na nalog.
 *
 * Dvije izvedbe istog ugovora: Firestore (servisni ključ postoji) i memorija
 * (testovi, lokalni dev bez ključa — kao push bez ključa, server radi dalje).
 *
 * Kolekcije:
 * - `profiles/{uid}` — `completedMatches`, `completedMatchesByGame` (mapa
 *   igra → broj, od 22.11.2026; stari profili je nemaju), `nickname`,
 *   `nicknameKey`, `nicknameChangedAt`, `avatar`, `updatedAt`
 * - `nicknames/{key}` — `uid`, `nickname`, `releasedAt?`; postojanje ovog
 *   dokumenta JE jedinstvenost nadimka (ključ = mala slova)
 * - `results/{matchId__uid}` — jedan dokument po (partija, igrač, uz `game`);
 *   njegovo postojanje brani dvostruko brojanje. Od F0 statistike nosi i
 *   ishod i polja za Ligu (`MatchResult`, SPEC_STATISTIKA §7.1)
 * - `profiles/{uid}.stats` — pobjede, porazi, napuštanja i niz po igri (F0)
 */

/** Napušten nadimak (promjena, kasnije i brisanje naloga) ostaje rezervisan (Q2). */
export const NICKNAME_RESERVATION_MS = 30 * 24 * 60 * 60 * 1000;

/** Završene partije po igri (SPEC_PROFIL_POSTAVKE D8). Igra bez partija nema ključ. */
export type MatchesByGame = Partial<Record<GameId, number>>;

export type StoredProfile = {
  /** Ukupno, sve igre — i partije prije brojača po igri. */
  completedMatches: number;
  /** Od 22.11.2026; ranije partije nisu raspoređene po igri. */
  completedMatchesByGame?: MatchesByGame;
  nickname?: string;
  nicknameKey?: string;
  /** Zadnja PROMJENA; prvi izbor nadimka je ne postavlja (brava kreće od prve promjene). */
  nicknameChangedAt?: number;
  avatar?: ProfileAvatar;
  /** SPEC_STATISTIKA F0; profil bez njega = prazna statistika. */
  stats?: PlayerStats;
  /** v0.3: vlasnik je sakrio statistiku od prijatelja i stola. Bez polja = vidljiva. */
  statsHidden?: boolean;
};

/** `own` = nadimak pripada ovom igraču (njegov ili njegov rezervisan). */
export type NicknameAvailability = "free" | "taken" | "own";

export type SetNicknameResult =
  | { ok: true }
  | { ok: false; reason: "taken" }
  | { ok: false; reason: "locked"; allowedAt: number };

export type ProfileStore = {
  /** `firestore` ili `memory` — za log na startu. */
  readonly kind: "firestore" | "memory";
  /** `null` = igrač još nema profil (ni partiju, ni nadimak, ni avatar). */
  getProfile(uid: string): Promise<StoredProfile | null>;
  /**
   * Završena partija za igrača. Idempotentno po (`matchId`, `uid`): ponovljen
   * poziv (restart, dupla dostava) vraća `false` i ne broji ponovo. Uvećava
   * ukupan brojač i brojač te igre u istom upisu.
   */
  recordCompletedMatch(matchId: string, uid: string, game: GameId, now?: number): Promise<boolean>;
  /**
   * Ishod partije (SPEC_STATISTIKA F0). Idempotentno po (`matchId`, `uid`) kao
   * `recordCompletedMatch`. Pobjeda i poraz uvećavaju i `completedMatches`;
   * napuštanje samo `stats`. Zapis u `results/` nosi cijeli `MatchResult`.
   * Vraća stanje igre prije i poslije; `null` = partija je već upisana.
   */
  recordMatchResult(
    matchId: string,
    uid: string,
    game: GameId,
    result: MatchResult,
    now?: number,
  ): Promise<RecordedStats | null>;
  nicknameAvailability(key: string, uid: string, now?: number): Promise<NicknameAvailability>;
  /**
   * Vlasnik nadimka (javni ID profila = ključ nadimka). `null` kad nadimak ne
   * postoji ili je napušten (rezervacija poslije promjene/brisanja).
   */
  uidForNickname(key: string): Promise<string | null>;
  /** `nickname`/`key` su već prošli `checkNickname` i filter riječi. */
  setNickname(uid: string, nickname: string, key: string, now?: number): Promise<SetNicknameResult>;
  setAvatar(uid: string, avatar: ProfileAvatar, now?: number): Promise<void>;
  /** SPEC_STATISTIKA v0.3: „Statistiku vide prijatelji i igrači za privatnim stolom". */
  setStatsHidden(uid: string, hidden: boolean, now?: number): Promise<void>;
  /**
   * Profil i svi rezultati igrača (napušten gost T6, nedovršen nalog Q10).
   * Nadimak NE dira — rezervacija nadimka je stvar brisanja naloga (korak 7).
   */
  deleteUserData(uid: string): Promise<void>;
  /**
   * Brisanje NALOGA (tok c): podaci kao `deleteUserData`, a nadimak ostaje
   * rezervisan 30 dana (Q2 — zaštita od lažnog predstavljanja).
   */
  deleteAccount(uid: string, now?: number): Promise<void>;
  /** §6.9: blokada `fromUid` → `toUid` (jednosmjerna zabilješka; posljedice čitaju oba smjera). */
  setBlock(fromUid: string, toUid: string, blocked: boolean, now?: number): Promise<void>;
  isBlocked(fromUid: string, toUid: string): Promise<boolean>;
  /** §6.9: prijava igrača — pregled je ručni (V1 nema admin ekran). */
  addReport(report: StoredReport): Promise<void>;

  // --- Prijatelji (§5 tok d, §6.6) — samo zapisi; pravila su u friends.ts ---
  hasRequest(fromUid: string, toUid: string): Promise<boolean>;
  setRequest(fromUid: string, toUid: string, on: boolean, now?: number): Promise<void>;
  areFriends(a: string, b: string): Promise<boolean>;
  setFriends(a: string, b: string, on: boolean, now?: number): Promise<void>;
  friendUids(uid: string): Promise<string[]>;
  /** Ko je poslao zahtjev ovom igraču (D4). */
  incomingRequestUids(uid: string): Promise<string[]>;
  /** Kome je ovaj igrač poslao zahtjev (D2 „Zahtjev poslat"). */
  outgoingRequestUids(uid: string): Promise<string[]>;
  /** D2: nadimci koji počinju sa `prefix` (ključ, mala slova), bez napuštenih. */
  searchNicknames(prefix: string, limit: number): Promise<{ key: string; uid: string }[]>;
};

/** Par prijatelja je neuređen — jedan dokument, ključ po sortiranim uid-ovima. */
function pair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export const REPORT_REASONS = ["nickname", "impersonation", "harassment", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export type StoredReport = {
  reporterUid: string;
  reportedUid: string;
  /** Nadimak u trenutku prijave — kasnija promjena ne briše dokaz. */
  nickname: string;
  reason: ReportReason;
  at: number;
};

type NicknameRecord = { uid: string; nickname: string; releasedAt?: number };

function availabilityOf(
  rec: NicknameRecord | null,
  uid: string,
  now: number,
): NicknameAvailability {
  if (!rec) return "free";
  if (rec.uid === uid) return "own";
  if (typeof rec.releasedAt === "number" && now - rec.releasedAt >= NICKNAME_RESERVATION_MS) {
    return "free";
  }
  return "taken";
}

/** Zajednička odluka obje izvedbe — šta promjena nadimka smije uraditi. */
function planNicknameChange(
  profile: StoredProfile | null,
  target: NicknameRecord | null,
  uid: string,
  key: string,
  now: number,
): { kind: "case_only" } | { kind: "change"; isFirst: boolean } | Exclude<SetNicknameResult, { ok: true }> {
  // Samo velika/mala slova („marko" → „Marko"): isti nadimak, bez brave.
  if (profile?.nicknameKey === key) return { kind: "case_only" };
  if (profile?.nickname) {
    const allowedAt = nicknameChangeAllowedAt(profile.nicknameChangedAt ?? null, now);
    if (allowedAt !== null) return { ok: false, reason: "locked", allowedAt };
  }
  if (availabilityOf(target, uid, now) === "taken") return { ok: false, reason: "taken" };
  return { kind: "change", isFirst: !profile?.nickname };
}

// ---------------------------------------------------------------------------
// Memorija
// ---------------------------------------------------------------------------

export function createMemoryProfileStore(): ProfileStore {
  const profiles = new Map<string, StoredProfile>();
  const nicknames = new Map<string, NicknameRecord>();
  /** `matchId__uid` → uid */
  const results = new Map<string, string>();
  const blocks = new Set<string>();
  const reports: StoredReport[] = [];
  /** `from|to` */
  const requests = new Set<string>();
  /** sortirani `a|b` */
  const friendships = new Set<string>();

  const profileOf = (uid: string): StoredProfile => profiles.get(uid) ?? { completedMatches: 0 };

  return {
    kind: "memory",
    async getProfile(uid) {
      const p = profiles.get(uid);
      return p ? { ...p } : null;
    },
    async recordCompletedMatch(matchId, uid, game) {
      const key = docId(matchId, uid);
      if (results.has(key)) return false;
      results.set(key, uid);
      const p = profileOf(uid);
      const byGame = { ...p.completedMatchesByGame, [game]: (p.completedMatchesByGame?.[game] ?? 0) + 1 };
      profiles.set(uid, { ...p, completedMatches: p.completedMatches + 1, completedMatchesByGame: byGame });
      return true;
    },
    async recordMatchResult(matchId, uid, game, result, now = Date.now()) {
      const key = docId(matchId, uid);
      if (results.has(key)) return null;
      results.set(key, uid);
      const p = profileOf(uid);
      const next: StoredProfile = { ...p, stats: nextStats(p.stats, game, result, now) };
      if (result.outcome !== "abandon") {
        next.completedMatches = p.completedMatches + 1;
        next.completedMatchesByGame = { ...p.completedMatchesByGame, [game]: (p.completedMatchesByGame?.[game] ?? 0) + 1 };
      }
      profiles.set(uid, next);
      return { before: p.stats?.byGame[game] ?? null, after: next.stats!.byGame[game]! };
    },
    async nicknameAvailability(key, uid, now = Date.now()) {
      return availabilityOf(nicknames.get(key) ?? null, uid, now);
    },
    async uidForNickname(key) {
      const rec = nicknames.get(key);
      return rec && rec.releasedAt === undefined ? rec.uid : null;
    },
    async setNickname(uid, nickname, key, now = Date.now()) {
      const profile = profiles.get(uid) ?? null;
      const plan = planNicknameChange(profile, nicknames.get(key) ?? null, uid, key, now);
      if ("ok" in plan) return plan;
      const p = profile ?? { completedMatches: 0 };
      nicknames.set(key, { uid, nickname });
      if (plan.kind === "change" && p.nicknameKey) {
        const old = nicknames.get(p.nicknameKey);
        if (old) nicknames.set(p.nicknameKey, { ...old, releasedAt: now });
      }
      profiles.set(uid, {
        ...p,
        nickname,
        nicknameKey: key,
        ...(plan.kind === "change" && !plan.isFirst && { nicknameChangedAt: now }),
      });
      return { ok: true };
    },
    async setAvatar(uid, avatar) {
      profiles.set(uid, { ...profileOf(uid), avatar });
    },
    async setStatsHidden(uid, hidden) {
      const { statsHidden: _old, ...rest } = profileOf(uid);
      profiles.set(uid, hidden ? { ...rest, statsHidden: true } : rest);
    },
    async deleteUserData(uid) {
      profiles.delete(uid);
      for (const [key, owner] of results) if (owner === uid) results.delete(key);
    },
    async deleteAccount(uid, now = Date.now()) {
      const key = profiles.get(uid)?.nicknameKey;
      const rec = key ? nicknames.get(key) : undefined;
      if (key && rec?.uid === uid) nicknames.set(key, { ...rec, releasedAt: now });
      // Blokade, zahtjevi i prijateljstva u oba smjera nestaju sa nalogom.
      for (const set of [blocks, requests, friendships]) {
        for (const k of set) {
          const [x, y] = k.split("|");
          if (x === uid || y === uid) set.delete(k);
        }
      }
      await this.deleteUserData(uid);
    },
    // `|` ne postoji u Firebase uid-u — ključ se ne može dvosmisleno raspasti.
    async setBlock(fromUid, toUid, blocked) {
      if (blocked) blocks.add(`${fromUid}|${toUid}`);
      else blocks.delete(`${fromUid}|${toUid}`);
    },
    async isBlocked(fromUid, toUid) {
      return blocks.has(`${fromUid}|${toUid}`);
    },
    async addReport(report) {
      reports.push({ ...report });
    },
    async hasRequest(fromUid, toUid) {
      return requests.has(`${fromUid}|${toUid}`);
    },
    async setRequest(fromUid, toUid, on) {
      if (on) requests.add(`${fromUid}|${toUid}`);
      else requests.delete(`${fromUid}|${toUid}`);
    },
    async areFriends(a, b) {
      return friendships.has(pair(a, b).join("|"));
    },
    async setFriends(a, b, on) {
      if (on) friendships.add(pair(a, b).join("|"));
      else friendships.delete(pair(a, b).join("|"));
    },
    async friendUids(uid) {
      return [...friendships].flatMap((k) => {
        const [x, y] = k.split("|");
        return x === uid ? [y!] : y === uid ? [x!] : [];
      });
    },
    async incomingRequestUids(uid) {
      return [...requests].flatMap((k) => {
        const [from, to] = k.split("|");
        return to === uid ? [from!] : [];
      });
    },
    async outgoingRequestUids(uid) {
      return [...requests].flatMap((k) => {
        const [from, to] = k.split("|");
        return from === uid ? [to!] : [];
      });
    },
    async searchNicknames(prefix, limit) {
      return [...nicknames.entries()]
        .filter(([key, rec]) => key.startsWith(prefix) && rec.releasedAt === undefined)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .slice(0, limit)
        .map(([key, rec]) => ({ key, uid: rec.uid }));
    },
  };
}

// ---------------------------------------------------------------------------
// Firestore
// ---------------------------------------------------------------------------

function decodeProfile(f: FsFields): StoredProfile {
  const n = f.completedMatches;
  const profile: StoredProfile = { completedMatches: typeof n === "number" && n > 0 ? n : 0 };
  const byGame = decodeMatchesByGame(f.completedMatchesByGame);
  if (byGame) profile.completedMatchesByGame = byGame;
  if (typeof f.nickname === "string") profile.nickname = f.nickname;
  if (typeof f.nicknameKey === "string") profile.nicknameKey = f.nicknameKey;
  if (typeof f.nicknameChangedAt === "number") profile.nicknameChangedAt = f.nicknameChangedAt;
  const avatar = parseProfileAvatar(f.avatar);
  if (avatar) profile.avatar = avatar;
  const stats = decodeStats(f.stats);
  if (stats) profile.stats = stats;
  if (f.statsHidden === true) profile.statsHidden = true;
  return profile;
}

const STAT_KEYS = ["won", "lost", "abandoned", "streak", "bestStreak", "lastAt"] as const;

/** Samo poznate igre i brojevi; sve drugo se tiho preskače (kao `decodeMatchesByGame`). */
export function decodeStats(raw: unknown): PlayerStats | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const byGameRaw = typeof r.byGame === "object" && r.byGame !== null ? (r.byGame as Record<string, unknown>) : {};
  const byGame: PlayerStats["byGame"] = {};
  for (const game of GAME_IDS) {
    const g = byGameRaw[game];
    if (typeof g !== "object" || g === null) continue;
    const out = {} as GameStats;
    for (const k of STAT_KEYS) {
      const n = (g as Record<string, unknown>)[k];
      out[k] = typeof n === "number" && n > 0 ? n : 0;
    }
    const t = (g as Record<string, unknown>).tables;
    if (typeof t === "object" && t !== null) {
      const tables: GameStats["tables"] = {};
      for (const size of TABLE_SIZES) {
        const n = (t as Record<string, unknown>)[size];
        if (typeof n === "number" && n > 0) tables[size] = n;
      }
      if (Object.keys(tables).length > 0) out.tables = tables;
    }
    byGame[game] = out;
  }
  return { v: 1, since: typeof r.since === "number" ? r.since : null, byGame };
}

/** Statistika poslije jednog ishoda — ista za memoriju i Firestore. */
function nextStats(prev: PlayerStats | undefined, game: GameId, result: MatchResult, now: number): PlayerStats {
  return {
    v: 1,
    since: prev?.since ?? now,
    byGame: { ...prev?.byGame, [game]: applyOutcome(prev?.byGame[game], result.outcome, now, result.players) },
  };
}

/** Pokušaji upisa ishoda kad se profil mijenja između čitanja i upisa. */
const RESULT_ATTEMPTS = 3;

/** Svaka igra sa brojem (0 kad nema partija) — oblik koji vraća `/api/me`. */
export function matchesByGameFull(byGame: MatchesByGame | undefined): Record<GameId, number> {
  return Object.fromEntries(GAME_IDS.map((g) => [g, byGame?.[g] ?? 0])) as Record<GameId, number>;
}

/** Samo poznate igre sa pozitivnim brojem; sve drugo se tiho preskače. */
function decodeMatchesByGame(raw: unknown): MatchesByGame | null {
  if (typeof raw !== "object" || raw === null) return null;
  const out: MatchesByGame = {};
  for (const game of GAME_IDS) {
    const n = (raw as Record<string, unknown>)[game];
    if (typeof n === "number" && n > 0) out[game] = n;
  }
  return Object.keys(out).length > 0 ? out : null;
}

function decodeNickname(f: FsFields): NicknameRecord {
  return {
    uid: String(f.uid ?? ""),
    nickname: String(f.nickname ?? ""),
    ...(typeof f.releasedAt === "number" && { releasedAt: f.releasedAt }),
  };
}

export function createFirestoreProfileStore(db: Firestore): ProfileStore {
  const profilePath = (uid: string) => `profiles/${docId(uid)}`;
  const nicknamePath = (key: string) => `nicknames/${docId(key)}`;

  async function trySetNickname(
    uid: string,
    nickname: string,
    key: string,
    now: number,
  ): Promise<SetNicknameResult> {
    const [profileDoc, targetDoc] = await Promise.all([
      db.getDoc(profilePath(uid)),
      db.getDoc(nicknamePath(key)),
    ]);
    const profile = profileDoc ? decodeProfile(profileDoc.fields) : null;
    const target = targetDoc ? decodeNickname(targetDoc.fields) : null;
    const plan = planNicknameChange(profile, target, uid, key, now);
    if ("ok" in plan) return plan;

    const writes: FsWrite[] = [
      // Bez maske: zamjena briše eventualni `releasedAt` rezervacije.
      {
        kind: "set",
        path: nicknamePath(key),
        // `key` služi pretrazi po prefiksu (D2) — upit ide po polju, ne po id-u.
        fields: { uid, nickname, key },
        ...(targetDoc ? { updateTime: targetDoc.updateTime } : { exists: false }),
      },
    ];
    if (plan.kind === "change" && profile?.nicknameKey) {
      writes.push({
        kind: "set",
        path: nicknamePath(profile.nicknameKey),
        fields: { releasedAt: now },
        mask: ["releasedAt"],
        exists: true,
      });
    }
    const changedAt = plan.kind === "change" && !plan.isFirst;
    writes.push({
      kind: "set",
      path: profilePath(uid),
      fields: { nickname, nicknameKey: key, updatedAt: now, ...(changedAt && { nicknameChangedAt: now }) },
      mask: ["nickname", "nicknameKey", "updatedAt", ...(changedAt ? ["nicknameChangedAt"] : [])],
      // Dvije istovremene promjene istog igrača: druga pada i ponavlja se.
      ...(profileDoc ? { updateTime: profileDoc.updateTime } : { exists: false }),
    });
    await db.commit(writes);
    return { ok: true };
  }

  return {
    kind: "firestore",
    async getProfile(uid) {
      const doc = await db.get(profilePath(uid));
      return doc ? decodeProfile(doc) : null;
    },
    async recordCompletedMatch(matchId, uid, game, now = Date.now()) {
      try {
        // Jedan commit: rezultat smije nastati samo jednom, a brojač raste
        // u istom potezu — ili oboje ili ništa.
        await db.commit([
          {
            kind: "set",
            path: `results/${docId(matchId, uid)}`,
            fields: { uid, matchId, game, at: now },
            exists: false,
          },
          {
            kind: "set",
            path: profilePath(uid),
            fields: { updatedAt: now },
            mask: ["updatedAt"],
            increment: { completedMatches: 1, [`completedMatchesByGame.${game}`]: 1 },
          },
        ]);
        return true;
      } catch (err) {
        if (err instanceof FirestoreConflictError) return false;
        throw err;
      }
    },
    async recordMatchResult(matchId, uid, game, result, now = Date.now()) {
      const resultPath = `results/${docId(matchId, uid)}`;
      // Niz pobjeda traži čitanje prije upisa, pa profil ide sa `updateTime`
      // preduslovom. Konflikt: ili je zapis već tu (dupla dostava → false), ili
      // je neko u međuvremenu mijenjao profil (novi pokušaj sa svježim stanjem).
      for (let attempt = 0; attempt < RESULT_ATTEMPTS; attempt++) {
        const doc = await db.getDoc(profilePath(uid));
        const prev = doc ? decodeStats(doc.fields.stats) ?? undefined : undefined;
        const stats = nextStats(prev, game, result, now);
        const counted = result.outcome !== "abandon";
        try {
          await db.commit([
            {
              kind: "set",
              path: resultPath,
              fields: { uid, matchId, game, at: now, ...(result as unknown as FsFields) },
              exists: false,
            },
            {
              kind: "set",
              path: profilePath(uid),
              fields: { updatedAt: now, stats: stats as unknown as FsFields },
              mask: ["updatedAt", "stats"],
              ...(counted && { increment: { completedMatches: 1, [`completedMatchesByGame.${game}`]: 1 } }),
              ...(doc ? { updateTime: doc.updateTime } : { exists: false }),
            },
          ]);
          return { before: prev?.byGame[game] ?? null, after: stats.byGame[game]! };
        } catch (err) {
          if (!(err instanceof FirestoreConflictError)) throw err;
          if (await db.get(resultPath)) return null;
        }
      }
      throw new Error(`profil ${uid} se mijenjao ${RESULT_ATTEMPTS} puta zaredom`);
    },
    async nicknameAvailability(key, uid, now = Date.now()) {
      const doc = await db.get(nicknamePath(key));
      return availabilityOf(doc ? decodeNickname(doc) : null, uid, now);
    },
    async uidForNickname(key) {
      const doc = await db.get(nicknamePath(key));
      if (!doc) return null;
      const rec = decodeNickname(doc);
      return rec.releasedAt === undefined && rec.uid ? rec.uid : null;
    },
    async setNickname(uid, nickname, key, now = Date.now()) {
      // Konflikt = neko je između čitanja i upisa promijenio nadimak ili
      // profil. Jedan novi pokušaj sa svježim stanjem; drugi konflikt = zauzet.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          return await trySetNickname(uid, nickname, key, now);
        } catch (err) {
          if (!(err instanceof FirestoreConflictError)) throw err;
        }
      }
      return { ok: false, reason: "taken" };
    },
    async setAvatar(uid, avatar, now = Date.now()) {
      await db.commit([
        {
          kind: "set",
          path: profilePath(uid),
          fields: { avatar, updatedAt: now },
          mask: ["avatar", "updatedAt"],
        },
      ]);
    },
    async setStatsHidden(uid, hidden, now = Date.now()) {
      await db.commit([
        {
          kind: "set",
          path: profilePath(uid),
          fields: { statsHidden: hidden, updatedAt: now },
          mask: ["statsHidden", "updatedAt"],
        },
      ]);
    },
    async deleteUserData(uid) {
      // Rezultati u stranicama (commit nosi najviše 500 upisa), pa profil.
      for (;;) {
        const paths = await db.findPaths("results", "uid", uid, 400);
        if (paths.length === 0) break;
        await db.commit(paths.map((path) => ({ kind: "delete" as const, path })));
      }
      await db.commit([{ kind: "delete", path: profilePath(uid) }]);
    },
    async deleteAccount(uid, now = Date.now()) {
      const profile = await this.getProfile(uid);
      if (profile?.nicknameKey) {
        const doc = await db.get(nicknamePath(profile.nicknameKey));
        // Samo ako je nadimak još njegov — tuđi (preuzet poslije rezervacije) se ne dira.
        if (doc && decodeNickname(doc).uid === uid) {
          await db.commit([
            { kind: "set", path: nicknamePath(profile.nicknameKey), fields: { releasedAt: now }, mask: ["releasedAt"], exists: true },
          ]);
        }
      }
      // Blokade, zahtjevi i prijateljstva u oba smjera nestaju sa nalogom.
      const owned: [string, string][] = [
        ["blocks", "from"],
        ["blocks", "to"],
        ["friendRequests", "from"],
        ["friendRequests", "to"],
        ["friendships", "a"],
        ["friendships", "b"],
      ];
      for (const [collection, field] of owned) {
        for (;;) {
          const paths = await db.findPaths(collection, field, uid, 400);
          if (paths.length === 0) break;
          await db.commit(paths.map((path) => ({ kind: "delete" as const, path })));
        }
      }
      await this.deleteUserData(uid);
    },
    async setBlock(fromUid, toUid, blocked, now = Date.now()) {
      const path = `blocks/${docId(fromUid, toUid)}`;
      await db.commit([
        blocked
          ? { kind: "set", path, fields: { from: fromUid, to: toUid, at: now } }
          : { kind: "delete", path },
      ]);
    },
    async isBlocked(fromUid, toUid) {
      return (await db.get(`blocks/${docId(fromUid, toUid)}`)) !== null;
    },
    async addReport(report) {
      await db.commit([
        { kind: "set", path: `reports/${randomUUID()}`, fields: { ...report }, exists: false },
      ]);
    },
    async hasRequest(fromUid, toUid) {
      return (await db.get(`friendRequests/${docId(fromUid, toUid)}`)) !== null;
    },
    async setRequest(fromUid, toUid, on, now = Date.now()) {
      const path = `friendRequests/${docId(fromUid, toUid)}`;
      await db.commit([
        on ? { kind: "set", path, fields: { from: fromUid, to: toUid, at: now } } : { kind: "delete", path },
      ]);
    },
    async areFriends(a, b) {
      return (await db.get(`friendships/${docId(...pair(a, b))}`)) !== null;
    },
    async setFriends(a, b, on, now = Date.now()) {
      const [x, y] = pair(a, b);
      const path = `friendships/${docId(x, y)}`;
      await db.commit([on ? { kind: "set", path, fields: { a: x, b: y, at: now } } : { kind: "delete", path }]);
    },
    async friendUids(uid) {
      const [asA, asB] = await Promise.all([
        db.findDocs("friendships", "a", uid),
        db.findDocs("friendships", "b", uid),
      ]);
      return [...asA.map((d) => String(d.fields.b)), ...asB.map((d) => String(d.fields.a))];
    },
    async incomingRequestUids(uid) {
      return (await db.findDocs("friendRequests", "to", uid)).map((d) => String(d.fields.from));
    },
    async outgoingRequestUids(uid) {
      return (await db.findDocs("friendRequests", "from", uid)).map((d) => String(d.fields.to));
    },
    async searchNicknames(prefix, limit) {
      // Napuštene (rezervisane) se filtriraju poslije upita — uzmi rezervu.
      const docs = await db.findPrefix("nicknames", "key", prefix, limit * 2);
      return docs
        .filter((d) => d.fields.releasedAt === undefined && typeof d.fields.uid === "string")
        .slice(0, limit)
        .map((d) => ({ key: String(d.fields.key), uid: String(d.fields.uid) }));
    },
  };
}

/** Firestore kad postoji servisni ključ, inače memorija. */
export function createProfileStore(account: ServiceAccount | null): ProfileStore {
  if (!account) return createMemoryProfileStore();
  const tokens = createAccessTokenSource(account, [FIRESTORE_SCOPE]);
  return createFirestoreProfileStore(createFirestore(account.project_id, tokens));
}

export const profileStore: ProfileStore = createProfileStore(
  parseServiceAccount(process.env.FCM_SERVICE_ACCOUNT_JSON),
);
