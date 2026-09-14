"use client";

import { useEffect, useState } from "react";

import {
  capturePush,
  isPromptSnoozed,
  pushEnabled,
  pushPermission,
  requestPushPermission,
  snoozePrompt,
} from "@/lib/push";
import { sr } from "@/lib/sr";

/** Koga i šta čeka: host kucanje, gost odobrenje, igrač u lobiju početak. */
export type PushPromptContext = "host" | "guest" | "waiting";

/**
 * Ponuda obavještenja u trenutku kad igrač nešto čeka (PRD §51).
 *
 * Sistemski dijalog na Androidu 13+ je praktično jednokratan — poslije
 * "Ne dozvoli" aplikacija ga više ne može pokazati. Zato ga pokreće TEK ovo
 * dugme, uz rečenicu koja kaže šta se dobija, a nikad prvo pokretanje.
 *
 * Ne crta se: na webu, kad je dozvola već data ili odbijena, i nedjelju dana
 * poslije "Ne sada".
 */
export function PushPrompt({
  context,
  className = "",
}: {
  context: PushPromptContext;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pushEnabled) return;
    let cancelled = false;
    void pushPermission().then((permission) => {
      if (cancelled || permission !== "prompt" || isPromptSnoozed()) return;
      setVisible(true);
      capturePush("push_prompt_shown", { context });
    });
    return () => {
      cancelled = true;
    };
  }, [context]);

  if (!visible) return null;

  const copy = sr.push[context];

  async function enable() {
    setBusy(true);
    capturePush("push_prompt_accepted", { context });
    await requestPushPermission();
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
