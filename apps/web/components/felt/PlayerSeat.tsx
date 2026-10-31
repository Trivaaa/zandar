"use client";

import type { CSSProperties, ReactNode } from "react";
import { CardBack } from "./CardBack";
import { Avatar } from "@/components/profile/Avatar";
import { sr } from "@/lib/sr";
import type { PublicPlayer } from "@/components/felt/types";

export type PlayerSeatProps = {
  player: PublicPlayer;
  /**
   * Boja tima iz ugla igrača: a = Mi, b = Oni. Bez nje prsten ide po `teamId`,
   * pa bi igrač iz tima 1 svoj tim vidio u boji koju traka daje protivnicima.
   */
  teamTone?: "a" | "b" | undefined;
  isActive?: boolean;
  /** Tvoje sjediste (orientation="bottom"): jaci prsten na potezu. */
  isYou?: boolean;
  secondsRemaining?: number;
  totalSeconds?: number;
  cardCount?: number;
  coins?: number;
  showCoins?: boolean;
  isThinking?: boolean;
  orientation?: "top" | "left" | "right" | "bottom";
  /** Emoji reakcija uz sjedište — da se vidi KO je reagovao. */
  reaction?: ReactNode;
  /** Natpis poteza (`SeatCaption`) — da se vidi KO je upravo odigrao. */
  caption?: ReactNode;
  className?: string | undefined;
  /** Pozicija na pozornici — dolazi kao `--stage-*` varijabla iz GameScreen-a. */
  style?: CSSProperties | undefined;
  /**
   * Dodir na igrača (SPEC_IDENTITET T1/T3): providno dugme preko avatara —
   * pravi `<button>`, bez uticaja na raspored. Bez handlera ga nema.
   */
  onTap?: ((anchor: DOMRect) => void) | undefined;
};

const statusLabel = {
  connected: sr.connection.connected,
  reconnecting: sr.connection.reconnecting,
  abandoned: sr.connection.abandoned,
} as const;

/** Ispod ovoga broj sekundi zamjenjuje slovo u avataru. */
const COUNT_FROM_SECONDS = 10;

function initial(name: string) {
  return name.trim().slice(0, 1).toLocaleUpperCase("sr-Latn");
}

