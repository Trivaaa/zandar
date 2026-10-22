"use client";

import { notFound } from "next/navigation";

import { FriendsGuest } from "@/components/friends/FriendsGuest";
import { TabBar } from "@/components/nav/TabBar";
import { identityUi } from "@/lib/features";

export default function FriendsPage() {
  if (!identityUi) notFound();
  return (
    <main className="screen profile screen--tabbed">
      {/* Registracija i prijava stižu u koraku 5; lista prijatelja u koraku 9. */}
      <FriendsGuest onRegister={() => {}} onLogin={() => {}} />
      <TabBar />
    </main>
  );
}
