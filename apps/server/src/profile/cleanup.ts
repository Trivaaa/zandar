import { createIdentityAdmin, IDENTITY_SCOPE, type IdentityAdmin } from "../google/identityToolkit";
import { createAccessTokenSource, parseServiceAccount } from "../google/serviceAuth";
import type { ProfileStore } from "./store";

/**
 * Brisanje podataka koje niko više ne koristi (SPEC_IDENTITET T6, Q10).
 *
 * Bez servisnog ključa `identity` je `null`: brišu se samo podaci u
 * skladištu, Firebase nalozi ostaju (lokalni dev, server bez ključa).
 */

export type CleanupDeps = {
  store: ProfileStore;
  identity: IdentityAdmin | null;
};

/** Nalog bez nadimka (nedovršena registracija) živi najviše ovoliko (Q10). */
export const INCOMPLETE_ACCOUNT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
/** Gornja granica stranica po jednom prolazu — dnevni posao ne smije da traje satima. */
const MAX_PAGES = 200;

/**
 * T6: gost se prijavio na POSTOJEĆI nalog, pa je njegov anonimni nalog na
 * ovom uređaju napušten — rezultati se ne spajaju (tok b), nego brišu.
 */
export async function abandonGuest(uid: string, deps: CleanupDeps): Promise<void> {
  await deps.store.deleteUserData(uid);
  await deps.identity?.deleteUser(uid);
}

/**
 * Q10: nalog koji je povezao e-mail/Google, ali nikad nije izabrao nadimak, a
 * stariji je od 30 dana — briše se zajedno sa Firebase nalogom i e-mailom.
 * Anonimni gosti se ovdje NE diraju (nemaju provajdera).
 */
export async function sweepIncompleteAccounts(
  deps: CleanupDeps,
  now: number = Date.now(),
): Promise<number> {
  if (!deps.identity) return 0;
  let removed = 0;
  let pageToken: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const { users, nextPageToken } = await deps.identity.listUsers(pageToken);
    for (const user of users) {
      if (user.providers.length === 0) continue;
      if (now - user.createdAt <= INCOMPLETE_ACCOUNT_MAX_AGE_MS) continue;
      const profile = await deps.store.getProfile(user.uid);
      if (profile?.nickname) continue;
      await deps.store.deleteUserData(user.uid);
      await deps.identity.deleteUser(user.uid);
      removed++;
    }
    if (!nextPageToken || users.length === 0) break;
    pageToken = nextPageToken;
  }
  return removed;
}

const account = parseServiceAccount(process.env.FCM_SERVICE_ACCOUNT_JSON);
export const identityAdmin: IdentityAdmin | null = account
  ? createIdentityAdmin(account.project_id, createAccessTokenSource(account, [IDENTITY_SCOPE]))
  : null;
