const MONTHS_GENITIVE = [
  "januara",
  "februara",
  "marta",
  "aprila",
  "maja",
  "juna",
  "jula",
  "avgusta",
  "septembra",
  "oktobra",
  "novembra",
  "decembra",
] as const;

/** „9. novembra" (P2: „Opet od 9. novembra"); godina tek kad nije ova. */
export function dayMonth(ms: number, now: number = Date.now()): string {
  const d = new Date(ms);
  const base = `${d.getDate()}. ${MONTHS_GENITIVE[d.getMonth()]}`;
  return d.getFullYear() === new Date(now).getFullYear() ? base : `${base} ${d.getFullYear()}.`;
}
