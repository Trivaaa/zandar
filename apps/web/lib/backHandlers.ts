"use client";

import { useEffect, useRef } from "react";

/**
 * Stek „zatvori" radnji za hardversko nazad na Androidu.
 *
 * `NativeShell` na `/` poziva `App.exitApp()`, jer je home korijen. To je
 * tačno — osim dok je preko home-a otvoren sheet ili modal: tad bi „nazad"
 * ugasio aplikaciju umjesto da zatvori ono što igrač gleda. Ekran koji otvara
 * sloj prijavi ovdje kako se taj sloj zatvara; `NativeShell` prvo pita stek.
 *
 * Najmlađi sloj se zatvara prvi. Na webu stek niko ne čita — browser Back i
 * dalje radi svoje.
 */
const stack: Array<{ run: () => void }> = [];

/** `true` ako je neki sloj zatvoren i „nazad" je time potrošen. */
export function runBackHandler(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  top.run();
  return true;
}

/**
 * Back u pregledaču (web) dok partija traje (QA B1/B11, web strana).
 *
 * Android nazad ide kroz stek iznad; pregledač ga ne čita, pa je Back tiho
 * izvodio igrača iz partije — bez potvrde i bez `room:leave`, a socket je
 * ostajao u sobi. Ovdje se iznad trenutnog unosa istorije stavi „čuvar" sa
 * ISTIM URL-om: Back skine čuvara (Next ostaje na istoj stranici), mi ga vratimo
 * i pitamo `onBack`. U aplikaciji se ne koristi (`enabled = false`) — tamo nazad
 * već ide kroz `useBackHandler`.
 *
 * Kad `active` padne (kraj meča) čuvar ostaje u istoriji: prvi sljedeći Back
 * ostaje na stolu, drugi izlazi. Skidanje bi tražilo `history.back()`, koji je
 * asinhron i tukao bi se sa Next navigacijom koja upravo teče.
 */
const GUARD_KEY = "__zandarBackGuard";

export function useBrowserBackGuard(
  enabled: boolean,
  active: boolean,
  onBack: () => void,
): void {
  const latest = useRef(onBack);
  useEffect(() => {
    latest.current = onBack;
  });

  useEffect(() => {
    if (!enabled || !active) return;
    const arm = () => {
      // Bez `__NA`: Next-ov patch kopira svoje interno stanje u novi unos.
      window.history.pushState({ [GUARD_KEY]: true }, "", window.location.href);
    };
    if (!window.history.state?.[GUARD_KEY]) arm();
    const onPop = (e: PopStateEvent) => {
      if (e.state?.[GUARD_KEY]) return; // Forward na čuvara — ništa.
      arm();
      latest.current();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [enabled, active]);
}

export function useBackHandler(active: boolean, onBack: () => void): void {
  const latest = useRef(onBack);
  useEffect(() => {
    latest.current = onBack;
  });

  useEffect(() => {
    if (!active) return;
    const entry = { run: () => latest.current() };
    stack.push(entry);
    return () => {
      const i = stack.lastIndexOf(entry);
      if (i >= 0) stack.splice(i, 1);
    };
  }, [active]);
}
