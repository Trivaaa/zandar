"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { checkNickname, NICKNAME_MAX_LENGTH, suggestNicknameFromGuestName } from "@zandar/shared-types";

import { AccountShell } from "@/components/account/AccountShell";
import { Field } from "@/components/account/Field";
import { usePlayerName } from "@/lib/playerName";
import { checkNicknameRemote, saveNickname, useMe, type NicknameVerdict } from "@/lib/profile";
import { dayMonth } from "@/lib/dates";
import { sr } from "@/lib/sr";

/** K1: provjera kreće pola sekunde poslije zadnjeg slova. */
const CHECK_DEBOUNCE_MS = 500;

type Status =
  | { kind: "idle" }
  | { kind: "local"; message: string }
  | { kind: "checking" }
  | { kind: "server"; verdict: NicknameVerdict }
  | { kind: "error" };

function localProblem(value: string): string | null {
  const check = checkNickname(value);
  if (check.ok) return null;
  if (check.problem === "invalid_chars") {
    return check.char === " " || check.char === "\t" ? sr.account.space : sr.account.badChar(check.char ?? "?");
  }
  if (check.problem === "too_short") return value.trim() === "" ? "" : sr.account.tooShort;
  return sr.account.nicknameRules;
}

/**
 * A5 (Korak 2 od 3) — stanja K1–K7. Polje stiže popunjeno imenom gosta,
 * ispravljenim po pravilima (K7). Dalje tek kad je nadimak slobodan i uslovi
 * prihvaćeni. Nalog bez nadimka je nedovršen (Q10) — Profil vraća ovdje.
 *
 * `mode="change"` je P5 (promjena postojećeg): bez koraka i uslova, polje
 * stiže sa trenutnim nadimkom, napomena o 30 dana, dugme Sačuvaj.
 */
