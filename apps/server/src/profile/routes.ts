import type { FastifyInstance } from "fastify";

import { nicknameChangeAllowedAt, parseProfileAvatar } from "@zandar/shared-types";

import type { AuthUser } from "../auth/idToken";
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

/** Provjera dok igrač kuca (0,5 s debounce) — 60 u minuti je daleko iznad ruke. */
const NICKNAME_LIMIT_PER_MINUTE = 60;

export function registerProfileRoutes(
  app: FastifyInstance,
  deps: { store: ProfileStore; requireUser: RequireUser; now?: () => number },
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
