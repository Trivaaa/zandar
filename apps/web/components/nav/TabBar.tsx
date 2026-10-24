"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { InviteInbox } from "@/components/friends/InviteInbox";
import { CardsIcon, FriendsIcon, PersonIcon } from "@/components/icons";
import { prefetchFriends } from "@/lib/friends";
import { sr } from "@/lib/sr";
import { useFriendRequestCount } from "@/lib/userChannel";

/**
 * Donja navigacija (SPEC_IDENTITET §4, tabla „1 · Donja navigacija").
 * Samo na tri glavna ekrana — `/`, `/prijatelji`, `/profil`; nigdje u toku
 * igre, sobe, matchinga ni koraka naloga. Ekran koji je nosi dodaje
 * `screen--tabbed`, da sadržaj ne ode ispod trake.
 */
const TABS = [
  { href: "/", label: sr.nav.play, Icon: CardsIcon },
  { href: "/prijatelji", label: sr.nav.friends, Icon: FriendsIcon },
  { href: "/profil", label: sr.nav.profile, Icon: PersonIcon },
] as const;

/** APK export ima `trailingSlash`, pa je `/profil/` isto što i `/profil`. */
function samePath(a: string, b: string): boolean {
  const norm = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);
  return norm(a) === norm(b);
}

export function TabBar() {
  const pathname = usePathname() ?? "/";
  // D4: broj zahtjeva koji čekaju, sa korisničkog kanala (0 za gosta).
  const friendRequests = useFriendRequestCount();
  // Tiho unaprijed: profil i lista prijatelja (samo postojeći nalog, jednom po
  // sesiji), da prvi ulazak u Prijatelji ne čeka dva puta mrežu. Sa malim
  // odmakom, da ne otima mrežu sadržaju ekrana koji se upravo učitava.
  useEffect(() => {
    const timer = window.setTimeout(() => void prefetchFriends(), 1200);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <>
    {/* E4: poziv na partiju stiže na glavnim ekranima — tamo gdje je i traka. */}
    <InviteInbox />
    <nav className="tabbar" aria-label={sr.nav.label}>
      {TABS.map(({ href, label, Icon }) => {
        const active = samePath(pathname, href);
        const badge = href === "/prijatelji" && friendRequests > 0 ? friendRequests : 0;
        return (
          <Link
            key={href}
            href={href}
            className="tabbar__tab"
            aria-current={active ? "page" : undefined}
            // Tab u tab ne gomila istoriju: „nazad" sa taba vodi na Igraj (NativeShell).
            replace
          >
            <span className="tabbar__icon-wrap">
              <Icon className="tabbar__icon" />
              {badge ? (
                <span className="tabbar__badge" aria-label={sr.nav.requests(badge)}>
                  {badge}
                </span>
              ) : null}
            </span>
            <span className="tabbar__label">{label}</span>
          </Link>
        );
      })}
    </nav>
    </>
  );
}
