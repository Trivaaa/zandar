"use client";

import type { ProfileAvatar } from "@zandar/shared-types";

import { authed } from "@/lib/profile";

/** Odnos iz ugla gledaoca (apps/server/src/profile/friends.ts). */
export type Relation = "self" | "blocked" | "friends" | "outgoing" | "incoming" | "none";

export type FriendEntry = { profileId: string; nickname: string; avatar: ProfileAvatar | null };
export type SearchResult = FriendEntry & { relation: Relation };

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`friends_${res.status}`);
  return (await res.json()) as T;
}

/** §6.6: prijatelji po abecedi i dolazni zahtjevi (D4). */
export async function fetchFriends(): Promise<{ friends: FriendEntry[]; incoming: FriendEntry[] }> {
  return json(await authed("/api/friends"));
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
