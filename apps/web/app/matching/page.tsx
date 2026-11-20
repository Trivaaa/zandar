"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MatchingRedirect } from "./MatchingRedirect";

/** `/matching?id=…` — stara in-app ruta; prosljeđuje na sto (`/room?id=`). */
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

  return <MatchingRedirect roomId={roomId} />;
}

export default function MatchingQueryPage() {
  return (
    <Suspense
      fallback={<main className="screen" aria-busy="true" />}
    >
      <MatchingFromQuery />
    </Suspense>
  );
}
