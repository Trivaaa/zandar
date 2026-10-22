import type { Player, ProfileAvatar } from "@zandar/shared-types";

import type { ProfileStore } from "./store";

/**
 * Igrač s nalogom sjeda za sto pod NADIMKOM, sa avatarom (SPEC_IDENTITET §3,
 * §6.8) — server ga uzima iz profila, ne iz tijela zahtjeva.
 */
export type AccountIdentity = {
  displayName: string;
  avatar?: ProfileAvatar;
  /** Javni ID profila = ključ nadimka (nadimak je ionako javan). */
  profileId: string;
};

/** Profil nikad ne smije zadržati ulazak za sto. */
const LOOKUP_TIMEOUT_MS = 1500;

/**
 * Identitet naloga za `uid`, ili `null`: gost, nalog bez nadimka, skladište
 * nedostupno ili sporo. `null` znači samo „sjedi kao gost" — nikad greška.
 */
export async function accountIdentityFor(
  store: ProfileStore,
  uid: string | undefined,
  timeoutMs: number = LOOKUP_TIMEOUT_MS,
): Promise<AccountIdentity | null> {
  if (!uid) return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const profile = await Promise.race([
      store.getProfile(uid),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
    if (!profile?.nickname || !profile.nicknameKey) return null;
    return {
      displayName: profile.nickname,
      ...(profile.avatar ? { avatar: profile.avatar } : {}),
      profileId: profile.nicknameKey,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Upiši identitet naloga na igrača (u mjestu). Bot se nikad ne dira. */
export function applyAccountIdentity(player: Player, account: AccountIdentity | null): void {
  if (!account || player.isBot) return;
  player.displayName = account.displayName;
  player.profileId = account.profileId;
  if (account.avatar) player.avatar = account.avatar;
  else delete player.avatar;
}
