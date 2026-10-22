"use client";

import { notFound } from "next/navigation";

import { useAccountEntry } from "@/components/account/AccountEntry";
import { FriendsGuest } from "@/components/friends/FriendsGuest";
import { TabBar } from "@/components/nav/TabBar";
import { identityUi } from "@/lib/features";

export default function FriendsPage() {
  if (!identityUi) notFound();
  return <FriendsScreen />;
}

function FriendsScreen() {
  const entry = useAccountEntry();
  return (
    <main className="screen profile screen--tabbed">
      {/* Lista prijatelja za nalog stiže u koraku 9. */}
      <FriendsGuest onRegister={entry.openRegister} onLogin={entry.openLogin} />
      <TabBar />
      {entry.sheet}
    </main>
  );
}
