"use client";

import { useSyncExternalStore } from "react";
import { useSetting } from "@/lib/settings";
import { playSfx } from "@/lib/sound";
import { hapticsSupported, vibrate, HAPTIC } from "@/lib/haptics";
import { setPushTable, usePushRegistered } from "@/lib/push";
import { sr } from "@/lib/sr";

/**
 * On/Off preklopke za zvuk i vibraciju (PRD §50.4, FR-025).
 *
 * Lako dostupne — jedan tap, bez menija. Primarno mjesto je glavni ekran (home),
 * iste preklopke se koriste i u igri radi konzistencije. Paleta-agnostičan stil
 * (radi i na home zelenoj i na felt pozadini).
 *
 * Vibracija: ako je uređaj ne podržava (iPhone/iOS Safari, desktop), 📳 je
 * onemogućen i zatamnjen uz objašnjenje — da se ne misli da je bug.
 *
 * 🔔 obavještenja o stolu (PRD §51): samo uz `showPush` (home — u igri je
 * zaglavlje preusko) i tek kad je uređaj registrovan. Prije toga preklopka
 * nema šta da gasi, a dozvolu traži `PushPrompt`, ne ova ikonica.
 */
export function FeedbackToggles({
  className,
  showPush = false,
}: {
  className?: string;
  showPush?: boolean;
}) {
  const [sound, setSound] = useSetting("sound");
  const [haptics, setHaptics] = useSetting("haptics");
  const [pushTable] = useSetting("pushTable");
  const pushRegistered = usePushRegistered();
  // `navigator.vibrate` se zna tek na klijentu → server snapshot=false izbjegava
  // hydration mismatch (React-preporučeni pattern, bez setState-in-effect).
  const canVibrate = useSyncExternalStore(
    () => () => {}, // subscribe: vrijednost se ne mijenja
    () => hapticsSupported(), // client
    () => false, // server
  );

  return (
    <div className={`flex items-center gap-1.5 ${className ?? ""}`}>
      <button
        type="button"
        aria-pressed={sound}
        aria-label={sound ? "Isključi zvuk" : "Uključi zvuk"}
        title={sound ? "Zvuk uključen" : "Zvuk isključen"}
        onClick={() => {
          const next = !sound;
          setSound(next);
          if (next) playSfx("capture"); // potvrda + otključavanje audija
        }}
        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg bg-black/30 hover:bg-black/40 active:scale-95 transition ${
          sound ? "ring-1 ring-white/25" : "opacity-50"
        }`}
      >
        {sound ? "🔊" : "🔇"}
      </button>

      <button
        type="button"
        disabled={!canVibrate}
        aria-pressed={canVibrate && haptics}
        aria-label={
          !canVibrate
            ? "Vibracija nije podržana na ovom uređaju"
            : haptics
              ? "Isključi vibraciju"
              : "Uključi vibraciju"
        }
        title={
          !canVibrate
            ? "Vibracija nije podržana na ovom uređaju (npr. iPhone/desktop)"
            : haptics
              ? "Vibracija uključena"
              : "Vibracija isključena"
        }
        onClick={() => {
          const next = !haptics;
          setHaptics(next);
          if (next) vibrate(HAPTIC.confirm); // osjetna potvrda (no-op ako nije podržano)
        }}
        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg bg-black/30 transition ${
          !canVibrate
            ? "opacity-30 cursor-not-allowed"
            : haptics
              ? "ring-1 ring-white/25 hover:bg-black/40 active:scale-95"
              : "opacity-50 line-through decoration-2 hover:bg-black/40 active:scale-95"
        }`}
      >
        📳
      </button>

      {showPush && pushRegistered ? (
        <button
          type="button"
          aria-pressed={pushTable}
          aria-label={pushTable ? sr.push.toggleOn : sr.push.toggleOff}
          title={pushTable ? sr.push.stateOn : sr.push.stateOff}
          onClick={() => setPushTable(!pushTable)}
          className={`w-10 h-10 rounded-full flex items-center justify-center text-lg bg-black/30 hover:bg-black/40 active:scale-95 transition ${
            pushTable ? "ring-1 ring-white/25" : "opacity-50"
          }`}
        >
          {pushTable ? "🔔" : "🔕"}
        </button>
      ) : null}
    </div>
  );
}
