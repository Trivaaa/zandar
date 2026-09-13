"use client";

import { useState } from "react";
import { HomeScreen } from "@/components/funnel/HomeScreen";
import { NameStep } from "@/components/funnel/NameStep";
import { SettingsSheet } from "@/components/home/SettingsSheet";
import { FeedbackToggles } from "@/components/FeedbackToggles";
import {
  MatchingTable,
  type MatchingPlayer,
} from "@/components/funnel/MatchingTable";
import { sr } from "@/lib/sr";

/**
 * Dev preview za funnel sloj. Komponente su čiste — stanja se biraju ručno, bez
 * sata i bez servera. Nije produkcijski. Pregib se mjeri na pravoj `/` ruti,
 * ne ovdje (okvir od 800px nije viewport).
 */

const players: MatchingPlayer[] = [
  { id: "me", displayName: "Dragan", seatIndex: 0 },
  { id: "p1", displayName: "Milica", seatIndex: 1 },
  { id: "p2", displayName: "Zoran", seatIndex: 2 },
  { id: "p3", displayName: "Svjetlana Vukašinović", seatIndex: 3 },
];

const ERROR = "Greška pri traženju stola. Pokušaj ponovo.";

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
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

const frame = "mx-auto w-[360px] h-[800px] max-w-full overflow-auto rounded-token-lg ring-1 ring-white/10";

export default function DevFunnelPage() {
  const [loading, setLoading] = useState(false);
  const [withError, setWithError] = useState(false);
  const [stores, setStores] = useState(true);
  const [name, setName] = useState("");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [savedName, setSavedName] = useState(true);
  const [revealed, setRevealed] = useState(2);
  const [done, setDone] = useState(false);

  const statusText = done ? sr.matching.ready : revealed === 0 ? sr.matching.preparing : sr.matching.seating;

  return (
    <div className="min-h-dvh bg-surface p-4 space-y-8 text-white">
      <h1 className="text-xl font-bold">Funnel sloj — home v4</h1>

      <section className="space-y-3">
        <h2 className="font-bold">HomeScreen</h2>
        <div className="flex flex-wrap gap-2">
          <Toggle on={loading} onClick={() => setLoading((v) => !v)}>loading</Toggle>
          <Toggle on={withError} onClick={() => setWithError((v) => !v)}>greška</Toggle>
          <Toggle on={stores} onClick={() => setStores((v) => !v)}>web (prodavnice)</Toggle>
        </div>
        <div className={frame}>
          <HomeScreen
            onPlay={() => undefined}
            onFriends={() => undefined}
            onOpenSettings={() => undefined}
            loading={loading}
            {...(withError ? { error: ERROR } : {})}
            showStores={stores}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">NameStep (/ime)</h2>
        <div className="flex flex-wrap gap-2">
          <Toggle on={nameLoading} onClick={() => setNameLoading((v) => !v)}>loading</Toggle>
          <Toggle on={nameError} onClick={() => setNameError((v) => !v)}>greška</Toggle>
        </div>
        <div className={frame}>
          <NameStep
            value={name}
            onChange={setName}
            onSubmit={() => undefined}
            onBack={() => undefined}
            loading={nameLoading}
            loadingLabel={sr.home.playLoading}
            {...(nameError ? { error: ERROR } : {})}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">SettingsSheet</h2>
        <div className="flex flex-wrap gap-2">
          <Toggle on={savedName} onClick={() => setSavedName((v) => !v)}>sačuvano ime</Toggle>
        </div>
        <div className="mx-auto w-[360px] max-w-full flex justify-center">
          <SettingsSheet
            playerName={savedName ? "Milica" : null}
            onChangeName={() => undefined}
            onRules={() => undefined}
            onClose={() => undefined}
            feedbackSlot={<FeedbackToggles />}
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
        <div className={frame}>
          <MatchingTable players={players} myPlayerId="me" revealed={revealed} statusText={statusText} done={done} />
        </div>
        <p className="text-sm text-muted">0 sjedišta = roster još nije stigao; sto se svejedno crta.</p>
      </section>
    </div>
  );
}
