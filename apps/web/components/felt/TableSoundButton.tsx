"use client";

import { SoundIcon } from "@/components/overlay/GameMenuSheet";
import { useSetting } from "@/lib/settings";
import { playSfx } from "@/lib/sound";
import { sr } from "@/lib/sr";

/**
 * Zvuk na stolu (tabla „Gdje je dugme za meni", M1): ono što se mijenja usred
 * igre je na stolu, a ne u meniju. Okrugao kao dugme za reakcije. Isti ključ
 * (`zandar:sound`) kao pločica u meniju, pa su uvijek u skladu.
 *
 * Stoji iznad dugmeta za reakcije (`ReactionFab aboveFab`), na njegovoj strani
 * — tamo je mjesto već slobodno na svakom stolu.
 */
export function TableSoundButton() {
  const [sound, setSound] = useSetting("sound");
  return (
    <button
      type="button"
      className="table-sound"
      aria-pressed={sound}
      aria-label={sound ? sr.tableSound.on : sr.tableSound.off}
      data-on={sound}
      onClick={() => {
        const next = !sound;
        setSound(next);
        if (next) playSfx("capture"); // potvrda + otključavanje audija
      }}
    >
      <SoundIcon on={sound} size={22} />
    </button>
  );
}
