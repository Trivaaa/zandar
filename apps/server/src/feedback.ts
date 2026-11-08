import { randomBytes } from "node:crypto";
import { mkdir, readdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import type { FastifyInstance } from "fastify";
import {
  FEEDBACK_LIMITS,
  isFeedbackKind,
  normalizeEmail,
  type AnalyticsEvents,
  type AnalyticsPlatform,
  type FeedbackKind,
  type FeedbackResponse,
} from "@zandar/shared-types";

import { parsePlatform } from "./analytics";
import type { Mailer } from "./mail/resend";
import { SlidingWindowLimiter } from "./rateLimit";
import { isAdmin } from "./signups";

/**
 * Utisci igrača („Pošalji utisak": greška, prijedlog, pohvala).
 *
 * Svaki utisak ide e-poštom vlasniku (Resend) I ostaje na disku: mejl je
 * sanduče u kojem se čita i odgovara, a disk je kopija za slučaj da pošta
 * zakaže (`GET /api/feedback/export`).
 *
 * ⚠ Gdje fajlovi žive: isti razlog kao `_signups` — `DATA_DIR` je folder SOBA,
 * a hidracija čita svaki `.json` na vrhu. Utisci idu u PODFOLDER `_feedback`
 * (preživljavaju deploy, van hidracije i van sweepera soba). `FEEDBACK_DIR` ga
 * nadjačava. Zapis je `<id>.json`, prilozi `<id>-<n>.<ext>`.
 */

export type FeedbackRecord = {
  id: string;
  kind: FeedbackKind;
  text: string;
  /** Adresa za odgovor (normalizovana), ako ju je igrač upisao. */
  email?: string;
  appVersion?: string;
  platform: AnalyticsPlatform;
  userAgent?: string;
  /** Samo iz PROVJERENOG tokena — klijentu se na riječ ne vjeruje. */
  uid?: string;
  nickname?: string;
  createdAt: number;
  /** Imena fajlova priloga u istom folderu. */
  attachments: string[];
};

export type FeedbackImage = { ext: "jpg" | "png" | "webp"; bytes: Buffer };

export function feedbackDir(): string {
  if (process.env.FEEDBACK_DIR) return resolve(process.env.FEEDBACK_DIR);
  const roomsDir = process.env.DATA_DIR || resolve(process.cwd(), ".data", "rooms");
  return join(roomsDir, "_feedback");
}

// ---- validacija ----

const APP_VERSION_MAX = 40;
const USER_AGENT_MAX = 400;

/** Kontrolni znakovi osim reda i taba — nevidljivi su u mejlu, a kvare CSV/terminal. */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function cleanLine(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const clean = value.replace(CONTROL_CHARS, "").replace(/[\r\n\t]+/g, " ").trim();
  return clean ? clean.slice(0, max) : undefined;
}

/**
 * Tip slike po PRVIM BAJTOVIMA, ne po MIME-u iz data-URL-a — taj piše klijent.
 * Bilo šta drugo (SVG, HTML, izvršni fajl preimenovan u .jpg) se odbija.
 */
export function sniffImage(bytes: Buffer): FeedbackImage["ext"] | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "png";
  }
  if (bytes.length >= 12 && bytes.toString("latin1", 0, 4) === "RIFF" && bytes.toString("latin1", 8, 12) === "WEBP") {
    return "webp";
  }
  return null;
}

const DATA_URL = /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

export type ParsedFeedback = {
  kind: FeedbackKind;
  text: string;
  email?: string;
  appVersion?: string;
  userAgent?: string;
  platform: AnalyticsPlatform;
  guestId?: string;
  images: FeedbackImage[];
};

export type ParseResult = { ok: true; value: ParsedFeedback } | { ok: false; error: string };

