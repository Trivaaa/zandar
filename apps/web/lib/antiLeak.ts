/**
 * Anti-leak straža (DS §7.1, C4).
 *
 * `PublicPlayer` (i svaki payload koji stiže klijentu) NIKAD ne smije sadržati
 * `isBot` / `botProfile` / `botIdentity`. Bot-leak je curenje skrivene
 * informacije — ista težina kao da procuri tuđa ruka.
 *
 * Ovo je dev-only runtime straža: ako server ikad procuri takvo polje, glasno
 * upozori u konzoli (regresija). U produkciji je no-op (bez troška).
 */

const FORBIDDEN_KEYS = ["isBot", "botProfile", "botIdentity"] as const;

export function assertNoBotLeak(
  players: readonly unknown[],
  context = "game:state",
): void {
  if (process.env.NODE_ENV === "production") return;

  for (const p of players) {
    if (!p || typeof p !== "object") continue;
    for (const key of FORBIDDEN_KEYS) {
      if (key in p) {
        // eslint-disable-next-line no-console
        console.error(
          `[anti-leak] (${context}) PublicPlayer procurio zabranjeno polje "${key}" — BOT-LEAK! (DS §7.1)`,
          p,
        );
      }
    }
  }
}
