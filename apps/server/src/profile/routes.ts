import type { FastifyInstance } from "fastify";

import { nicknameChangeAllowedAt, parseProfileAvatar } from "@zandar/shared-types";

import type { AuthUser } from "../auth/idToken";
import type { IdentityAdmin } from "../google/identityToolkit";
import { abandonGuest, deleteAccount } from "./cleanup";
import { SlidingWindowLimiter } from "../rateLimit";
import { evaluateNickname } from "./nickname";
import type { ProfileStore } from "./store";

/**
 * Rute profila (SPEC_IDENTITET §6.2, §6.4, §7). Sve traže Firebase token;
 * izmjene traže NALOG — anonimni gost dobija 403 `account_required`.
 */

type RequireUser = (
  request: { headers: { authorization?: string | undefined } },
  reply: { code: (status: number) => { send: (body: unknown) => unknown } },
) => Promise<AuthUser | null>;

/** C3/C6: brisanje traži prijavu iz zadnjih 5 minuta (kao Firebase za osjetljive radnje). */
export const RECENT_LOGIN_MS = 5 * 60 * 1000;

/** Provjera dok igrač kuca (0,5 s debounce) — 60 u minuti je daleko iznad ruke. */
const NICKNAME_LIMIT_PER_MINUTE = 60;

