/**
 * Firebase web konfiguracija po okruženju (docs/Specs/player-profile-v1.md).
 *
 * U repou, a ne u env varijablama: ove vrijednosti nisu tajna (završe u bundle-u
 * i svaki posjetilac ih vidi), a u dashboardu bi bile još četiri varijable po
 * projektu koje se mogu razići. Pristup podacima ne čuva `apiKey`, nego provjera
 * ID tokena na serveru.
 *
 * `null` = nalog isključen: aplikacija radi kao prije, bez tokena. Produkcija je
 * `null` dok se produkcijski Firebase projekat ne podesi (Auth provajderi, web
 * aplikacija) — staging token na produkcijskom serveru bi ionako bio odbijen.
 */
export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
};

const STAGING: FirebaseWebConfig = {
  apiKey: "AIzaSyDUnKQrsI4TomdibXFqoyxOJfj4oLiPIhA",
  authDomain: "kartaonica---staging.firebaseapp.com",
  projectId: "kartaonica---staging",
  appId: "1:228917580477:web:9c0b13e24e866523299dd4",
};

const PRODUCTION: FirebaseWebConfig | null = null;

/** Lokalni dev ide na staging projekat — produkcijski nalozi ostaju samo pravi igrači. */
export function firebaseConfigFor(appEnv: string | undefined): FirebaseWebConfig | null {
  return appEnv === "production" ? PRODUCTION : STAGING;
}

export const FIREBASE_CONFIG = firebaseConfigFor(process.env.NEXT_PUBLIC_APP_ENV);
