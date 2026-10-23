"use client";

import type { TableTheme } from "@zandar/shared-types";

import { getGuestId } from "@/lib/guestId";
import { analyticsPlatform } from "@/lib/platform";
import { authed } from "@/lib/profile";
import { saveSession } from "@/lib/session";

/** Pozivi na partiju (SPEC_IDENTITET tok e). */

/** E2 → E3: nova privatna soba sa pozivima; host ulazi u nju. Vraća id sobe. */
export async function createInviteRoom(input: {
  profileIds: string[];
  playerCount: 2 | 3 | 4;
  targetScore: 11 | 21;
  tableTheme?: TableTheme | undefined;
}): Promise<string> {
  const res = await authed("/api/invites", {
    method: "POST",
    body: JSON.stringify({ ...input, guestId: getGuestId(), platform: analyticsPlatform }),
  });
  if (!res.ok) throw new Error(`invite_${res.status}`);
  const body = (await res.json()) as { roomId: string; playerId: string; playerSessionToken: string };
  saveSession({ roomId: body.roomId, playerId: body.playerId, sessionToken: body.playerSessionToken });
  return body.roomId;
}

/** E3 „Pozovi iz prijatelja" (host sobe koja čeka). */
export async function inviteToRoom(roomId: string, profileIds: string[]): Promise<void> {
  const res = await authed(`/api/rooms/${encodeURIComponent(roomId)}/invites`, {
    method: "POST",
    body: JSON.stringify({ profileIds }),
  });
  if (!res.ok) throw new Error(`invite_${res.status}`);
}

/** E5 Pridruži se. `expired` = poziv više ne važi (F7). */
export async function acceptInvite(roomId: string): Promise<"ok" | "expired" | "error"> {
  try {
    const res = await authed(`/api/invites/${encodeURIComponent(roomId)}/accept`, {
      method: "POST",
      body: JSON.stringify({ guestId: getGuestId(), platform: analyticsPlatform }),
    });
    if (res.status === 410) return "expired";
    if (!res.ok) return "error";
    const body = (await res.json()) as { roomId: string; playerId: string; sessionToken: string };
    saveSession({ roomId: body.roomId, playerId: body.playerId, sessionToken: body.sessionToken });
    return "ok";
  } catch {
    return "error";
  }
}
