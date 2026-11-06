/**
 * Da li se poker igra u OVOM buildu.
 *
 * Play: igra sa simuliranim kockanjem mijenja dobni rejting cijele aplikacije
 * (IARC), pa produkcija dobija poker tek kad je upitnik gotov — svjesnim
 * upisom `NEXT_PUBLIC_POKER=1` (Vercel / `build-mobile.mjs`), ne sama od sebe
 * kad kod stigne na `production`. Staging i razvoj ga imaju odmah.
 * `NEXT_PUBLIC_POKER=0` gasi ga svuda.
 *
 * Čista funkcija od okruženja, da se testira bez build-a.
 */
export function pokerEnabled(env: { appEnv?: string | undefined; flag?: string | undefined }): boolean {
  if (env.flag === "1") return true;
  if (env.flag === "0") return false;
  return env.appEnv !== "production";
}

export const pokerLive = pokerEnabled({
  appEnv: process.env.NEXT_PUBLIC_APP_ENV,
  flag: process.env.NEXT_PUBLIC_POKER,
});
