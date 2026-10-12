import type { Auth } from "@firebase/auth";

import { FIREBASE_CONFIG } from "@/lib/firebaseConfig";

/**
 * Nalog igrača (docs/Specs/player-profile-v1.md). Gost je anonimni Firebase
 * nalog sa stalnim ID-jem; registracija ga kasnije nadograđuje uz ISTI ID.
 *
 * Pravilo cijelog modula: nalog NIKAD ne stoji između igrača i partije. Svaka
 * funkcija ovdje vraća `null` umjesto da baci ili da čeka neograničeno —
 * Firebase nedostupan, mreža spora ili skladište ugašeno znači samo zahtjev bez
 * tokena, a server takav zahtjev prima kao i do sad.
 *
 * SDK se učitava dinamički: ne ulazi u početni bundle i ne izvršava se na
 * serveru (statički export za APK ga ne smije dotaći u build-u).
 */

/** Koliko zahtjev smije da čeka token prije nego što ode bez njega. */
export const TOKEN_TIMEOUT_MS = 2500;
/** Poslije neuspjeha: koliko dugo zahtjevi idu bez tokena i bez čekanja. */
export const TOKEN_COOLDOWN_MS = 30_000;

let authPromise: Promise<Auth | null> | null = null;
let signInPromise: Promise<string | null> | null = null;
let cooldownUntil = 0;

async function loadAuth(): Promise<Auth | null> {
  if (typeof window === "undefined" || !FIREBASE_CONFIG) return null;
  try {
    const [{ initializeApp }, { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence }] =
      await Promise.all([import("@firebase/app"), import("@firebase/auth")]);
    // `initializeAuth` umjesto `getAuth`: `getAuth` uvijek priprema i popup
    // mašineriju (skriveni iframe ka `authDomain`), koja gostu ne treba, a u
    // WebView-u je samo još jedan zahtjev koji može da visi. Prijava Googleom
    // će resolver proslijediti uz sam poziv.
    return initializeAuth(initializeApp(FIREBASE_CONFIG), {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    });
  } catch (err) {
    console.warn("[auth] Firebase nije dostupan:", err);
    return null;
  }
}

function getAuthInstance(): Promise<Auth | null> {
  authPromise ??= loadAuth();
  return authPromise;
}

async function signIn(): Promise<string | null> {
  const auth = await getAuthInstance();
  if (!auth) return null;
  try {
    // Sačekaj da SDK pročita sačuvanu sesiju — bez toga je `currentUser` na
    // startu `null` i za prijavljenog igrača, pa bi svako pokretanje pravilo
    // novog gosta.
    await auth.authStateReady();
    if (auth.currentUser) return auth.currentUser.uid;
    const { signInAnonymously } = await import("@firebase/auth");
    return (await signInAnonymously(auth)).user.uid;
  } catch (err) {
    console.warn("[auth] prijava gosta nije uspjela:", err);
    return null;
  }
}

/**
 * Obezbijedi nalog (postojeću sesiju ili novog gosta) i vrati njegov ID.
 * Istovremeni pozivi dijele jedan pokušaj; neuspjeh se ne pamti, pa sljedeći
 * poziv pokušava ponovo.
 */
export function ensureSignedIn(): Promise<string | null> {
  signInPromise ??= signIn().then((uid) => {
    if (uid === null) signInPromise = null;
    return uid;
  });
  return signInPromise;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

/**
 * Svjež ID token, ili `null`. SDK ga kešira i sam obnavlja pred istek (sat
 * vremena), pa je ovo u redovnom slučaju bez mreže.
 *
 * Kad token ne stigne u roku, sljedećih `TOKEN_COOLDOWN_MS` se ne čeka uopšte:
 * igrač kojem je Firebase nedostupan (blokiran, spora mreža) plati čekanje
 * jednom, a ne na svakom ulasku u sobu. Prijava u pozadini za to vrijeme teče
 * dalje, pa se token pojavi čim uspije.
 */
export async function getIdToken(): Promise<string | null> {
  if (Date.now() < cooldownUntil) return null;
  const token = await withTimeout(
    (async () => {
      if ((await ensureSignedIn()) === null) return null;
      const auth = await getAuthInstance();
      return (await auth?.currentUser?.getIdToken()) ?? null;
    })(),
    TOKEN_TIMEOUT_MS,
  );
  if (token === null) cooldownUntil = Date.now() + TOKEN_COOLDOWN_MS;
  return token;
}

/** Zaglavlje za `fetch`; prazno kad tokena nema. */
export async function authHeaders(): Promise<Record<string, string>> {
  const token = await getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
