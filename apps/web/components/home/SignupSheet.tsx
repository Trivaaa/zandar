"use client";

import { Sheet } from "@/components/sheet/Sheet";
import { SignupForm } from "@/components/teaser/SignupForm";
import type { GameConfig } from "@/lib/games";
import { sr } from "@/lib/sr";

/** „Javi mi" sa početne: jedna prijava za sve najavljene igre (SPEC_POCETNA §7). */
export function SignupSheet({ games, onClose }: { games: readonly GameConfig[]; onClose: () => void }) {
  const slugs = games.flatMap((g) => (g.slug === "zandar" ? [] : [g.slug]));
  return (
    <Sheet
      title={sr.signup.manyTitle(games.map((g) => sr.games[g.slug].name))}
      closeLabel={sr.home.close}
      onClose={onClose}
    >
      <p className="sheet__note sheet__note--muted">{sr.signup.manyBody}</p>
      <SignupForm
        games={slugs}
        onBackToGame={onClose}
        backLabel={sr.signup.backHome}
        successBody={sr.signup.manySuccessBody}
      />
    </Sheet>
  );
}