/** Čista provjera tijela zahtjeva. Poruke su za igrača (ijekavica). */
export function parseFeedback(raw: unknown): ParseResult {
  const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  if (!isFeedbackKind(body.kind)) return { ok: false, error: "Izaberi šta nam pišeš" };

  const text = typeof body.text === "string" ? body.text.replace(CONTROL_CHARS, "").trim() : "";
  if (!text) return { ok: false, error: "Napiši poruku" };
  if (text.length > FEEDBACK_LIMITS.textMax) {
    return { ok: false, error: `Poruka je predugačka (najviše ${FEEDBACK_LIMITS.textMax} znakova)` };
  }

  let email: string | undefined;
  if (typeof body.email === "string" && body.email.trim() !== "") {
    const normalized = normalizeEmail(body.email);
    if (!normalized) return { ok: false, error: "Neispravna e-adresa" };
    email = normalized;
  }

  const rawImages = body.images ?? [];
  if (!Array.isArray(rawImages)) return { ok: false, error: "Neispravan prilog" };
  if (rawImages.length > FEEDBACK_LIMITS.imagesMax) {
    return { ok: false, error: `Najviše ${FEEDBACK_LIMITS.imagesMax} slike` };
  }
  const images: FeedbackImage[] = [];
  for (const item of rawImages) {
    const match = typeof item === "string" ? DATA_URL.exec(item) : null;
    if (!match?.[1]) return { ok: false, error: "Prilog mora biti slika" };
    const bytes = Buffer.from(match[1], "base64");
    if (bytes.length > FEEDBACK_LIMITS.imageBytesMax) return { ok: false, error: "Slika je prevelika" };
    const ext = sniffImage(bytes);
    if (!ext) return { ok: false, error: "Prilog mora biti slika" };
    images.push({ ext, bytes });
  }

  const guestId = typeof body.guestId === "string" && body.guestId.length <= 64 ? body.guestId : undefined;
  const appVersion = cleanLine(body.appVersion, APP_VERSION_MAX);
  const userAgent = cleanLine(body.userAgent, USER_AGENT_MAX);

  return {
    ok: true,
    value: {
      kind: body.kind,
      text,
      ...(email ? { email } : {}),
      ...(appVersion ? { appVersion } : {}),
      ...(userAgent ? { userAgent } : {}),
      platform: parsePlatform(body.platform) ?? "web",
      ...(guestId ? { guestId } : {}),
      images,
    },
  };
}

// ---- disk ----

export function newFeedbackId(now: number = Date.now()): string {
  // Vrijeme naprijed: `ls` foldera je odmah hronološki.
  return `${new Date(now).toISOString().replace(/[-:.]/g, "").replace("T", "-").slice(0, 15)}-${randomBytes(4).toString("hex")}`;
}

async function writeAtomic(file: string, data: string | Buffer): Promise<void> {
  const tmp = `${file}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  await writeFile(tmp, data);
  await rename(tmp, file);
}

/** Prilozi prvo, zapis zadnji — zapis bez priloga na disku nikad ne pokazuje na nepostojeći fajl. */
export async function saveFeedback(
  record: Omit<FeedbackRecord, "attachments">,
  images: readonly FeedbackImage[],
  dir: string = feedbackDir(),
): Promise<FeedbackRecord> {
  await mkdir(dir, { recursive: true });
  const attachments: string[] = [];
  for (const [i, image] of images.entries()) {
    const name = `${record.id}-${i + 1}.${image.ext}`;
    await writeAtomic(join(dir, name), image.bytes);
    attachments.push(name);
  }
  const full: FeedbackRecord = { ...record, attachments };
  await writeAtomic(join(dir, `${record.id}.json`), JSON.stringify(full));
  return full;
}

async function readEntries(dir: string): Promise<Array<{ file: string; record: FeedbackRecord }>> {
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }
  const out: Array<{ file: string; record: FeedbackRecord }> = [];
  for (const name of files) {
    if (!name.endsWith(".json")) continue;
    const file = join(dir, name);
    try {
      out.push({ file, record: JSON.parse(await readFile(file, "utf8")) as FeedbackRecord });
    } catch {
      // korumpiran fajl
    }
  }
  return out;
}

export async function listFeedback(dir: string = feedbackDir()): Promise<FeedbackRecord[]> {
  return (await readEntries(dir)).map((e) => e.record).sort((a, b) => a.createdAt - b.createdAt);
}

/** Politika privatnosti: utisak se na serveru čuva najviše 12 mjeseci. */
export const FEEDBACK_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

export async function sweepExpiredFeedback(
  now: number = Date.now(),
  dir: string = feedbackDir(),
  maxAgeMs: number = FEEDBACK_MAX_AGE_MS,
): Promise<number> {
  let removed = 0;
  for (const { file, record } of await readEntries(dir)) {
    if (typeof record.createdAt === "number" && now - record.createdAt > maxAgeMs) {
      for (const name of record.attachments ?? []) {
        await unlink(join(dir, name)).catch(() => undefined);
      }
      await unlink(file).catch(() => undefined);
      removed++;
    }
  }
  return removed;
}

/**
 * Brisanje na zahtjev igrača (politika privatnosti): po `id`-u utiska ili po
 * e-adresi koju je upisao (svi njegovi utisci). Prilozi idu zajedno sa zapisom.
 */
export async function removeFeedback(
  match: { id?: string; email?: string },
  dir: string = feedbackDir(),
): Promise<number> {
  let removed = 0;
  for (const { file, record } of await readEntries(dir)) {
    const hit = (match.id && record.id === match.id) || (match.email && record.email === match.email);
    if (!hit) continue;
    for (const name of record.attachments ?? []) {
      await unlink(join(dir, name)).catch(() => undefined);
    }
    await unlink(file).catch(() => undefined);
    removed++;
  }
  return removed;
}

/**
 * CSV za slučaj da pošta zakaže (prilozi ostaju na disku, ovdje samo broj).
 * Isto čuvanje od formula kao `signupsToCsv`: `= + - @` na početku dobija apostrof.
 */
export function feedbackToCsv(records: readonly FeedbackRecord[]): string {
  const cell = (value: string) => {
    const safe = /^[=+@-]/.test(value) ? `'${value}` : value;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const header = ["id", "createdAt", "kind", "text", "email", "nickname", "uid", "appVersion", "platform", "userAgent", "attachments"];
  const rows = records.map((r) =>
    [
      r.id,
      new Date(r.createdAt).toISOString(),
      r.kind,
      r.text,
      r.email ?? "",
      r.nickname ?? "",
      r.uid ?? "",
      r.appVersion ?? "",
      r.platform,
      r.userAgent ?? "",
      String(r.attachments?.length ?? 0),
    ].map(cell),
  );
  return [header.map(cell), ...rows].map((row) => row.join(",")).join("\n") + "\n";
}

