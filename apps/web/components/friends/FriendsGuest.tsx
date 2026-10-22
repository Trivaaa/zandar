"use client";

import { FriendsIcon } from "@/components/icons";
import { sr } from "@/lib/sr";

/** Tab Prijatelji za gosta — F1: objašnjava zašto treba nalog. */
export function FriendsGuest({
  onRegister,
  onLogin,
}: {
  onRegister: () => void;
  onLogin: () => void;
}) {
  return (
    <div className="profile__col">
      <h1 className="profile__title">{sr.friends.title}</h1>
      <div className="profile__empty">
        <span className="profile__empty-icon" aria-hidden="true">
          <FriendsIcon className="profile__empty-svg" />
        </span>
        <h2 className="profile__empty-title">{sr.friends.guestTitle}</h2>
        <p className="profile__empty-body">{sr.friends.guestBody}</p>
      </div>
      <div className="profile__actions">
        <button type="button" className="home__cta" onClick={onRegister}>
          {sr.profile.register}
        </button>
        <button type="button" className="home__friends" onClick={onLogin}>
          {sr.profile.login}
        </button>
      </div>
    </div>
  );
}
