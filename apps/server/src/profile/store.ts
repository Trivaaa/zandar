import {
  createFirestore,
  docId,
  FIRESTORE_SCOPE,
  FirestoreConflictError,
  type Firestore,
} from "../google/firestore";
import {
  createAccessTokenSource,
  parseServiceAccount,
  type ServiceAccount,
} from "../google/serviceAuth";

/**
 * Trajni podaci igrača (docs/Specs/SPEC_IDENTITET.md §7, Q6): profil i
 * rezultati. Ključ je Firebase `uid` — gost (anonimni nalog) i nalog dijele
 * isti, pa partije odigrane kao gost prelaze na nalog bez prenosa.
 *
 * Dvije izvedbe istog ugovora: Firestore (servisni ključ postoji) i memorija
 * (testovi, lokalni dev bez ključa — kao push bez ključa, server radi dalje).
 *
 * Kolekcije:
 * - `profiles/{uid}` — `completedMatches`, `updatedAt`
 * - `results/{matchId__uid}` — jedan dokument po (partija, igrač); njegovo
 *   postojanje je ono što brani dvostruko brojanje.
 */

export type StoredProfile = {
  completedMatches: number;
};

export type ProfileStore = {
  /** `firestore` ili `memory` — za log na startu. */
  readonly kind: "firestore" | "memory";
  /** `null` = igrač još nema nijednu završenu partiju ni profil. */
  getProfile(uid: string): Promise<StoredProfile | null>;
  /**
   * Završena partija za igrača. Idempotentno po (`matchId`, `uid`): ponovljen
   * poziv (restart, dupla dostava) vraća `false` i ne broji ponovo.
   */
  recordCompletedMatch(matchId: string, uid: string, now?: number): Promise<boolean>;
};

export function createMemoryProfileStore(): ProfileStore {
  const profiles = new Map<string, StoredProfile>();
  const results = new Set<string>();

  return {
    kind: "memory",
    async getProfile(uid) {
      const p = profiles.get(uid);
      return p ? { ...p } : null;
    },
    async recordCompletedMatch(matchId, uid) {
      const key = docId(matchId, uid);
      if (results.has(key)) return false;
      results.add(key);
      const p = profiles.get(uid) ?? { completedMatches: 0 };
      profiles.set(uid, { ...p, completedMatches: p.completedMatches + 1 });
      return true;
    },
  };
}

export function createFirestoreProfileStore(db: Firestore): ProfileStore {
  return {
    kind: "firestore",
    async getProfile(uid) {
      const doc = await db.get(`profiles/${docId(uid)}`);
      if (!doc) return null;
      const n = doc.completedMatches;
      return { completedMatches: typeof n === "number" && n > 0 ? n : 0 };
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
            path: `profiles/${docId(uid)}`,
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
