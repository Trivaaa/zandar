"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AccountShell } from "@/components/account/AccountShell";
import { DataLossSheet } from "@/components/account/AccountSheets";
import { Field } from "@/components/account/Field";
import { PrivacyNote } from "@/components/account/PrivacyNote";
import { registerWithEmail } from "@/lib/account";
import { accountErrorCode, looksLikeEmail, PASSWORD_MIN_LENGTH } from "@/lib/accountErrors";
import { useMe } from "@/lib/profile";
import { sr } from "@/lib/sr";
import { withQuery } from "@/lib/useQuery";

/** A4 (Korak 1 od 3) sa greškama R5 i upozorenjem R6. Nalog nastaje ovdje. */
export function RegisterEmailScreen() {
  const router = useRouter();
  const me = useMe();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailInUse, setEmailInUse] = useState(false);

  const emailBad = submitted && !looksLikeEmail(email);
  const passwordBad = submitted && password.length < PASSWORD_MIN_LENGTH;
  const lost =
    me.status === "ready" && me.me.anonymous && me.me.completedMatches > 0
      ? sr.profile.completed(me.me.completedMatches)
      : null;

  async function submit() {
    setSubmitted(true);
    setError(null);
    if (!looksLikeEmail(email) || password.length < PASSWORD_MIN_LENGTH) return;
    setBusy(true);
    try {
      await registerWithEmail(email, password);
      router.replace("/nalog/nadimak");
    } catch (err) {
      const code = accountErrorCode(err);
      if (code === "email_in_use") setEmailInUse(true);
      else if (code === "invalid_email") setError(sr.account.invalidEmail);
      else if (code === "weak_password") setError(sr.account.weakPassword);
      else if (code === "network") setError(sr.account.networkError);
      else if (code === "too_many") setError(sr.account.tooMany);
      else setError(sr.account.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountShell step={1} title={sr.account.registerTitle} onBack={() => router.back()}>
      <form
        className="acct__form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Field
          label={sr.account.email}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          enterKeyHint="next"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={emailBad}
          message={emailBad ? sr.account.invalidEmail : undefined}
        />
        <Field
          label={sr.account.password}
          password
          autoComplete="new-password"
          enterKeyHint="go"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={passwordBad}
          message={passwordBad ? sr.account.weakPassword : sr.account.passwordHint}
        />
        <button type="submit" className="home__cta acct__submit" disabled={busy} aria-busy={busy}>
          {sr.account.createAccount}
        </button>
        <PrivacyNote />
        <p className="acct__error" data-empty={!error} role="status">
          {error ?? ""}
        </p>
        <p className="acct__alt">
          {sr.account.haveAccount}{" "}
          <button type="button" className="acct__link" onClick={() => router.replace("/nalog/prijava")}>
            {sr.profile.login}
          </button>
        </p>
      </form>

      {emailInUse ? (
        <DataLossSheet
          kind="email"
          lost={lost}
          onClose={() => setEmailInUse(false)}
          onConfirm={() => router.replace(withQuery("/nalog/prijava", { email: email.trim(), ack: "1" }))}
        />
      ) : null}
    </AccountShell>
  );
}
