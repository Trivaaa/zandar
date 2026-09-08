"use client";

import { useParams } from "next/navigation";
import { MatchingScreen } from "@/components/MatchingScreen";

/** `/matching/:roomId` — path ruta, samo web build (vidi `room/[roomId]/page.web.tsx`). */
export default function MatchingPathPage() {
  const params = useParams<{ roomId: string }>();
  return <MatchingScreen roomId={params.roomId} />;
}
