"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { GAME_IDS, type GameId, type ProfileAvatar } from "@zandar/shared-types";

import { useAccountEntry } from "@/components/account/AccountEntry";
import { VerifyEmailSheet } from "@/components/account/AccountSheets";
import { RetryIcon, WarningIcon } from "@/components/icons";
import { TabBar } from "@/components/nav/TabBar";
import { AccountProfileError } from "@/components/profile/AccountProfile";
import { GameSettingsSheet } from "@/components/profile/GameSettingsSheet";
import {
  IdentityCard,
  MyGames,
  ProfileTop,
  SaveProgressCard,
  StatTiles,
  type IdentityMeta,
} from "@/components/profile/ProfileParts";
import { AvatarSheet, IdentitySheet } from "@/components/profile/ProfileSheets";
import { StatsCard, type StatsCardState } from "@/components/profile/StatsCard";
import { currentAccount, refreshAccount, resendVerification, type AccountInfo } from "@/lib/account";
import { fetchFriends, peekFriends } from "@/lib/friends";
import { GAMES, homeLayout, type GameConfig } from "@/lib/games";
import { useHomeHistory } from "@/lib/homePrefs";
import { isNative } from "@/lib/platform";
import { usePlayerName } from "@/lib/playerName";
import { mostPlayedGame, profileGames, shortEmail } from "@/lib/profileView";
import { saveAvatar, useMe } from "@/lib/profile";
import { namePath, profileStartPath } from "@/lib/routes";
import { sr } from "@/lib/sr";
import { track } from "@/lib/track";
import { useQueryParam } from "@/lib/useQuery";

type ProfileSheet = { kind: "identity" } | { kind: "avatar" } | { kind: "game"; game: GameConfig } | null;

/**
 * Tab Profil (SPEC_PROFIL_POSTAVKE v0.3, A1/A2): ko si, šta igraš i kako.
 * Gost i nalog imaju isti raspored; gost još i „Sačuvaj napredak" (D11, iznad
 * igara). Postavke su poseban ekran (`/postavke`) iza pilule gore desno.
 * Nalog bez nadimka je nedovršen (Q10) — ulazak u Profil ga vraća na A5.
 */
