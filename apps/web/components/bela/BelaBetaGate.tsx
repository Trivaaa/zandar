"use client";

import { useCallback, useState, type ReactNode } from "react";

import { BelaBetaSheet } from "@/components/bela/BelaParts";
import { useBackHandler } from "@/lib/backHandlers";
import { markBelaBetaSeen, readBelaBetaSeen } from "@/lib/belaBeta";

/**
 * Beta prozor PRIJE ulaska za Bela sto (odluka 16, dopuna 21.11.2026).
 *
 * Server pokreće partiju čim igrač sjedne (Quick Play odmah, sa botovima), pa
 * prozor na stolu je značio da igra teče iza njega. Zato svaki ulaz za Bela sto
 * (Igraj, Napravi sto, poziv prijatelja, link pozivnice) ide kroz `gate`: prvi
 * put na uređaju pokaže prozor, a zahtjev serveru ide tek na „Razumijem".
 * Android/pregledač „nazad" zatvara prozor bez ulaska.
 */
export function useBelaBetaGate(): {
  gate: (game: string | null | undefined, go: () => void) => void;
  element: ReactNode;
} {
  const [pending, setPending] = useState<{ go: () => void } | null>(null);

  const gate = useCallback((game: string | null | undefined, go: () => void) => {
    if (game !== "bela" || readBelaBetaSeen()) {
      go();
      return;
    }
    setPending({ go });
  }, []);

  useBackHandler(pending !== null, () => setPending(null));

  const element = pending ? (
    <div className="bl-beta-gate">
      <BelaBetaSheet
        onClose={() => {
          markBelaBetaSeen();
          setPending(null);
          pending.go();
        }}
      />
    </div>
  ) : null;

  return { gate, element };
}
