"use client";

import type { ProfileAvatar } from "@zandar/shared-types";

import { ArrowRightIcon, ChevronRightIcon, GearIcon, PencilIcon, RetryIcon, WarningIcon } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import type { GameConfig } from "@/lib/games";
import { gameSettingsSummary } from "@/lib/profileView";
import { useQuickPlayPrefs } from "@/lib/quickPlayPrefs";
import { useRaubDeck } from "@/lib/settings";
import { sr } from "@/lib/sr";
import { useTableTheme } from "@/lib/tableTheme";

/**
 * Dijelovi Profila v0.3 (SPEC_PROFIL_POSTAVKE §3, A1/A2) — isti za gosta i
 * za nalog; gost dobija još samo karticu „Sačuvaj napredak".
 */

/** Naslov „Profil" + pilula „Postavke" (D3: ikonica I riječ). */
export function ProfileTop({ onSettings }: { onSettings: () => void }) {
  return (
    <div className="profile__top">
      <h1 className="profile__title">{sr.profile.title}</h1>
      <button type="button" className="profile__gear" onClick={onSettings}>
        <GearIcon className="profile__gear-icon" />
        {sr.profile.settings}
      </button>
    </div>
  );
}

export type IdentityMeta =
  | { status: "loading" }
  | { status: "error"; onRetry: () => void }
  | { status: "ready"; text: string };

/**
 * Kartica igrača: CIJELA je jedno dugme (odluka vlasnika 24.11.2026) i radi
 * isto što i olovka. Olovka ostaje kao znak, bez chevrona — dodir otvara
 * izmjenu, ne novi ekran.
 */
export function IdentityCard({
  name,
  avatar,
  guest,
  meta,
  label,
  onEdit,
}: {
  name: string;
  avatar: ProfileAvatar | null;
  guest: boolean;
  meta: IdentityMeta;
  /** Pristupačni naziv dugmeta („Promijeni ime" / „… nadimak i avatar"). */
  label: string;
  onEdit: () => void;
}) {
  const letter = name.charAt(0).toLocaleUpperCase("sr-Latn");
  return (
    <div className="profile__id">
      <button type="button" className="profile__id-hit" onClick={onEdit} aria-label={`${name} — ${label}`}>
        {avatar ? (
          <Avatar id={avatar} size={64} />
        ) : (
          <span className="profile__letter profile__id-letter" aria-hidden="true">
            {letter}
          </span>
        )}
        <span className="profile__id-text">
          <span className="profile__id-name">
            {name}
            {guest ? <span className="profile__chip">{sr.profile.guestTag}</span> : null}
          </span>
          {meta.status === "ready" ? (
            <span className="profile__meta">{meta.text}</span>
          ) : meta.status === "loading" ? (
            <span className="skeleton profile__skel-meta" aria-label={sr.profile.loading} />
          ) : null}
        </span>
        <PencilIcon className="profile__id-pencil" />
      </button>
      {meta.status === "error" ? (
        // Greška se ne nosi u dugmetu kartice: „Pokušaj ponovo" je svoje dugme.
        <span className="profile__error profile__id-error" role="alert">
          <WarningIcon className="profile__error-icon" />
          {sr.profile.countError}
          <button type="button" className="profile__retry" onClick={meta.onRetry}>
            <RetryIcon className="profile__retry-icon" />
            {sr.profile.retry}
          </button>
        </span>
      ) : null}
    </div>
  );
}

/** Tri pločice: partije · najviše igraš · prijatelji (`null` → „—"). */
export function StatTiles({
  matches,
  mostPlayed,
  friends,
}: {
  matches: number | null;
  mostPlayed: string | null;
  friends: number | null;
}) {
  const p = sr.profile;
  return (
    <dl className="profile__stats">
      <div className="profile__stat">
        <dt className="profile__stat-label">{p.statMatches(matches ?? 0)}</dt>
        <dd className="profile__stat-value">{matches ?? "—"}</dd>
      </div>
      <div className="profile__stat">
        <dt className="profile__stat-label">{p.statMost}</dt>
        <dd className="profile__stat-value">{mostPlayed ?? "—"}</dd>
      </div>
      <div className="profile__stat">
        <dt className="profile__stat-label">{p.statFriends(friends ?? 0)}</dt>
        <dd className="profile__stat-value">{friends ?? "—"}</dd>
      </div>
    </dl>
  );
}

/** Samo gost (D11): stoji iznad igara, da se vidi bez skrola. */
export function SaveProgressCard({ onRegister, onLogin }: { onRegister: () => void; onLogin: () => void }) {
  const p = sr.profile;
  return (
    <section className="profile__save" aria-labelledby="profile-save-title">
      <h2 id="profile-save-title" className="profile__save-title">
        {p.saveTitle}
      </h2>
      <p className="profile__save-body">{p.saveBody}</p>
      <button type="button" className="home__cta profile__save-cta" onClick={onRegister}>
        <span>{p.saveCta}</span>
        <ArrowRightIcon className="home__cta-arrow" />
      </button>
      <button type="button" className="profile__save-login" onClick={onLogin}>
        {p.haveAccount} <u>{p.login}</u>
      </button>
    </section>
  );
}

/** „Moje igre · kako igraš": red = boja igre, ime, trenutni izbor; dodir → list igre. */
export function MyGames({ games, onOpen }: { games: readonly GameConfig[]; onOpen: (game: GameConfig) => void }) {
  return (
    <section className="profile__games" aria-labelledby="profile-games-title">
      <h2 id="profile-games-title" className="profile__section-title">
        {sr.profileGames.title}
      </h2>
      <ul className="profile__game-list">
        {games.map((game) => (
          <li key={game.slug}>
            <GameRow game={game} onOpen={() => onOpen(game)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Opis ispod imena čita isti izbor koji ide serveru („Red = istina", §5). */
function GameRow({ game, onOpen }: { game: GameConfig; onOpen: () => void }) {
  const prefs = useQuickPlayPrefs(game.slug);
  const tableTheme = useTableTheme(game.slug);
  const [deck] = useRaubDeck();
  return (
    <button type="button" className="profile__game" data-tint={game.tint} onClick={onOpen}>
      <span className="profile__game-dot" aria-hidden="true">
        {game.letter}
      </span>
      <span className="profile__game-text">
        <span className="profile__game-name">{sr.games[game.slug].name}</span>
        <span className="profile__game-sub">{gameSettingsSummary(game.slug, { prefs, tableTheme, deck })}</span>
      </span>
      <ChevronRightIcon className="profile__item-chevron" />
    </button>
  );
}