export function ProfileScreen() {
  const router = useRouter();
  const name = usePlayerName();
  const me = useMe();
  const history = useHomeHistory();
  const verifyParam = useQueryParam("potvrda") === "1";
  // `undefined` = Firebase još nije pročitao sesiju (ne znamo ni da li je gost).
  const [account, setAccount] = useState<AccountInfo | null | undefined>(undefined);
  // Google prijava na postojeći nalog ostaje na ovom ekranu — profil se osvježi.
  const entry = useAccountEntry(() => {
    me.retry();
    void refreshAccount().then(setAccount);
  });
  const [verifyDismissed, setVerifyDismissed] = useState(false);
  const [resent, setResent] = useState(false);
  const [sheet, setSheet] = useState<ProfileSheet>(null);
  const [avatarFailed, setAvatarFailed] = useState<ProfileAvatar | null>(null);
  // Broj prijatelja (samo nalog): odmah iz keša, pa svjež sa servera.
  const [friends, setFriends] = useState<number | null>(() => peekFriends()?.friends.length ?? null);

  // Firebase lokalno zna da li je ovo nalog prije nego što server odgovori —
  // nalog dok čeka vidi svoj skeleton (P7), ne ekran gosta.
  const isAccount = me.status === "ready" ? !me.me.anonymous : account != null && !account.anonymous;
  // Dok ni server ni Firebase nisu odgovorili, ekran gosta bi bljesnuo i
  // prijavljenom igraču — zato neutralni skeleton.
  const unknown = me.status !== "ready" && account === undefined;
  const accountReady = isAccount && me.status === "ready" && !!me.me.nickname;

  useEffect(() => {
    if (me.status === "ready" && !me.me.anonymous && !me.me.nickname) router.replace("/nalog/nadimak");
  }, [me, router]);

  // Potvrda e-maila se desi van aplikacije (link u pošti) — osvježi po povratku.
  useEffect(() => {
    const refresh = () => void refreshAccount().then(setAccount);
    // Lokalna sesija stiže bez mreže; `refreshAccount` čeka `user.reload()`.
    void currentAccount().then((a) => setAccount((prev) => (prev === undefined ? a : prev)));
    refresh();
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, []);

  useEffect(() => {
    if (!accountReady) return;
    let alive = true;
    void fetchFriends().then(
      (d) => alive && setFriends(d.friends.length),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [accountReady]);

  const layout = useMemo(() => homeLayout(GAMES, history), [history]);
  const games = useMemo(() => profileGames(layout, history, isNative), [layout, history]);
  const byGame = me.status === "ready" ? me.me.completedMatchesByGame : undefined;
  const most = mostPlayedGame(byGame, history.played, games);

  function resend() {
    setResent(true);
    void resendVerification().catch(() => setResent(false));
  }

  async function changeAvatar(avatar: ProfileAvatar) {
    setSheet(null);
    setAvatarFailed(null);
    try {
      me.update(await saveAvatar(avatar));
    } catch {
      // P4: profil ostaje na starom avataru, poruka nudi ponovni pokušaj.
      setAvatarFailed(avatar);
    }
  }

  function openSettings() {
    track("settings_opened", { from: "profile_pill" });
    router.push("/postavke");
  }

  function openGame(game: GameConfig) {
    track("game_settings_opened", { game: game.slug as "zandar" | "poker" | "raub" | "bela", from: "profile" });
    setSheet({ kind: "game", game });
  }

  const unverified = account?.provider === "password" && !account.emailVerified;
  const verifyOpen = verifyParam && !verifyDismissed;
  const matches = me.status === "ready" ? me.me.completedMatches : null;
  const stats = (
    <StatTiles
      matches={matches}
      mostPlayed={most ? sr.games[most].name : null}
      friends={isAccount ? friends : null}
    />
  );
  const playerStats = me.status === "ready" ? me.me.stats : undefined;
  const myGames = <MyGames games={games} stats={playerStats} onOpen={openGame} />;
  // S1: redoslijed igara kao na početnoj; „Igraj" bez partija = najviše igrana ili prva.
  const statsOrder = games.map((g) => g.slug).filter((s): s is GameId => (GAME_IDS as readonly string[]).includes(s));
  const statsState: StatsCardState =
    me.status === "ready"
      ? { status: "ready", stats: playerStats }
      : me.status === "error"
        ? { status: "error", onRetry: me.retry }
        : { status: "loading" };
  const statsCard = (
    <StatsCard
      state={statsState}
      order={statsOrder}
      fallbackGame={statsOrder.find((g) => g === most) ?? statsOrder[0] ?? "zandar"}
      onPlay={(game) => router.push(profileStartPath(game))}
    />
  );

  let body;
  if (accountReady && me.status === "ready" && me.me.nickname) {
    const nickname = me.me.nickname;
    body = (
      <>
        {unverified ? (
          <div className="profile__banner" role="status">
            <span>{sr.account.unverified}</span>
            <button type="button" className="profile__banner-btn" onClick={resend} disabled={resent}>
              {sr.account.sendAgain}
            </button>
          </div>
        ) : null}
        <IdentityCard
          name={nickname}
          avatar={me.me.avatar}
          guest={false}
          meta={{
            status: "ready",
            text: account?.email ? shortEmail(account.email) : sr.profile.matches(me.me.completedMatches),
          }}
          label={sr.profile.editIdentity}
          onEdit={() => setSheet({ kind: "identity" })}
        />
        {stats}
        {statsCard}
        {myGames}
      </>
    );
  } else if (isAccount && me.status === "error") {
    body = <AccountProfileError onRetry={me.retry} />;
  } else if (isAccount || unknown) {
    body = <ProfileSkeleton />;
  } else {
    const meta: IdentityMeta =
      me.status === "ready"
        ? { status: "ready", text: sr.profile.matches(me.me.completedMatches) }
        : me.status === "error"
          ? { status: "error", onRetry: me.retry }
          : { status: "loading" };
    body = (
      <>
        <IdentityCard
          name={name ?? sr.profile.guestNoName}
          avatar={null}
          // Bez upisanog imena ime je već „Gost" — oznaka bi ga ponovila.
          guest={name !== null}
          meta={meta}
          label={sr.profile.editName}
          onEdit={() => router.push(namePath("home"))}
        />
        {stats}
        <SaveProgressCard
          onRegister={() => {
            track("account_cta_tapped", { action: "register", from: "profile_card" });
            entry.openRegister();
          }}
          onLogin={() => {
            track("account_cta_tapped", { action: "login", from: "profile_card" });
            entry.openLogin();
          }}
        />
        {statsCard}
        {myGames}
      </>
    );
  }

  return (
    <main className="screen profile screen--tabbed">
      <div className="profile__col">
        <ProfileTop onSettings={openSettings} />
        {body}
        {avatarFailed ? (
          <div className="profile__toast" role="alert">
            <span className="profile__toast-text">
              <WarningIcon className="profile__error-icon" />
              {sr.profile.avatarSaveFailed}
            </span>
            <button type="button" className="profile__retry" onClick={() => void changeAvatar(avatarFailed)}>
              <RetryIcon className="profile__retry-icon" />
              {sr.profile.retry}
            </button>
          </div>
        ) : null}
      </div>
      <TabBar />
      {entry.sheet}

      {sheet?.kind === "identity" && me.status === "ready" && me.me.nickname ? (
        <IdentitySheet
          nickname={me.me.nickname}
          avatar={me.me.avatar}
          nicknameLockedUntil={me.me.nicknameChangeAllowedAt}
          onChangeNickname={() => {
            setSheet(null);
            router.push("/nalog/promijeni-nadimak");
          }}
          onChangeAvatar={() => setSheet({ kind: "avatar" })}
          onClose={() => setSheet(null)}
        />
      ) : null}
      {sheet?.kind === "avatar" && me.status === "ready" ? (
        <AvatarSheet current={me.me.avatar} onSave={(a) => void changeAvatar(a)} onClose={() => setSheet(null)} />
      ) : null}
      {sheet?.kind === "game" ? (
        <GameSettingsSheet
          game={sheet.game.slug}
          name={sr.games[sheet.game.slug].name}
          onPlay={() => {
            const slug = sheet.game.slug;
            setSheet(null);
            router.push(profileStartPath(slug));
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {verifyOpen && account?.email ? (
        <VerifyEmailSheet
          email={account.email}
          resent={resent}
          onResend={resend}
          onClose={() => {
            setVerifyDismissed(true);
            router.replace("/profil");
          }}
        />
      ) : null}
    </main>
  );
}

/** P7 — skeleton profila (traka se i dalje vidi). */
function ProfileSkeleton() {
  return (
    <div className="profile__skeleton" aria-busy="true" aria-label={sr.profile.loading}>
      <span className="skeleton profile__skel-id" />
      <span className="skeleton profile__skel-row" />
      <span className="skeleton profile__skel-row" />
      <span className="skeleton profile__skel-row profile__skel-row--sm" />
    </div>
  );
}
