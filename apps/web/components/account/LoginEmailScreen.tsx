"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AccountShell } from "@/components/account/AccountShell";
import { DataLossSheet } from "@/components/account/AccountSheets";
import { Field } from "@/components/account/Field";
import { currentAccount, signInWithEmail } from "@/lib/account";
import { accountErrorCode, looksLikeEmail } from "@/lib/accountErrors";
import { getIdToken } from "@/lib/auth";
import { abandonGuest, fetchMe, useMe } from "@/lib/profile";
import { sr } from "@/lib/sr";
import { useQueryParam, withQuery } from "@/lib/useQuery";

/**
 * R1 prijava e-mailom, R4 pogrešni podaci, R7 e-mail već upisan (iz R6).
 * Gost sa partijama prije prijave vidi upozorenje (kao B4) — osim kad je
 * stigao iz R6, gdje ga je već vidio (`ack=1`).
 */
export function LoginEmailScreen() {
  const router = useRouter();
  const me = useMe();
  const presetEmail = useQueryParam("email");
  const acknowledged = useQueryParam("ack") === "1";
  // R7: e-mail stiže upisan dok ga igrač ne promijeni (`null` = netaknut).
  const [typedEmail, setEmail] = useState<string | null>(null);
  const email = typedEmail ?? presetEmail ?? "";
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wrong, setWrong] = useState(false);
  const [confirmLoss, setConfirmLoss] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  // R7: sa upisanim e-mailom fokus ide na lozinku.
  useEffect(() => {
    if (presetEmail) passwordRef.current?.focus();
  }, [presetEmail]);

  const lostCount = me.status === "ready" && me.me.anonymous ? me.me.completedMatches : 0;

  async function signIn() {
    setConfirmLoss(false);
    setBusy(true);
    setError(null);
    setWrong(false);
    try {
      // T6: token gosta se uzima PRIJE prijave — poslije nje je trenutni nalog drugi.
      const guest = await currentAccount();
      const guestToken = guest?.anonymous ? await getIdToken() : null;
      await signInWithEmail(email, password);
      if (guestToken) void abandonGuest(guestToken);
      // Nalog bez nadimka (izašao prije A5) nastavlja registraciju.
      const after = await fetchMe().catch(() => null);
      router.replace(after && !after.nickname ? "/nalog/nadimak" : "/profil");
    } catch (err) {
      const code = accountErrorCode(err);
      if (code === "wrong_credentials") setWrong(true);
      else if (code === "invalid_email") setError(sr.account.invalidEmail);
      else if (code === "network") setError(sr.account.networkError);
      else if (code === "too_many") setError(sr.account.tooMany);
      else setError(sr.account.genericError);
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    if (!looksLikeEmail(email) || password === "") {
      setWrong(true);
      return;
    }
    if (lostCount > 0 && !acknowledged) setConfirmLoss(true);
    else void signIn();
  }

  return (
    <AccountShell title={sr.account.loginTitle} onBack={() => router.back()}>
      <form
        className="acct__form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
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
          error={wrong}
        />
        <Field
          ref={passwordRef}
          label={sr.account.password}
          password
          autoComplete="current-password"
          enterKeyHint="go"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={wrong}
          message={wrong ? sr.account.wrongCredentials : undefined}
        />
        <button
          type="button"
          className="acct__link acct__forgot"
          onClick={() => router.push(withQuery("/nalog/lozinka", { email: email.trim() }))}
        >
          {sr.account.forgotPassword}
        </button>
        <button type="submit" className="home__cta acct__submit" disabled={busy} aria-busy={busy}>
          {sr.profile.login}
        </button>
        <p className="acct__error" data-empty={!error} role="status">
          {error ?? ""}
        </p>
        <p className="acct__alt">
          {sr.account.noAccount}{" "}
          <button type="button" className="acct__link" onClick={() => router.replace("/nalog/registracija")}>
            {sr.profile.register}
          </button>
        </p>
      </form>

      {confirmLoss ? (
        <DataLossSheet
          kind="account"
          lost={sr.profile.completed(lostCount)}
          onClose={() => setConfirmLoss(false)}
          onConfirm={() => void signIn()}
        />
      ) : null}
    </AccountShell>
  );
}
