/**
 * Lokalno vrijeme uređaja (IANA zona sa telefona) — za lični sat i tiho vrijeme
 * podsjetnika (SPEC_PUSH_V2 B4). Nepoznata ili pokvarena zona pada na
 * `FALLBACK_TZ`, nikad ne baca.
 */

export const FALLBACK_TZ = "Europe/Sarajevo";

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    });
    formatters.set(tz, f);
  }
  return f;
}

/** Zona koju `Intl` prihvata, inače rezervna. */
export function safeTz(tz: string | undefined): string {
  if (!tz) return FALLBACK_TZ;
  try {
    formatter(tz);
    return tz;
  } catch {
    return FALLBACK_TZ;
  }
}

export type LocalParts = {
  /** Broj dana od 1970-01-01 po LOKALNOM kalendaru — razlika dva je broj ponoći između. */
  day: number;
  hour: number;
};

export function localParts(ms: number, tz: string | undefined): LocalParts {
  const parts = formatter(safeTz(tz)).formatToParts(new Date(ms));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const day = Math.floor(Date.UTC(get("year"), get("month") - 1, get("day")) / 86_400_000);
  return { day, hour: get("hour") % 24 };
}
