"use client";

import { useState } from "react";

import { PROFILE_AVATARS, type ProfileAvatar } from "@zandar/shared-types";

import { LockIcon } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { Sheet } from "@/components/sheet/Sheet";
import { dayMonth } from "@/lib/dates";
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
        {PROFILE_AVATARS.map((a) => (
          <button
            key={a}
            type="button"
            role="radio"
            aria-checked={chosen === a}
            aria-label={sr.account.avatarNames[a]}
            className="acct__avatar-option"
            onClick={() => setChosen(a)}
          >
            <Avatar id={a} />
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

/**
 * Nadimak i avatar (Profil v0.3): otvara ga dodir na karticu igrača. Isti
 * redovi koji su ranije stajali na Profilu (P1/P2) — nadimak sa bravom od 30
 * dana, avatar → `AvatarSheet`.
 */
export function IdentitySheet({
  nickname,
  avatar,
  nicknameLockedUntil,
  onChangeNickname,
  onChangeAvatar,
  onClose,
}: {
  nickname: string;
  avatar: ProfileAvatar | null;
  nicknameLockedUntil: number | null;
  onChangeNickname: () => void;
  onChangeAvatar: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet title={sr.profile.identityTitle} closeLabel={sr.account.close} onClose={onClose}>
      <div className="profile__rows">
        <div className="settings__row">
          <span className="settings__name">
            <span className="settings__label">{sr.profile.nicknameRow}</span>
            <span className="settings__value">{nickname}</span>
          </span>
          {nicknameLockedUntil !== null ? (
            <span className="profile__locked">
              <LockIcon className="profile__locked-icon" />
              {sr.profile.lockedUntil(dayMonth(nicknameLockedUntil))}
            </span>
          ) : (
            <button type="button" className="settings__change" onClick={onChangeNickname}>
              {sr.profile.change}
            </button>
          )}
        </div>
        <div className="settings__row">
          <span className="settings__name">
            <span className="settings__label">{sr.profile.avatarRow}</span>
            <span className="settings__value profile__row-avatar">
              {avatar ? <Avatar id={avatar} size={40} /> : "—"}
            </span>
          </span>
          <button type="button" className="settings__change" onClick={onChangeAvatar}>
            {sr.profile.change}
          </button>
        </div>
      </div>
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