export function NicknameScreen({ mode = "first" }: { mode?: "first" | "change" }) {
  const changing = mode === "change";
  const router = useRouter();
  const me = useMe();
  const guestName = usePlayerName();
  // `null` = igrač još nije kucao; polje pokazuje prijedlog iz imena gosta (K7).
  const [typed, setValue] = useState<string | null>(null);
  // Odgovor servera važi samo za vrijednost za koju je tražen.
  const [result, setResult] = useState<{ for: string; verdict: NicknameVerdict | null } | null>(null);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Gost nema šta da radi ovdje; prvi izbor samo bez nadimka, promjena samo
  // sa nadimkom koji nije zaključan (P2).
  useEffect(() => {
    if (me.status !== "ready") return;
    if (me.me.anonymous) router.replace("/profil");
    else if (changing) {
      if (!me.me.nickname) router.replace("/nalog/nadimak");
      else if (me.me.nicknameChangeAllowedAt !== null) router.replace("/profil");
    } else if (me.me.nickname) router.replace(me.me.avatar ? "/profil" : "/nalog/avatar");
  }, [me, router, changing]);
  const current = me.status === "ready" ? (me.me.nickname ?? "") : "";

  // K7: prijedlog iz imena gosta, sa objašnjenjem dok ga igrač ne mijenja.
  const suggestion = useMemo(() => suggestNicknameFromGuestName(guestName ?? ""), [guestName]);
  const value = typed ?? (changing ? current : suggestion.nickname);
  const note =
    changing || typed !== null || !suggestion.nickname
      ? null
      : suggestion.changes.includes("cyrillic")
        ? sr.account.fromGuestCyrillic
        : suggestion.changes.includes("space")
          ? sr.account.fromGuestSpace
          : null;

  const problem = localProblem(value);
  const trimmed = value.trim();
  const status: Status =
    problem === ""
      ? { kind: "idle" }
      : problem !== null
        ? { kind: "local", message: problem }
        : result?.for !== trimmed
          ? { kind: "checking" }
          : result.verdict
            ? { kind: "server", verdict: result.verdict }
            : { kind: "error" };

  // K1: pita server tek kad oblik prođe, pola sekunde poslije zadnjeg slova.
  useEffect(() => {
    if (problem !== null) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      checkNicknameRemote(trimmed, ctrl.signal).then(
        (verdict) => setResult({ for: trimmed, verdict }),
        () => {
          if (!ctrl.signal.aborted) setResult({ for: trimmed, verdict: null });
        },
      );
    }, CHECK_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [problem, trimmed]);

  const free =
    status.kind === "server" && (status.verdict.status === "free" || status.verdict.status === "own");
  const canSubmit = free && !busy && (changing ? trimmed !== current : terms);

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setSaveError(null);
    try {
      const result = await saveNickname(value.trim());
      if (result.ok) {
        router.replace(changing ? "/profil" : "/nalog/avatar");
        return;
      }
      if (result.code === "locked") {
        setSaveError(sr.profile.lockedUntil(dayMonth(result.allowedAt)));
        return;
      }
      if (result.code === "taken") setResult({ for: trimmed, verdict: { status: "taken", suggestions: result.suggestions } });
      else if (result.code === "blocked") setResult({ for: trimmed, verdict: { status: "blocked" } });
      else setSaveError(sr.account.genericError);
    } catch {
      setSaveError(sr.account.networkError);
    } finally {
      setBusy(false);
    }
  }

  let message: string | null = null;
  let error = false;
  let suggestions: string[] = [];
  if (status.kind === "local") {
    message = status.message;
    error = true;
  } else if (status.kind === "checking") {
    message = sr.account.checking;
  } else if (status.kind === "error") {
    message = sr.account.networkError;
    error = true;
  } else if (status.kind === "server") {
    const v = status.verdict;
    if (v.status === "free" || v.status === "own") message = sr.account.free;
    else if (v.status === "taken") {
      message = sr.account.taken;
      suggestions = v.suggestions;
      error = true;
    } else if (v.status === "blocked") {
      message = sr.account.blocked;
      error = true;
    } else {
      message = localProblem(value) || sr.account.nicknameRules;
      error = true;
    }
  }

  return (
    <AccountShell
      {...(changing ? {} : { step: 2 })}
      title={changing ? sr.profile.changeNicknameTitle : sr.account.nicknameTitle}
      subtitle={sr.account.nicknameSub}
      // Prvi izbor: nalog već postoji, nazad ne briše ništa — Profil kasnije
      // vraća ovdje. Promjena: nazad na profil.
      onBack={() => (changing ? router.back() : router.replace("/"))}
    >
      <form
        className="acct__form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Field
          ref={inputRef}
          label={sr.account.nicknameLabel}
          autoComplete="nickname"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          maxLength={NICKNAME_MAX_LENGTH}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
          }}
          error={error}
          message={
            <>
              {/* Trenutni nadimak nije „slobodan" — on je već tvoj; bez poruke. */}
              {message && !(changing && trimmed === current) ? (
                <span className="acct__msg-line">{message}</span>
              ) : null}
              {note ? <span className="acct__msg-line acct__msg-line--muted">{note}</span> : null}
              <span className="acct__msg-line acct__msg-line--muted">{sr.account.nicknameRules}</span>
            </>
          }
        >
          {suggestions.length > 0 ? (
            <div className="acct__suggestions">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="acct__chip"
                  onClick={() => {
                    setValue(s);
                    inputRef.current?.focus();
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}
        </Field>

        {changing ? (
          <p className="acct__body acct__body--muted">{sr.profile.changeNicknameNote}</p>
        ) : (
          <label className="acct__check">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
            <span>
              {sr.account.terms.replace(sr.account.termsLink, "")}
              <Link href="/uslovi" className="acct__link">
                {sr.account.termsLink}
              </Link>
            </span>
          </label>
        )}

        <button type="submit" className="home__cta acct__submit" disabled={!canSubmit} aria-busy={busy}>
          {changing ? sr.profile.save : sr.account.next}
        </button>
        <p className="acct__error" data-empty={!saveError} role="status">
          {saveError ?? ""}
        </p>
      </form>
    </AccountShell>
  );
}
