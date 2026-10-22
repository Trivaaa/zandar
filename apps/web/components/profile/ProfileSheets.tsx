"use client";

import { useState } from "react";

import { PROFILE_AVATARS, type ProfileAvatar } from "@zandar/shared-types";

import { Avatar } from "@/components/profile/Avatar";
import { Sheet } from "@/components/sheet/Sheet";
import { sr } from "@/lib/sr";

/** P6 — promjena avatara: mreža 5×2, Sačuvaj · Odustani. Bez ograničenja učestalosti. */
export function AvatarSheet({
  current,
  onSave,
  onClose,
}: {
  current: ProfileAvatar | null;
  onSave: (avatar: ProfileAvatar) => void;
  onClose: () => void;
}) {
  const [chosen, setChosen] = useState<ProfileAvatar | null>(current);
  return (
    <Sheet title={sr.profile.changeAvatarTitle} closeLabel={sr.account.cancel} onClose={onClose}>
      <div className="acct__avatar-grid" role="radiogroup" aria-label={sr.profile.changeAvatarTitle}>
        {PROFILE_AVATARS.map((a, i) => (
          <button
            key={a}
            type="button"
            role="radio"
            aria-checked={chosen === a}
            aria-label={sr.account.avatarLabel(i + 1)}
            className="acct__avatar-option"
            onClick={() => setChosen(a)}
          >
            <Avatar avatar={a} />
          </button>
        ))}
      </div>
      <button
        type="button"
        className="home__cta sheet__btn"
        disabled={!chosen || chosen === current}
        onClick={() => chosen && onSave(chosen)}
      >
        {sr.profile.save}
      </button>
    </Sheet>
  );
}

/** O1 — potvrda odjave. */
export function LogoutSheet({
  busy,
  onConfirm,
  onClose,
}: {
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet title={sr.profile.logoutTitle} closeLabel={sr.account.cancel} onClose={onClose}>
      <p className="sheet__note">{sr.profile.logoutBody}</p>
      <button type="button" className="home__cta sheet__btn" disabled={busy} aria-busy={busy} onClick={onConfirm}>
        {sr.profile.logout}
      </button>
    </Sheet>
  );
}
