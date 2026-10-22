import { createIdentityAdmin, IDENTITY_SCOPE, type IdentityAdmin } from "../google/identityToolkit";
import { createAccessTokenSource, parseServiceAccount } from "../google/serviceAuth";
import type { ProfileStore } from "./store";

/**
 * Brisanje podataka koje niko više ne koristi (SPEC_IDENTITET T6).
 *
 * Nalog bez nadimka (nedovršena registracija) se NE briše (Q10): igra i
 * skuplja partije kao i svaki drugi, samo je nevidljiv drugima dok ne
 * izabere nadimak.
 *
 * Bez servisnog ključa `identity` je `null`: brišu se samo podaci u
 * skladištu, Firebase nalozi ostaju (lokalni dev, server bez ključa).
 */

export type CleanupDeps = {
  store: ProfileStore;
  identity: IdentityAdmin | null;
};

/**
 * T6: gost se prijavio na POSTOJEĆI nalog, pa je njegov anonimni nalog na
 * ovom uređaju napušten — rezultati se ne spajaju (tok b), nego brišu.
 */
export async function abandonGuest(uid: string, deps: CleanupDeps): Promise<void> {
  await deps.store.deleteUserData(uid);
  await deps.identity?.deleteUser(uid);
}

/**
 * Tok c — brisanje naloga (SPEC_IDENTITET §7). Redom: podaci u skladištu
 * (nadimak ostaje rezervisan 30 dana), push uređaji odvezani od naloga, pa
 * Firebase nalog sa e-mailom. Firebase ide ZADNJI: ako nešto prije padne,
 * igrač može ponoviti brisanje istim nalogom.
 */
export async function deleteAccount(
  uid: string,
  deps: CleanupDeps & { unbindDevices: (uid: string) => void },
  now: number = Date.now(),
): Promise<void> {
  await deps.store.deleteAccount(uid, now);
  deps.unbindDevices(uid);
  await deps.identity?.deleteUser(uid);
}

const account = parseServiceAccount(process.env.FCM_SERVICE_ACCOUNT_JSON);
export const identityAdmin: IdentityAdmin | null = account
  ? createIdentityAdmin(account.project_id, createAccessTokenSource(account, [IDENTITY_SCOPE]))
  : null;
