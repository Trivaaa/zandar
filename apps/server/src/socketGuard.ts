/**
 * Straža za socket handlere: nijedan paket sa mreže ne smije oboriti proces.
 *
 * Neuhvaćena greška u handleru završi u `uncaughtException` /
 * `unhandledRejection`, a ta straža (index.ts) radi `shutdown(1)` — padaju SVI
 * stolovi, i to na paket koji može poslati bilo ko, bez prijave. Desilo se:
 * `room:subscribe` sa `null` payload-om.
 *
 * Dvije zamke koje tip ne vidi:
 *  - payload je šta god je klijent poslao (`null`, broj, niz…), ne naš tip;
 *  - `ack` je funkcija SAMO kad je klijent tražio potvrdu — inače je zadnji
 *    argument obična vrijednost, pa `ack?.(…)` baca „ack is not a function".
 *
 * Modul je čist (bez io/fastify), da se testira bez servera.
 */

export type AckResult = { ok: boolean; error?: string };
export type Ack = (res: AckResult) => void;

type Log = { error: (msg: string) => void };

/**
 * Razdvoji argumente Socket.IO događaja na payload i ack. Ack se poziva
 * najviše jednom; kad ga klijent nije tražio, poziv je no-op.
 */
export function splitArgs(args: readonly unknown[]): { payload: unknown; ack: Ack } {
  const last = args.at(-1);
  const raw = typeof last === "function" ? (last as Ack) : null;
  const payload = raw && args.length === 1 ? undefined : args[0];

  let sent = false;
  const ack: Ack = (res) => {
    if (sent || !raw) return;
    sent = true;
    raw(res);
  };
  return { payload, ack };
}

/**
 * Omotaj handler: sinhrona greška i odbijen promise se loguju i javljaju
 * klijentu kao `INTERNAL`, a nikad ne izlaze iz handlera.
 */
export function guarded(
  event: string,
  log: Log,
  handler: (payload: unknown, ack: Ack) => void | Promise<void>,
): (...args: unknown[]) => void {
  return (...args) => {
    const { payload, ack } = splitArgs(args);
    const fail = (err: unknown) => {
      const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
      log.error(`✗ Socket handler ${event} pao: ${message}`);
      ack({ ok: false, error: "INTERNAL" });
    };
    try {
      const result = handler(payload, ack);
      if (result instanceof Promise) result.catch(fail);
    } catch (err) {
      fail(err);
    }
  };
}

// ---- PARSERI ----
// Granice su labave: sadašnji klijent i stari APK-ovi moraju proći bez izmjene.

const MAX_ID_LENGTH = 256;
const MAX_CARD_ID_LENGTH = 64;
const MAX_MOVE_ID_LENGTH = 128;
/** Na stolu ne može biti više karata nego u špilu. */
const MAX_CAPTURE_CARDS = 52;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isShortString(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length <= max;
}

export type SubscribePayload = {
  roomId: string;
  playerId: string;
  sessionToken: string;
  /** Push uređaj koji gleda ovo sjedište (PRD §51); provjerava ga deviceStore. */
  pushId?: unknown;
  /** Firebase ID token (nalog); stari klijenti ga ne šalju. Provjerava ga idTokens. */
  idToken?: unknown;
};

export function parseSubscribePayload(payload: unknown): SubscribePayload | null {
  if (!isRecord(payload)) return null;
  const { roomId, playerId, sessionToken, pushId, idToken } = payload;
  if (
    !isShortString(roomId, MAX_ID_LENGTH) ||
    !isShortString(playerId, MAX_ID_LENGTH) ||
    !isShortString(sessionToken, MAX_ID_LENGTH)
  ) {
    return null;
  }
  return { roomId, playerId, sessionToken, pushId, idToken };
}

export type PlayCardPayload = {
  cardId: string;
  selectedCaptureCardIds: string[];
  clientMoveId: string;
  clientKnownStateVersion: number;
};

export function parsePlayCardPayload(payload: unknown): PlayCardPayload | null {
  if (!isRecord(payload)) return null;
  const { cardId, selectedCaptureCardIds, clientMoveId, clientKnownStateVersion } = payload;
  if (!isShortString(cardId, MAX_CARD_ID_LENGTH)) return null;
  if (
    !Array.isArray(selectedCaptureCardIds) ||
    selectedCaptureCardIds.length > MAX_CAPTURE_CARDS ||
    !selectedCaptureCardIds.every((id) => isShortString(id, MAX_CARD_ID_LENGTH))
  ) {
    return null;
  }
  if (!isShortString(clientMoveId, MAX_MOVE_ID_LENGTH)) return null;
  if (typeof clientKnownStateVersion !== "number" || !Number.isFinite(clientKnownStateVersion)) {
    return null;
  }
  return {
    cardId,
    selectedCaptureCardIds: selectedCaptureCardIds as string[],
    clientMoveId,
    clientKnownStateVersion,
  };
}

export function parseReactionType(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  return isShortString(payload.type, MAX_ID_LENGTH) ? payload.type : null;
}
