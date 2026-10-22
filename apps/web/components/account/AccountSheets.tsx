"use client";

import { PrivacyNote } from "@/components/account/PrivacyNote";
import { Sheet } from "@/components/sheet/Sheet";
import { GoogleMarkIcon } from "@/components/icons";
import { sr } from "@/lib/sr";

/**
 * Listovi naloga (SPEC_IDENTITET A3, B2, B4/R6, A7). Sadržaj samo — list,
 * scrim, nazad i fokus daje `Sheet`.
 */

/** A3 „Registruj se" / B2 „Prijavi se": izbor načina. */
export function MethodSheet({
  kind,
  googleAvailable,
  busy = false,
  error = null,
  onGoogle,
  onEmail,
  onClose,
}: {
  kind: "register" | "login";
  /** Bez Firebase konfiguracije (ili google-services.json u APK-u) dugme ne postoji. */
  googleAvailable: boolean;
  /** Google prozor je otvoren — dugmad čekaju. */
  busy?: boolean;
  error?: string | null;
  onGoogle: () => void;
  onEmail: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet
      title={kind === "register" ? sr.account.registerSheetTitle : sr.account.loginSheetTitle}
      closeLabel={sr.account.cancel}
      onClose={onClose}
    >
      {kind === "register" ? <p className="sheet__note">{sr.account.registerSheetNote}</p> : null}
      {googleAvailable ? (
        <button
          type="button"
          className="home__friends sheet__btn"
          onClick={onGoogle}
          disabled={busy}
          aria-busy={busy}
        >
          <GoogleMarkIcon className="home__friends-icon" />
          {sr.account.withGoogle}
        </button>
      ) : null}
      <button type="button" className="home__friends sheet__btn" onClick={onEmail} disabled={busy}>
        {sr.account.withEmail}
      </button>
      {error ? (
        <p className="acct__error" role="status">
          {error}
        </p>
      ) : null}
      {kind === "register" ? <PrivacyNote /> : null}
    </Sheet>
  );
}

/** B4 / R6: prijava na postojeći nalog briše gostujuće rezultate na ovom uređaju. */
export function DataLossSheet({
  kind,
  lost,
  onConfirm,
  onClose,
}: {
  kind: "account" | "email";
  /** Već formatirano („12 završenih partija"); `null` = gost nema šta da izgubi. */
  lost: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet
      title={kind === "account" ? sr.account.accountExistsTitle : sr.account.emailExistsTitle}
      closeLabel={sr.account.cancel}
      onClose={onClose}
    >
      {lost ? <p className="sheet__note">{sr.account.dataLoss(lost)}</p> : null}
      <button type="button" className="home__cta sheet__btn" onClick={onConfirm}>
        {sr.profile.login}
      </button>
    </Sheet>
  );
}

/** A7: e-mail za potvrdu je poslat. */
export function VerifyEmailSheet({
  email,
  onResend,
  resent,
  onClose,
}: {
  email: string;
  onResend: () => void;
  resent: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet title={sr.account.verifyTitle} closeLabel={sr.account.ok} onClose={onClose}>
      <p className="sheet__note">{sr.account.verifySent(email)}</p>
      <p className="sheet__note sheet__note--muted">{sr.account.spamHint}</p>
      <button type="button" className="profile__link" onClick={onResend} disabled={resent}>
        {sr.account.sendAgain}
      </button>
    </Sheet>
  );
}
