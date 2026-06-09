import { mkdir, readdir, readFile, writeFile, rename, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";

/**
 * Persistence adapter (DS backlog: rooms survive server restart).
 *
 * Apstrakcija da datastore bude zamjenjiv. Default je FileAdapter (zero-dep,
 * atomski JSON po sobi na disku) — radi na VM-u s persistent diskom. Postgres
 * adapter (pg, JSONB) se kasnije dodaje kao drop-in implementacija ovog
 * interfejsa, bez diranja rooms.ts/index.ts logike.
 */
export interface PersistenceAdapter {
  init(): Promise<void>;
  /** Vrati sve perzistirane sobe (serijalizovani JSON objekti). */
  loadAll(): Promise<unknown[]>;
  /** Upiši/azuriraj jednu sobu (atomski). */
  save(id: string, data: unknown): Promise<void>;
  /** Obriši jednu sobu. */
  remove(id: string): Promise<void>;
}

/** FileAdapter — jedan JSON fajl po sobi, atomski write (tmp + rename). */
class FileAdapter implements PersistenceAdapter {
  constructor(private readonly dir: string) {}

  async init(): Promise<void> {
    await mkdir(this.dir, { recursive: true });
  }

  async loadAll(): Promise<unknown[]> {
    let files: string[];
    try {
      files = await readdir(this.dir);
    } catch {
      return [];
    }
    const out: unknown[] = [];
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      try {
        const raw = await readFile(join(this.dir, f), "utf8");
        out.push(JSON.parse(raw));
      } catch {
        // preskoči korumpiran fajl
      }
    }
    return out;
  }

  async save(id: string, data: unknown): Promise<void> {
    const file = join(this.dir, `${safeId(id)}.json`);
    const tmp = `${file}.tmp`;
    await writeFile(tmp, JSON.stringify(data), "utf8");
    await rename(tmp, file); // atomski na istom fajl-sistemu
  }

  async remove(id: string): Promise<void> {
    try {
      await unlink(join(this.dir, `${safeId(id)}.json`));
    } catch {
      // već ne postoji — ok
    }
  }
}

/** Spriječi path-traversal kroz roomId (ID je hex, ali budimo sigurni). */
function safeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "");
}

const DATA_DIR =
  process.env.DATA_DIR || resolve(process.cwd(), ".data", "rooms");

export const persistence: PersistenceAdapter = new FileAdapter(DATA_DIR);
