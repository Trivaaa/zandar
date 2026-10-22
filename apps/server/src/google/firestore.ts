import type { AccessTokenSource } from "./serviceAuth";

/**
 * Firestore REST v1 bez SDK-a — samo ono što nalog igrača koristi: čitanje
 * dokumenta i atomski `commit` sa preduslovima i inkrementom.
 *
 * Bazi pristupa SAMO server servisnim ključem; Security Rules odbijaju sve
 * ostale (`allow read, write: if false`). Klijent nikad ne priča s Firestoreom.
 */

export const FIRESTORE_SCOPE = "https://www.googleapis.com/auth/datastore";
const REQUEST_TIMEOUT_MS = 10_000;

export type FsPrimitive = string | number | boolean | null;
export type FsValue = FsPrimitive | FsValue[] | { [key: string]: FsValue };
export type FsFields = Record<string, FsValue>;

/** Tipizirana Firestore vrijednost (`{ stringValue: "…" }` i sl.). */
type Encoded = Record<string, unknown>;

export function encodeValue(value: FsValue): Encoded {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    // Firestore integerValue je int64 kao string; sve ostalo je double.
    return Number.isSafeInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  return { mapValue: { fields: encodeFields(value) } };
}

export function encodeFields(fields: FsFields): Record<string, Encoded> {
  const out: Record<string, Encoded> = {};
  for (const [key, value] of Object.entries(fields)) out[key] = encodeValue(value);
  return out;
}

export function decodeValue(raw: unknown): FsValue {
  const v = (raw ?? {}) as Record<string, unknown>;
  if ("stringValue" in v) return String(v.stringValue);
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("booleanValue" in v) return Boolean(v.booleanValue);
  if ("timestampValue" in v) return Date.parse(String(v.timestampValue));
  if ("arrayValue" in v) {
    const values = (v.arrayValue as { values?: unknown[] } | undefined)?.values ?? [];
    return values.map(decodeValue);
  }
  if ("mapValue" in v) {
    return decodeFields((v.mapValue as { fields?: unknown } | undefined)?.fields);
  }
  return null;
}

export function decodeFields(raw: unknown): FsFields {
  const out: FsFields = {};
  for (const [key, value] of Object.entries((raw ?? {}) as Record<string, unknown>)) {
    out[key] = decodeValue(value);
  }
  return out;
}

/**
 * Id dokumenta iz vrijednosti koje nisu naše (Firebase `uid`, `matchId`):
 * `/` bi napravio podkolekciju, a `.`/`..` i `__x__` Firestore odbija. `_` se
 * kodira da `__` između dijelova ostane jednoznačan.
 */
export function docId(...parts: string[]): string {
  return parts
    .map((p) => encodeURIComponent(p).replace(/[._]/g, (c) => (c === "." ? "%2E" : "%5F")))
    .join("__");
}

/** Jedan upis u `commit`-u. Sve u jednom `commit`-u prolazi ili ništa. */
export type FsWrite =
  | {
      kind: "set";
      path: string;
      fields: FsFields;
      /** `false` = dokument NE smije postojati (jedinstvenost, idempotentnost). */
      exists?: boolean;
      /** Samo ova polja se mijenjaju; bez maske dokument se zamjenjuje. */
      mask?: string[];
      /** Atomski inkrement brojčanih polja (ne postoji → kreće od 0). */
      increment?: Record<string, number>;
    }
  | { kind: "delete"; path: string; exists?: boolean };

/** Preduslov `commit`-a nije ispunjen — npr. dokument već postoji. */
export class FirestoreConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FirestoreConflictError";
  }
}

export function createFirestore(
  projectId: string,
  tokens: AccessTokenSource,
  fetchImpl: typeof fetch = globalThis.fetch,
) {
  const root = `projects/${projectId}/databases/(default)/documents`;
  const base = `https://firestore.googleapis.com/v1/${root}`;

  function docName(path: string): string {
    return `${root}/${path}`;
  }

  async function call(url: string, init: RequestInit): Promise<Response> {
    const doFetch = async () =>
      fetchImpl(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${await tokens.get()}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    let res = await doFetch();
    // Opozvan ili istekao token: jedan novi pokušaj sa svježim.
    if (res.status === 401) {
      tokens.invalidate();
      res = await doFetch();
    }
    return res;
  }

  function encodeWrite(w: FsWrite): Record<string, unknown> {
    const precondition = w.exists === undefined ? undefined : { exists: w.exists };
    if (w.kind === "delete") {
      return { delete: docName(w.path), ...(precondition && { currentDocument: precondition }) };
    }
    return {
      update: { name: docName(w.path), fields: encodeFields(w.fields) },
      ...(w.mask && { updateMask: { fieldPaths: w.mask } }),
      ...(w.increment && {
        updateTransforms: Object.entries(w.increment).map(([fieldPath, by]) => ({
          fieldPath,
          increment: encodeValue(by),
        })),
      }),
      ...(precondition && { currentDocument: precondition }),
    };
  }

  return {
    projectId,

    /** `null` = dokument ne postoji. */
    async get(path: string): Promise<FsFields | null> {
      const res = await call(`${base}/${path}`, { method: "GET" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`Firestore get ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return decodeFields(((await res.json()) as { fields?: unknown }).fields);
    },

    /** Atomski: svi upisi ili nijedan. Neispunjen preduslov → `FirestoreConflictError`. */
    async commit(writes: FsWrite[]): Promise<void> {
      const res = await call(`${base}:commit`, {
        method: "POST",
        body: JSON.stringify({ writes: writes.map(encodeWrite) }),
      });
      if (res.ok) return;
      const body = await res.text();
      // `exists:false` na postojećem dokumentu vraća ALREADY_EXISTS (409),
      // `exists:true` na nepostojećem NOT_FOUND/FAILED_PRECONDITION.
      if (res.status === 409 || /FAILED_PRECONDITION|ALREADY_EXISTS/.test(body)) {
        throw new FirestoreConflictError(body.slice(0, 300));
      }
      throw new Error(`Firestore commit ${res.status}: ${body.slice(0, 300)}`);
    },
  };
}

export type Firestore = ReturnType<typeof createFirestore>;
