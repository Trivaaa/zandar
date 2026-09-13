"use client";

import { useEffect, useRef } from "react";

import { ArrowLeftIcon } from "@/components/icons";
import { isValidPlayerName } from "@/lib/playerName";
import { sr } from "@/lib/sr";

export type NameStepProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  loading: boolean;
  /** Tekst dugmeta dok traje slanje (npr. „Tražim sto..."). */
  loadingLabel: string;
  error?: string | undefined;
  className?: string | undefined;
};

/**
 * „Ime za stolom" — pita se tek kad je igrač izabrao radnju, ne na home-u.
 * Prava forma: Enter šalje, prazno ime ne može da se pošalje (ista validacija
 * kao ranije), greška ostaje uz formu i ne briše unos.
 */
export function NameStep({
  value,
  onChange,
  onSubmit,
  onBack,
  loading,
  loadingLabel,
  error,
  className = "",
}: NameStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const canSubmit = !loading && isValidPlayerName(value);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <main className={`screen namestep ${className}`}>
      <button type="button" className="namestep__back" onClick={onBack}>
        <ArrowLeftIcon className="namestep__back-icon" />
        <span>{sr.backLabel}</span>
      </button>

      <form
        className="namestep__form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) onSubmit();
        }}
      >
        <label htmlFor="name-input" className="namestep__label">
          {sr.name.label}
        </label>
        <input
          ref={inputRef}
          id="name-input"
          className="namestep__input"
          type="text"
          inputMode="text"
          autoComplete="nickname"
          autoCapitalize="words"
          enterKeyHint="go"
          placeholder={sr.name.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby="name-error"
        />
        <button
          type="submit"
          className="home__cta namestep__submit"
          disabled={!canSubmit}
          aria-busy={loading}
        >
          {loading ? loadingLabel : sr.name.submit}
        </button>
        <p id="name-error" className="namestep__error" data-empty={!error} role="status">
          {error ?? ""}
        </p>
      </form>
    </main>
  );
}
