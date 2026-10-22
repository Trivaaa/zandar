/**
 * Firebase Auth greška → stanje ekrana iz speca (SPEC_IDENTITET §6.3, tok b).
 * Čista funkcija bez Firebase uvoza, da je testovi pokrivaju direktno.
 */
export type AccountErrorCode =
  /** R4 — e-mail ili lozinka nisu tačni (ne kaže koje polje). */
  | "wrong_credentials"
  /** R5 — „Ovo ne liči na e-mail adresu." */
  | "invalid_email"
  /** R5 — „Prekratka je. Najmanje 8 znakova." */
  | "weak_password"
  /** R6 — e-mail već ima nalog; nudi se prijava na njega. */
  | "email_in_use"
  /** B4 — izabrani Google nalog već pripada drugom igraču. */
  | "credential_in_use"
  /** Igrač je zatvorio Google prozor — nije greška, ne prikazuje se ništa. */
  | "cancelled"
  /** Previše pokušaja; Firebase privremeno odbija. */
  | "too_many"
  | "network"
  /** Firebase nije dostupan ili nije konfigurisan (npr. produkcija prije R2). */
  | "unavailable"
  /** Osjetljiva radnja traži svježu prijavu (brisanje, tok c). */
  | "recent_login_required"
  | "unknown";

export class AccountError extends Error {
  constructor(
    readonly code: AccountErrorCode,
    cause?: unknown,
  ) {
    super(code, { cause });
    this.name = "AccountError";
  }
}

const BY_FIREBASE_CODE: Record<string, AccountErrorCode> = {
  "auth/invalid-credential": "wrong_credentials",
  "auth/invalid-login-credentials": "wrong_credentials",
  "auth/wrong-password": "wrong_credentials",
  "auth/user-not-found": "wrong_credentials",
  "auth/user-mismatch": "wrong_credentials",
  "auth/invalid-email": "invalid_email",
  "auth/missing-email": "invalid_email",
  "auth/weak-password": "weak_password",
  "auth/missing-password": "weak_password",
  "auth/email-already-in-use": "email_in_use",
  "auth/credential-already-in-use": "credential_in_use",
  "auth/account-exists-with-different-credential": "email_in_use",
  "auth/popup-closed-by-user": "cancelled",
  "auth/cancelled-popup-request": "cancelled",
  "auth/user-cancelled": "cancelled",
  "auth/too-many-requests": "too_many",
  "auth/network-request-failed": "network",
  "auth/requires-recent-login": "recent_login_required",
};

export function accountErrorCode(err: unknown): AccountErrorCode {
  if (err instanceof AccountError) return err.code;
  const code = (err as { code?: unknown } | null)?.code;
  if (typeof code !== "string") return "unknown";
  return BY_FIREBASE_CODE[code] ?? "unknown";
}

/** Najmanja dužina lozinke (A4: „Najmanje 8 znakova."); Firebase sam traži 6. */
export const PASSWORD_MIN_LENGTH = 8;

/** Gruba provjera prije slanja — konačnu odluku donosi Firebase (R5). */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}
