import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { link, mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { CONSENT_TEXTS, type ConsentTextId, type UpcomingGameSlug } from "@zandar/shared-types";

/**
 * Prijave za obavještenje o budućim igrama — jedan JSON fajl po (e-adresa, igra).
 *
 * Zašto NE `PersistenceAdapter`: njegov `save` je „posljednji piše" i ne zna da li
 * je fajl već postojao. Dva istovremena zahtjeva sa istom adresom bi oba javila
 * uspjeh i DVAPUT okinula `signup_succeeded`. Ovdje je upis `writeFile(tmp)` →
 * `link(tmp, cilj)`: `link` je atomičan i ekskluzivan, pa `EEXIST` znači
 * „već prijavljen" — i za dupli klik i za trku dva zahtjeva, jednim potezom.
 *
 * ⚠ Gdje fajlovi žive: `DATA_DIR` na Railwayu pokazuje na folder SOBA, a
 * hidracija (`persistence.loadAll`) čita svaki `.json` u njemu. Zato prijave idu
 * u PODFOLDER `_signups` — unutar istog volumena (preživljavaju deploy), ali van
 * `readdir` filtera soba i van dosega TTL sweepera. `SIGNUPS_DIR` ga nadjačava.
 * Staging i produkcija imaju zasebne volumene, pa i zasebne prijave.
 *
 * ⚠ Volumen nema backup. Gubitak volumena = gubitak adresa; povremeni export
 * (`GET /api/signups/export`) je jedina kopija van servera.
 */
export type SignupRecord = {
  game: UpcomingGameSlug;
  /** Već normalizovana (`normalizeEmail`). */
  email: string;
  consentTextId: ConsentTextId;
  /** Serversko vrijeme saglasnosti — ne klijentsko, klijentu se ne vjeruje. */
  consentedAt: number;
  createdAt: number;
};

export function signupsDir(): string {
  if (process.env.SIGNUPS_DIR) return resolve(process.env.SIGNUPS_DIR);
  const roomsDir = process.env.DATA_DIR || resolve(process.cwd(), ".data", "rooms");
  return join(roomsDir, "_signups");
}

/**
 * Ključ fajla. Hash, a ne sama adresa: `safeId` iz persistence-a bi `a@b.com` i
 * `ab@c.om` sveo na isto ime, a adresa u imenu fajla bi se vidjela u svakom
 * `ls`-u volumena.
 */
export function signupId(email: string, game: UpcomingGameSlug): string {
  return createHash("sha256").update(`${game}:${email}`).digest("hex").slice(0, 40);
}

export async function saveSignup(
  record: SignupRecord,
  dir: string = signupsDir(),
): Promise<{ created: boolean }> {
  await mkdir(dir, { recursive: true });
  const id = signupId(record.email, record.game);
  const file = join(dir, `${id}.json`);
  const tmp = join(dir, `${id}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`);
  await writeFile(tmp, JSON.stringify(record), "utf8");
  try {
    await link(tmp, file);
    return { created: true };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "EEXIST") return { created: false };
    throw err;
  } finally {
    await unlink(tmp).catch(() => undefined);
  }
}

export async function listSignups(dir: string = signupsDir()): Promise<SignupRecord[]> {
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }
  const out: SignupRecord[] = [];
  for (const name of files) {
    if (!name.endsWith(".json")) continue;
    try {
      out.push(JSON.parse(await readFile(join(dir, name), "utf8")) as SignupRecord);
    } catch {
      // korumpiran fajl se preskače, isto kao kod soba
    }
  }
  return out.sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * CSV za ručnu analizu. Svako polje u navodnicima; vrijednost koja počinje sa
 * `= + - @` dobija apostrof, da je tabelarni program ne izvrši kao formulu.
 */
export function signupsToCsv(records: readonly SignupRecord[]): string {
  const cell = (value: string) => {
    const safe = /^[=+@-]/.test(value) ? `'${value}` : value;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const header = ["game", "email", "consentTextId", "consentText", "consentedAt", "createdAt"];
  const rows = records.map((r) =>
    [
      r.game,
      r.email,
      r.consentTextId,
      CONSENT_TEXTS[r.consentTextId] ?? "",
      new Date(r.consentedAt).toISOString(),
      new Date(r.createdAt).toISOString(),
    ].map(cell),
  );
  return [header.map(cell), ...rows].map((row) => row.join(",")).join("\n") + "\n";
}

/** Poređenje tokena u konstantnom vremenu (hash izjednačava dužine). */
export function tokenMatches(given: string, expected: string): boolean {
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
