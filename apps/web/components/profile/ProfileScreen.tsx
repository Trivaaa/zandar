"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAccountEntry } from "@/components/account/AccountEntry";
import { VerifyEmailSheet } from "@/components/account/AccountSheets";
import { TabBar } from "@/components/nav/TabBar";
import { AccountProfile } from "@/components/profile/AccountProfile";
import { GuestProfile } from "@/components/profile/GuestProfile";
import { refreshAccount, resendVerification, type AccountInfo } from "@/lib/account";
import { usePlayerName } from "@/lib/playerName";
import { useMe } from "@/lib/profile";
import { useQueryParam } from "@/lib/useQuery";

/**
 * Tab Profil: gost (A2) ili nalog (P1 vrh + A8). Nalog bez nadimka je
 * nedovršen (Q10) — ulazak u Profil ga vraća na A5.
 */
export function ProfileScreen() {
  const router = useRouter();
  const name = usePlayerName();
  const me = useMe();
  const entry = useAccountEntry();
  const verifyParam = useQueryParam("potvrda") === "1";
  const [account, setAccount] = useState<AccountInfo | null>(null);
  // A7 se otvara sa `?potvrda=1` (poslije A6) dok ga igrač ne zatvori.
  const [verifyDismissed, setVerifyDismissed] = useState(false);
  const verifyOpen = verifyParam && !verifyDismissed;
  const [resent, setResent] = useState(false);

  const isAccount = me.status === "ready" && !me.me.anonymous;

  useEffect(() => {
    if (me.status === "ready" && !me.me.anonymous && !me.me.nickname) router.replace("/nalog/nadimak");
  }, [me, router]);

  // Potvrda e-maila se desi van aplikacije (link u pošti) — osvježi po povratku.
  useEffect(() => {
    if (!isAccount) return;
    const refresh = () => void refreshAccount().then(setAccount);
    refresh();
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [isAccount]);

  function resend() {
    setResent(true);
    void resendVerification().catch(() => setResent(false));
  }

  const unverified = account?.provider === "password" && !account.emailVerified;

  return (
    <main className="screen profile screen--tabbed">
      {isAccount && me.status === "ready" && me.me.nickname ? (
        <AccountProfile
          nickname={me.me.nickname}
          avatar={me.me.avatar}
          completedMatches={me.me.completedMatches}
          unverified={unverified}
          onResend={resend}
          resent={resent}
        />
      ) : (
        <GuestProfile
          name={name}
          completed={
            me.status === "ready" ? { status: "ready", count: me.me.completedMatches } : { status: me.status }
          }
          onRetry={me.retry}
          onRegister={entry.openRegister}
          onLogin={entry.openLogin}
          onBackToPlay={() => router.replace("/")}
        />
      )}
      <TabBar />
      {entry.sheet}
      {verifyOpen && account?.email ? (
        <VerifyEmailSheet
          email={account.email}
          resent={resent}
          onResend={resend}
          onClose={() => {
            setVerifyDismissed(true);
            router.replace("/profil");
          }}
        />
      ) : null}
    </main>
  );
}
