"use client";

import { useEffect } from "react";
import { notFound, useRouter } from "next/navigation";

import { useAccountEntry } from "@/components/account/AccountEntry";
import { FriendsGuest } from "@/components/friends/FriendsGuest";
import { FriendsList } from "@/components/friends/FriendsList";
import { TabBar } from "@/components/nav/TabBar";
import { identityUi } from "@/lib/features";
import { useMe } from "@/lib/profile";
import { sr } from "@/lib/sr";

export default function FriendsPage() {
  if (!identityUi) notFound();
  return <FriendsScreen />;
}

/**
 * Tab Prijatelji: gost → F1 (zašto nalog); nalog → lista (§6.6). Nalog bez
 * nadimka je nedovršen (Q10) — kao i Profil, vraća ga na A5.
 */
function FriendsScreen() {
  const router = useRouter();
  const me = useMe();
  const entry = useAccountEntry(() => me.retry());
  const account = me.status === "ready" && !me.me.anonymous;

  useEffect(() => {
    if (me.status === "ready" && !me.me.anonymous && !me.me.nickname) router.replace("/nalog/nadimak");
  }, [me, router]);

  return (
    <main className="screen profile screen--tabbed">
      {me.status === "loading" ? (
        <div className="profile__col" aria-busy="true" aria-label={sr.friends.loading}>
          <h1 className="profile__title">{sr.friends.title}</h1>
        </div>
      ) : account ? (
        <FriendsList />
      ) : (
        <FriendsGuest onRegister={entry.openRegister} onLogin={entry.openLogin} />
      )}
      <TabBar />
      {entry.sheet}
    </main>
  );
}
