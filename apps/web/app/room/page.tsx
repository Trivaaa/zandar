"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { RoomScreen } from "@/components/RoomScreen";

/**
 * `/room?id=…` — kanonska in-app ruta za sobu. Radi i u statičkom exportu /
 * WebView-u (nema path routing-a na disku). Path oblik `/room/:id` postoji samo
 * u web build-u (`[roomId]/page.web.tsx`) za invite linkove.
 */
function RoomFromQuery() {
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

  return <RoomScreen roomId={roomId} />;
}

export default function RoomQueryPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-felt text-white flex items-center justify-center">
          <p className="text-muted">Učitavanje...</p>
        </main>
      }
    >
      <RoomFromQuery />
    </Suspense>
  );
}
