"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { sr } from "@/lib/sr";

const TABS = [
  { href: "/", label: sr.nav.play },
  { href: "/prijatelji", label: sr.nav.friends },
  { href: "/profil", label: sr.nav.profile },
] as const;

/**
 * Desktop (W2): donja traka prelazi u zaglavlje, bez naziva Kartaonica. CSS ga
 * prikazuje samo na širokom ekranu — tamo isti CSS sakriva donju traku.
 */
export function WebTopNav() {
  const pathname = usePathname() ?? "/";
  return (
    <header className="web-top">
      <nav className="web-top__nav" aria-label={sr.homeWeb.nav}>
        {TABS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="web-top__tab"
            aria-current={pathname === href ? "page" : undefined}
            replace
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
