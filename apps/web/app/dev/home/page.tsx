"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { HomeScreen } from "@/components/funnel/HomeScreen";
import { GameSheet } from "@/components/home/GameSheet";
import { TabBar } from "@/components/nav/TabBar";
import { GAMES, homeLayout, type GameConfig, type GameSlug, type HomeHistory } from "@/lib/games";
import { sr } from "@/lib/sr";
import { useQueryParam } from "@/lib/useQuery";

/**
 * Harness za početnu preko CIJELOG viewporta (pregib se mjeri ovdje, ne u
 * okviru `/dev/funnel`). Konfiguracija se bira u URL-u, bez izmjene `GAMES`:
 *   ?live=1|2|3   koliko igara je živo (Žandar, pa Poker, pa Raub) — H1/H2/H3
 *   &pin=poker    zakačena igra — H5
 *   &web=0        bez pravnog reda (kao APK)
 * Dodir na red igre otvara pravi list igre (H4); Zakači/Otkači mijenja glavnu.
 */
const NOW = Date.parse("2026-10-23");

export default function DevHomePage() {
  const live = Number(useQueryParam("live") ?? "1");
  const pinParam = useQueryParam("pin");
  // Kačenje iz lista igre radi i ovdje (lokalno stanje, bez localStorage-a).
  const [pinOverride, setPinOverride] = useState<string | null | undefined>(undefined);
  const pin = pinOverride === undefined ? pinParam : pinOverride;
  const [open, setOpen] = useState<GameConfig | null>(null);
  const web = useQueryParam("web") !== "0";

  const { layout, history } = useMemo(() => {
    const order: GameSlug[] = ["zandar", "poker", "raub"];
    const games: GameConfig[] = GAMES.map((g) =>
      order.indexOf(g.slug) < live ? { ...g, status: "live", releasedAt: g.releasedAt ?? "2026-10-20" } : g,
    );
    const h: HomeHistory = {
      pinned: games.some((g) => g.slug === pin && g.status === "live") ? (pin as GameSlug) : null,
      played: live >= 3 ? { poker: NOW - 1 } : {},
    };
    return { layout: homeLayout(games, h), history: h };
  }, [live, pin]);

  return (
    <>
      <HomeScreen
        layout={layout}
        history={history}
        now={NOW}
        loading={false}
        setupSummary={sr.quickSetup.summary(4, 21, sr.tableTheme.names.classic)}
        onPlay={() => undefined}
        onSetup={() => undefined}
        onFriends={() => undefined}
        onOpenGame={setOpen}
        onNotify={() => undefined}
        {...(web
          ? {
              legalSlot: (
                <>
                  <Link href="/privatnost">{sr.home.privacy}</Link>
                  <Link href="/uslovi">{sr.home.terms}</Link>
                  <Link href="/o-nama">{sr.home.about}</Link>
                </>
              ),
            }
          : {})}
        className="screen--tabbed"
      />
      <TabBar />
      {open ? (
        <GameSheet
          game={open}
          pinned={history.pinned === open.slug}
          onPlay={() => setOpen(null)}
          onFriends={() => setOpen(null)}
          onRules={() => setOpen(null)}
          onTogglePin={() => {
            setPinOverride(history.pinned === open.slug ? null : open.slug);
            setOpen(null);
          }}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </>
  );
}
