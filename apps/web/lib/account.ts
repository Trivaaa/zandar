import type { Auth, OAuthCredential, User } from "@firebase/auth";

import { AccountError, accountErrorCode } from "@/lib/accountErrors";
import { ensureSignedIn, getAuthInstance, resetSignIn } from "@/lib/auth";
import { FIREBASE_CONFIG } from "@/lib/firebaseConfig";
import { isNative } from "@/lib/platform";
import { forgetMe } from "@/lib/profile";
import { recordAccount } from "@/lib/track";

/**
 * Radnje naloga koje igrač sam pokreće (SPEC_IDENTITET tok a, b, §6.3, §6.7).
 * Za razliku od `lib/auth.ts` (tihi gost), ovdje svaki neuspjeh baca
 * `AccountError` sa kodom koji ekran pretvara u poruku.
 */

export type AccountInfo = {
  uid: string;
  anonymous: boolean;
  email: string | null;
  emailVerified: boolean;
  /** `password`, `google.com` ili `anonymous`. */
  provider: string;
};

function infoOf(user: User): AccountInfo {
  const provider = user.isAnonymous
    ? "anonymous"
    : (user.providerData[0]?.providerId ?? "password");
  return {
    uid: user.uid,
    anonymous: user.isAnonymous,
    email: user.email,
    emailVerified: user.emailVerified,
    provider,
  };
}

async function requireAuth(): Promise<Auth> {
  const auth = await getAuthInstance();
  if (!auth) throw new AccountError("unavailable");
  await auth.authStateReady();
  return auth;
}

/** Trenutni gost ili nalog; pravi gosta ako ga još nema. */
async function requireUser(): Promise<User> {
  const auth = await requireAuth();
  if (!auth.currentUser) await ensureSignedIn();
  if (!auth.currentUser) throw new AccountError("unavailable");
  return auth.currentUser;
}

function rethrow(err: unknown): never {
  throw err instanceof AccountError ? err : new AccountError(accountErrorCode(err), err);
}

export async function currentAccount(): Promise<AccountInfo | null> {
  const auth = await getAuthInstance();
  if (!auth) return null;
  await auth.authStateReady();
  return auth.currentUser ? infoOf(auth.currentUser) : null;
}

/**
 * A4: gost postaje nalog sa e-mailom i lozinkom — ISTI `uid`, pa partije
 * odigrane kao gost prelaze na nalog. Šalje e-mail za potvrdu (A7).
 * `email_in_use` → R6 (taj e-mail već ima drugi nalog).
 */
export async function registerWithEmail(email: string, password: string): Promise<AccountInfo> {
  try {
    const user = await requireUser();
    const { EmailAuthProvider, linkWithCredential, sendEmailVerification } = await import(
      "@firebase/auth"
    );
    const { user: linked } = await linkWithCredential(
      user,
      EmailAuthProvider.credential(email.trim(), password),
    );
    // Potvrda nije uslov ni za šta (Q7) — neuspjelo slanje ne ruši registraciju;
    // traka „E-mail nije potvrđen · Pošalji ponovo" ostaje na profilu.
    await sendEmailVerification(linked).catch(() => undefined);
    // Novi token nosi `email` i provider — server odmah vidi nalog, ne gosta.
    await linked.getIdToken(true);
    recordAccount("password");
    return infoOf(linked);
  } catch (err) {
    rethrow(err);
  }
}

/**
 * R1/R7: prijava na POSTOJEĆI nalog. Gost na ovom uređaju time ostaje
 * napušten — upozorenje (B4/R6) i brisanje gosta na serveru (T6) su na
 * pozivaocu, PRIJE ovog poziva.
 */
export async function signInWithEmail(email: string, password: string): Promise<AccountInfo> {
  try {
    const auth = await requireAuth();
    const { signInWithEmailAndPassword } = await import("@firebase/auth");
    const { user } = await signInWithEmailAndPassword(auth, email.trim(), password);
    resetSignIn();
    forgetMe();
    recordAccount(null);
    return infoOf(user);
  } catch (err) {
    rethrow(err);
  }
}

