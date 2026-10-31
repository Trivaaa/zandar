import { isNative } from "@/lib/platform";

/**
 * „Pošalji pozivnicu" (QA P1): sistemski meni za dijeljenje — Viber, WhatsApp,
 * Messenger, SMS… šta igrač ima. Tok odluke je sa table P1 na platnu
 * „Kartaonica · identitet".
 *
 * - aplikacija: `@capacitor/share` — Android WebView NEMA `navigator.share`;
 * - web: `navigator.share` (Android Chrome, iOS Safari, Win/macOS);
 * - inače (desktop Firefox) ili kad dijeljenje pukne: link u clipboard, da
 *   dugme nikad nije mrtvo.
 *
 * Link ide U tekst, bez zasebnog `url`: neke aplikacije ga inače dupliraju, a
 * druge izgube tekst. Viber/WhatsApp pregled grade iz linka u poruci.
 */
export type ShareChannel = "native" | "web" | "copy";
export type ShareOutcome = "shared" | "copied" | "cancelled";

export function pickShareChannel(env: { native: boolean; hasWebShare: boolean }): ShareChannel {
  if (env.native) return "native";
  if (env.hasWebShare) return "web";
  return "copy";
}

export type ShareInput = { title: string; text: string; url: string };

/** Ono što `shareInvite` koristi iz okoline — podmetljivo u testovima. */
export type ShareEnv = {
  native: boolean;
  webShare?: ((data: { title: string; text: string }) => Promise<void>) | undefined;
  nativeShare?: ((data: { title: string; text: string }) => Promise<void>) | undefined;
  copy: (text: string) => Promise<void>;
};

/** Igrač je zatvorio meni bez izbora — to nije greška. */
function isCancel(err: unknown): boolean {
  if (err instanceof Error && err.name === "AbortError") return true;
  // @capacitor/share na Androidu odbija sa porukom „Share canceled".
  const msg = err instanceof Error ? err.message : String(err);
  return /cancel/i.test(msg);
}

export async function shareInvite(input: ShareInput, env: ShareEnv = browserEnv()): Promise<ShareOutcome> {
  const data = { title: input.title, text: input.text };
  const channel = pickShareChannel({ native: env.native, hasWebShare: !!env.webShare });
  try {
    if (channel === "native" && env.nativeShare) {
      await env.nativeShare(data);
      return "shared";
    }
    if (channel === "web" && env.webShare) {
      await env.webShare(data);
      return "shared";
    }
  } catch (err) {
    if (isCancel(err)) return "cancelled";
    // Dijeljenje puklo (dozvola, nepodržan sadržaj) — padamo na kopiranje.
  }
  await env.copy(input.url).catch(() => {});
  return "copied";
}

function browserEnv(): ShareEnv {
  const nav = typeof navigator !== "undefined" ? navigator : undefined;
  return {
    native: isNative,
    webShare: nav?.share ? (data) => nav.share(data) : undefined,
    // Pravilo iz CLAUDE.md: plugin objekat se nikad ne vraća iz `async`
    // funkcije (Android proxy puca na `.then`) — import pa ODMAH poziv.
    nativeShare: async (data) => {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title: data.title, text: data.text, dialogTitle: data.title });
    },
    // `navigator.clipboard` traži siguran kontekst; u Capacitoru je origin
    // `https://localhost`, pa radi — odbijanje se guta iznad.
    copy: (text) => nav?.clipboard?.writeText(text) ?? Promise.resolve(),
  };
}
