"use client";

import type { ComponentProps } from "react";
import type {
  BelaCallOptions,
  BelaHandResult,
  BelaPlacement,
  BelaPlayerDeclarations,
  BelaTeam,
  Card,
  PublicPlayer,
  Suit,
} from "@zandar/shared-types";

import { FeedbackForm } from "@/components/feedback/FeedbackForm";
import { PlayerHand } from "@/components/felt/PlayerHand";
import { BugIcon, ChevronRightIcon } from "@/components/icons";
import { PlayingCard } from "@/components/felt/PlayingCard";
import { PokerAvatar } from "@/components/poker/PokerParts";
import { withSuits } from "@/components/raub/RaubParts";
import { huSuitIcon } from "@/lib/hungarianDeck";
import {
  belaHandRows,
  belaHandTable,
  belaOutcome,
  belaOutcomeSentence,
  belaScoreTable,
  declarationLabel,
  progressPercent,
  suitTitle,
} from "@/lib/belaView";
import { SUIT_SYMBOL } from "@/lib/raubView";
import { sr } from "@/lib/sr";
import { PushPrompt } from "@/components/push/PushPrompt";

/** Rezultat u zaglavlju: „MI 412 : 380 VI", ispod „ova ruka 34 : 21" (dodir otvara tabelu). */
export function BelaScore({
  match,
  live,
  target,
  onOpen,
}: {
  match: [number, number];
  live: [number, number] | null;
  target: number;
  onOpen: () => void;
}) {
  return (
    <button type="button" className="bl-score" onClick={onOpen} aria-label={sr.bela.score.open}>
      <span className="bl-score__line">
        <span className="bl-score__mi">{sr.bela.score.mi}</span>
        <b>{match[0]}</b>
        <i aria-hidden="true">:</i>
        <b>{match[1]}</b>
        <span className="bl-score__vi">{sr.bela.score.vi}</span>
      </span>
      <small>{live ? sr.bela.score.live(live[0], live[1]) : sr.bela.score.to(target)}</small>
    </button>
  );
}

/** Panel zvanja aduta: četiri boje i „Dalje"; kod musa bez „Dalje" i sa razlogom (B2, B3). */
export function CallPanel({
  options,
  seconds,
  busy,
  onCall,
}: {
  options: BelaCallOptions;
  seconds: number;
  busy: boolean;
  onCall: (suit: Suit | null) => void;
}) {
  const must = !options.canPass;
  return (
    <div className="bl-panel" data-must={must || undefined} role="group" aria-label={sr.bela.call.title}>
      <div className="bl-panel__head">
        <b>{must ? sr.bela.call.must : sr.bela.call.title}</b>
        <small>{must ? sr.bela.call.mustSub : sr.bela.call.yourTurn(seconds)}</small>
      </div>
      <div className="bl-suits">
        {options.suits.map((s) => (
          <button key={s} type="button" className="bl-suit" disabled={busy} onClick={() => onCall(s)}>
            {/* eslint-disable-next-line @next/next/no-img-element -- mala statična ikonica, i u APK exportu */}
            <img src={huSuitIcon(s)} alt="" draggable={false} />
            <span>{suitTitle(s)}</span>
          </button>
        ))}
      </div>
      {must ? null : (
        <button type="button" className="bl-pass" disabled={busy} onClick={() => onCall(null)}>
          {sr.bela.bid.pass}
        </button>
      )}
    </div>
  );
}

/** Traka zvanja uz prvu kartu (odluka 9): „Terca u žiru · 20" + Zovi / Ne zovem. */
export function DeclarationBar({
  cards,
  label,
  points,
  declare,
  onChange,
}: {
  cards: readonly Card[];
  label: string;
  points: number;
  declare: boolean;
  onChange: (declare: boolean) => void;
}) {
  return (
    <div className="bl-decl" role="group" aria-label={label}>
      <span className="bl-decl__cards" aria-hidden="true">
        {cards.slice(0, 4).map((c) => (
          <PlayingCard key={c.id} card={c} size="sm" />
        ))}
      </span>
      <span className="bl-decl__text">
        <b>{withSuits(label)}</b>
        <small>{sr.bela.decl.sub}</small>
      </span>
      <span className="bl-seg">
        <button type="button" data-on={declare || undefined} aria-pressed={declare} onClick={() => onChange(true)}>
          {sr.bela.decl.say(points)}
        </button>
        <button type="button" data-on={!declare || undefined} aria-pressed={!declare} onClick={() => onChange(false)}>
          {sr.bela.decl.skip}
        </button>
      </span>
    </div>
  );
}