/**
 * R2/R3: link za novu lozinku. Nepostojeći nalog se NE prijavljuje kao
 * greška — ekran ne smije otkriti da li adresa ima nalog.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  try {
    const auth = await requireAuth();
    const { sendPasswordResetEmail } = await import("@firebase/auth");
    await sendPasswordResetEmail(auth, email.trim());
  } catch (err) {
    const code = accountErrorCode(err);
    if (code === "wrong_credentials") return;
    rethrow(err);
  }
}

/** A7/A8/P3: „Pošalji ponovo". */
export async function resendVerification(): Promise<void> {
  try {
    const user = await requireUser();
    const { sendEmailVerification } = await import("@firebase/auth");
    await sendEmailVerification(user);
  } catch (err) {
    rethrow(err);
  }
}

/**
 * Svježe stanje naloga sa Firebasea — npr. da li je e-mail u međuvremenu
 * potvrđen (igrač je kliknuo link u drugoj aplikaciji). Ne baca: bez mreže
 * vraća poznato stanje.
 */
export async function refreshAccount(): Promise<AccountInfo | null> {
  const auth = await getAuthInstance();
  if (!auth) return null;
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) return null;
  try {
    const wasVerified = user.emailVerified;
    await user.reload();
    if (user.emailVerified && !wasVerified) await user.getIdToken(true);
  } catch {
    // poznato stanje je dovoljno
  }
  return infoOf(user);
}

/**
 * C3: ponovna prijava lozinkom prije brisanja. Svjež token nosi novi
 * `auth_time`, koji server traži (prijava iz zadnjih 5 minuta).
 */
export async function reauthenticateWithPassword(password: string): Promise<void> {
  try {
    const user = await requireUser();
    if (!user.email) throw new AccountError("unavailable");
    const { EmailAuthProvider, reauthenticateWithCredential } = await import("@firebase/auth");
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
    await user.getIdToken(true);
  } catch (err) {
    rethrow(err);
  }
}

/**
 * Google prijava postoji kad postoji Firebase konfiguracija, a u APK-u i
 * `google-services.json` (build ga od 5c traži, `NEXT_PUBLIC_PUSH` je njegov
 * trag u web bundle-u).
 */
export const googleSignInAvailable =
  FIREBASE_CONFIG !== null && (!isNative || process.env.NEXT_PUBLIC_PUSH === "1");

/**
 * U APK-u: nativni izbor Google naloga → kredencijal za JS SDK (plugin ima
 * `skipNativeAuth`, pa se nativno NE prijavljuje). Pravilo iz CLAUDE.md:
 * plugin objekat se nikad ne vraća iz `async` funkcije — poziva se odmah.
 */
async function nativeGoogleCredential(): Promise<OAuthCredential> {
  let idToken: string | null | undefined;
  let accessToken: string | null | undefined;
  try {
    const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
    const result = await FirebaseAuthentication.signInWithGoogle();
    idToken = result.credential?.idToken;
    accessToken = result.credential?.accessToken;
  } catch (err) {
    // Nativni plugin javlja odustajanje porukom, ne Firebase kodom.
    if (/cancel/i.test(String((err as { message?: unknown })?.message ?? err))) {
      throw new AccountError("cancelled", err);
    }
    throw err;
  }
  if (!idToken) throw new AccountError("cancelled");
  const { GoogleAuthProvider } = await import("@firebase/auth");
  return GoogleAuthProvider.credential(idToken, accessToken ?? null);
}

export type GoogleOutcome =
  /** A3 Google: gost je postao nalog (isti `uid`) → A5. */
  | { kind: "linked"; account: AccountInfo }
  /** Taj Google nalog već ima nalog kod nas → B4, pa `signInWithGoogleCredential`. */
  | { kind: "exists"; credential: OAuthCredential };

