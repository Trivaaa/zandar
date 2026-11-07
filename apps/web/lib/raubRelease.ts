/**
 * Da li se Raub igra u OVOM buildu (docs/raub-spec.md, odluka 8).
 *
 * Isti obrazac kao `pokerRelease.ts`: staging i razvoj ga imaju odmah, a
 * produkcija tek svjesnim upisom `NEXT_PUBLIC_RAUB=1` (Vercel /
 * `build-mobile.mjs`) — ne sama od sebe kad kod stigne na `production`.
 * `NEXT_PUBLIC_RAUB=0` gasi ga svuda. Raub nema IARC uslov kao poker; prekidač
 * je tu da izdanje bude odluka, ne posljedica merge-a.
 *
 * Čista funkcija od okruženja, da se testira bez build-a.
 */
export function raubEnabled(env: { appEnv?: string | undefined; flag?: string | undefined }): boolean {
  if (env.flag === "1") return true;
  if (env.flag === "0") return false;
  return env.appEnv !== "production";
}

export const raubLive = raubEnabled({
  appEnv: process.env.NEXT_PUBLIC_APP_ENV,
  flag: process.env.NEXT_PUBLIC_RAUB,
});
