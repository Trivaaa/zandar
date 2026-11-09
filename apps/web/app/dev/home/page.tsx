"use client";

import { useMemo, useState } from "react";

import { HomeScreen } from "@/components/funnel/HomeScreen";
import { GameSheet } from "@/components/home/GameSheet";
import { TabBar } from "@/components/nav/TabBar";
import { GAMES, gameBadge, homeLayout, type GameConfig, type GameSlug, type HomeHistory } from "@/lib/games";
import { sr } from "@/lib/sr";
import { useQueryParam } from "@/lib/useQuery";

/**
 * Harness za početnu preko CIJELOG viewporta (pregib se mjeri ovdje, ne u
 * okviru `/dev/funnel`). Konfiguracija se bira u URL-u, bez izmjene `GAMES`:
 *   ?live=1|2|3   koliko igara je živo (Žandar, pa Poker, pa Raub) — H1/H2/H3
 *   &pin=poker    zakačena igra — H5
 *   &last=poker   zadnja igrana igra (bez nje niko nije igrao ništa)
 *   &err=1        greška traženja stola (stoji na mjestu mete)
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
  const last = useQueryParam("last");
  const err = useQueryParam("err") === "1";
  // &name=Igor — pozdrav iznad liste (bez njega samo pitanje).
  const name = useQueryParam("name");

  const { layout, history } = useMemo(() => {
    const order: GameSlug[] = ["zandar", "poker", "raub"];
    const games: GameConfig[] = GAMES.map((g) =>
      order.indexOf(g.slug) < live
        ? { ...g, status: "live", releasedAt: g.releasedAt ?? "2026-10-20" }
        : { ...g, status: "upcoming", releasedAt: null },
    );
    const h: HomeHistory = {
      pinned: games.some((g) => g.slug === pin && g.status === "live") ? (pin as GameSlug) : null,
      played: last && games.some((g) => g.slug === last) ? { [last]: NOW - 1 } : {},
    };
    return { layout: homeLayout(games, h), history: h };
  }, [live, pin, last]);

  return (
    <>
      <HomeScreen
        layout={layout}
        history={history}
        now={NOW}
        loading={false}
        {...(err ? { error: sr.quickSetup.error } : {})}
        onPlay={() => undefined}
        onCreate={() => undefined}
        onOpenGame={setOpen}
        onNotify={() => undefined}
        className="screen--tabbed"
        {...(layout.more.length > 0
          ? {
              list: {
                items: [layout.main, ...layout.more].map((game) => ({
                  game,
                  badge: gameBadge(game, history, NOW),
                })),
                loadingSlug: err ? layout.main.slug : null,
                onPlay: () => undefined,
                onCreate: () => undefined,
                greetingName: name,
              },
            }
          : {})}
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