/** Traka iznad ruke: potez i razlog zatamnjenih karata; zeleni okvir kad si na redu. */
export function TurnBar({ text, active, warn }: { text: string; active: boolean; warn: boolean }) {
  return (
    <div className="bl-turn" data-active={active || undefined} data-warn={warn || undefined} role="status">
      {withSuits(text)}
    </div>
  );
}

/**
 * Ruka u dva reda po 4 (odluka 8). Svaki red je `PlayerHand` (isti dodir,
 * prevlačenje i zatamnjenje kao u ostalim igrama); gornji red se preklapa sa
 * donjim, pa je kartu iz njega dovoljno dodirnuti na vidljivom dijelu.
 */
export function BelaHand({
  cards,
  ...rest
}: Omit<ComponentProps<typeof PlayerHand>, "cards" | "className"> & { cards: Card[] }) {
  const [back, front] = belaHandRows(cards);
  return (
    <div className="bl-hand" data-rows={back.length > 0 ? 2 : 1}>
      {back.length > 0 ? <PlayerHand cards={back} className="bl-hand__row bl-hand__row--back" {...rest} /> : null}
      <PlayerHand cards={front} className="bl-hand__row bl-hand__row--front" {...rest} />
    </div>
  );
}

/** Pokazivanje zvanja poslije prvog štiha (P-6, tabla B7): karte tima koji ih boduje. */
export function DeclarationShow({
  shown,
  nameOf,
}: {
  shown: readonly BelaPlayerDeclarations[];
  nameOf: (id: string) => string;
}) {
  const first = shown.find((p) => p.declarations.length > 0);
  if (!first) return null;
  return (
    <div className="bl-show" role="status">
      {shown
        .filter((p) => p.declarations.length > 0)
        .map((p) => (
          <div key={p.playerId} className="bl-show__who">
            <b>
              {sr.bela.decl.shown(nameOf(p.playerId))} ·{" "}
              {withSuits(p.declarations.map(declarationLabel).join(" + "))}
            </b>
            <span className="bl-show__cards">
              {p.declarations.flatMap((d) => d.cards).map((c, i) => (
                <PlayingCard key={`${c.id}-${i}`} card={c} size="sm" />
              ))}
            </span>
          </div>
        ))}
      <small>{sr.bela.decl.shownWins}</small>
    </div>
  );
}

