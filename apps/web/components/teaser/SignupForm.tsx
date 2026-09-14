"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { normalizeEmail, type UpcomingGameSlug } from "@zandar/shared-types";

import { ArrowRightIcon } from "@/components/icons";
import { submitSignup } from "@/lib/api";
import { isNative } from "@/lib/platform";
import { sr } from "@/lib/sr";

type Problem = "email" | "consent" | "network" | null;

const MESSAGE: Record<Exclude<Problem, null>, string> = {
  email: sr.signup.invalidEmail,
  consent: sr.signup.missingConsent,
  network: sr.signup.error,
};

/**
 * Prijava za obavještenje o jednoj budućoj igri.
 *
 * - Uspjeh zamjenjuje formu TEK kad server potvrdi upis. Ponovljena prijava
 *   (`created: false`) je isto uspjeh za igrača — adresa je već na spisku.
 * - Greška ostavlja formu popunjenu; ponovno slanje je isti klik.
 * - Adresa se provjerava istim pravilom kao na serveru (`normalizeEmail`).
 * - `ph-no-capture`: PostHog autocapture i snimak sesije ne smiju da ponesu
 *   adresu. Snimak već maskira polja, ali klasa isključuje i klikove u formi.
 */
export function SignupForm({
  game,
  onBackToGame,
}: {
  game: UpcomingGameSlug;
  onBackToGame: () => void;
}) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState<"form" | "sending" | "done">("form");
  const [problem, setProblem] = useState<Problem>(null);
  // `phase` stiže na sljedećem renderu; dvostruki tap stigne prije njega.
  const sending = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef<HTMLElement>(null);

  // Forma nestaje ispod fokusa — fokus ide na potvrdu, da čitač ekrana pročita ishod.
  useEffect(() => {
    if (phase === "done") doneRef.current?.focus();
  }, [phase]);

  async function submit() {
    if (sending.current) return;
    if (!normalizeEmail(email)) {
      setProblem("email");
      emailRef.current?.focus();
      return;
    }
    if (!consent) {
      setProblem("consent");
      consentRef.current?.focus();
      return;
    }
    sending.current = true;
    setProblem(null);
    setPhase("sending");
    try {
      await submitSignup({ game, email });
      setPhase("done");
    } catch {
      setProblem("network");
      setPhase("form");
      sending.current = false;
    }
  }

  if (phase === "done") {
    return (
      <section ref={doneRef} className="signup signup--done" tabIndex={-1} aria-labelledby="signup-done-title">
        <h2 id="signup-done-title" className="signup__done-title">
          {sr.signup.successTitle}
        </h2>
        <p className="signup__done-text">{sr.signup.successBody}</p>
        <button type="button" className="home__cta signup__submit" onClick={onBackToGame}>
          {sr.signup.backToGame}
        </button>
      </section>
    );
  }

  const busy = phase === "sending";

  return (
    <form
      className="signup ph-no-capture"
      noValidate
      aria-busy={busy}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <label htmlFor="signup-email" className="signup__label">
        {sr.signup.emailLabel}
      </label>
      <input
        ref={emailRef}
        id="signup-email"
        className="namestep__input signup__input ph-no-capture"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="send"
        placeholder={sr.signup.emailPlaceholder}
        value={email}
        readOnly={busy}
        onChange={(e) => {
          setEmail(e.target.value);
          if (problem === "email") setProblem(null);
        }}
        aria-invalid={problem === "email" ? true : undefined}
        aria-describedby={problem === "email" ? "signup-problem" : undefined}
      />

      <div className="signup__consent">
        <input
          ref={consentRef}
          id="signup-consent"
          className="signup__checkbox"
          type="checkbox"
          checked={consent}
          disabled={busy}
          onChange={(e) => {
            setConsent(e.target.checked);
            if (problem === "consent") setProblem(null);
          }}
          aria-invalid={problem === "consent" ? true : undefined}
          aria-describedby={problem === "consent" ? "signup-problem" : undefined}
        />
        <label htmlFor="signup-consent" className="signup__consent-text">
          {sr.signup.consent}
        </label>
        {/* Novi tab na webu: navigacija u istom tabu bi odmontirala formu i
            izgubila upisanu adresu. U APK-u ostaje u aplikaciji. */}
        <Link
          href="/privatnost"
          className="signup__privacy"
          {...(isNative ? {} : { target: "_blank", rel: "noopener" })}
        >
          {sr.signup.privacyLink}
        </Link>
      </div>

      <button type="submit" className="home__cta signup__submit" disabled={busy} aria-busy={busy}>
        <span>{busy ? sr.signup.sending : sr.signup.submit}</span>
        {busy ? null : <ArrowRightIcon className="home__cta-arrow" />}
      </button>

      {/* Rezervisan red: greška ne pomjera napomenu ispod. */}
      <p id="signup-problem" className="signup__problem" role="status" data-empty={!problem}>
        {problem ? MESSAGE[problem] : ""}
      </p>
      <p className="signup__note">{sr.signup.submitNote}</p>
    </form>
  );
}
