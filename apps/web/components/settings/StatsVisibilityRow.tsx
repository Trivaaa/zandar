"use client";

import { useState } from "react";

import { saveStatsVisible, type Me } from "@/lib/profile";
import { sr } from "@/lib/sr";

/**
 * SPEC_STATISTIKA v0.3: „Statistiku vide prijatelji i igrači za privatnim
 * stolom" — samo nalog (gost nema prijatelje ni javni profil). Čuva se odmah;
 * na grešku se vraća staro stanje i ispiše poruka. Isti oblik reda kao
 * `MetaConsentRow` (Uključeno / Isključi).
 */
export function StatsVisibilityRow({ me, onSaved }: { me: Me; onSaved: (me: Me) => void }) {
  const [visible, setVisible] = useState(me.statsVisible !== false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const s = sr.stats;

  async function toggle() {
    const next = !visible;
    setVisible(next);
    setBusy(true);
    setFailed(false);
    try {
      onSaved(await saveStatsVisible(next));
    } catch {
      setVisible(!next);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="settings__row">
        <span className="settings__name">
          <span className="settings__label">{s.visibleTitle}</span>
          <span className="settings__value">{visible ? s.visibleOn : s.visibleSub}</span>
        </span>
        <button type="button" className="settings__change" disabled={busy} aria-pressed={visible} onClick={() => void toggle()}>
          {visible ? s.turnOff : s.turnOn}
        </button>
      </div>
      {failed ? (
        <p className="acct__error" role="status">
          {s.visibleError}
        </p>
      ) : null}
    </>
  );
}
