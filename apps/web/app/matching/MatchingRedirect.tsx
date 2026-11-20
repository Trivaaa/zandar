"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { roomPath } from "@/lib/routes";
import { markIntro } from "@/lib/shuffleView";

/**
 * Stara ruta matching ekrana. Uvod „Miješamo špil" je sada na samom stolu
 * (`RoomScreen`), pa ovo samo prosljeđuje — bez ikakvog čekanja. Ostaje zbog
 * istorije pregledača i starih linkova.
 */
export function MatchingRedirect({ roomId }: { roomId: string }) {
  const router = useRouter();
  useEffect(() => {
    markIntro(roomId);
    router.replace(roomPath(roomId));
  }, [roomId, router]);
  return <main className="screen" aria-busy="true" />;
}
