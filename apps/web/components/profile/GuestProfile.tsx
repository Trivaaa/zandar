"use client";

import {
  ChevronRightIcon,
  DevicesIcon,
  FriendsIcon,
  GearIcon,
  RetryIcon,
  StatsIcon,
  TagIcon,
  WarningIcon,
} from "@/components/icons";
import { sr } from "@/lib/sr";

export type GuestProfileProps = {
  /** Ime za stolom; `null` = gost još nije upisao ime. */
  name: string | null;
  /** Broj završenih partija: učitava se, greška ili broj. */
  completed: { status: "loading" } | { status: "error" } | { status: "ready"; count: number };
  onRetry: () => void;
  onRegister: () => void;
  onLogin: () => void;
  onBackToPlay: () => void;
  /** Postavke (SPEC_POCETNA §6, H6) — i gost ih otvara iz Profila. */
  onSettings: () => void;
};

/**
 * Profil gosta — A2, stanja G1 (učitavanje) i G2 (greška). Učitava se samo
 * kartica; dugmad rade odmah, i dok broj partija ne stigne.
 */
export function GuestProfile({
  name,
  completed,
  onRetry,
  onRegister,
  onLogin,
  onBackToPlay,
  onSettings,
}: GuestProfileProps) {
  const shown = name ?? sr.profile.guestNoName;
  const letter = shown.charAt(0).toLocaleUpperCase("sr-Latn");

  return (
    <div className="profile__col">
      <h1 className="profile__title">{sr.profile.title}</h1>

      {completed.status === "loading" ? (
        <div className="profile__card" aria-busy="true" aria-label={sr.profile.loading}>
          <span className="profile__letter skeleton" aria-hidden="true" />
          <span className="profile__card-text">
            <span className="skeleton profile__skel-name" />
            <span className="skeleton profile__skel-meta" />
          </span>
        </div>
      ) : (
        <div className="profile__card" role={completed.status === "error" ? "alert" : undefined}>
          <span className="profile__letter" aria-hidden="true">
            {letter}
          </span>
          <span className="profile__card-text">
            <span className="profile__name">{shown}</span>
            {completed.status === "ready" ? (
              <span className="profile__meta">{sr.profile.guestCompleted(completed.count)}</span>
            ) : (
              <>
                <span className="profile__error">
                  <WarningIcon className="profile__error-icon" />
                  {sr.profile.countError}
                </span>
                <button type="button" className="profile__retry" onClick={onRetry}>
                  <RetryIcon className="profile__retry-icon" />
                  {sr.profile.retry}
                </button>
              </>
            )}
          </span>
        </div>
      )}

      <p className="profile__subtitle">{sr.profile.benefitsTitle}</p>
      <ul className="profile__benefits">
        <li>
          <StatsIcon className="profile__benefit-icon" />
          {sr.profile.benefits.results}
        </li>
        <li>
          <TagIcon className="profile__benefit-icon" />
          {sr.profile.benefits.nickname}
        </li>
        <li>
          <DevicesIcon className="profile__benefit-icon" />
          {sr.profile.benefits.devices}
        </li>
        <li>
          <FriendsIcon className="profile__benefit-icon" />
          {sr.profile.benefits.friends}
        </li>
      </ul>

      <button type="button" className="profile__item" onClick={onSettings}>
        <span className="profile__item-label">
          <GearIcon className="profile__item-icon" />
          {sr.profile.settings}
        </span>
        <ChevronRightIcon className="profile__item-chevron" />
      </button>

      <div className="profile__actions">
        <button type="button" className="home__cta" onClick={onRegister}>
          {sr.profile.register}
        </button>
        <button type="button" className="home__friends" onClick={onLogin}>
          {sr.profile.login}
        </button>
        <button type="button" className="profile__link" onClick={onBackToPlay}>
          {sr.profile.backToPlay}
        </button>
      </div>
    </div>
  );
}
