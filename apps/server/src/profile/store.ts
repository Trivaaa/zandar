import {
  nicknameChangeAllowedAt,
  parseProfileAvatar,
  type ProfileAvatar,
} from "@zandar/shared-types";

import {
  createFirestore,
  docId,
  FIRESTORE_SCOPE,
  FirestoreConflictError,
  type Firestore,
  type FsFields,
  type FsWrite,
} from "../google/firestore";
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
 * - `profiles/{uid}` — `completedMatches`, `nickname`, `nicknameKey`,
 *   `nicknameChangedAt`, `avatar`, `updatedAt`
 * - `nicknames/{key}` — `uid`, `nickname`, `releasedAt?`; postojanje ovog
 *   dokumenta JE jedinstvenost nadimka (ključ = mala slova)
 * - `results/{matchId__uid}` — jedan dokument po (partija, igrač); njegovo
 *   postojanje brani dvostruko brojanje
 */

/** Napušten nadimak (promjena, kasnije i brisanje naloga) ostaje rezervisan (Q2). */
export const NICKNAME_RESERVATION_MS = 30 * 24 * 60 * 60 * 1000;

export type StoredProfile = {
  completedMatches: number;
  nickname?: string;
  nicknameKey?: string;
  /** Zadnja PROMJENA; prvi izbor nadimka je ne postavlja (brava kreće od prve promjene). */
  nicknameChangedAt?: number;
  avatar?: ProfileAvatar;
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
   * poziv (restart, dupla dostava) vraća `false` i ne broji ponovo.
   */
  recordCompletedMatch(matchId: string, uid: string, now?: number): Promise<boolean>;
  nicknameAvailability(key: string, uid: string, now?: number): Promise<NicknameAvailability>;
  /** `nickname`/`key` su već prošli `checkNickname` i filter riječi. */
  setNickname(uid: string, nickname: string, key: string, now?: number): Promise<SetNicknameResult>;
  setAvatar(uid: string, avatar: ProfileAvatar, now?: number): Promise<void>;
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

  const profileOf = (uid: string): StoredProfile => profiles.get(uid) ?? { completedMatches: 0 };

  return {
    kind: "memory",
    async getProfile(uid) {
      const p = profiles.get(uid);
      return p ? { ...p } : null;
    },
    async recordCompletedMatch(matchId, uid) {
      const key = docId(matchId, uid);
      if (results.has(key)) return false;
      results.set(key, uid);
      const p = profileOf(uid);
      profiles.set(uid, { ...p, completedMatches: p.completedMatches + 1 });
      return true;
    },
    async nicknameAvailability(key, uid, now = Date.now()) {
      return availabilityOf(nicknames.get(key) ?? null, uid, now);
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
    async deleteUserData(uid) {
      profiles.delete(uid);
      for (const [key, owner] of results) if (owner === uid) results.delete(key);
    },
    async deleteAccount(uid, now = Date.now()) {
      const key = profiles.get(uid)?.nicknameKey;
      const rec = key ? nicknames.get(key) : undefined;
      if (key && rec?.uid === uid) nicknames.set(key, { ...rec, releasedAt: now });
      await this.deleteUserData(uid);
    },
  };
}

// ---------------------------------------------------------------------------
// Firestore
// ---------------------------------------------------------------------------

function decodeProfile(f: FsFields): StoredProfile {
  const n = f.completedMatches;
  const profile: StoredProfile = { completedMatches: typeof n === "number" && n > 0 ? n : 0 };
  if (typeof f.nickname === "string") profile.nickname = f.nickname;
  if (typeof f.nicknameKey === "string") profile.nicknameKey = f.nicknameKey;
  if (typeof f.nicknameChangedAt === "number") profile.nicknameChangedAt = f.nicknameChangedAt;
  const avatar = parseProfileAvatar(f.avatar);
  if (avatar) profile.avatar = avatar;
  return profile;
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
        fields: { uid, nickname },
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
    async recordCompletedMatch(matchId, uid, now = Date.now()) {
      try {
        // Jedan commit: rezultat smije nastati samo jednom, a brojač raste
        // u istom potezu — ili oboje ili ništa.
        await db.commit([
          {
            kind: "set",
            path: `results/${docId(matchId, uid)}`,
            fields: { uid, matchId, at: now },
            exists: false,
          },
          {
            kind: "set",
            path: profilePath(uid),
            fields: { updatedAt: now },
            mask: ["updatedAt"],
            increment: { completedMatches: 1 },
          },
        ]);
        return true;
      } catch (err) {
        if (err instanceof FirestoreConflictError) return false;
        throw err;
      }
    },
    async nicknameAvailability(key, uid, now = Date.now()) {
      const doc = await db.get(nicknamePath(key));
      return availabilityOf(doc ? decodeNickname(doc) : null, uid, now);
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
      await this.deleteUserData(uid);
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
