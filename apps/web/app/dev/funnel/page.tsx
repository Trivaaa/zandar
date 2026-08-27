"use client";

import { useState } from "react";
import { HomeScreen } from "@/components/funnel/HomeScreen";
import {
  MatchingTable,
  type MatchingPlayer,
} from "@/components/funnel/MatchingTable";
import { sr } from "@/lib/sr";

/**
 * Dev preview za funnel sloj (Lovable korak 5). Komponente su čiste — stanja se
 * biraju ručno, bez sata i bez servera. Nije produkcijski.
 */

const players: MatchingPlayer[] = [
  { id: "me", displayName: "Dragan", seatIndex: 0 },
  { id: "p1", displayName: "Milica", seatIndex: 1 },
  { id: "p2", displayName: "Zoran", seatIndex: 2 },
  { id: "p3", displayName: "Svjetlana Vukašinović", seatIndex: 3 },
];

function Toggle({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-token-md px-2.5 py-1 text-sm ${
        on ? "bg-accent text-accent-contrast font-bold" : "bg-surface-raised text-muted"
      }`}
    >
      {children}
    </button>
  );
}

export default function DevFunnelPage() {
  const [named, setNamed] = useState(true);
  const [nameInput, setNameInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [withError, setWithError] = useState(false);
  const [revealed, setRevealed] = useState(2);
  const [done, setDone] = useState(false);

  const statusText = done
    ? sr.matching.ready
    : revealed === 0
      ? sr.matching.preparing
      : sr.matching.seating;

  return (
    <div className="min-h-dvh bg-surface p-4 space-y-8 text-white">
      <h1 className="text-xl font-bold">Funnel sloj — port (Lovable korak 5)</h1>

      <section className="space-y-3">
        <h2 className="font-bold">HomeScreen</h2>
        <div className="flex flex-wrap gap-2">
          <Toggle on={named} onClick={() => setNamed(true)}>zapamćeno ime</Toggle>
          <Toggle on={!named} onClick={() => setNamed(false)}>prvi put</Toggle>
          <Toggle on={loading} onClick={() => setLoading((v) => !v)}>loading</Toggle>
          <Toggle on={withError} onClick={() => setWithError((v) => !v)}>greška</Toggle>
        </div>
        <div className="mx-auto w-[360px] h-[800px] max-w-full overflow-hidden rounded-token-lg ring-1 ring-white/10">
          <HomeScreen
            savedName={named ? "Milica" : null}
            nameInput={nameInput}
            onNameInput={setNameInput}
            onPlay={() => undefined}
            onForgetName={() => setNamed(false)}
            onCreateRoom={() => undefined}
            loading={loading}
            {...(withError ? { error: "Greška pri traženju stola. Pokušaj ponovo." } : {})}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">MatchingTable</h2>
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3, 4].map((n) => (
            <Toggle key={n} on={revealed === n} onClick={() => setRevealed(n)}>
              {n} sjedišta
            </Toggle>
          ))}
          <Toggle on={done} onClick={() => setDone((v) => !v)}>sto popunjen</Toggle>
        </div>
        <div className="mx-auto w-[360px] h-[800px] max-w-full overflow-hidden rounded-token-lg ring-1 ring-white/10">
          <MatchingTable
            players={players}
            myPlayerId="me"
            revealed={revealed}
            statusText={statusText}
            done={done}
          />
        </div>
        <p className="text-sm text-muted">
          0 sjedišta = roster još nije stigao; sto se svejedno crta.
        </p>
      </section>
    </div>
  );
}
