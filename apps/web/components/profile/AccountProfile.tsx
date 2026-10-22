"use client";

import type { ProfileAvatar } from "@zandar/shared-types";

import { Avatar } from "@/components/profile/Avatar";
import { sr } from "@/lib/sr";

/**
 * Moj profil — za sada samo vrh P1 i traka A8/P3. Redovi Nadimak/Avatar,
 * Postavke, Odjavi se i Obriši nalog stižu u koracima 6 i 7.
 */
export function AccountProfile({
  nickname,
  avatar,
  completedMatches,
  unverified,
  onResend,
  resent,
}: {
  nickname: string;
  avatar: ProfileAvatar | null;
  completedMatches: number;
  /** A8/P3: traka dok e-mail nije potvrđen. */
  unverified: boolean;
  onResend: () => void;
  resent: boolean;
}) {
  return (
    <div className="profile__col">
      <h1 className="profile__title">{sr.profile.title}</h1>
      {unverified ? (
        <div className="profile__banner" role="status">
          <span>{sr.account.unverified}</span>
          <button type="button" className="profile__banner-btn" onClick={onResend} disabled={resent}>
            {sr.account.sendAgain}
          </button>
        </div>
      ) : null}
      <div className="profile__hero">
        {avatar ? (
          <Avatar avatar={avatar} className="avatar--xl" />
        ) : (
          <span className="profile__letter profile__letter--xl" aria-hidden="true">
            {nickname.charAt(0).toLocaleUpperCase("sr-Latn")}
          </span>
        )}
        <span className="profile__hero-name">{nickname}</span>
        <span className="profile__meta">{sr.profile.completed(completedMatches)}</span>
      </div>
    </div>
  );
}
