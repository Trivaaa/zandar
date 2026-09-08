"use client";

import { useParams } from "next/navigation";
import { RoomScreen } from "@/components/RoomScreen";

/**
 * `/room/:roomId` — path ruta za invite linkove koji su već podijeljeni.
 * SAMO web build (`page.web.tsx`; vidi `pageExtensions` u `next.config.ts`):
 * statički export ne može generisati nepoznat `roomId`, a WebView i ne treba
 * path routing — in-app navigacija ide na `/room?id=`.
 */
export default function RoomPathPage() {
  const params = useParams<{ roomId: string }>();
  return <RoomScreen roomId={params.roomId} />;
}