export function PlayerSeat({
  player,
  teamTone,
  isActive = false,
  secondsRemaining = 0,
  totalSeconds = 20,
  cardCount = 0,
  coins = 0,
  showCoins = false,
  isThinking = false,
  orientation = "top",
  reaction,
  caption,
  className = "",
  style,
  onTap,
}: PlayerSeatProps) {
  const team =
    teamTone ?? (player.teamId === undefined ? undefined : player.teamId === 0 ? "a" : "b");

  // Sat drzi roditelj; ovdje se samo crta udio preostalog vremena.
  const countdown = isActive && !isThinking && secondsRemaining > 0;
  const fill = countdown ? Math.max(0, Math.min(1, secondsRemaining / totalSeconds)) : 1;
  const urgent = countdown && secondsRemaining <= 5;
  // Zadnjih 10s broj stoji U avataru. Ranije ne: protivnik koji odigra za par
  // sekundi (a tako igra vecina poteza) ne treba da pali cifre na stolu.
  // `useCountdown` vraca razlomljene sekunde (otkucaj 250ms) — cifra se
  // zaokruzuje NAVISE, pa "1" stoji dok vrijeme zaista ne istekne.
  const wholeSeconds = Math.ceil(secondsRemaining);
  const counting = countdown && wholeSeconds <= COUNT_FROM_SECONDS;

  return (
    <div
      className={`seat seat--${orientation} ${team ? `seat--team-${team}` : ""} ${className}`}
      style={style}
      /* Jedino sidro ovog igraca za `flyAnimation`. Omotac ruke ga je nekad
         nosio takode; dva ista sidra su znacila da `collectCardsToSeat`
         (querySelector, jednina) bira po redoslijedu u DOM-u, a `dealFromDeck`
         (querySelectorAll) tebi dijeli dvaput. Ne vracati ga nazad. */
      data-seat-id={player.id}
      {...(isActive ? { "data-current-turn": true } : {})}
      {...(urgent ? { "data-urgent": true } : {})}
      {...(countdown ? { "data-countdown": true } : {})}
      data-status={player.connectionStatus}
    >
      {reaction ? (
        <div className="seat__reaction" aria-hidden="true">
          {reaction}
        </div>
      ) : null}

      {/* Natpis je APSOLUTAN, kao i lepeza i mjehur reakcije. Red u toku
          sjedišta bi narastao `--stage-partner-h` / `--stage-seat-h`, a te su
          vrijednosti IZMJERENE i svaki njihov piksel je piksel manje za sto
          (v3.5 lekcija). */}
      {caption}

      <div className="seat__body">
        {onTap ? (
          <button
            type="button"
            className="seat__tap"
            aria-label={sr.otherProfile.open(player.displayName)}
            onClick={(e) => onTap(e.currentTarget.getBoundingClientRect())}
          />
        ) : null}
        {/* Bez `text-num-sm`: utility bi iz kasnijeg sloja pobijedio font-size
            koji `.seat__avatar` racuna iz `--seat-avatar`, pa slovo ne bi
            pratilo velicinu avatara. */}
        <div className="seat__avatar font-display" aria-hidden="true">
          {/* Odbrojavanje tudjeg poteza: zlatni prsten koji se prazni kao sat.
              Zamijenio je liniju od 2.4px po dnu cipa — radila je, ali je igrac
              nije vidio (prijavljeno iz zive igre). Prsten ne trosi ni piksel
              rasporeda: crta se preko prstena koji aktivno sjediste vec nosi. */}
          {countdown ? (
            <span
              className="seat__ring"
              style={{ "--seat-fill": fill } as React.CSSProperties}
            />
          ) : null}
          {counting ? (
            <span className="seat__count">{wholeSeconds}</span>
          ) : player.avatar ? (
            // Nalog: avatar UNUTAR prstena (tim i potez ostaju na prstenu).
            <Avatar id={player.avatar} />
          ) : (
            initial(player.displayName)
          )}
        </div>

        <div className="seat__meta">
          {/* Bez `text-base`: velicinu drzi `.seat__name` u felt.css, pa je
              bocno sjediste moze spustiti na 13px i prelomiti u dva reda.
              Utility bi iz kasnijeg sloja pobijedio i to bi tiho otkazalo. */}
          <span className="seat__name font-sans">{player.displayName}</span>
          {/* Rezultat je skinut sa sjedista — stajao je na svakom igracu i bio
              najglasniji broj na feltu, a sad se cita u traci u zaglavlju
              i sam iskoci na kraju svake ruke. Zeton ostaje kao sina
              za kasniju kozmetiku; danas ga niko ne pali. */}
          {showCoins ? (
            <span className="seat__numbers">
              <span className="seat__coins font-display text-num-sm">{coins}</span>
            </span>
          ) : null}
          {/* Status je izuzetak, ne ukras: "Na vezi" ispod svakog imena je sum.
              Boja stanja zivi u felt.css (.seat__status), ne u utility klasi. */}
          {player.connectionStatus !== "connected" ? (
            <span className="seat__status font-sans text-sm">
              {player.left ? sr.connection.left : statusLabel[player.connectionStatus]}
            </span>
          ) : null}

        </div>
      </div>

      <div
        className="seat__fan"
        aria-label={sr.seat.cards(cardCount)}
        style={{ "--fan-n": Math.min(cardCount, 8) } as React.CSSProperties}
      >
        {Array.from({ length: Math.min(cardCount, 8) }, (_, i) => (
          <span key={i} className="seat__fan-slot" style={{ "--fan-i": i } as React.CSSProperties}>
            <CardBack size="xs" />
          </span>
        ))}
      </div>
    </div>
  );
}
