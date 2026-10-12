"use client";

import { useEffect } from "react";

import { ensureSignedIn } from "@/lib/auth";

/**
 * Nalog gosta na startu (docs/Specs/player-profile-v1.md): prvo pokretanje tiho
 * napravi anonimni Firebase nalog, svako sljedeće vrati istu sesiju. Bez ekrana
 * i bez čekanja — igrač ne vidi ništa.
 *
 * Ovdje je samo da token bude spreman PRIJE prvog zahtjeva. Ako ne uspije
 * (nema mreže), `getIdToken` pokuša ponovo uz zahtjev kojem treba, a povratak
 * mreže ovdje okida još jedan pokušaj.
 */
export function AuthBoot() {
  useEffect(() => {
    const attempt = () => void ensureSignedIn();
    attempt();
    window.addEventListener("online", attempt);
    return () => window.removeEventListener("online", attempt);
  }, []);

  return null;
}
