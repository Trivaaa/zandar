"use client";

import { useRef, useState } from "react";

import { Sheet } from "@/components/sheet/Sheet";
import { isValidPlayerName } from "@/lib/playerName";
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
