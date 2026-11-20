/**
 * Da li je NAŠA veza sa stolom prekinuta (QA 2026-11-07 PK-B3).
 *
 * Tuđi prekid sto već pokazuje (`connectionStatus` igrača); ovo je vlastiti:
 * pregledač javi `offline` odmah, a socket.io prekid primijeti tek na ping
 * timeout — zato važi bilo koji od dva znaka. `connecting` nije prekid: to je
 * prvo spajanje, sto se tada još ne crta.
 */
export type SocketStatus = "disconnected" | "connecting" | "connected" | "error";

export function isConnectionLost(input: { browserOnline: boolean; socketStatus: SocketStatus }): boolean {
  if (!input.browserOnline) return true;
  return input.socketStatus === "disconnected" || input.socketStatus === "error";
}
