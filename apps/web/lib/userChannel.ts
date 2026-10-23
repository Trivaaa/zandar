"use client";

import { useEffect, useState } from "react";

import { currentAccount } from "@/lib/account";
import { getIdToken } from "@/lib/auth";
import { identityUi } from "@/lib/features";
import { getSocket } from "@/lib/socket";

/**
 * Korisnički kanal (SPEC_IDENTITET T2): socket soba naloga, nezavisna od
 * stola. Server na nju šalje broj dolaznih zahtjeva (D4) i pozive na partiju
 * (E4) — odmah po pretplati i na svaku promjenu.
 *
 * Jedna pretplata za cijelu aplikaciju (ne po ekranu), ponovljena na svako
 * (ponovno) spajanje socketa — server je ne pamti preko prekida veze. Zadnje
 * vrijednosti se pamte, pa novi ekran odmah ima broj. Gost se ne pretplaćuje.
 */

/** E4: ono što pozvani vidi (apps/server/src/profile/invites.ts). */
export type InviteNotice = {
  roomId: string;
  fromNickname: string;
  playerCount: number;
  targetScore: number;
  expiresAt: number;
};

let started = false;
let friendCount = 0;
let invites: InviteNotice[] = [];
/** „Ne sada" (E4): server ponovo javlja važeće pozive pri svakoj pretplati — ovi se ne vraćaju. */
const dismissed = new Set<string>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/**
 * (Ponovna) pretplata. Gost šalje token gosta — server tada izbacuje socket iz
 * kanala prethodnog naloga (odjava, brisanje), pa ne stižu tuđi događaji.
 */
async function subscribe(): Promise<void> {
  const account = await currentAccount();
  if (!account) return;
  if (account.anonymous && (friendCount !== 0 || invites.length > 0)) {
    friendCount = 0;
    invites = [];
    notify();
  }
  const idToken = await getIdToken();
  if (idToken) getSocket().emit("user:subscribe", { idToken });
}

function start(): void {
  if (started || !identityUi) return;
  started = true;
  const socket = getSocket();
  socket.on("user:friends", (payload: { incoming?: unknown }) => {
    if (typeof payload?.incoming !== "number") return;
    friendCount = payload.incoming;
    notify();
  });
  socket.on("user:invite", (notice: InviteNotice) => {
    if (typeof notice?.roomId !== "string" || dismissed.has(notice.roomId)) return;
    invites = [...invites.filter((i) => i.roomId !== notice.roomId), notice];
    notify();
  });
  socket.on("connect", () => void subscribe());
  if (socket.connected) void subscribe();
}

let expiredInvite = false;

/** F7 iz push-a: tap na poziv koji više ne važi — list prikazuje glavni ekran. */
export function markInviteExpired(): void {
  expiredInvite = true;
  notify();
}

export function clearExpiredInvite(): void {
  expiredInvite = false;
  notify();
}

const readExpired = () => expiredInvite;

/** F7 čeka da ga glavni ekran prikaže. */
export function useExpiredInvite(): boolean {
  return useChannel(readExpired);
}

/** Poziv je obrađen (Pridruži se / Ne sada / istekao) — skloni ga. */
export function dismissInvite(roomId: string): void {
  dismissed.add(roomId);
  invites = invites.filter((i) => i.roomId !== roomId);
  notify();
}

function useChannel<T>(read: () => T): T {
  const [value, setValue] = useState(read);
  useEffect(() => {
    // Svaki glavni ekran obnovi pretplatu: posle registracije, prijave ili
    // odjave nalog je drugi, a ovo je najjednostavnije mjesto da se to uhvati.
    if (started) void subscribe();
    else start();
    const update = () => setValue(read);
    listeners.add(update);
    update();
    return () => {
      listeners.delete(update);
    };
  }, [read]);
  return value;
}

const readCount = () => friendCount;
const readInvites = () => invites;

/** D4: broj zahtjeva koji čekaju (0 za gosta). */
export function useFriendRequestCount(): number {
  return useChannel(readCount);
}

/**
 * E4: primljeni pozivi, najnoviji zadnji. Rok provjerava server pri
 * prihvatanju — istekao poziv daje F7, ne grešku.
 */
export function useIncomingInvites(): InviteNotice[] {
  return useChannel(readInvites);
}
