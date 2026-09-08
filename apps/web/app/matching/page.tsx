"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MatchingScreen } from "@/components/MatchingScreen";

/** `/matching?id=…` — kanonska in-app ruta (vidi `app/room/page.tsx`). */
function MatchingFromQuery() {
  const roomId = useSearchParams().get("id");

  if (!roomId) {
    return (
      <main className="min-h-screen bg-felt text-white flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <p className="text-muted">Nema sobe u linku.</p>
          <Link href="/" className="underline text-base">
            ← Nazad na početnu
          </Link>
        </div>
      </main>
    );
  }

  return <MatchingScreen roomId={roomId} />;
}

export default function MatchingQueryPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-felt text-white flex items-center justify-center">
          <p className="text-muted">Pripremamo sto...</p>
        </main>
      }
    >
      <MatchingFromQuery />
    </Suspense>
  );
}
