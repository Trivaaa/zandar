"use client";

import { useAccountEntry } from "@/components/account/AccountEntry";
import { InviteSheet } from "@/components/friends/InviteSheet";
import { Sheet } from "@/components/sheet/Sheet";
import { useMe } from "@/lib/profile";
import { sr } from "@/lib/sr";

/**
 * „Pozovi iz prijatelja" iz lobija (tabla P1, F1–F6). Nalog se provjerava tek
 * na dodir, ne pri svakom otvaranju sobe: gost → F5, nalog → lista prijatelja
 * (`InviteSheet`, čije je prazno stanje F6). Ni u jednom slučaju dugme ne vodi
 * u prazno — uvijek ostaje „Pošalji pozivnicu linkom".
 */
export function RoomInviteSheet({
  roomId,
  onShareLink,
  onClose,
}: {
  roomId: string;
  onShareLink: () => void;
  onClose: () => void;
}) {
  const me = useMe();
  // Registracija Google-om ostaje na ovom ekranu: isti `uid`, pa svjež `me`
  // prebacuje list sa F5 na listu prijatelja (prazna → F6).
  const entry = useAccountEntry(() => me.retry());

  if (me.status === "loading") return null;
  if (me.status === "ready" && !me.me.anonymous) {
    return <InviteSheet roomId={roomId} onShareLink={onShareLink} onClose={onClose} />;
  }
  return (
    <>
      <InviteGuestSheet
        onRegister={entry.openRegister}
        onShareLink={() => {
          onClose();
          onShareLink();
        }}
        onClose={onClose}
      />
      {entry.sheet}
    </>
  );
}

/** F5: host je gost — prijatelji traže nalog, a link radi i bez njega. */
function InviteGuestSheet({
  onRegister,
  onShareLink,
  onClose,
}: {
  onRegister: () => void;
  onShareLink: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet title={sr.friends.guestTitle} closeLabel={sr.invite.close} onClose={onClose}>
      <p className="sheet__note sheet__note--muted">{sr.friends.guestBody}</p>
      <button type="button" className="home__cta sheet__btn" onClick={onRegister}>
        {sr.profile.register}
      </button>
      <button type="button" className="home__friends sheet__btn" onClick={onShareLink}>
        {sr.invite.linkInstead}
      </button>
    </Sheet>
  );
}
