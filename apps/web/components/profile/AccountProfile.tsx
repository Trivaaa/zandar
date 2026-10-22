"use client";

import type { ProfileAvatar } from "@zandar/shared-types";

import {
  ChevronRightIcon,
  GearIcon,
  LockIcon,
  LogoutIcon,
  RetryIcon,
  TrashIcon,
  WarningIcon,
} from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { dayMonth } from "@/lib/dates";
import { sr } from "@/lib/sr";

export type AccountProfileProps = {
  nickname: string;
  avatar: ProfileAvatar | null;
  completedMatches: number;
  /** P2: do kada je nadimak zaključan; `null` = može se mijenjati. */
  nicknameLockedUntil: number | null;
  /** A8/P3: traka dok e-mail nije potvrđen. */
  unverified: boolean;
  onResend: () => void;
  resent: boolean;
  /** P4: zadnje čuvanje avatara nije uspjelo. */
  avatarFailed: boolean;
  onRetryAvatar: () => void;
  onChangeNickname: () => void;
  onChangeAvatar: () => void;
  onSettings: () => void;
  onLogout: () => void;
  /** C1 — ulaz u brisanje naloga. */
  onDelete: () => void;
};

/**
 * Moj profil — P1 sa stanjima P2 (nadimak zaključan), P3 (e-mail nije
 * potvrđen) i P4 (čuvanje nije uspjelo); na dnu C1 „Obriši nalog".
 */
export function AccountProfile(props: AccountProfileProps) {
  const { nickname, avatar, completedMatches, nicknameLockedUntil } = props;
  return (
    <div className="profile__col">
      <h1 className="profile__title">{sr.profile.title}</h1>
      {props.unverified ? (
        <div className="profile__banner" role="status">
          <span>{sr.account.unverified}</span>
          <button
            type="button"
            className="profile__banner-btn"
            onClick={props.onResend}
            disabled={props.resent}
          >
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
            <button type="button" className="settings__change" onClick={props.onChangeNickname}>
              {sr.profile.change}
            </button>
          )}
        </div>
        <div className="settings__row">
          <span className="settings__name">
            <span className="settings__label">{sr.profile.avatarRow}</span>
            <span className="settings__value profile__row-avatar">
              {avatar ? <Avatar avatar={avatar} className="avatar--sm" /> : "—"}
            </span>
          </span>
          <button type="button" className="settings__change" onClick={props.onChangeAvatar}>
            {sr.profile.change}
          </button>
        </div>
        <button type="button" className="profile__item" onClick={props.onSettings}>
          <span className="profile__item-label">
            <GearIcon className="profile__item-icon" />
            {sr.profile.settings}
          </span>
          <ChevronRightIcon className="profile__item-chevron" />
        </button>
        <button type="button" className="profile__item" onClick={props.onLogout}>
          <span className="profile__item-label">
            <LogoutIcon className="profile__item-icon" />
            {sr.profile.logout}
          </span>
        </button>
      </div>

      <button type="button" className="profile__delete" onClick={props.onDelete}>
        <TrashIcon className="profile__delete-icon" />
        {sr.deleteAccount.entry}
      </button>

      {props.avatarFailed ? (
        <div className="profile__toast" role="alert">
          <span className="profile__toast-text">
            <WarningIcon className="profile__error-icon" />
            {sr.profile.avatarSaveFailed}
          </span>
          <button type="button" className="profile__retry" onClick={props.onRetryAvatar}>
            <RetryIcon className="profile__retry-icon" />
            {sr.profile.retry}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** P7 — skeleton cijelog profila (traka se i dalje vidi). */
export function AccountProfileSkeleton() {
  return (
    <div className="profile__col" aria-busy="true" aria-label={sr.profile.loading}>
      <h1 className="profile__title">{sr.profile.title}</h1>
      <div className="profile__hero">
        <span className="skeleton profile__skel-avatar" />
        <span className="skeleton profile__skel-name" />
        <span className="skeleton profile__skel-meta" />
      </div>
      <div className="profile__rows">
        <span className="skeleton profile__skel-row" />
        <span className="skeleton profile__skel-row" />
        <span className="skeleton profile__skel-row profile__skel-row--sm" />
        <span className="skeleton profile__skel-row profile__skel-row--sm" />
      </div>
    </div>
  );
}

/** P8 — profil se nije učitao. */
export function AccountProfileError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="profile__col">
      <h1 className="profile__title">{sr.profile.title}</h1>
      <div className="profile__empty" role="alert">
        <span className="profile__empty-icon" aria-hidden="true">
          <WarningIcon className="profile__empty-svg" />
        </span>
        <h2 className="profile__empty-title">{sr.profile.loadError}</h2>
        <p className="profile__empty-body">{sr.profile.loadErrorBody}</p>
        <button type="button" className="home__cta profile__empty-cta" onClick={onRetry}>
          {sr.profile.retry}
        </button>
      </div>
    </div>
  );
}
