"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AccountShell } from "@/components/account/AccountShell";
import { Field } from "@/components/account/Field";
import { GoogleMarkIcon } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import {
  continueAsNewGuest,
  currentAccount,
  reauthenticateWithGoogle,
  reauthenticateWithPassword,
  type AccountInfo,
} from "@/lib/account";
import { accountErrorCode } from "@/lib/accountErrors";
import { deleteMyAccount, useMe } from "@/lib/profile";
import { sr } from "@/lib/sr";
import { withQuery } from "@/lib/useQuery";

type Step = "what" | "verify" | "confirm" | "done";

/**
 * Tok c — brisanje naloga: C2 šta se briše → C3/C6 ponovna prijava → C4
 * konačna potvrda → C5 obrisan. Odustani na svakom koraku vraća na profil i
 * ne briše ništa; bez uspješne ponovne prijave nema brisanja.
 */
export function DeleteAccountScreen() {
  const router = useRouter();
  const me = useMe();
  const [step, setStep] = useState<Step>("what");
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void currentAccount().then(setAccount);
  }, []);

  // Gost nema nalog za brisanje.
  useEffect(() => {
    if (step !== "done" && me.status === "ready" && me.me.anonymous) router.replace("/profil");
  }, [me, router, step]);

  const toProfile = () => router.replace("/profil");
  const google = account?.provider === "google.com";

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      if (google) await reauthenticateWithGoogle();
      else await reauthenticateWithPassword(password);
      setPassword("");
      setStep("confirm");
    } catch (err) {
      const code = accountErrorCode(err);
      setError(
        code === "wrong_credentials"
          ? sr.deleteAccount.wrongPassword
          : code === "cancelled"
            ? null
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

  async function destroy() {
    setBusy(true);
    setError(null);
    const result = await deleteMyAccount();
    if (result === "ok") {
      await continueAsNewGuest();
      setStep("done");
    } else if (result === "recent_login") {
      setStep("verify");
    } else {
      setError(sr.account.genericError);
    }
    setBusy(false);
  }

  if (step === "done") {
    return (
      <main className="screen namestep acct">
        <div className="acct__col acct__done">
          <h1 className="acct__title">{sr.deleteAccount.doneTitle}</h1>
          <p className="acct__body">{sr.deleteAccount.doneBody}</p>
          <button type="button" className="home__cta acct__submit" onClick={() => router.replace("/")}>
            {sr.deleteAccount.playZandar}
          </button>
        </div>
      </main>
    );
  }

  const nickname = me.status === "ready" ? (me.me.nickname ?? "") : "";
  const completed = me.status === "ready" ? me.me.completedMatches : 0;

  if (step === "what") {
    return (
      <AccountShell step={1} title={sr.deleteAccount.title} onBack={toProfile}>
        <p className="acct__body">{sr.deleteAccount.whatGoes}</p>
        <ul className="acct__list">
          <li>{sr.deleteAccount.nicknameAndAvatar(nickname)}</li>
          <li>{sr.deleteAccount.results(completed)}</li>
          <li>{sr.deleteAccount.signInEverywhere}</li>
        </ul>
        <p className="acct__body">
          <strong>{sr.deleteAccount.irreversible}</strong> {sr.deleteAccount.keepPlaying}
        </p>
        <div className="acct__form">
          <button type="button" className="home__friends acct__submit" onClick={() => setStep("verify")}>
            {sr.deleteAccount.continue}
          </button>
          <button type="button" className="acct__link acct__center" onClick={toProfile}>
            {sr.account.cancel}
          </button>
        </div>
      </AccountShell>
    );
  }

  if (step === "verify") {
    return (
      <AccountShell step={2} title={sr.deleteAccount.verifyTitle} onBack={toProfile}>
        {google ? (
          <>
            <p className="acct__body">{sr.deleteAccount.verifyGoogle}</p>
            <div className="acct__form">
              <button type="button" className="home__friends acct__submit" disabled={busy} onClick={() => void verify()}>
                <GoogleMarkIcon className="home__friends-icon" />
                {sr.account.withGoogle}
              </button>
              <p className="acct__error" data-empty={!error} role="status">
                {error ?? ""}
              </p>
              <button type="button" className="acct__link acct__center" onClick={toProfile}>
                {sr.account.cancel}
              </button>
            </div>
          </>
        ) : (
          <form
            className="acct__form"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (password) void verify();
            }}
          >
            <p className="acct__body">{sr.deleteAccount.verifyPassword(account?.email ?? "")}</p>
            <Field
              label={sr.account.password}
              password
              autoComplete="current-password"
              enterKeyHint="go"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={error === sr.deleteAccount.wrongPassword}
              message={error ?? undefined}
            />
            <button
              type="button"
              className="acct__link acct__forgot"
              onClick={() => router.push(withQuery("/nalog/lozinka", { email: account?.email }))}
            >
              {sr.account.forgotPassword}
            </button>
            <button type="submit" className="home__cta acct__submit" disabled={busy || !password} aria-busy={busy}>
              {sr.deleteAccount.confirm}
            </button>
            <button type="button" className="acct__link acct__center" onClick={toProfile}>
              {sr.account.cancel}
            </button>
          </form>
        )}
      </AccountShell>
    );
  }

  return (
    <AccountShell step={3} title={sr.deleteAccount.finalTitle} onBack={toProfile}>
      <div className="profile__card">
        {me.status === "ready" && me.me.avatar ? (
          <Avatar id={me.me.avatar} size={64} />
        ) : (
          <span className="profile__letter" aria-hidden="true">
            {nickname.charAt(0).toLocaleUpperCase("sr-Latn")}
          </span>
        )}
        <span className="profile__card-text">
          <span className="profile__name">{nickname}</span>
          <span className="profile__meta">{sr.profile.completed(completed)}</span>
        </span>
      </div>
      <p className="acct__body">{sr.deleteAccount.finalBody}</p>
      <div className="acct__form">
        <button type="button" className="acct__danger" disabled={busy} aria-busy={busy} onClick={() => void destroy()}>
          {sr.deleteAccount.entry}
        </button>
        <p className="acct__error" data-empty={!error} role="status">
          {error ?? ""}
        </p>
        <button type="button" className="acct__link acct__center" onClick={toProfile}>
          {sr.account.cancel}
        </button>
      </div>
    </AccountShell>
  );
}
