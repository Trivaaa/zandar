"use client";

import { useEffect, useState } from "react";

import { PushSoftAsk } from "@/components/push/PushSoftAsk";
import {
  capturePush,
  getPushAskArm,
  isPromptSnoozed,
  markPromptShownOnce,
  noteAppOpenDay,
  notePromptCardShown,
  promptCardShownToday,
  promptCardShows,
  promptShownOnce,
  pushEnabled,
  pushPermissionState,
  requestPushPermission,
  setPushAskArm,
  snoozePrompt,
} from "@/lib/push";
import {
  assignPushAskArm,
  decideMatchEndAsk,
  MATCH_END_DIRECT_DELAY_MS,
  MATCH_END_DIRECT_KEY,
} from "@/lib/pushAsk";
import { sr } from "@/lib/sr";

/** Koga i šta čeka: host kucanje, gost odobrenje, igrač u lobiju početak; `match_end` = kraj partije (SPEC_PUSH_V2 A1). */
export type PushPromptContext =
  | "host"
  | "guest"
  | "waiting"
  | "friends"
  | "match_end"
  // SPEC_PUSH_V2 A4: početna, od drugog dana otvaranja, jednom.
  | "home_return"
  // Propušten poziv: list „Poziv je istekao".
  | "invite_missed";

/**
 * Ponuda obavještenja u trenutku kad igrač nešto čeka (PRD §51).
 *
 * Sistemski dijalog na Androidu 13+ ima dvije prilike — poslije drugog
 * "Ne dozvoli" aplikacija ga više ne može pokazati. Zato ga pokreće ovo
 * dugme, uz rečenicu koja kaže šta se dobija, a nikad prvo pokretanje.
 * Izuzetak (`match_end`): kraj PRVE partije na uređaju — od 1.5.2 A/B između
 * sistemskog dijaloga odmah (`direct`) i lista sa razlogom (`soft`,
 * `PushSoftAsk`); kartica je kasnija prilika, najviše jednom dnevno i 5 puta
 * (`decideMatchEndAsk`).
 *
 * Ne crta se: na webu, kad je dozvola već data ili odbijena, i nedjelju dana
 * poslije "Ne sada".
 */
export function PushPrompt({
  context,
  className = "",
  onceKey,
  minOpenDays,
}: {
  context: PushPromptContext;
  className?: string;
  /** Ponuda se pokazuje najviše jednom po ključu (npr. A4 na početnoj). */
  onceKey?: string;
  /** Tek od ovoliko različitih dana otvaranja aplikacije (A4: 2). */
  minOpenDays?: number;
}) {
  const [visible, setVisible] = useState(false);
  const [soft, setSoft] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pushEnabled) return;
    let cancelled = false;
    let directTimer: ReturnType<typeof setTimeout> | undefined;
    void pushPermissionState().then(({ permission, raw }) => {
      if (cancelled) return;
      if (context === "match_end") {
        const directAsked = promptShownOnce(MATCH_END_DIRECT_KEY);
        const arm = assignPushAskArm({
          existing: getPushAskArm(),
          permission,
          directAsked,
          random: Math.random(),
        });
        if (arm && !getPushAskArm()) setPushAskArm(arm);
        const ask = decideMatchEndAsk({
          permission,
          rationale: raw === "prompt-with-rationale",
          snoozed: isPromptSnoozed(),
          directAsked,
          arm: arm ?? undefined,
          cardShows: promptCardShows(context),
          cardShownToday: promptCardShownToday(context),
        });
        if (ask === "direct" || ask === "soft") {
          // Ključ tek u trenutku pitanja: zatvoren ekran u pauzi ne troši priliku.
          directTimer = setTimeout(() => {
            if (cancelled) return;
            markPromptShownOnce(MATCH_END_DIRECT_KEY);
            if (ask === "direct") {
              capturePush("push_prompt_shown", { context, direct: true });
              void requestPushPermission(MATCH_END_DIRECT_KEY);
            } else {
              capturePush("push_prompt_shown", { context, soft: true });
              setSoft(true);
            }
          }, MATCH_END_DIRECT_DELAY_MS);
          return;
        }
        if (ask === null) return;
        notePromptCardShown(context);
        setVisible(true);
        capturePush("push_prompt_shown", { context });
        return;
      }
      if (permission !== "prompt" || isPromptSnoozed()) return;
      if (onceKey && promptShownOnce(onceKey)) return;
      // Idempotentno u toku dana — ne zavisi od toga da li je NativePush već upisao danas.
      if (minOpenDays && noteAppOpenDay() < minOpenDays) return;
      if (onceKey) markPromptShownOnce(onceKey);
      setVisible(true);
      capturePush("push_prompt_shown", { context });
    });
    return () => {
      cancelled = true;
      clearTimeout(directTimer);
    };
  }, [context, onceKey, minOpenDays]);

  if (soft) {
    return (
      <PushSoftAsk
        onEnable={async () => {
          capturePush("push_prompt_accepted", { context, soft: true });
          await requestPushPermission("match_end_soft");
          setSoft(false);
        }}
        onDismiss={() => {
          snoozePrompt();
          capturePush("push_prompt_dismissed", { context, soft: true });
          setSoft(false);
        }}
      />
    );
  }

  if (!visible) return null;

  const copy = sr.push[context];

  async function enable() {
    setBusy(true);
    capturePush("push_prompt_accepted", { context });
    await requestPushPermission(context);
    // Bez obzira na ishod: dato → registracija teče sama, odbijeno → sistem više ne pita.
    setVisible(false);
  }

  function dismiss() {
    snoozePrompt();
    capturePush("push_prompt_dismissed", { context });
    setVisible(false);
  }

  return (
    <div className={`pushprompt ${className}`} role="group" aria-label={copy.title}>
      <p className="pushprompt__title font-sans font-semibold text-base">{copy.title}</p>
      <p className="pushprompt__body font-sans text-sm">{copy.body}</p>
      <div className="pushprompt__actions">
        <button
          type="button"
          className="pushprompt__enable font-sans text-base"
          onClick={() => void enable()}
          disabled={busy}
          data-disabled={busy}
        >
          {sr.push.enable}
        </button>
        <button
          type="button"
          className="pushprompt__dismiss font-sans text-base"
          onClick={dismiss}
          disabled={busy}
        >
          {sr.push.notNow}
        </button>
      </div>
    </div>
  );
}
