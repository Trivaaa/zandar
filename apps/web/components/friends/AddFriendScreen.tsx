"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AccountShell } from "@/components/account/AccountShell";
import { Field } from "@/components/account/Field";
import { Avatar } from "@/components/profile/Avatar";
import {
  acceptFriendRequest,
  searchPlayers,
  sendFriendRequest,
  type Relation,
  type SearchResult,
} from "@/lib/friends";
import { sr } from "@/lib/sr";

const SEARCH_DEBOUNCE_MS = 400;
const SEARCH_MIN = 3;

/**
 * D2 Dodaj prijatelja → D3 „Zahtjev poslat". Pretraga po početku nadimka
 * (≥3 slova). Red nosi radnju prema odnosu; igrač koji je meni već poslao
 * zahtjev dobija Prihvati (obostrani zahtjev ionako pravi prijateljstvo).
 */
export function AddFriendScreen() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [result, setResult] = useState<{ for: string; rows: SearchResult[] | null } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const term = q.trim();
  const ready = term.length >= SEARCH_MIN;

  useEffect(() => {
    if (!ready) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      searchPlayers(term, ctrl.signal).then(
        (rows) => setResult({ for: term, rows }),
        () => {
          if (!ctrl.signal.aborted) setResult({ for: term, rows: null });
        },
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [term, ready]);

  async function act(row: SearchResult) {
    setBusyId(row.profileId);
    setError(null);
    try {
      const relation: Relation =
        row.relation === "incoming"
          ? await acceptFriendRequest(row.profileId)
          : await sendFriendRequest(row.profileId);
      setResult((cur) =>
        cur?.rows
          ? { ...cur, rows: cur.rows.map((r) => (r.profileId === row.profileId ? { ...r, relation } : r)) }
          : cur,
      );
    } catch {
      setError(sr.account.genericError);
    } finally {
      setBusyId(null);
    }
  }

  const current = ready && result?.for === term ? result : null;
  let status: string | null = null;
  if (!ready) status = sr.friends.minChars;
  else if (!current) status = sr.friends.searching;
  else if (current.rows === null) status = sr.account.networkError;
  else if (current.rows.length === 0) status = sr.friends.noResults;

  return (
    <AccountShell title={sr.friends.addTitle} subtitle={sr.friends.addSub} onBack={() => router.back()}>
      <div className="acct__form">
        <Field
          label={sr.friends.searchLabel}
          type="search"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          message={status ?? undefined}
        />
        {current?.rows && current.rows.length > 0 ? (
          <ul className="friends__results">
            {current.rows.map((row) => (
              <li key={row.profileId} className="friends__row">
                {row.avatar ? (
                  <Avatar avatar={row.avatar} />
                ) : (
                  <span className="friends__letter" aria-hidden="true">
                    {row.nickname.charAt(0).toLocaleUpperCase("sr-Latn")}
                  </span>
                )}
                <span className="friends__name">{row.nickname}</span>
                {row.relation === "none" || row.relation === "incoming" ? (
                  <button
                    type="button"
                    className="friends__btn friends__btn--primary"
                    disabled={busyId === row.profileId}
                    onClick={() => void act(row)}
                  >
                    {row.relation === "incoming" ? sr.friends.accept : sr.friends.add}
                  </button>
                ) : (
                  <span className="friends__state">
                    {row.relation === "friends" ? sr.friends.already : sr.friends.sent}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="acct__error" data-empty={!error} role="status">
          {error ?? ""}
        </p>
      </div>
    </AccountShell>
  );
}
