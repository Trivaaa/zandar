"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { PROFILE_AVATARS, type ProfileAvatar } from "@zandar/shared-types";

import { AccountShell } from "@/components/account/AccountShell";
import { Avatar } from "@/components/profile/Avatar";
import { currentAccount } from "@/lib/account";
import { saveAvatar, useMe } from "@/lib/profile";
import { sr } from "@/lib/sr";

function avatarFromUid(uid: string): ProfileAvatar {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
  return PROFILE_AVATARS[h % PROFILE_AVATARS.length] ?? "a1";
}

/**
 * A6 (Korak 3 od 3) — mreža 5×2, jedan unaprijed izabran nasumično, veliki
 * prikaz sa nadimkom. Poslije: Moj profil; za e-mail registraciju i list
 * „Provjeri e-mail" (A7, `?potvrda=1`).
 */
export function AvatarScreen() {
  const router = useRouter();
  const me = useMe();
  const [picked, setChosen] = useState<ProfileAvatar | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // „Nasumično" unaprijed izabran (A6), ali izveden iz uid-a: stabilan između
  // renderovanja i isti na serveru i u pregledaču.
  const chosen = picked ?? (me.status === "ready" ? avatarFromUid(me.me.uid) : null);

  useEffect(() => {
    if (me.status !== "ready") return;
    if (me.me.anonymous) router.replace("/profil");
    else if (!me.me.nickname) router.replace("/nalog/nadimak");
  }, [me, router]);

  async function done() {
    if (!chosen) return;
    setBusy(true);
    setError(null);
    try {
      await saveAvatar(chosen);
      const account = await currentAccount();
      const needsVerify = account?.provider === "password" && !account.emailVerified;
      router.replace(needsVerify ? "/profil?potvrda=1" : "/profil");
    } catch {
      setError(sr.account.genericError);
      setBusy(false);
    }
  }

  const nickname = me.status === "ready" ? (me.me.nickname ?? "") : "";

  return (
    <AccountShell
      step={3}
      title={sr.account.avatarTitle}
      subtitle={sr.account.avatarSub}
      onBack={() => router.replace("/nalog/nadimak")}
    >
      <div className="acct__avatar-preview">
        {chosen ? <Avatar avatar={chosen} className="avatar--xl" /> : <span className="avatar avatar--xl" />}
        <span className="acct__avatar-name">{nickname}</span>
      </div>
      <div className="acct__avatar-grid" role="radiogroup" aria-label={sr.account.avatarTitle}>
        {PROFILE_AVATARS.map((a, i) => (
          <button
            key={a}
            type="button"
            role="radio"
            aria-checked={chosen === a}
            aria-label={sr.account.avatarLabel(i + 1)}
            className="acct__avatar-option"
            onClick={() => setChosen(a)}
          >
            <Avatar avatar={a} />
          </button>
        ))}
      </div>
      <div className="acct__form">
        <button type="button" className="home__cta acct__submit" disabled={!chosen || busy} onClick={() => void done()}>
          {sr.account.done}
        </button>
        <p className="acct__error" data-empty={!error} role="status">
          {error ?? ""}
        </p>
      </div>
    </AccountShell>
  );
}
