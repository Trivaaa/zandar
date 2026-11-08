"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";

import { FEEDBACK_KINDS, FEEDBACK_LIMITS, normalizeEmail, type FeedbackKind } from "@zandar/shared-types";

import { ArrowLeftIcon, BugIcon, ChatIcon, CloseIcon, ImageIcon, SmileIcon } from "@/components/icons";
import { sendFeedback } from "@/lib/api";
import { getAuthInstance } from "@/lib/auth";
import { compressImage } from "@/lib/imageCompress";
import { sr } from "@/lib/sr";

const KIND_ICONS: Record<FeedbackKind, ComponentType<{ className?: string }>> = {
  bug: BugIcon,
  idea: ChatIcon,
  praise: SmileIcon,
};

type Status = "idle" | "sending" | "done";

/**
 * „Pošalji utisak" (tabla A2): vrsta, poruka, do 3 slike, e-mail za odgovor.
 * Verzija i telefon idu sami (`sendFeedback`). Gost nema nalog — zato polje
 * za e-mail; prijavljenom igraču je unaprijed popunjeno adresom naloga.
 */
export function FeedbackForm({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  // `null` = igrač još nije dirao polje → važi adresa naloga (ako je ima).
  const [emailDraft, setEmailDraft] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [problem, setProblem] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);

  const email = emailDraft ?? accountEmail;

  useEffect(() => {
    let cancelled = false;
    void getAuthInstance().then((auth) => {
      const address = auth?.currentUser?.email;
      if (!cancelled && address) setAccountEmail(address);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status === "done") doneRef.current?.focus();
  }, [status]);

  const trimmed = text.trim();
  const canSubmit = status === "idle" && !reading && trimmed.length > 0;
  const room = FEEDBACK_LIMITS.imagesMax - images.length;

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setReading(true);
    setProblem(null);
    const picked = Array.from(files).slice(0, room);
    const out: string[] = [];
    let failed = false;
    for (const file of picked) {
      try {
        out.push(await compressImage(file));
      } catch {
        failed = true;
      }
    }
    setImages((prev) => [...prev, ...out].slice(0, FEEDBACK_LIMITS.imagesMax));
    if (failed) setProblem(sr.feedback.attachError);
    setReading(false);
    // Isti fajl izabran ponovo mora opet okinuti `change`.
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit() {
    if (!canSubmit) return;
    const address = email.trim();
    if (address && !normalizeEmail(address)) {
      setProblem(sr.feedback.invalidEmail);
      return;
    }
    setStatus("sending");
    setProblem(null);
    try {
      await sendFeedback({ kind, text: trimmed, images, ...(address ? { email: address } : {}) });
      setStatus("done");
    } catch (err) {
      const message = err instanceof Error && err.message !== "Greška" ? err.message : sr.feedback.error;
      setProblem(message);
      setStatus("idle");
    }
  }

  if (status === "done") {
    return (
      <main className="screen fbform">
        <div ref={doneRef} tabIndex={-1} className="fbform__done" role="status">
          <h1 className="fbform__done-title">{sr.feedback.doneTitle}</h1>
          <p className="fbform__done-body">{email.trim() ? sr.feedback.doneBodyEmail : sr.feedback.doneBody}</p>
          <button type="button" className="home__cta fbform__submit" onClick={onDone}>
            {sr.feedback.backHome}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="screen fbform">
      <header className="fbform__head">
        <button type="button" className="fbform__back" onClick={onBack} aria-label={sr.backLabel}>
          <ArrowLeftIcon className="fbform__back-icon" />
        </button>
        <h1 className="fbform__title">{sr.feedback.title}</h1>
      </header>

      <form
        className="fbform__form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <fieldset className="fbform__field">
          <legend className="fbform__label">{sr.feedback.kindLabel}</legend>
          <div className="fbform__kinds" role="radiogroup">
            {FEEDBACK_KINDS.map((k) => {
              const Icon = KIND_ICONS[k];
              return (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={kind === k}
                  className="fbform__kind"
                  onClick={() => setKind(k)}
                >
                  <Icon className="fbform__kind-icon" />
                  <span>{sr.feedback.kinds[k]}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <textarea
          className="fbform__text"
          aria-label={sr.feedback.textLabel}
          placeholder={sr.feedback.placeholders[kind]}
          value={text}
          maxLength={FEEDBACK_LIMITS.textMax}
          rows={5}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="fbform__field">
          <span className="fbform__label">{sr.feedback.attachLabel}</span>
          <div className="fbform__attach">
            {images.map((src, i) => (
              <div key={`${i}-${src.length}`} className="fbform__thumb">
                {/* eslint-disable-next-line @next/next/no-img-element -- data-URL, nema šta da optimizuje */}
                <img src={src} alt="" className="fbform__thumb-img" />
                <button
                  type="button"
                  className="fbform__thumb-remove"
                  aria-label={sr.feedback.attachRemove(i + 1)}
                  onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                >
                  <CloseIcon className="fbform__thumb-x" />
                </button>
              </div>
            ))}
            {room > 0 ? (
              <label className="fbform__add" aria-busy={reading}>
                <ImageIcon className="fbform__add-icon" />
                <span className="fbform__add-text">{images.length ? sr.feedback.attachMore : sr.feedback.attachAdd}</span>
                <span className="fbform__add-limit">· {sr.feedback.attachLimit(FEEDBACK_LIMITS.imagesMax)}</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="fbform__file"
                  disabled={reading}
                  onChange={(e) => void addFiles(e.target.files)}
                />
              </label>
            ) : null}
          </div>
        </div>

        <label className="fbform__field">
          <span className="fbform__label">{sr.feedback.emailLabel}</span>
          <input
            className="fbform__input"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={sr.feedback.emailPlaceholder}
            value={email}
            onChange={(e) => {
              setEmailDraft(e.target.value);
              // Stara poruka o adresi ne smije ostati dok igrač ispravlja.
              if (problem === sr.feedback.invalidEmail) setProblem(null);
            }}
          />
          <span className="fbform__note">{sr.feedback.note}</span>
        </label>

        <div className="fbform__foot">
          <p className="fbform__problem" data-empty={!problem} role="status">
            {problem ?? ""}
          </p>
          <button type="submit" className="home__cta fbform__submit" disabled={!canSubmit} aria-busy={status === "sending"}>
            {status === "sending" ? sr.feedback.sending : sr.feedback.submit}
          </button>
        </div>
      </form>
    </main>
  );
}
