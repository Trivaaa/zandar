"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import type { OAuthCredential } from "@firebase/auth";

import { DataLossSheet, MethodSheet } from "@/components/account/AccountSheets";
import {
  continueWithGoogle,
  googleSignInAvailable,
  signInWithGoogleCredential,
} from "@/lib/account";
import { accountErrorCode } from "@/lib/accountErrors";
import { getIdToken } from "@/lib/auth";
import { abandonGuest, fetchMe, useMe } from "@/lib/profile";
import { sr } from "@/lib/sr";

/**
 * Ulaz u nalog sa Profila i Prijatelja: Registruj se → A3, Prijavi se → B2.
 * Google (tok a/b) radi isto iz oba lista: poveži sa gostom (novi nalog → A5)
 * ili, ako Google nalog već postoji, upozori (B4) pa prijavi (B5).
 *
 * `onSignedIn` javlja hostu da je na ovom ekranu sad drugi nalog (osvježi profil).
 */
export function useAccountEntry(onSignedIn?: () => void): {
  openRegister: () => void;
  openLogin: () => void;
  sheet: ReactNode;
} {
  const router = useRouter();
  const me = useMe();
  const [open, setOpen] = useState<"register" | "login" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ credential: OAuthCredential; guestToken: string | null } | null>(
    null,
  );

  const lostCount = me.status === "ready" && me.me.anonymous ? me.me.completedMatches : 0;

  function close() {
    setOpen(null);
    setError(null);
  }

  async function signInExisting(credential: OAuthCredential, guestToken: string | null) {
    setPending(null);
    setBusy(true);
    try {
      await signInWithGoogleCredential(credential);
      // T6: gost na ovom uređaju je napušten tek kad je prijava uspjela.
      if (guestToken) void abandonGuest(guestToken);
      close();
      const after = await fetchMe().catch(() => null);
      if (after && !after.nickname) router.push("/nalog/nadimak");
      else onSignedIn?.();
    } catch (err) {
      setError(errorText(accountErrorCode(err)));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    setError(null);
    try {
      // Token gosta PRIJE prijave — poslije nje je trenutni nalog drugi.
      const guestToken = await getIdToken();
      const outcome = await continueWithGoogle();
      if (outcome.kind === "linked") {
        close();
        router.push("/nalog/nadimak");
      } else if (lostCount > 0) {
        setOpen(null);
        setPending({ credential: outcome.credential, guestToken });
      } else {
        await signInExisting(outcome.credential, guestToken);
      }
    } catch (err) {
      const code = accountErrorCode(err);
      if (code !== "cancelled") setError(errorText(code));
    } finally {
      setBusy(false);
    }
  }

  let sheet: ReactNode = null;
  if (pending) {
    sheet = (
      <DataLossSheet
        kind="account"
        lost={sr.profile.completed(lostCount)}
        onClose={() => setPending(null)}
        onConfirm={() => void signInExisting(pending.credential, pending.guestToken)}
      />
    );
  } else if (open) {
    sheet = (
      <MethodSheet
        kind={open}
        googleAvailable={googleSignInAvailable}
        busy={busy}
        error={error}
        onGoogle={() => void google()}
        onEmail={() => {
          close();
          router.push(open === "register" ? "/nalog/registracija" : "/nalog/prijava");
        }}
        onClose={close}
      />
    );
  }

  return { openRegister: () => setOpen("register"), openLogin: () => setOpen("login"), sheet };
}

function errorText(code: string): string {
  if (code === "network") return sr.account.networkError;
  if (code === "too_many") return sr.account.tooMany;
  return sr.account.genericError;
}
