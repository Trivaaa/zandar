import type { FastifyInstance } from "fastify";

import type { AuthUser } from "../auth/idToken";
import { SlidingWindowLimiter } from "../rateLimit";
import {
  acceptRequest,
  cancelRequest,
  declineRequest,
  relationOf,
  removeFriend,
  sendRequest,
} from "./friends";
import type { ProfileStore } from "./store";

/**
 * Prijatelji (SPEC_IDENTITET tok d, §6.6). Sve rute traže NALOG SA NADIMKOM:
 * gost nema prijatelje, a nedovršen nalog (bez nadimka, Q10) ne šalje i ne
 * prima zahtjeve. Drugi igrač se uvijek adresira javnim ID-jem (ključ
 * nadimka), nikad `uid`-om.
 */

type RequireUser = (
  request: { headers: { authorization?: string | undefined } },
  reply: { code: (status: number) => { send: (body: unknown) => unknown } },
) => Promise<AuthUser | null>;

/** Tihi tehnički limit (Q9): zaštita od skripte, igrač ga ne dostiže. */
const REQUESTS_PER_DAY = 100;
const SEARCH_MIN = 3;
const SEARCH_LIMIT = 20;

export type FriendEntry = { profileId: string; nickname: string; avatar: string | null };

export function registerFriendRoutes(
  app: FastifyInstance,
  deps: {
    store: ProfileStore;
    requireUser: RequireUser;
    /** Promijenio se broj zahtjeva ovih igrača — javi im (korisnički kanal). */
    onFriendsChanged?: (uids: string[]) => void;
    now?: () => number;
  },
): void {
  const { store, requireUser } = deps;
  const now = deps.now ?? Date.now;
  const changed = (...uids: string[]) => deps.onFriendsChanged?.(uids);
  const requestLimiter = new SlidingWindowLimiter(REQUESTS_PER_DAY, 24 * 60 * 60 * 1000);
  setInterval(() => requestLimiter.sweep(), 5 * 60_000).unref();

  type Reply = { code: (status: number) => { send: (body: unknown) => unknown } };

  /** Nalog sa nadimkom, ili odgovor greške i `null`. */
  async function member(request: { headers: { authorization?: string | undefined } }, reply: Reply) {
    const user = await requireUser(request, reply);
    if (!user) return null;
    if (user.anonymous) {
      reply.code(403).send({ error: "Potreban je nalog", code: "account_required" });
      return null;
    }
    const profile = await store.getProfile(user.uid);
    if (!profile?.nickname) {
      reply.code(403).send({ error: "Prvo izaberi nadimak", code: "nickname_required" });
      return null;
    }
    return user;
  }

  async function entryOf(uid: string): Promise<FriendEntry | null> {
    const p = await store.getProfile(uid);
    return p?.nickname && p.nicknameKey
      ? { profileId: p.nicknameKey, nickname: p.nickname, avatar: p.avatar ?? null }
      : null;
  }

  async function entries(uids: string[]): Promise<FriendEntry[]> {
    const list = (await Promise.all(uids.map(entryOf))).filter((e): e is FriendEntry => e !== null);
    return list.sort((a, b) => a.nickname.localeCompare(b.nickname, "sr-Latn"));
  }

  /** `uid` vlasnika javnog ID-a (samo nalog sa nadimkom), ili odgovor 404. */
  async function target(profileId: string, reply: Reply): Promise<string | null> {
    const uid = await store.uidForNickname(profileId.toLowerCase());
    const p = uid ? await store.getProfile(uid) : null;
    if (!uid || !p?.nickname) {
      reply.code(404).send({ code: "not_found" });
      return null;
    }
    return uid;
  }

  function failed(reply: Reply, err: unknown, where: string) {
    app.log.error(`[friends] ${where}: ${String(err).slice(0, 300)}`);
    return reply.code(503).send({ error: "Prijatelji trenutno nisu dostupni", code: "store_unavailable" });
  }

  /** §6.6 lista: prijatelji po abecedi + dolazni zahtjevi (D4). */
  app.get("/api/friends", async (request, reply) => {
    try {
      const me = await member(request, reply);
      if (!me) return reply;
      const [friendUids, incomingUids] = await Promise.all([
        store.friendUids(me.uid),
        store.incomingRequestUids(me.uid),
      ]);
      return { friends: await entries(friendUids), incoming: await entries(incomingUids) };
    } catch (err) {
      return failed(reply, err, "GET /api/friends");
    }
  });

  /** D2 pretraga: prefiks nadimka, ≥3 znaka, najviše 20, bez sebe i blokiranih. */
  app.get<{ Querystring: { q?: string } }>("/api/players/search", async (request, reply) => {
    try {
      const me = await member(request, reply);
      if (!me) return reply;
      const q = (request.query.q ?? "").trim().normalize("NFC").toLowerCase();
      if (q.length < SEARCH_MIN) return reply.code(400).send({ code: "too_short" });
      const hits = await store.searchNicknames(q, SEARCH_LIMIT + 1);
      const results = [];
      for (const hit of hits) {
        if (hit.uid === me.uid) continue;
        if ((await store.isBlocked(me.uid, hit.uid)) || (await store.isBlocked(hit.uid, me.uid))) continue;
        const entry = await entryOf(hit.uid);
        if (!entry) continue;
        results.push({ ...entry, relation: await relationOf(store, me.uid, hit.uid) });
        if (results.length === SEARCH_LIMIT) break;
      }
      return { results };
    } catch (err) {
      return failed(reply, err, "GET /api/players/search");
    }
  });

  /** D3 zahtjev (ili prijateljstvo odmah, ako je i on poslao meni). */
  app.post<{ Body: { profileId?: unknown } }>("/api/friend-requests", async (request, reply) => {
    try {
      const me = await member(request, reply);
      if (!me) return reply;
      if (typeof request.body?.profileId !== "string") return reply.code(400).send({ code: "invalid" });
      const to = await target(request.body.profileId, reply);
      if (!to) return reply;
      if (!requestLimiter.tryHit(me.uid)) {
        return reply.code(429).send({ error: "Previše zahtjeva", code: "rate_limited" });
      }
      const relation = await sendRequest(store, me.uid, to, now());
      if (relation === "outgoing" || relation === "friends") changed(to, me.uid);
      return { relation };
    } catch (err) {
      return failed(reply, err, "POST /api/friend-requests");
    }
  });

  const actions = {
    accept: (me: string, other: string) => acceptRequest(store, me, other, now()),
    decline: (me: string, other: string) => declineRequest(store, me, other),
  } as const;
  for (const [name, act] of Object.entries(actions)) {
    app.post<{ Params: { profileId: string } }>(`/api/friend-requests/:profileId/${name}`, async (request, reply) => {
      try {
        const me = await member(request, reply);
        if (!me) return reply;
        const other = await target(request.params.profileId, reply);
        if (!other) return reply;
        const relation = await act(me.uid, other);
        changed(me.uid);
        return { relation };
      } catch (err) {
        return failed(reply, err, `POST /api/friend-requests/:id/${name}`);
      }
    });
  }

  /** F3 Povuci zahtjev. */
  app.delete<{ Params: { profileId: string } }>("/api/friend-requests/:profileId", async (request, reply) => {
    try {
      const me = await member(request, reply);
      if (!me) return reply;
      const other = await target(request.params.profileId, reply);
      if (!other) return reply;
      const relation = await cancelRequest(store, me.uid, other);
      changed(other);
      return { relation };
    } catch (err) {
      return failed(reply, err, "DELETE /api/friend-requests/:id");
    }
  });

  /** F6 Ukloni iz prijatelja — tiho. */
  app.delete<{ Params: { profileId: string } }>("/api/friends/:profileId", async (request, reply) => {
    try {
      const me = await member(request, reply);
      if (!me) return reply;
      const other = await target(request.params.profileId, reply);
      if (!other) return reply;
      return { relation: await removeFriend(store, me.uid, other) };
    } catch (err) {
      return failed(reply, err, "DELETE /api/friends/:id");
    }
  });
}
