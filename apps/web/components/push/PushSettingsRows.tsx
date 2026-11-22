"use client";

import { useEffect, useState } from "react";

import {
  capturePush,
  openNotificationSettings,
  pushEnabled,
  pushPermission,
  requestPushPermission,
  setPushReminders,
  setPushTable,
  type PushPermission,
} from "@/lib/push";
import { useSetting } from "@/lib/settings";
import { sr } from "@/lib/sr";

/**
 * Red „Obavještenja" u Postavkama (SPEC_PUSH_V2 A3) — jedino mjesto gdje
 * ponuda ostaje i poslije tri „Ne sada", i jedini put nazad poslije
 * „Ne dozvoli" na Androidu 13+ (sistemska podešavanja).
 *
 * Tri stanja dozvole:
 *  - `granted`: dvije preklopke, sto i prijatelji / podsjetnici;
 *  - `prompt`:  Uključi → sistemski dijalog;
 *  - `denied`:  Otvori podešavanja → ekran obavještenja aplikacije.
 * Na povratku u prvi plan stanje se čita ponovo (igrač je možda upravo
 * uključio obavještenja u podešavanjima telefona).
 *
 * Samo u aplikaciji sa Firebase konfiguracijom; na webu se ništa ne crta.
 */
export function PushSettingsRows() {
  const [permission, setPermission] = useState<PushPermission | null>(null);
  const [table] = useSetting("pushTable");
  const [reminders] = useSetting("pushReminders");

  useEffect(() => {
    if (!pushEnabled) return;
    let alive = true;
    const read = () => {
      if (document.visibilityState !== "visible") return;
      void pushPermission().then((p) => {
        if (alive) setPermission(p);
      });
    };
    read();
    document.addEventListener("visibilitychange", read);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", read);
    };
  }, []);

  if (!pushEnabled || permission === null || permission === "unsupported") return null;
  const t = sr.push.settings;

  if (permission !== "granted") {
    const denied = permission === "denied";
    return (
      <div className="settings__row">
        <span className="settings__name">
          <span className="settings__label">{t.title}</span>
          <span className="settings__value">{denied ? t.offAtPhone : t.off}</span>
        </span>
        <button
          type="button"
          className="settings__change"
          onClick={() => {
            if (denied) {
              capturePush("push_settings_opened", {});
              void openNotificationSettings();
              return;
            }
            capturePush("push_prompt_accepted", { context: "settings" });
            void requestPushPermission().then(setPermission);
          }}
        >
          {denied ? t.openSettings : t.turnOn}
        </button>
      </div>
    );
  }

  return (
    <>
      <ToggleRow label={t.table} on={table} onChange={setPushTable} />
      <ToggleRow label={t.reminders} on={reminders} onChange={setPushReminders} />
    </>
  );
}

function ToggleRow({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (next: boolean) => void;
}) {
  const t = sr.push.settings;
  return (
    <div className="settings__row">
      <span className="settings__name">
        <span className="settings__label">{label}</span>
        <span className="settings__value">{on ? t.on : t.off}</span>
      </span>
      <button
        type="button"
        className="settings__change"
        aria-pressed={on}
        onClick={() => onChange(!on)}
      >
        {on ? t.turnOff : t.turnOn}
      </button>
    </div>
  );
}
