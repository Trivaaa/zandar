"use client";

import { useState } from "react";

import type { SignupListItem } from "@zandar/shared-types";

import { fetchSignups, fetchSignupsCsv } from "@/lib/api";
import { groupSignups } from "@/lib/signupsOverview";
import { sr } from "@/lib/sr";

const DATE = new Intl.DateTimeFormat("sr-Latn-BA", { dateStyle: "short", timeStyle: "short" });

/**
 * Pregled prijava za vlasnika. Token živi samo u stanju ove stranice: ne upisuje
 * se u URL ni u storage, pa zatvaranje stranice briše i njega i adrese.
 *
 * `ph-no-capture` na cijeloj stranici: snimak sesije ne smije ponijeti adrese.
 */
export function SignupsAdmin() {
  const [token, setToken] = useState("");
  const [signups, setSignups] = useState<SignupListItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setProblem(null);
    try {
      const res = await fetchSignups(token.trim());
      if (res) setSignups(res.signups);
      else {
        setSignups(null);
        setProblem(sr.adminSignups.wrongToken);
      }
    } catch {
      setProblem(sr.adminSignups.network);
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    setProblem(null);
    try {
      const url = URL.createObjectURL(await fetchSignupsCsv(token.trim()));
      const a = document.createElement("a");
      a.href = url;
      a.download = `prijave-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setProblem(sr.adminSignups.network);
    }
  }

  const rows = signups ? groupSignups(signups) : null;

  return (
    <main className="ph-no-capture min-h-screen bg-felt text-white px-4 py-6 pt-safe-top pb-safe-bottom font-sans text-base">
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">{sr.adminSignups.title}</h1>

        {rows ? null : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void load();
            }}
          >
            <label className="block space-y-1">
              <span className="text-muted">{sr.adminSignups.tokenLabel}</span>
              <input
                className="namestep__input ph-no-capture"
                type="password"
                autoComplete="off"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </label>
            <button type="submit" className="home__cta" disabled={busy || !token.trim()}>
              {busy ? sr.adminSignups.opening : sr.adminSignups.open}
            </button>
          </form>
        )}

        {problem ? <p role="alert">{problem}</p> : null}

        {rows ? (
          <>
            <p className="text-lg font-bold">{sr.adminSignups.addresses(rows.length)}</p>
            <p className="text-muted">{sr.adminSignups.note}</p>
            <div className="flex gap-4">
              <button type="button" className="underline text-accent" disabled={busy} onClick={() => void load()}>
                {sr.adminSignups.refresh}
              </button>
              <button type="button" className="underline text-accent" onClick={() => void download()}>
                {sr.adminSignups.download}
              </button>
            </div>
            {rows.length === 0 ? <p className="text-muted">{sr.adminSignups.empty}</p> : null}
            <ul className="divide-y divide-white/15">
              {rows.map((row) => (
                <li key={row.email} className="py-3">
                  <div className="font-bold break-all">{row.email}</div>
                  <div className="text-muted">
                    {row.games.join(", ")} · {DATE.format(row.firstAt)}
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </main>
  );
}
