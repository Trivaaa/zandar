"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Sheet } from "@/components/sheet/Sheet";
import { isNative } from "@/lib/platform";
import { sr } from "@/lib/sr";

type Consent = "granted" | "denied" | "unset";

type MetaEventsPlugin = {
  getStatus(): Promise<{ consent: Consent }>;
  setConsent(options: { granted: boolean }): Promise<{ consent: Consent }>;
};

// Plugin objekat ne smije proći kroz `async return` (CLAUDE.md — Capacitor proxy
// puca na `.then`), pa `call` vraća samo rezultat metode.
let plugin: MetaEventsPlugin | null = null;

async function call(run: (meta: MetaEventsPlugin) => Promise<{ consent: Consent }>): Promise<Consent> {
  const { registerPlugin } = await import("@capacitor/core");
  plugin ??= registerPlugin<MetaEventsPlugin>("MetaEvents");
  return (await run(plugin)).consent;
}

const readConsent = () => call((meta) => meta.getStatus());
const saveConsent = (granted: boolean) => call((meta) => meta.setConsent({ granted }));

/**
 * Pita jednom, na početnoj: nikad preko sobe ili pozivnice. SDK (MetaEventsPlugin)
 * se ne diže dok igrač ne dozvoli. Nazad i dodir van lista znače „Ne dozvoli",
 * a izbor se mijenja u Postavkama.
 */
export function MetaConsentPrompt() {
  const onHome = usePathname().replace(/\/+$/, "") === "";
  const [consent, setConsent] = useState<Consent | null>(null);

  useEffect(() => {
    if (!isNative || !onHome) return;
    readConsent().then(setConsent).catch(() => {});
  }, [onHome]);

  if (!isNative || !onHome || consent !== "unset") return null;

  const answer = (granted: boolean) => {
    setConsent(granted ? "granted" : "denied");
    saveConsent(granted).catch(() => {});
  };

  return (
    <Sheet title={sr.metaConsent.title} closeLabel={sr.metaConsent.decline} onClose={() => answer(false)}>
      <p className="settings__section-note">{sr.metaConsent.body}</p>
      <Link href="/privatnost" className="settings__section-note underline">
        {sr.metaConsent.policy}
      </Link>
      <button type="button" className="gamemenu__item font-sans text-base font-bold" onClick={() => answer(true)}>
        {sr.metaConsent.accept}
      </button>
    </Sheet>
  );
}

/** Red u Postavkama: povlačenje i ponovno davanje saglasnosti (samo aplikacija). */
export function MetaConsentRow() {
  const [consent, setConsent] = useState<Consent | null>(null);

  useEffect(() => {
    if (!isNative) return;
    readConsent().then(setConsent).catch(() => {});
  }, []);

  if (!isNative || consent === null) return null;
  const granted = consent === "granted";

  return (
    <div className="settings__row">
      <span className="settings__name">
        <span className="settings__label">{sr.metaConsent.title}</span>
        <span className="settings__value">{granted ? sr.metaConsent.on : sr.metaConsent.off}</span>
      </span>
      <button
        type="button"
        className="settings__change"
        onClick={() => {
          setConsent(granted ? "denied" : "granted");
          saveConsent(!granted).catch(() => {});
        }}
      >
        {granted ? sr.metaConsent.turnOff : sr.metaConsent.turnOn}
      </button>
    </div>
  );
}
