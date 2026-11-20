"use client";

import { useParams } from "next/navigation";
import { MatchingRedirect } from "../MatchingRedirect";

/** `/matching/:roomId` — stara path ruta (samo web); prosljeđuje na sto. */
export default function MatchingPathPage() {
  const params = useParams<{ roomId: string }>();
  return <MatchingRedirect roomId={params.roomId} />;
}
