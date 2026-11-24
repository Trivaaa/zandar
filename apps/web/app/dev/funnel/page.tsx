"use client";

import { useState } from "react";
import { NameStep } from "@/components/funnel/NameStep";
import { sr } from "@/lib/sr";

/**
 * Dev preview za funnel sloj. Komponente su čiste — stanja se biraju ručno, bez
 * sata i bez servera. Nije produkcijski. Pregib se mjeri na pravoj `/` ruti,
 * ne ovdje (okvir od 800px nije viewport).
 */

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
  const [name, setName] = useState("");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState(false);


  return (
    <div className="min-h-dvh bg-surface p-4 space-y-8 text-white">
      <h1 className="text-xl font-bold">Funnel sloj — home v4</h1>

      <section className="space-y-3">
        <h2 className="font-bold">HomeScreen</h2>
        <p className="text-sm text-muted">
          Preko cijelog ekrana (pregib, 1/2/3 igre, zakačena): <a className="underline" href="/dev/home?live=1">/dev/home?live=1</a>
          {" · "}
          <a className="underline" href="/dev/home?live=2">live=2</a>
          {" · "}
          <a className="underline" href="/dev/home?live=3">live=3</a>
          {" · "}
          <a className="underline" href="/dev/home?live=3&pin=poker">pin=poker</a>
        </p>
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


    </div>
  );
}