// ---- mejl ----

export const FEEDBACK_KIND_LABELS: Record<FeedbackKind, string> = {
  bug: "Greška",
  idea: "Prijedlog",
  praise: "Pohvala",
};

const SUBJECT_SNIPPET = 60;

export function buildFeedbackMail(record: FeedbackRecord, to: string, images: readonly FeedbackImage[]) {
  const firstLine = record.text.split("\n")[0] ?? "";
  const snippet = firstLine.length > SUBJECT_SNIPPET ? `${firstLine.slice(0, SUBJECT_SNIPPET)}…` : firstLine;
  const account = record.nickname
    ? `${record.nickname} (${record.uid})`
    : record.uid
      ? `bez nadimka (${record.uid})`
      : "gost";
  const text = [
    record.text,
    "",
    "—",
    `Vrsta: ${FEEDBACK_KIND_LABELS[record.kind]}`,
    `E-mail za odgovor: ${record.email ?? "nije upisan"}`,
    `Nalog: ${account}`,
    `Verzija: ${record.appVersion ?? "?"} · ${record.platform}`,
    `Uređaj: ${record.userAgent ?? "?"}`,
    `Vrijeme: ${new Date(record.createdAt).toISOString()}`,
    `ID: ${record.id}`,
    `Prilozi: ${record.attachments.length}`,
  ].join("\n");
  return {
    to,
    subject: `[Kartaonica · ${FEEDBACK_KIND_LABELS[record.kind]}] ${snippet}`,
    text,
    ...(record.email ? { replyTo: record.email } : {}),
    attachments: images.map((image, i) => ({
      filename: record.attachments[i] ?? `prilog-${i + 1}.${image.ext}`,
      content: image.bytes,
    })),
  };
}

// ---- rute ----

/** Prilozi su base64 (+⅓) — 3 × 1,5 MB uz tekst staje u ovo. */
export const FEEDBACK_BODY_LIMIT = 7 * 1024 * 1024;
const WINDOW_MS = 60 * 60 * 1000;

