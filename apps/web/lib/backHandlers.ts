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
