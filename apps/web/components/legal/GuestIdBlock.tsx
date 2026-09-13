"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { peekGuestId } from "@/lib/guestId";
import { CONTACT_EMAIL } from "@/lib/contact";
import { sr } from "@/lib/sr";

/**
 * Prikaz guest ID-a + mailto zahtjev za brisanje.
 *
 * Jedini klijentski list na `/delete-account` — stranica i njena ljuska ostaju
 * server komponente, pa se i dalje prerenderuju u oba builda (`output: export`
 * za Capacitor).
 *
 * Zasto ID uopste stoji na stranici: server NE cuva guestId (zivi samo na
 * socketu u memoriji), pa ne postoji nacin da se zahtjev za brisanje poveze sa
 * podacima bez broja koji korisnik sam posalje. Bez ovog bloka zahtjev nije
 * izvrsiv.
 *
 * `peekGuestId` (ne `getGuestId`) — ovaj blok samo CITA; ne pravi identifikator
 * nekome ko ga nema.
 *
 * Napomena za citaoca: to ne znaci da otvaranje ove stranice ne napravi ID.
 * `instrumentation-client.ts` zove `getGuestId()` u PostHog bootstrap-u, a taj
 * fajl se izvrsava na SVAKOJ ruti — dakle i ovdje. ID zato u praksi skoro
 * uvijek postoji, a `null` grana pokriva slucaj kad je analitika blokirana ili
 * je storage prazan. Ako se ikad uvede pristanak prije analitike, ova
 * komponenta je vec ispravna i ne treba je dirati.
 *
 * Stilovi su Tailwind utilitiji, bez zasebnog CSS fajla — isto kao `/privatnost`
 * i `/uslovi`. Nijedan `layer(components)` fajl ne drzi tipografiju ovih
 * elemenata, pa `text-*` u JSX-u ovdje nema sa cim da se bori.
 */

// ── citanje ID-a ────────────────────────────────────────────────────────────
//
// `useSyncExternalStore`, ne `useEffect` + `setState`: isti obrazac koji
// `lib/settings.ts` koristi za postavke, i jedini koji ovdje ne pravi kaskadni
// render (ESLint `react-hooks/set-state-in-effect` to i trazi).
//
// Server snapshot je `undefined` = "jos ne znamo". Taj isti snapshot React
// koristi i za hydration render, pa server i klijent crtaju identicno i
// mismatch-a nema; prava vrijednost stize tek poslije hidracije.

let cachedId: string | null | undefined;
let didRead = false;

function getClientSnapshot(): string | null {
  // Kes je obavezan: `getSnapshot` se zove pri svakom renderu, a mora vratiti
  // stabilnu vrijednost. ID se ne mijenja dok stranica zivi.
  if (!didRead) {
    cachedId = peekGuestId();
    didRead = true;
  }
  return cachedId ?? null;
}

/** ID se ne mijenja tokom zivota stranice — nema na sta da se pretplati. */
const noopSubscribe = () => () => {};

function useGuestId(): string | null | undefined {
  return useSyncExternalStore(noopSubscribe, getClientSnapshot, () => undefined);
}

// ── komponenta ──────────────────────────────────────────────────────────────

export function GuestIdBlock() {
  const id = useGuestId();
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tajmer se cisti na unmount — bez toga setState pada na odmontiranu
  // komponentu ako korisnik ode sa stranice u te 2s.
  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  function handleCopy(value: string) {
    // `androidScheme: "https"` daje WebView-u siguran kontekst, pa clipboard
    // radi i u APK-u. Optional chaining + progutan reject: odbijena dozvola ne
    // smije da baci iz handlera. Obrazac je isti kao u `RoomScreen`.
    void navigator.clipboard?.writeText(value).catch(() => {});
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 2000);
  }

  const known = typeof id === "string" && id.length > 0;

  const mailHref =
    `mailto:${CONTACT_EMAIL}` +
    `?subject=${encodeURIComponent(sr.legal.mailSubject)}` +
    `&body=${encodeURIComponent(
      sr.legal.mailBodyLines(known ? id : null).join("\n"),
    )}`;

  return (
    <div className="space-y-3">
      <div className="bg-surface-raised rounded-token-md p-3 space-y-1">
        <p className="font-sans text-sm text-muted">{sr.legal.idLabel}</p>
        {/* Rezervisana visina preko min-h — dugme ispod ne poskakuje kad ID
            stigne poslije hidracije. UUID od 36 znakova se prelama na 360px. */}
        <p className="font-mono text-base min-h-6 [overflow-wrap:anywhere] select-all">
          {id === undefined ? sr.legal.idLoading : known ? id : "—"}
        </p>
      </div>

      {id === null && <p className="font-sans">{sr.legal.idMissing}</p>}

      <div className="flex flex-wrap gap-2">
        {known && (
          <button
            type="button"
            className="inline-flex items-center min-h-11 px-4 rounded-token-md bg-surface-raised text-white font-sans text-base active:opacity-80"
            onClick={() => handleCopy(id)}
          >
            {copied ? sr.legal.copied : sr.legal.copy}
          </button>
        )}

        {/* Obican <a>, bez target/router: Capacitor prosljedjuje mailto: kao
            Android Intent. Ako uredjaj nema mail aplikaciju, tap ne uradi nista
            vidljivo — zato adresa stoji i kao tekst na stranici. */}
        <a
          className="inline-flex items-center min-h-11 px-4 rounded-token-md bg-accent text-accent-contrast font-sans text-base font-bold active:opacity-80"
          href={mailHref}
        >
          {sr.legal.mailto}
        </a>
      </div>

      {/* Potvrda kopiranja za citace ekrana; vizuelno je nosi sam natpis dugmeta. */}
      <span className="sr-only" role="status">
        {copied ? sr.legal.copied : ""}
      </span>
    </div>
  );
}
