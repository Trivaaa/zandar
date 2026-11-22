"use client";

import { useEffect, useState } from "react";

import { PushPrompt } from "@/components/push/PushPrompt";
import { Sheet } from "@/components/sheet/Sheet";
import { isPromptSnoozed, pushPermission } from "@/lib/push";
import { sr } from "@/lib/sr";
import { clearMissedInvite } from "@/lib/userChannel";

/**
 * „Poziv je istekao" (SPEC_PUSH_V2): prijatelj je zvao dok aplikacija nije bila
 * otvorena, a igrač nema obavještenja. Najjasniji trenutak za ponudu, jer igrač
 * upravo vidi šta je propustio.
 *
 * List se crta SAMO kad ponuda ima smisla (dozvola još nije tražena i ponuda
 * nije ugašena). Ko već ima obavještenja dobio je push za poziv, pa bi list
 * bio samo buka; tada se događaj tiho briše.
 */
export function MissedInviteSheet() {
  const [canOffer, setCanOffer] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    void pushPermission().then((p) => {
      if (!alive) return;
      const ok = p === "prompt" && !isPromptSnoozed();
      if (!ok) clearMissedInvite();
      setCanOffer(ok);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!canOffer) return null;
  return (
    <Sheet title={sr.push.missedTitle} closeLabel={sr.invite.ok} onClose={clearMissedInvite}>
      <p className="sheet__note">{sr.push.missedBody}</p>
      <PushPrompt context="invite_missed" className="pushprompt--end" />
    </Sheet>
  );
}
