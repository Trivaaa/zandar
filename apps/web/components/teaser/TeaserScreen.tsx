"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import type { UpcomingGameSlug } from "@zandar/shared-types";

import { BrandLockup } from "@/components/brand/BrandLockup";
import { CardBack } from "@/components/felt/CardBack";
import { PlayingCard } from "@/components/felt/PlayingCard";
import { ArrowLeftIcon } from "@/components/icons";
import { SignupForm } from "@/components/teaser/SignupForm";
import { findUpcomingGame, type UpcomingGame } from "@/lib/games";
import { sr } from "@/lib/sr";
import { track } from "@/lib/track";

/** Tri karte: asovi za poker, prigušene poleđine za igre bez naše reprezentacije. */
function Motif({ game }: { game: UpcomingGame }) {
  return (
    <div className="card-fan teaser__fan" data-backs={game.heroCards ? undefined : "true"} aria-hidden="true">
      {[0, 1, 2].map((i) => {
        const face = game.heroCards?.[i];
        return (
          <div key={i} className="card-fan-slot">
            {face ? (
              <PlayingCard card={{ id: `teaser-${face.rank}-${face.suit}`, ...face }} size="md" />
            ) : (
              <CardBack size="md" />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Teaser jedne buduće igre — ista stranica za svaku, podaci iz `lib/games.ts`
 * i `sr.games`. Nema dugmeta za igru, drugih igara ni preuzimanja: jedina
 * radnja je prijava.
 */
export function TeaserScreen({ slug }: { slug: UpcomingGameSlug }) {
  const router = useRouter();
  const game = findUpcomingGame(slug);
  const copy = sr.games[slug];
  // Jednom po prikazu. Ref preživljava StrictMode-ovo dvostruko montiranje u dev-u.
  const opened = useRef(false);

  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    track("teaser_opened", { game: slug });
  }, [slug]);

  // Nazad vraća home sa skrolom (router čuva poziciju). Direktno otvoren link
  // nema istoriju — tad je odredište home.
  const back = () => {
    if (window.history.length > 1) router.back();
    else router.push("/");
  };

  if (!game) return null;

  return (
    <main className="screen teaser">
      <header className="teaser__top">
        <button type="button" className="namestep__back teaser__back" onClick={back}>
          <ArrowLeftIcon className="namestep__back-icon" />
          <span>{sr.backLabel}</span>
        </button>
        <BrandLockup />
      </header>

      <div className="teaser__body">
        <section className="teaser__intro" aria-labelledby="teaser-name">
          <div className="teaser__head">
            <div className="teaser__heading">
              <span className="teaser__tag">{sr.teaser.tag}</span>
              <h1 id="teaser-name" className="teaser__name">
                {copy.name}
              </h1>
              <p className="teaser__status">{copy.status}</p>
            </div>
            <Motif game={game} />
          </div>
          <h2 className="teaser__title">{sr.teaser.title}</h2>
          <p className="teaser__text">{copy.body}</p>
        </section>

        <SignupForm game={slug} onBackToGame={() => router.push("/")} />
      </div>

      <footer className="home__legal teaser__legal">
        <Link href="/privatnost">{sr.home.privacy}</Link>
        <Link href="/uslovi">{sr.home.terms}</Link>
        <Link href="/o-nama">{sr.home.about}</Link>
      </footer>
    </main>
  );
}
