"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { CardsIcon, FriendsIcon, PersonIcon } from "@/components/icons";
import { sr } from "@/lib/sr";

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

export function TabBar({ friendRequests = 0 }: { friendRequests?: number }) {
  const pathname = usePathname() ?? "/";
  return (
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
  );
}
