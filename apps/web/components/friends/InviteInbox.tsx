"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Sheet } from "@/components/sheet/Sheet";
import { acceptInvite } from "@/lib/invites";
import { roomPath } from "@/lib/routes";
import { sr } from "@/lib/sr";
import {
  clearExpiredInvite,
  dismissInvite,
  useExpiredInvite,
  useIncomingInvites,
} from "@/lib/userChannel";

/**
 * E4 — poziv dok je igrač u aplikaciji, na glavnim ekranima (gdje je donja
 * traka): „X te zove na partiju" · Pridruži se · Ne sada. U partiji se ne
 * prikazuje: kanal ga ponovo javi kad se igrač vrati, ako još važi.
 * Istekao poziv → F7.
 */
export function InviteInbox() {
  const router = useRouter();
  const invites = useIncomingInvites();
  const [busy, setBusy] = useState(false);
  const [expiredHere, setExpired] = useState(false);
  // F7 i iz push-a (tap na poziv koji je u međuvremenu istekao, NativePush).
  const expiredFromPush = useExpiredInvite();
  const expired = expiredHere || expiredFromPush;
  const [error, setError] = useState<string | null>(null);

  if (expired) {
    return (
      <Sheet
        title={sr.invite.expiredTitle}
        closeLabel={sr.invite.ok}
        onClose={() => {
          setExpired(false);
          clearExpiredInvite();
        }}
      >
        <p className="sheet__note">{sr.invite.expiredBody}</p>
      </Sheet>
    );
  }

  const invite = invites.at(-1);
  if (!invite) return null;

  async function join() {
    if (!invite) return;
    setBusy(true);
    setError(null);
    const result = await acceptInvite(invite.roomId);
    setBusy(false);
    if (result === "ok") {
      dismissInvite(invite.roomId);
      router.push(roomPath(invite.roomId));
    } else if (result === "expired") {
      dismissInvite(invite.roomId);
      setExpired(true);
    } else {
      setError(sr.account.genericError);
    }
  }

  return (
    <Sheet
      title={sr.invite.incomingTitle(invite.fromNickname)}
      closeLabel={sr.invite.notNow}
      // „Ne sada" samo zatvara — poziv i dalje važi do isteka (§11).
      onClose={() => dismissInvite(invite.roomId)}
    >
      <p className="sheet__note">{sr.invite.incomingBody(invite.playerCount, invite.targetScore)}</p>
      <button type="button" className="home__cta sheet__btn" disabled={busy} aria-busy={busy} onClick={() => void join()}>
        {sr.invite.join}
      </button>
      {error ? (
        <p className="acct__error" role="status">
          {error}
        </p>
      ) : null}
    </Sheet>
  );
}
