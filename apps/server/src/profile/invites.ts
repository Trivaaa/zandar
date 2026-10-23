import type { ProfileAvatar } from "@zandar/shared-types";

/**
 * Pozivi na partiju (SPEC_IDENTITET tok e, §7, Q1). Poziv živi na SOBI
 * (`LobbyRoom.invites`, opciono — stari snapshot-i ga nemaju) i važi dok
 * partija ne počne, soba se ne popuni ili zatvori — a najduže 30 minuta.
 * Pozvani ulazi BEZ odobrenja hosta.
 */
export const INVITE_TTL_MS = 30 * 60 * 1000;

export type RoomInvite = {
  /** Pozvani (server-only — nikad ne ide klijentu). */
  uid: string;
  /** Javno lice pozvanog, za red „Poziv poslat" u sobi (E3). */
  profileId: string;
  nickname: string;
  avatar?: ProfileAvatar;
  fromUid: string;
  createdAt: number;
};

/** Ono iz sobe što pravila poziva čitaju. */
export type InviteRoom = {
  status: "waiting" | "playing" | "finished";
  players: { uid?: string; isBot?: boolean }[];
  rulesConfig: { playerCount: number; targetScore: number };
  invites?: RoomInvite[];
};

/** Ima li još mjesta za čovjeka (bot-sjedište se oslobađa za njega). */
function hasSeatForHuman(room: InviteRoom): boolean {
  const humans = room.players.filter((p) => !p.isBot).length;
  return humans < room.rulesConfig.playerCount;
}

/** Važeći pozivi sobe: soba čeka, ima mjesta, nije istekao, pozvani još ne sjedi. */
export function activeInvites(room: InviteRoom, now: number): RoomInvite[] {
  if (room.status !== "waiting" || !hasSeatForHuman(room)) return [];
  const seated = new Set(room.players.map((p) => p.uid).filter(Boolean));
  return (room.invites ?? []).filter((i) => now - i.createdAt < INVITE_TTL_MS && !seated.has(i.uid));
}

export function inviteFor(room: InviteRoom, uid: string, now: number): RoomInvite | null {
  return activeInvites(room, now).find((i) => i.uid === uid) ?? null;
}

/** Dodaj pozive; ponovljen poziv istom igraču zamjenjuje stari (novi rok). */
export function addInvites(room: InviteRoom, invites: RoomInvite[]): void {
  const fresh = new Set(invites.map((i) => i.uid));
  room.invites = [...(room.invites ?? []).filter((i) => !fresh.has(i.uid)), ...invites];
}

export function removeInvite(room: InviteRoom, uid: string): void {
  if (room.invites) room.invites = room.invites.filter((i) => i.uid !== uid);
}

/** E3: red „Poziv poslat · čeka se odgovor" — samo javno lice, bez uid-a. */
export function publicInvites(
  room: InviteRoom,
  now: number,
): { profileId: string; nickname: string; avatar: ProfileAvatar | null }[] {
  return activeInvites(room, now).map((i) => ({
    profileId: i.profileId,
    nickname: i.nickname,
    avatar: i.avatar ?? null,
  }));
}

/** E4: šta pozvani vidi — ko zove, za koju partiju, do kada. */
export type InviteNotice = {
  roomId: string;
  fromNickname: string;
  playerCount: number;
  targetScore: number;
  expiresAt: number;
};

export function noticeOf(roomId: string, room: InviteRoom, invite: RoomInvite, fromNickname: string): InviteNotice {
  return {
    roomId,
    fromNickname,
    playerCount: room.rulesConfig.playerCount,
    targetScore: room.rulesConfig.targetScore,
    expiresAt: invite.createdAt + INVITE_TTL_MS,
  };
}
