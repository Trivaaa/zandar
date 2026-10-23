import type { ProfileStore } from "./store";

/**
 * Pravila prijateljstva (SPEC_IDENTITET tok d, §6.5, §6.9). Skladište samo
 * pamti zapise; odluke su ovdje, iste za Firestore i memoriju.
 *
 * Odnos se uvijek čita iz ugla GLEDAOCA: `blocked` znači „ja sam njega
 * blokirao". Ko je blokiran to nikad ne saznaje — za njega je odnos `none`,
 * a njegov zahtjev se „pošalje" (odgovor isti), ali se ne upisuje.
 */
export type Relation = "self" | "blocked" | "friends" | "outgoing" | "incoming" | "none";

export async function relationOf(store: ProfileStore, viewer: string, target: string): Promise<Relation> {
  if (viewer === target) return "self";
  const [iBlocked, friends, outgoing, incoming] = await Promise.all([
    store.isBlocked(viewer, target),
    store.areFriends(viewer, target),
    store.hasRequest(viewer, target),
    store.hasRequest(target, viewer),
  ]);
  if (iBlocked) return "blocked";
  if (friends) return "friends";
  if (outgoing) return "outgoing";
  if (incoming) return "incoming";
  return "none";
}

/**
 * D3: zahtjev. Obostrani zahtjev = prijateljstvo odmah (spec §5d). Ponovljen
 * zahtjev je bezopasan (isti dokument).
 */
export async function sendRequest(
  store: ProfileStore,
  from: string,
  to: string,
  now: number = Date.now(),
): Promise<Relation> {
  if (from === to) return "self";
  if (await store.isBlocked(from, to)) return "blocked";
  if (await store.isBlocked(to, from)) return "outgoing"; // tiho
  if (await store.areFriends(from, to)) return "friends";
  if (await store.hasRequest(to, from)) {
    await store.setFriends(from, to, true, now);
    await store.setRequest(to, from, false);
    return "friends";
  }
  await store.setRequest(from, to, true, now);
  return "outgoing";
}

/** D4 Prihvati. Bez zahtjeva nema ništa — vraća trenutni odnos. */
export async function acceptRequest(
  store: ProfileStore,
  me: string,
  from: string,
  now: number = Date.now(),
): Promise<Relation> {
  if (!(await store.hasRequest(from, me))) return relationOf(store, me, from);
  await store.setFriends(me, from, true, now);
  await store.setRequest(from, me, false);
  return "friends";
}

/** D4 Odbij — tiho: pošiljalac ne dobija obavještenje. */
export async function declineRequest(store: ProfileStore, me: string, from: string): Promise<Relation> {
  await store.setRequest(from, me, false);
  return relationOf(store, me, from);
}

/** F3 Povuci zahtjev. */
export async function cancelRequest(store: ProfileStore, me: string, to: string): Promise<Relation> {
  await store.setRequest(me, to, false);
  return relationOf(store, me, to);
}

/** F6 Ukloni iz prijatelja — tiho, kod oba igrača. */
export async function removeFriend(store: ProfileStore, me: string, other: string): Promise<Relation> {
  await store.setFriends(me, other, false);
  return relationOf(store, me, other);
}

/** §6.9: blokada briše prijateljstvo i zahtjeve u oba smjera. */
export async function severOnBlock(store: ProfileStore, a: string, b: string): Promise<void> {
  await Promise.all([
    store.setFriends(a, b, false),
    store.setRequest(a, b, false),
    store.setRequest(b, a, false),
  ]);
}