/** Pregled ruke (B9): ishod jednom rečenicom, odakle su bodovi, dugme hosta. */
export function BelaHandSummary({
  result,
  myTeam,
  match,
  target,
  isHost,
  hostName,
  busy,
  onNextHand,
  onTable,
}: {
  result: BelaHandResult;
  myTeam: BelaTeam | null;
  match: [number, number];
  target: number;
  isHost: boolean;
  hostName: string;
  busy: boolean;
  onNextHand: () => void;
  onTable: () => void;
}) {
  const outcome = belaOutcome(result, myTeam);
  const rows = belaHandTable(result, myTeam);
  const suit = result.trumpSuit ? `${suitTitle(result.trumpSuit).toLowerCase()} ${SUIT_SYMBOL[result.trumpSuit]}` : null;
  return (
    <div className="pk-card-scrim rb-summary-scrim">
      <div className="pk-card bl-summary" role="dialog" aria-modal="true" aria-label={sr.bela.summary.hand(result.dealNo, suit)}>
        <div className="bl-summary__head">
          <span className="bl-outcome" data-tone={outcome.tone}>
            {outcome.label}
          </span>
          <div>
            <h3>{withSuits(sr.bela.summary.hand(result.dealNo, suit))}</h3>
            <p>{belaOutcomeSentence(result, myTeam)}</p>
          </div>
        </div>
        {rows.length > 0 ? (
          <table className="bl-rows">
            <thead>
              <tr>
                <th />
                <th className="bl-mi">{sr.bela.score.mi}</th>
                <th className="bl-vi">{sr.bela.score.vi}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} {...(r.kind ? { "data-kind": r.kind } : {})}>
                  <th>{r.label}</th>
                  <td>{r.mine}</td>
                  <td>{r.theirs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        <div className="bl-match">
          <span>{sr.bela.summary.match}</span>
          <b>
            <span className="bl-mi">{sr.bela.score.mi}</span> {match[0]} : {match[1]}{" "}
            <span className="bl-vi">{sr.bela.score.vi}</span>
          </b>
          <small>{sr.bela.score.to(target)}</small>
        </div>
        <div className="pk-card__actions">
          {isHost ? (
            <button type="button" className="pk-card__primary" disabled={busy} onClick={onNextHand}>
              {sr.bela.summary.next}
            </button>
          ) : (
            <span className="pk-card__status">{sr.bela.summary.waitingHost(hostName)}</span>
          )}
          <button type="button" className="pk-card__secondary" onClick={onTable}>
            {sr.bela.summary.table}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Tabela meča (B10): ruka po red, Mi / Vi, oznake, traka do cilja. */
export function BelaTableSheet({
  history,
  myTeam,
  match,
  target,
  onClose,
}: {
  history: readonly BelaHandResult[];
  myTeam: BelaTeam | null;
  match: [number, number];
  target: number;
  onClose: () => void;
}) {
  const rows = belaScoreTable(history, myTeam);
  return (
    <div className="rb-sheet-scrim" onClick={onClose}>
      <div className="rb-sheet" role="dialog" aria-modal="true" aria-label={sr.bela.table.title(target)} onClick={(e) => e.stopPropagation()}>
        <span className="rb-sheet__grip" aria-hidden="true" />
        <h3>{sr.bela.table.title(target)}</h3>
        <div className="rb-sheet__scroll">
          {rows.length === 0 ? (
            <p>{sr.bela.table.empty}</p>
          ) : (
            <table className="rb-grid bl-grid">
              <thead>
                <tr>
                  <th>{sr.bela.table.hand}</th>
                  <th className="bl-mi">{sr.bela.score.mi}</th>
                  <th className="bl-vi">{sr.bela.score.vi}</th>
                  <th aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.dealNo}>
                    <th>{r.dealNo}</th>
                    <td>{r.mine}</td>
                    <td>{r.theirs}</td>
                    <td className="bl-grid__tag">{r.tag ? <span>{r.tag}</span> : null}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th>{sr.bela.table.total}</th>
                  <td>{match[0]}</td>
                  <td>{match[1]}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
        <div className="bl-bars" aria-hidden="true">
          <div>
            <span className="bl-mi">{sr.bela.score.mi}</span>
            <i>
              <em style={{ width: `${progressPercent(match[0], target)}%` }} />
            </i>
            <b>{match[0]}</b>
          </div>
          <div>
            <span className="bl-vi">{sr.bela.score.vi}</span>
            <i>
              <em data-vi style={{ width: `${progressPercent(match[1], target)}%` }} />
            </i>
            <b>{match[1]}</b>
          </div>
        </div>
        <p className="rb-sheet__pending">{sr.bela.table.note}</p>
        <button type="button" className="pk-card__secondary rb-sheet__close" onClick={onClose}>
          {sr.bela.table.close}
        </button>
      </div>
    </div>
  );
}

/** Kraj meča (B11): ekran pripada timu, ne igraču. */
export function BelaMatchEnd({
  placements,
  myPlayerId,
  myTeam,
  match,
  hands,
  playerOf,
  abandoned,
  mode,
  busy,
  onPlayAgain,
  onRematch,
  onLeave,
  onTable,
}: {
  placements: readonly BelaPlacement[];
  myPlayerId: string;
  myTeam: BelaTeam | null;
  match: [number, number];
  hands: number;
  playerOf: (id: string) => PublicPlayer | undefined;
  abandoned: boolean;
  mode: "quick" | "host" | "guest";
  busy: boolean;
  onPlayAgain: () => void;
  onRematch: () => void;
  onLeave: () => void;
  onTable: () => void;
}) {
  const winners = placements.filter((p) => p.place === 1);
  const won = winners.some((p) => p.team === (myTeam ?? 0));
  const title = abandoned ? sr.bela.end.abandoned : won ? sr.bela.end.win : sr.bela.end.lose;
  const names = winners.map((p) => (p.playerId === myPlayerId ? sr.poker.you : (playerOf(p.playerId)?.displayName ?? "")));
  return (
    <div className="pk-card-scrim">
      <div className="pk-card bl-end" role="dialog" aria-modal="true" aria-label={title}>
        <h3 data-won={(!abandoned && won) || undefined}>{title}</h3>
        {!abandoned && winners.length > 0 ? (
          <div className="bl-end__pair">
            {winners.map((p) => (
              <PokerAvatar key={p.playerId} player={playerOf(p.playerId)} />
            ))}
          </div>
        ) : null}
        <p className="bl-end__score">
          <span className="bl-mi">{sr.bela.score.mi}</span> {match[0]} : {match[1]}{" "}
          <span className="bl-vi">{sr.bela.score.vi}</span>
        </p>
        {!abandoned && names.length === 2 ? (
          <p>
            {sr.bela.end.team(names[0]!, names[1]!)} · {sr.bela.end.hands(hands)}
          </p>
        ) : null}
        <div className="pk-card__actions">
          {mode === "quick" ? (
            <button type="button" className="pk-card__primary" disabled={busy} onClick={onPlayAgain}>
              {sr.bela.end.playAgain}
            </button>
          ) : mode === "host" && !abandoned ? (
            <button type="button" className="pk-card__primary" disabled={busy} onClick={onRematch}>
              {sr.bela.end.rematch}
            </button>
          ) : !abandoned ? (
            <span className="pk-card__status">{sr.poker.waitingRematch}</span>
          ) : null}
          {!abandoned ? (
            <button type="button" className="pk-card__secondary" onClick={onTable}>
              {sr.bela.end.table}
            </button>
          ) : null}
          <button type="button" className="pk-card__secondary" onClick={onLeave}>
            {sr.bela.end.home}
          </button>
        </div>
        {/* SPEC_PUSH_V2 A1 — samo aplikacija, ispod dugmadi. */}
        {!abandoned ? <PushPrompt context="match_end" className="pushprompt--end" /> : null}
      </div>
    </div>
  );
}

/**
 * Prijava greške sa stola (odluka 17) — okruglo dugme na mjestu zvuka (odluka
 * 18), isti izgled kao `TableSoundButton`.
 */
export function BugButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="table-sound bl-bug"
      aria-label={sr.bela.beta.report}
      onClick={onClick}
    >
      <BugIcon className="bl-bug__icon" />
    </button>
  );
}

/** Red „Prijavi grešku" u meniju stola (drugi put do iste forme). */
export function ReportMenuRow({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="gamemenu__row" onClick={onClick}>
      <BugIcon className="bl-menu-bug" />
      <span className="gamemenu__row-label">{sr.bela.beta.report}</span>
      <ChevronRightIcon className="bl-menu-chev" />
    </button>
  );
}

/**
 * Beta prozor prije prve Bela partije (odluka 16; `useBelaBetaGate`): igra je
 * nova i POKAZUJE gdje je dugme za prijavu greške i kako izgleda (isto okruglo
 * dugme kao na stolu).
 * Bez prijave odmah — igrač još nije ni igrao (vlasnik, 21.11.2026).
 * Jednom po uređaju (`lib/belaBeta.ts`).
 */
export function BelaBetaSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="pk-card-scrim bl-beta-scrim">
      <div className="pk-card bl-beta" role="dialog" aria-modal="true" aria-labelledby="bl-beta-title">
        <span className="game-beta bl-beta__tag">{sr.beta.tag}</span>
        <h3 id="bl-beta-title">{sr.bela.beta.title}</h3>
        <p>{sr.bela.beta.body}</p>
        <div className="bl-beta__how">
          <span className="table-sound bl-bug bl-beta__demo" aria-hidden="true">
            <BugIcon className="bl-bug__icon" />
          </span>
          <p>{sr.bela.beta.how}</p>
        </div>
        <div className="pk-card__actions">
          <button type="button" className="pk-card__primary" onClick={onClose}>
            {sr.bela.beta.ok}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Forma za grešku kao sloj preko stola — partija ostaje otvorena ispod. */
export function BelaReportSheet({ context, onClose }: { context: string; onClose: () => void }) {
  return (
    <div className="bl-report" role="dialog" aria-modal="true" aria-label={sr.feedback.tableTitle}>
      <FeedbackForm onBack={onClose} onDone={onClose} table={{ context }} />
    </div>
  );
}