export function registerProfileRoutes(
  app: FastifyInstance,
  deps: {
    store: ProfileStore;
    requireUser: RequireUser;
    /** Firebase Auth admin; `null` = brišu se samo podaci, ne i Firebase nalog. */
    identity?: IdentityAdmin | null;
    /** Brisanje naloga: odveži sve push uređaje tog naloga (T3). */
    unbindDevices?: (uid: string) => void;
    now?: () => number;
  },
): void {
  const { store, requireUser } = deps;
  const now = deps.now ?? Date.now;
  const nicknameLimiter = new SlidingWindowLimiter(NICKNAME_LIMIT_PER_MINUTE, 60_000);
  setInterval(() => nicknameLimiter.sweep(), 5 * 60_000).unref();

  async function me(user: AuthUser) {
    const profile = await store.getProfile(user.uid);
    return {
      uid: user.uid,
      anonymous: user.anonymous,
      completedMatches: profile?.completedMatches ?? 0,
      nickname: profile?.nickname ?? null,
      avatar: profile?.avatar ?? null,
      /** Kad je nadimak zaključan (P2); `null` = smije se mijenjati. */
      nicknameChangeAllowedAt: profile?.nickname
        ? nicknameChangeAllowedAt(profile.nicknameChangedAt ?? null, now())
        : null,
    };
  }

  type Reply = { code: (status: number) => { send: (body: unknown) => unknown } };

  function storeUnavailable(reply: Reply, err: unknown, where: string) {
    app.log.error(`[profile] ${where}: ${String(err).slice(0, 300)}`);
    return reply.code(503).send({ error: "Profil trenutno nije dostupan", code: "store_unavailable" });
  }

  function accountRequired(user: AuthUser, reply: Reply): boolean {
    if (!user.anonymous) return false;
    reply.code(403).send({ error: "Potreban je nalog", code: "account_required" });
    return true;
  }

  function rateLimited(user: AuthUser, reply: Reply): boolean {
    if (nicknameLimiter.tryHit(user.uid)) return false;
    reply.code(429).send({ error: "Previše pokušaja", code: "rate_limited" });
    return true;
  }

  app.get("/api/me", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    try {
      return await me(user);
    } catch (err) {
      return storeUnavailable(reply, err, "/api/me");
    }
  });

  app.get<{ Querystring: { n?: string } }>("/api/nicknames/check", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    if (rateLimited(user, reply)) return reply;
    try {
      const verdict = await evaluateNickname(request.query.n ?? "", user.uid, store, { now: now() });
      // Ključ je interni detalj skladišta.
      if (verdict.status === "free" || verdict.status === "own") {
        return { status: verdict.status, nickname: verdict.nickname };
      }
      return verdict;
    } catch (err) {
      return storeUnavailable(reply, err, "/api/nicknames/check");
    }
  });

  app.put<{ Body: { nickname?: unknown } }>("/api/me/nickname", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    if (accountRequired(user, reply)) return reply;
    if (rateLimited(user, reply)) return reply;
    try {
      const t = now();
      const verdict = await evaluateNickname(request.body?.nickname, user.uid, store, { now: t });
      if (verdict.status === "invalid") return reply.code(400).send({ code: "invalid", ...verdict });
      if (verdict.status === "blocked") return reply.code(400).send({ code: "blocked" });
      if (verdict.status === "taken") {
        return reply.code(409).send({ code: "taken", suggestions: verdict.suggestions });
      }
      const result = await store.setNickname(user.uid, verdict.nickname, verdict.key, t);
      if (!result.ok && result.reason === "locked") {
        return reply.code(423).send({ code: "locked", allowedAt: result.allowedAt });
      }
      if (!result.ok) return reply.code(409).send({ code: "taken", suggestions: [] });
      return await me(user);
    } catch (err) {
      return storeUnavailable(reply, err, "PUT /api/me/nickname");
    }
  });

  /**
   * T6: gost se prijavio na postojeći nalog. Klijent PRIJE prijave zapamti
   * token gosta i poslije uspjeha ga šalje ovdje — tako se gost briše samo
   * kad je prijava stvarno uspjela, a ne kad je lozinka bila pogrešna.
   */
  app.post("/api/me/abandon", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    if (!user.anonymous) {
      return reply.code(403).send({ error: "Samo gost", code: "guest_only" });
    }
    try {
      await abandonGuest(user.uid, { store, identity: deps.identity ?? null });
      return reply.code(204).send();
    } catch (err) {
      return storeUnavailable(reply, err, "POST /api/me/abandon");
    }
  });

  /**
   * Tok c — brisanje naloga. Tek poslije ponovne prijave (C3/C6): token mora
   * nositi prijavu iz zadnjih 5 minuta, inače 401 `recent_login_required`.
   */
  app.delete("/api/me", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    if (accountRequired(user, reply)) return reply;
    if (user.authTime === undefined || now() - user.authTime > RECENT_LOGIN_MS) {
      return reply.code(401).send({ error: "Potrebna je ponovna prijava", code: "recent_login_required" });
    }
    try {
      await deleteAccount(user.uid, {
        store,
        identity: deps.identity ?? null,
        unbindDevices: deps.unbindDevices ?? (() => {}),
      }, now());
      return reply.code(204).send();
    } catch (err) {
      return storeUnavailable(reply, err, "DELETE /api/me");
    }
  });

  /**
   * Tuđi profil (T1/T2, F2–F5): javno lice naloga — nadimak, avatar, broj
   * partija. NIKAD e-mail ni način prijave (G4). Gost i bot nemaju profil
   * (njihov `profileId` je `null`), pa ih ova ruta ne može ni naći.
   */
  app.get<{ Params: { profileId: string } }>("/api/profiles/:profileId", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    try {
      const uid = await store.uidForNickname(request.params.profileId.toLowerCase());
      const profile = uid ? await store.getProfile(uid) : null;
      if (!uid || !profile?.nickname) return reply.code(404).send({ code: "not_found" });
      return {
        profileId: profile.nicknameKey,
        nickname: profile.nickname,
        avatar: profile.avatar ?? null,
        completedMatches: profile.completedMatches,
        relation: uid === user.uid ? "self" : "none",
      };
    } catch (err) {
      return storeUnavailable(reply, err, "GET /api/profiles/:id");
    }
  });

  app.put<{ Body: { avatar?: unknown } }>("/api/me/avatar", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    if (accountRequired(user, reply)) return reply;
    const avatar = parseProfileAvatar(request.body?.avatar);
    if (!avatar) return reply.code(400).send({ code: "invalid" });
    try {
      await store.setAvatar(user.uid, avatar, now());
      return await me(user);
    } catch (err) {
      return storeUnavailable(reply, err, "PUT /api/me/avatar");
    }
  });
}
