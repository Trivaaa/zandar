"use client";

import type { ProfileAvatar } from "@zandar/shared-types";

import { getAuthInstance } from "@/lib/auth";
import { authed, fetchMe, peekMe } from "@/lib/profile";

/** Odnos iz ugla gledaoca (apps/server/src/profile/friends.ts). */
export type Relation = "self" | "blocked" | "friends" | "outgoing" | "incoming" | "none";

export type FriendEntry = { profileId: string; nickname: string; avatar: ProfileAvatar | null };
export type SearchResult = FriendEntry & { relation: Relation };

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`friends_${res.status}`);
  return (await res.json()) as T;
}

export type FriendsData = { friends: FriendEntry[]; incoming: FriendEntry[] };

/**
 * Zadnja lista u ovoj sesiji, vezana za `uid` — povratak na tab je pokaže
 * odmah, a svjež odgovor je zamijeni. Drugi nalog (prijava/odjava mijenja
 * `peekMe`) nikad ne vidi tuđu listu.
 */
let cachedFriends: { uid: string; data: FriendsData } | null = null;

export function peekFriends(): FriendsData | null {
  const me = peekMe();
  return cachedFriends && me && cachedFriends.uid === me.uid ? cachedFriends.data : null;
}

/** §6.6: prijatelji po abecedi i dolazni zahtjevi (D4). */
export async function fetchFriends(): Promise<FriendsData> {
  const data = await json<FriendsData>(await authed("/api/friends"));
  const me = peekMe();
  if (me) cachedFriends = { uid: me.uid, data };
  return data;
}

let prefetched = false;

/**
 * Tiho učitavanje profila i liste prijatelja (jednom po sesiji), da prvi
 * ulazak u Prijatelji ne čeka mrežu. Samo za POSTOJEĆI nalog sa nadimkom:
 * nikad ne pravi gosta (`authed` bi ga napravio) i ne šalje ništa za gosta.
 */
export async function prefetchFriends(): Promise<void> {
  if (prefetched) return;
  prefetched = true;
  try {
    const auth = await getAuthInstance();
    if (!auth) return;
    await auth.authStateReady();
    const user = auth.currentUser;
    if (!user || user.isAnonymous) return;
    const me = await fetchMe();
    if (me.anonymous || !me.nickname) return;
    await fetchFriends();
  } catch {
    // Samo ubrzanje: ekran ionako učitava sam.
  }
}

/** D2: prefiks nadimka, najmanje 3 znaka. */
export async function searchPlayers(q: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const res = await authed(`/api/players/search?q=${encodeURIComponent(q)}`, signal ? { signal } : {});
  return (await json<{ results: SearchResult[] }>(res)).results;
}

const id = (profileId: string) => encodeURIComponent(profileId);

export async function sendFriendRequest(profileId: string): Promise<Relation> {
  const res = await authed("/api/friend-requests", { method: "POST", body: JSON.stringify({ profileId }) });
  return (await json<{ relation: Relation }>(res)).relation;
}

export async function acceptFriendRequest(profileId: string): Promise<Relation> {
  return (await json<{ relation: Relation }>(await authed(`/api/friend-requests/${id(profileId)}/accept`, { method: "POST" }))).relation;
}

export async function declineFriendRequest(profileId: string): Promise<Relation> {
  return (await json<{ relation: Relation }>(await authed(`/api/friend-requests/${id(profileId)}/decline`, { method: "POST" }))).relation;
}

export async function cancelFriendRequest(profileId: string): Promise<Relation> {
  return (await json<{ relation: Relation }>(await authed(`/api/friend-requests/${id(profileId)}`, { method: "DELETE" }))).relation;
}

export async function removeFriend(profileId: string): Promise<Relation> {
  return (await json<{ relation: Relation }>(await authed(`/api/friends/${id(profileId)}`, { method: "DELETE" }))).relation;
}
