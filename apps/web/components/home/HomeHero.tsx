"use client";

import type { Ref } from "react";

import { BrandLockup } from "@/components/brand/BrandLockup";
import { PlayingCard } from "@/components/felt/PlayingCard";
import { ArrowRightIcon, FriendsIcon, GearIcon } from "@/components/icons";
import { HOME_HERO_CARDS } from "@/lib/games";
import { isStaging } from "@/lib/platform";
import { sr } from "@/lib/sr";

export type HomeHeroProps = {
  onPlay: () => void;
  onFriends: () => void;
  onOpenSettings: () => void;
  settingsButtonRef?: Ref<HTMLButtonElement> | undefined;
  loading: boolean;
  error?: string | undefined;
};

/**
 * Gornji dio home-a: brend, motiv, ime igre i dvije radnje.
 *
 * Glavni CTA mora stati iznad pregiba na 360×760, pa motiv karata raste sa
 * `dvh` i ima plafon (`--hero-card-w` u home.css) — na niskom ekranu se
 * smanjuju karte, ne gura se dugme.
 */
export function HomeHero({
  onPlay,
  onFriends,
  onOpenSettings,
  settingsButtonRef,
  loading,
  error,
}: HomeHeroProps) {
  return (
    <>
      <header className="home__top">
        <BrandLockup />
        {isStaging ? <span className="home__env">STAGING</span> : null}
        <button
          ref={settingsButtonRef}
          type="button"
          className="home__settings"
          onClick={onOpenSettings}
          aria-label={sr.settings.title}
          aria-haspopup="dialog"
        >
          <GearIcon className="home__settings-icon" />
        </button>
      </header>

      <section className="home__hero" aria-labelledby="home-title">
        {/* Dekoracija: PlayingCard nosi aria-label igraće karte, ovdje to nije. */}
        <div className="card-fan" aria-hidden="true">
          {HOME_HERO_CARDS.map((face) => (
            <div key={`${face.rank}${face.suit}`} className="card-fan-slot">
              <PlayingCard card={{ id: `home-${face.rank}-${face.suit}`, ...face }} size="md" />
            </div>
          ))}
        </div>

        <h1 id="home-title" className="home__title">
          {sr.home.game}
        </h1>
        <p className="home__tagline">{sr.home.tagline}</p>

        <div className="home__actions">
          <button
            type="button"
            className="home__cta"
            onClick={onPlay}
            disabled={loading}
            aria-busy={loading}
          >
            <span>{loading ? sr.home.playLoading : sr.home.play}</span>
            {loading ? null : <ArrowRightIcon className="home__cta-arrow" />}
          </button>
          <p className="home__note">{sr.home.playNote}</p>

          {/* Rezervisan red: greška ne pomjera dugme ispod nje. */}
          <p className="home__error" data-empty={!error} role="status">
            {error ?? ""}
          </p>

          <button type="button" className="home__friends" onClick={onFriends}>
            <FriendsIcon className="home__friends-icon" />
            <span>{sr.home.friends}</span>
          </button>
          <p className="home__note">{sr.home.friendsNote}</p>
        </div>
      </section>
    </>
  );
}
