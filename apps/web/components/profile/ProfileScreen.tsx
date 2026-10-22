"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { ProfileAvatar } from "@zandar/shared-types";

import { useAccountEntry } from "@/components/account/AccountEntry";
import { VerifyEmailSheet } from "@/components/account/AccountSheets";
import { FeedbackToggles } from "@/components/FeedbackToggles";
import { SettingsSheet } from "@/components/home/SettingsSheet";
import { TabBar } from "@/components/nav/TabBar";
import {
  AccountProfile,
  AccountProfileError,
  AccountProfileSkeleton,
} from "@/components/profile/AccountProfile";
import { GuestProfile } from "@/components/profile/GuestProfile";
import { AvatarSheet, LogoutSheet } from "@/components/profile/ProfileSheets";
import { RulesModal } from "@/components/RulesModal";
import {
  refreshAccount,
  resendVerification,
  signOutToGuest,
  type AccountInfo,
} from "@/lib/account";
import { unbindPushDevice } from "@/lib/api";
import { useBackHandler } from "@/lib/backHandlers";
import { isNative } from "@/lib/platform";
import { usePlayerName } from "@/lib/playerName";
import { saveAvatar, useMe } from "@/lib/profile";
import { getPushId } from "@/lib/push";
import { namePath } from "@/lib/routes";
import { sr } from "@/lib/sr";
import { useQueryParam } from "@/lib/useQuery";

const legalSlot = (
  <>
    <Link href="/privatnost">{sr.home.privacy}</Link>
    <Link href="/uslovi">{sr.home.terms}</Link>
    <Link href="/o-nama">{sr.home.about}</Link>
  </>
);

/**
 * Tab Profil: gost (A2, G1/G2) ili Moj profil (P1–P8, A7/A8, O1).
 * Nalog bez nadimka je nedovršen (Q10) — ulazak u Profil ga vraća na A5.
 */
export function ProfileScreen() {
  const router = useRouter();
  const name = usePlayerName();
  const me = useMe();
  const entry = useAccountEntry();
  const verifyParam = useQueryParam("potvrda") === "1";
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [verifyDismissed, setVerifyDismissed] = useState(false);
  const [resent, setResent] = useState(false);
  const [sheet, setSheet] = useState<"avatar" | "logout" | "settings" | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState<ProfileAvatar | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Firebase lokalno zna da li je ovo nalog prije nego što server odgovori —
  // nalog dok čeka vidi svoj skeleton (P7), ne ekran gosta.
  const isAccount = me.status === "ready" ? !me.me.anonymous : account !== null && !account.anonymous;

  useEffect(() => {
    if (me.status === "ready" && !me.me.anonymous && !me.me.nickname) router.replace("/nalog/nadimak");
  }, [me, router]);

  // Potvrda e-maila se desi van aplikacije (link u pošti) — osvježi po povratku.
  useEffect(() => {
    const refresh = () => void refreshAccount().then(setAccount);
    refresh();
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, []);

  useBackHandler(rulesOpen, () => setRulesOpen(false));
  // Postavke koriste postojeći `SettingsSheet` (bez `Sheet` omotača) — nazad ručno.
  useBackHandler(sheet === "settings", () => setSheet(null));

  function resend() {
    setResent(true);
    void resendVerification().catch(() => setResent(false));
  }

  async function changeAvatar(avatar: ProfileAvatar) {
    setSheet(null);
    setAvatarFailed(null);
    try {
      me.update(await saveAvatar(avatar));
    } catch {
      // P4: profil ostaje na starom avataru, poruka nudi ponovni pokušaj.
      setAvatarFailed(avatar);
    }
  }

  async function logout() {
    setLoggingOut(true);
    // T3: uređaj prestaje da prima obavještenja ovog naloga — prije odjave.
    const pushId = getPushId();
    if (pushId) await unbindPushDevice(pushId);
    try {
      await signOutToGuest();
    } finally {
      setLoggingOut(false);
      setSheet(null);
      setAccount(null);
      me.retry();
    }
  }

  const unverified = account?.provider === "password" && !account.emailVerified;
  const verifyOpen = verifyParam && !verifyDismissed;

  let body;
  if (isAccount && me.status === "ready" && me.me.nickname) {
    body = (
      <AccountProfile
        nickname={me.me.nickname}
        avatar={me.me.avatar}
        completedMatches={me.me.completedMatches}
        nicknameLockedUntil={me.me.nicknameChangeAllowedAt}
        unverified={unverified}
        onResend={resend}
        resent={resent}
        avatarFailed={avatarFailed !== null}
        onRetryAvatar={() => avatarFailed && void changeAvatar(avatarFailed)}
        onChangeNickname={() => router.push("/nalog/promijeni-nadimak")}
        onChangeAvatar={() => setSheet("avatar")}
        onSettings={() => setSheet("settings")}
        onLogout={() => setSheet("logout")}
      />
    );
  } else if (isAccount && me.status === "error") {
    body = <AccountProfileError onRetry={me.retry} />;
  } else if (isAccount) {
    body = <AccountProfileSkeleton />;
  } else {
    body = (
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
    );
  }

  return (
    <main className="screen profile screen--tabbed">
      {body}
      <TabBar />
      {entry.sheet}

      {sheet === "avatar" && me.status === "ready" ? (
        <AvatarSheet current={me.me.avatar} onSave={(a) => void changeAvatar(a)} onClose={() => setSheet(null)} />
      ) : null}
      {sheet === "logout" ? (
        <LogoutSheet busy={loggingOut} onConfirm={() => void logout()} onClose={() => setSheet(null)} />
      ) : null}
      {sheet === "settings" ? (
        <div className="home-layer">
          <div className="sheet-scrim" onClick={() => setSheet(null)}>
            <div className="sheet-scrim__inner" onClick={(e) => e.stopPropagation()}>
              <SettingsSheet
                playerName={name}
                onChangeName={() => {
                  setSheet(null);
                  router.push(namePath("home"));
                }}
                onRules={() => {
                  setSheet(null);
                  setRulesOpen(true);
                }}
                onClose={() => setSheet(null)}
                feedbackSlot={<FeedbackToggles showPush />}
                {...(isNative ? { legalSlot } : {})}
              />
            </div>
          </div>
        </div>
      ) : null}
      <div className="home-layer">
        <RulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />
      </div>

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
