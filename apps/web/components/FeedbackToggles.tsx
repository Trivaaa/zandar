"use client";

import { useSetting } from "@/lib/settings";

/**
 * On/Off preklopke za zvuk i vibraciju (PRD §50.4, FR-025).
 *
 * Lako dostupne — jedan tap, bez menija. Primarno mjesto je glavni ekran (home),
 * iste preklopke se koriste i u igri radi konzistencije. Paleta-agnostičan stil
 * (radi i na home zelenoj i na felt pozadini).
 */
export function FeedbackToggles({ className }: { className?: string }) {
  const [sound, setSound] = useSetting("sound");
  const [haptics, setHaptics] = useSetting("haptics");

  return (
    <div className={`flex items-center gap-1.5 ${className ?? ""}`}>
      <button
        type="button"
        aria-pressed={sound}
        aria-label={sound ? "Isključi zvuk" : "Uključi zvuk"}
        title={sound ? "Zvuk uključen" : "Zvuk isključen"}
        onClick={() => setSound(!sound)}
        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg bg-black/30 hover:bg-black/40 active:scale-95 transition ${
          sound ? "ring-1 ring-white/25" : "opacity-50"
        }`}
      >
        {sound ? "🔊" : "🔇"}
      </button>

      <button
        type="button"
        aria-pressed={haptics}
        aria-label={haptics ? "Isključi vibraciju" : "Uključi vibraciju"}
        title={haptics ? "Vibracija uključena" : "Vibracija isključena"}
        onClick={() => setHaptics(!haptics)}
        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg bg-black/30 hover:bg-black/40 active:scale-95 transition ${
          haptics ? "ring-1 ring-white/25" : "opacity-50 line-through decoration-2"
        }`}
      >
        📳
      </button>
    </div>
  );
}
