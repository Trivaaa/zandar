/**
 * Množina brojeva (SPEC_IDENTITET §3): 1 i 21 → jednina, 2–4 i 22–24 →
 * paukal, ostalo (i 11–14) → genitiv množine. Vraća jedan od tri oblika.
 */
export function pluralForm<T>(n: number, one: T, few: T, many: T): T {
  const abs = Math.abs(Math.trunc(n));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
