/**
 * Prelazak socketa iz jedne sobe u drugu (QA 2026-10-24 / B10).
 *
 * Klijent je jedan singleton socket za cijelu aplikaciju. Kad igrač iz sobe A
 * pređe u sobu B bez ponovnog učitavanja (revanš → novi sto, pozivnica, push,
 * Android nazad), `room:subscribe` za B je ranije samo radio `join(B)`: socket
 * je ostajao i u socket.io sobi A, a `socket.data.playerId` je prepisan na
 * igrača iz B. `broadcastGameState(A)` je zato i dalje slao stanje A tom
 * socketu, izgrađeno za pogrešnog gledaoca — klijent na ruti A je crtao tuđu
 * partiju, a sebe kao protivnika bez ruke.
 *
 * Ovdje je samo odluka; `index.ts` radi `leave` i javlja odlazak sa starog
 * sjedišta (isti tok kao prekid veze).
 */
export type SubscribedSeat = { roomId: string; playerId: string };

/**
 * Sjedište koje socket napušta pretplatom na `next`, ili `null` ako nema šta
 * da se napusti (prva pretplata, ili ponovna pretplata na isto sjedište —
 * reconnect, povratak u prvi plan, dozvola za push).
 */
export function seatToLeave(
  data: { roomId?: unknown; playerId?: unknown },
  next: SubscribedSeat,
): SubscribedSeat | null {
  const { roomId, playerId } = data;
  if (typeof roomId !== "string" || typeof playerId !== "string") return null;
  if (roomId === next.roomId && playerId === next.playerId) return null;
  return { roomId, playerId };
}
