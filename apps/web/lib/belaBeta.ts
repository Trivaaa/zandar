/**
 * Bela beta (docs/bela-spec.md, odluka 16): prozor „Bela je u beta fazi" se
 * pokazuje jednom po uređaju, na prvoj Bela partiji. Pamti se u
 * `localStorage`; svaki pristup je u `try/catch` (privatni prozor, blokirano
 * skladište) — bez skladišta prozor se pokaže, a „Razumijem" ga zatvori za
 * ovu sesiju.
 */

export const BELA_BETA_KEY = "kartaonica:bela:beta-seen";

type Store = Pick<Storage, "getItem" | "setItem">;

const listeners = new Set<() => void>();
/** Rezerva kad skladište ne radi: „viđeno" bar do kraja sesije. */
let seenInMemory = false;

function storage(): Store | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readBelaBetaSeen(store: Store | null = storage()): boolean {
  if (seenInMemory) return true;
  try {
    return store?.getItem(BELA_BETA_KEY) === "1";
  } catch {
    return false;
  }
}

export function markBelaBetaSeen(store: Store | null = storage()): void {
  seenInMemory = true;
  try {
    store?.setItem(BELA_BETA_KEY, "1");
  } catch {
    // pamćenje je udobnost
  }
  for (const l of listeners) l();
}

/** Za `useSyncExternalStore`: promjena u ovom tabu i u drugom (storage event). */
export function subscribeBelaBeta(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === BELA_BETA_KEY) listener();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

/** Samo za testove: vrati stanje sesije. */
export function resetBelaBetaMemory(): void {
  seenInMemory = false;
}