export type FeedbackDeps = {
  dir?: () => string;
  mailer: Pick<Mailer, "send">;
  /** Primalac; bez njega se ne šalje (zapis ostaje na disku). */
  to: () => string | undefined;
  /** Provjeren nalog iz `Authorization` zaglavlja, ili `null`. Ne baca. */
  resolveUser: (authorization: string | undefined) => Promise<{ uid: string; nickname?: string } | null>;
  track?: (guestId: string | undefined, props: AnalyticsEvents["feedback_sent"]) => void;
  log?: { info: (msg: string) => void; error: (msg: string) => void };
  limits?: { ip: SlidingWindowLimiter; guest: SlidingWindowLimiter };
  now?: () => number;
};

export function registerFeedbackRoutes(app: FastifyInstance, deps: FeedbackDeps): void {
  const dir = deps.dir ?? feedbackDir;
  const now = deps.now ?? Date.now;
  const limits = deps.limits ?? {
    ip: new SlidingWindowLimiter(10, WINDOW_MS),
    guest: new SlidingWindowLimiter(5, WINDOW_MS),
  };
  if (!deps.limits) {
    setInterval(() => {
      limits.ip.sweep();
      limits.guest.sweep();
    }, 10 * 60 * 1000).unref();
  }

  app.post("/api/feedback", { bodyLimit: FEEDBACK_BODY_LIMIT }, async (request, reply) => {
    const parsed = parseFeedback(request.body);
    if (!parsed.ok) return reply.code(400).send({ error: parsed.error });
    const input = parsed.value;

    // Limit POSLIJE provjere tijela: pogrešno popunjena forma ne troši pokušaje.
    if (!limits.ip.tryHit(request.ip) || (input.guestId && !limits.guest.tryHit(input.guestId))) {
      return reply.code(429).send({ error: "Previše poruka. Pokušaj ponovo kasnije." });
    }

    const user = await deps.resolveUser(request.headers.authorization).catch(() => null);
    const createdAt = now();
    const record = await saveFeedback(
      {
        id: newFeedbackId(createdAt),
        kind: input.kind,
        text: input.text,
        ...(input.email ? { email: input.email } : {}),
        ...(input.appVersion ? { appVersion: input.appVersion } : {}),
        platform: input.platform,
        ...(input.userAgent ? { userAgent: input.userAgent } : {}),
        ...(user ? { uid: user.uid } : {}),
        ...(user?.nickname ? { nickname: user.nickname } : {}),
        createdAt,
      },
      input.images,
      dir(),
    );

    // ⚠ Tekst i adresa NIKAD u log ni u analitiku.
    deps.log?.info(`💬 Novi utisak (${record.kind}) ${record.id}`);
    deps.track?.(input.guestId, {
      kind: record.kind,
      platform: record.platform,
      has_attachments: record.attachments.length > 0,
      has_email: Boolean(record.email),
    });

    const to = deps.to();
    if (to) {
      const result = await deps.mailer.send(buildFeedbackMail(record, to, input.images));
      if (result === "failed") deps.log?.error(`Utisak ${record.id} nije poslan e-poštom (ostaje na disku)`);
    }

    const body: FeedbackResponse = { ok: true };
    return body;
  });

  /** Rezerva za slučaj da pošta zakaže: `curl -H "Authorization: Bearer $ADMIN_TOKEN"`. Isti 404 kao signups. */
  app.get("/api/feedback/export", async (request, reply) => {
    if (!isAdmin(request.headers.authorization)) return reply.callNotFound();
    return reply
      .header("content-type", "text/csv; charset=utf-8")
      .header("content-disposition", 'attachment; filename="utisci.csv"')
      .header("cache-control", "no-store")
      .send(feedbackToCsv(await listFeedback(dir())));
  });

  /**
   * Brisanje na zahtjev: `curl -X DELETE -H "Authorization: Bearer $ADMIN_TOKEN"
   * -H "Content-Type: application/json" -d '{"id":"…"}'` (ili `{"email":"…"}`).
   * Mejl u sandučetu briše se ručno.
   */
  app.delete<{ Body: { id?: unknown; email?: unknown } | null }>("/api/feedback", async (request, reply) => {
    if (!isAdmin(request.headers.authorization)) return reply.callNotFound();
    const id = typeof request.body?.id === "string" && request.body.id ? request.body.id : undefined;
    const email = normalizeEmail(request.body?.email) ?? undefined;
    if (!id && !email) return reply.code(400).send({ error: "Treba id ili e-adresa" });
    return { removed: await removeFeedback({ ...(id ? { id } : {}), ...(email ? { email } : {}) }, dir()) };
  });
}
