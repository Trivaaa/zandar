"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AccountShell } from "@/components/account/AccountShell";
import { Field } from "@/components/account/Field";
import { sendPasswordReset } from "@/lib/account";
import { accountErrorCode, looksLikeEmail } from "@/lib/accountErrors";
import { sr } from "@/lib/sr";
import { useQueryParam, withQuery } from "@/lib/useQuery";

/** Ponovno slanje linka za novu lozinku tek nakon 60 s (R3). */
const RESEND_AFTER_S = 60;

/**
 * R2 zaboravljena lozinka → R3 link poslat. R3 ne otkriva da li adresa ima
 * nalog: isti tekst za svaku ispravnu adresu.
 */
export function ResetPasswordScreen() {
  const router = useRouter();
  const presetEmail = useQueryParam("email");
  // E-mail sa prijave stiže upisan dok ga igrač ne promijeni.
  const [typedEmail, setEmail] = useState<string | null>(null);
  const email = typedEmail ?? presetEmail ?? "";
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function send(address: string) {
    setError(null);
    if (!looksLikeEmail(address)) {
      setError(sr.account.invalidEmail);
      return;
    }
    setBusy(true);
    try {
      await sendPasswordReset(address);
      setSentTo(address.trim());
      setWait(RESEND_AFTER_S);
    } catch (err) {
      const code = accountErrorCode(err);
      setError(
        code === "invalid_email"
          ? sr.account.invalidEmail
          : code === "network"
            ? sr.account.networkError
            : code === "too_many"
              ? sr.account.tooMany
              : sr.account.genericError,
      );
    } finally {
      setBusy(false);
    }
  }

  const toLogin = () => router.replace(withQuery("/nalog/prijava", { email: sentTo ?? email.trim() }));

  if (sentTo) {
    return (
      <AccountShell title={sr.account.checkEmailTitle} onBack={toLogin}>
        <p className="acct__body">{sr.account.resetSent(sentTo)}</p>
        <p className="acct__body acct__body--muted">{sr.account.spamHint}</p>
        <div className="acct__form">
          <button
            type="button"
            className="home__friends acct__submit"
            disabled={wait > 0 || busy}
            onClick={() => void send(sentTo)}
          >
            {wait > 0 ? sr.account.sendAgainIn(wait) : sr.account.sendAgain}
          </button>
          <p className="acct__error" data-empty={!error} role="status">
            {error ?? ""}
          </p>
          <button type="button" className="acct__link acct__center" onClick={toLogin}>
            {sr.account.backToLogin}
          </button>
        </div>
      </AccountShell>
    );
  }

  return (
    <AccountShell title={sr.account.resetTitle} subtitle={sr.account.resetBody} onBack={() => router.back()}>
      <form
        className="acct__form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void send(email);
        }}
      >
        <Field
          label={sr.account.email}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          enterKeyHint="send"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error !== null}
          message={error ?? undefined}
        />
        <button type="submit" className="home__cta acct__submit" disabled={busy} aria-busy={busy}>
          {sr.account.sendLink}
        </button>
      </form>
    </AccountShell>
  );
}
