"use client";

import { useRouter } from "next/navigation";

import { TabBar } from "@/components/nav/TabBar";
import { GuestProfile } from "@/components/profile/GuestProfile";
import { usePlayerName } from "@/lib/playerName";
import { useMe } from "@/lib/profile";

/**
 * Tab Profil. Za sada samo gost (A2) — nalog postoji tek od koraka 5
 * (registracija), a „Moj profil" (P1–P8) dolazi u koraku 6.
 */
export function ProfileScreen({ onRegister, onLogin }: { onRegister: () => void; onLogin: () => void }) {
  const router = useRouter();
  const name = usePlayerName();
  const me = useMe();

  return (
    <main className="screen profile screen--tabbed">
      <GuestProfile
        name={name}
        completed={
          me.status === "ready" ? { status: "ready", count: me.me.completedMatches } : { status: me.status }
        }
        onRetry={me.retry}
        onRegister={onRegister}
        onLogin={onLogin}
        onBackToPlay={() => router.replace("/")}
      />
      <TabBar />
    </main>
  );
}
