"use client";

import type { UpcomingGameSlug } from "@zandar/shared-types";

import { Sheet } from "@/components/sheet/Sheet";
import { SignupForm } from "@/components/teaser/SignupForm";
import { sr } from "@/lib/sr";

/**
 * Lažna vrata (Tablić, Remi): igrač je dodirnuo „Igraj" na igri koja još ne
 * postoji. Odmah na vrhu piše da dolazi uskoro, a ispod je prijava samo za tu
 * igru. Analitiku nosi domaćin (`onSignedUp`).
 */
export function ComingSoonSheet({
  game,
  onSignedUp,
  onClose,
}: {
  game: UpcomingGameSlug;
  onSignedUp: () => void;
  onClose: () => void;
}) {
  const name = sr.games[game].name;
  return (
    <Sheet title={sr.door.title(name)} closeLabel={sr.home.close} onClose={onClose}>
      <p className="sheet__note sheet__note--muted">{sr.door.body(name)}</p>
      <SignupForm
        games={[game]}
        onBackToGame={onClose}
        backLabel={sr.signup.backHome}
        successBody={sr.door.successBody}
        onSuccess={onSignedUp}
      />
    </Sheet>
  );
}
