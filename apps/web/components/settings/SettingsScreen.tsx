"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { FeedbackToggles } from "@/components/FeedbackToggles";
import { ArrowLeftIcon, ChevronRightIcon, DownloadIcon, LogoutIcon, TrashIcon } from "@/components/icons";
import { MetaConsentRow } from "@/components/MetaConsent";
import { TabBar } from "@/components/nav/TabBar";
import { LogoutSheet } from "@/components/profile/ProfileSheets";
import { PushSettingsRows } from "@/components/push/PushSettingsRows";
import { RulesModal } from "@/components/RulesModal";
import { signOutToGuest } from "@/lib/account";
import { unbindPushDevice } from "@/lib/api";
import { useBackHandler } from "@/lib/backHandlers";
import { isNative } from "@/lib/platform";
import { useMe } from "@/lib/profile";
import { getPushId, pushEnabled } from "@/lib/push";
import { sr } from "@/lib/sr";
import { STORE_LINKS } from "@/lib/stores";

/**
 * Postavke (SPEC_PROFIL_POSTAVKE §4, A3 / A3g) — kako radi aplikacija.
 * Poseban ekran iza pilule na Profilu; „‹ Profil" i Android nazad vode nazad.
 * Igre NISU ovdje (D4) — žive u Profilu → „Moje igre". Nadimak i avatar se
 * mijenjaju samo karticom na Profilu. Gost nema grupu „Nalog", ali Privatnost
 * (brisanje podataka) ima uvijek.
 */
export function SettingsScreen() {
  const router = useRouter();
  const me = useMe();
  const isAccount = me.status === "ready" && !me.me.anonymous;
  const [rulesOpen, setRulesOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const storeUrl = isNative ? null : STORE_LINKS["google-play"];

  useBackHandler(rulesOpen, () => setRulesOpen(false));

  function back() {
    // Direktno otvorene Postavke nemaju gdje „nazad" — tad je odredište Profil.
    if (window.history.length > 1) router.back();
    else router.replace("/profil");
  }

  async function logout() {
    setLoggingOut(true);
    // T3: uređaj prestaje da prima obavještenja ovog naloga — prije odjave.
    const pushId = getPushId();
    if (pushId) await unbindPushDevice(pushId);
    try {
      await signOutToGuest();
    } finally {
      setLoggingOut(false);
      setLogoutOpen(false);
      router.replace("/profil");
    }
  }

  const s = sr.settings;
  return (
    <main className="screen profile settings-screen screen--tabbed">
      <div className="profile__col">
        <div className="profile__top">
          <button type="button" className="settings-screen__back" onClick={back}>
            <ArrowLeftIcon className="settings-screen__back-icon" />
            {s.back}
          </button>
        </div>
        <h1 className="profile__title settings-screen__title">{s.title}</h1>

        <Group title={s.groupTable}>
          <div className="settings__feedback">
            <FeedbackToggles />
          </div>
        </Group>

        {pushEnabled ? (
          <Group title={s.groupNotifications}>
            <PushSettingsRows />
          </Group>
        ) : null}

        <Group title={s.groupHelp}>
          <button type="button" className="profile__item" onClick={() => setRulesOpen(true)}>
            <span className="profile__item-label">{s.rules}</span>
            <ChevronRightIcon className="profile__item-chevron" />
          </button>
          <Link href="/utisak" className="profile__item">
            <span className="profile__item-label settings-screen__two">
              {s.sendFeedback}
              <small>{s.sendFeedbackNote}</small>
            </span>
            <ChevronRightIcon className="profile__item-chevron" />
          </Link>
          {storeUrl ? (
            <a className="profile__item" href={storeUrl} target="_blank" rel="noopener noreferrer">
              <span className="profile__item-label">
                <DownloadIcon className="profile__item-icon" />
                {s.getApp}
              </span>
              <ChevronRightIcon className="profile__item-chevron" />
            </a>
          ) : null}
        </Group>

        <Group title={s.groupPrivacy}>
          <MetaConsentRow />
          <Link href="/delete-account" className="profile__item">
            <span className="profile__item-label">{s.deleteData}</span>
            <ChevronRightIcon className="profile__item-chevron" />
          </Link>
        </Group>

        {isAccount ? (
          <Group title={s.groupAccount}>
            <button type="button" className="profile__item" onClick={() => setLogoutOpen(true)}>
              <span className="profile__item-label">
                <LogoutIcon className="profile__item-icon" />
                {sr.profile.logout}
              </span>
            </button>
            <button type="button" className="profile__delete" onClick={() => router.push("/nalog/brisanje")}>
              <TrashIcon className="profile__delete-icon" />
              {sr.deleteAccount.entry}
            </button>
          </Group>
        ) : null}
      </div>

      {/* Privatnost / uslovi / o nama — jedino mjesto u Profilu i Postavkama
          (odluka vlasnika 24.11.2026: skinuto sa dna Profila). */}
      <footer className="home__legal">
        <Link href="/privatnost">{sr.home.privacy}</Link>
        <Link href="/uslovi">{sr.home.terms}</Link>
        <Link href="/o-nama">{sr.home.about}</Link>
      </footer>
      <TabBar />

      {logoutOpen ? (
        <LogoutSheet busy={loggingOut} onConfirm={() => void logout()} onClose={() => setLogoutOpen(false)} />
      ) : null}
      <div className="home-layer">
        <RulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />
      </div>
    </main>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="settings-screen__group" aria-label={title}>
      <h2 className="settings__section-title">{title}</h2>
      {children}
    </section>
  );
}