const EXISTING_ACCOUNT_CODES = new Set([
  "auth/credential-already-in-use",
  "auth/email-already-in-use",
  "auth/account-exists-with-different-credential",
]);

/**
 * A3/B2 „Nastavi s Googleom" za gosta: prvo pokušaj povezati Google sa
 * gostom (registracija bez gubitka partija). Ako Google nalog već postoji,
 * NE prijavljuje — vraća kredencijal, da ekran prvo pokaže upozorenje (B4).
 */
export async function continueWithGoogle(): Promise<GoogleOutcome> {
  try {
    const user = await requireUser();
    const fa = await import("@firebase/auth");
    if (isNative) {
      const credential = await nativeGoogleCredential();
      try {
        const { user: linked } = await fa.linkWithCredential(user, credential);
        await linked.getIdToken(true);
        recordAccount("google");
        return { kind: "linked", account: infoOf(linked) };
      } catch (err) {
        if (EXISTING_ACCOUNT_CODES.has(String((err as { code?: unknown })?.code))) {
          return { kind: "exists", credential };
        }
        throw err;
      }
    }
    try {
      const { user: linked } = await fa.linkWithPopup(
        user,
        new fa.GoogleAuthProvider(),
        fa.browserPopupRedirectResolver,
      );
      await linked.getIdToken(true);
      recordAccount("google");
      return { kind: "linked", account: infoOf(linked) };
    } catch (err) {
      if (EXISTING_ACCOUNT_CODES.has(String((err as { code?: unknown })?.code))) {
        const credential = fa.GoogleAuthProvider.credentialFromError(err as never);
        if (credential) return { kind: "exists", credential };
      }
      throw err;
    }
  } catch (err) {
    rethrow(err);
  }
}

/** B5: prijava na POSTOJEĆI nalog Google kredencijalom (poslije B4). */
export async function signInWithGoogleCredential(credential: OAuthCredential): Promise<AccountInfo> {
  try {
    const auth = await requireAuth();
    const { signInWithCredential } = await import("@firebase/auth");
    const { user } = await signInWithCredential(auth, credential);
    resetSignIn();
    forgetMe();
    recordAccount(null);
    return infoOf(user);
  } catch (err) {
    rethrow(err);
  }
}

/** C6: ponovna prijava istim Google nalogom prije brisanja. */
export async function reauthenticateWithGoogle(): Promise<void> {
  try {
    const user = await requireUser();
    const fa = await import("@firebase/auth");
    if (isNative) {
      await fa.reauthenticateWithCredential(user, await nativeGoogleCredential());
    } else {
      await fa.reauthenticateWithPopup(user, new fa.GoogleAuthProvider(), fa.browserPopupRedirectResolver);
    }
    await user.getIdToken(true);
  } catch (err) {
    rethrow(err);
  }
}

/**
 * C5: nalog je obrisan na serveru (i Firebase nalog). Lokalna sesija se
 * gasi i uređaj nastavlja kao NOVI gost. Ne baca — igra mora ići dalje.
 */
export async function continueAsNewGuest(): Promise<void> {
  try {
    const auth = await requireAuth();
    const { signOut } = await import("@firebase/auth");
    await signOut(auth);
  } catch {
    // obrisan nalog ionako više ne važi
  }
  resetSignIn();
  forgetMe();
  await ensureSignedIn();
}

/**
 * O1: odjava. Uređaj nastavlja kao NOVI gost (nalog i rezultati ostaju na
 * serveru). Odvezivanje push uređaja od naloga (T3) radi pozivalac prije.
 */
export async function signOutToGuest(): Promise<void> {
  try {
    const auth = await requireAuth();
    const { signOut } = await import("@firebase/auth");
    await signOut(auth);
    resetSignIn();
    forgetMe();
    await ensureSignedIn();
  } catch (err) {
    rethrow(err);
  }
}
