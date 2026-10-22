import type { Auth, User } from "@firebase/auth";

import { AccountError, accountErrorCode } from "@/lib/accountErrors";
import { ensureSignedIn, getAuthInstance, resetSignIn } from "@/lib/auth";

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
 * O1: odjava. Uređaj nastavlja kao NOVI gost (nalog i rezultati ostaju na
 * serveru). Odvezivanje push uređaja od naloga (T3) radi pozivalac prije.
 */
export async function signOutToGuest(): Promise<void> {
  try {
    const auth = await requireAuth();
    const { signOut } = await import("@firebase/auth");
    await signOut(auth);
    resetSignIn();
    await ensureSignedIn();
  } catch (err) {
    rethrow(err);
  }
}
