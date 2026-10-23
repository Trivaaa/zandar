"use client";

import { useRef, useState } from "react";
import type { TableTheme } from "@zandar/shared-types";

import { TableSetupFields } from "@/components/lobby/TableSetupFields";
import { Sheet } from "@/components/sheet/Sheet";
import { isValidPlayerName } from "@/lib/playerName";
import { QUICK_PLAY_COUNTS, QUICK_PLAY_TARGETS, type QuickPlayPrefs } from "@/lib/quickPlayPrefs";
import { sr } from "@/lib/sr";

/**
 * Ime — samo prvi put, kad „Igraj Žandar" nema sačuvano ime. Upis i „Nađi sto"
 * vode pravo za sto; poslije se list više ne pojavljuje (ime se mijenja u
 * Postavkama, `/ime`).
 */
export function QuickPlayNameSheet({
  loading,
  error,
  onSubmit,
  onClose,
}: {
  loading: boolean;
  error?: string | undefined;
  onSubmit: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const disabled = loading || !isValidPlayerName(name);

  return (
    <Sheet title={sr.quickSetup.nameTitle} closeLabel={sr.quickSetup.cancel} onClose={onClose} initialFocusRef={input}>
      <form
        className="qp-sheet"
        onSubmit={(e) => {
          e.preventDefault();
          if (!disabled) onSubmit(name);
        }}
      >
        <p className="sheet__note">{sr.quickSetup.nameSub}</p>
        <div className="create__field">
          <label className="create__label font-sans text-sm" htmlFor="qp-name">
            {sr.quickSetup.nameLabel}
          </label>
          <input
            ref={input}
            id="qp-name"
            className="create__input font-sans text-base"
            type="text"
            inputMode="text"
            autoComplete="nickname"
            enterKeyHint="go"
            placeholder={sr.create.namePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <button type="submit" className="home__cta sheet__btn" disabled={disabled} aria-busy={loading}>
          {loading ? sr.quickSetup.submitting : sr.quickSetup.submit}
        </button>
        {/* Rezervisan red: greška ne pomjera dugme. */}
        <p className="home__error" data-empty={!error} role="status">
          {error ?? ""}
        </p>
      </form>
    </Sheet>
  );
}

/**
 * Podešavanja brze igre: broj igrača, cilj, izgled stola. Ništa se ne čuva dok
 * igrač ne dodirne „Sačuvaj" — Odustani/nazad ostavljaju stari izbor.
 */
export function QuickPlaySettingsSheet({
  prefs,
  tableTheme,
  onSave,
  onClose,
}: {
  prefs: QuickPlayPrefs;
  tableTheme: TableTheme;
  onSave: (prefs: QuickPlayPrefs, tableTheme: TableTheme) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(prefs);
  const [theme, setTheme] = useState(tableTheme);

  return (
    <Sheet title={sr.quickSetup.settingsTitle} closeLabel={sr.quickSetup.cancel} onClose={onClose}>
      <div className="qp-sheet">
        <TableSetupFields
          counts={QUICK_PLAY_COUNTS}
          playerCount={draft.playerCount}
          onPlayerCount={(n) => {
            const playerCount = QUICK_PLAY_COUNTS.find((c) => c === n);
            if (playerCount) setDraft((d) => ({ ...d, playerCount }));
          }}
          targetScore={draft.targetScore}
          onTargetScore={(n) => {
            const targetScore = QUICK_PLAY_TARGETS.find((t) => t === n);
            if (targetScore) setDraft((d) => ({ ...d, targetScore }));
          }}
          tableTheme={theme}
          onTableTheme={setTheme}
          playersLabel={sr.quickSetup.players}
          targetLabel={sr.quickSetup.target}
        />
        <button type="button" className="home__cta sheet__btn" onClick={() => onSave(draft, theme)}>
          {sr.quickSetup.save}
        </button>
      </div>
    </Sheet>
  );
}
