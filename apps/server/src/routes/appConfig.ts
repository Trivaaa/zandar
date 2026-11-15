import type { FastifyInstance } from "fastify";

/**
 * Konfiguracija koju aplikacija čita pri pokretanju (Play In-App Updates).
 *
 * `minVersionCode`: Android verzija ispod ove dobija obavezno ažuriranje
 * (Play-ov ekran preko cijele aplikacije). Postavlja se u Railway dashboardu
 * (`ANDROID_MIN_VERSION_CODE`), pa se mijenja bez novog APK-a.
 *
 * Fail-open: bez env-a ili sa neispravnom vrijednošću → 0, tj. prisile nema.
 * Klijent ionako traži ažuriranje samo kad Play kaže da novija verzija postoji,
 * pa ni prevelik broj nikoga ne zaključava.
 */
export function parseMinVersionCode(raw: string | undefined): number {
  if (raw === undefined || !/^\d+$/.test(raw.trim())) return 0;
  const n = Number(raw.trim());
  return Number.isSafeInteger(n) ? n : 0;
}

export function registerAppConfigRoute(
  fastify: FastifyInstance,
  readEnv: () => string | undefined = () => process.env.ANDROID_MIN_VERSION_CODE,
): void {
  fastify.get("/api/app-config", async () => ({
    android: { minVersionCode: parseMinVersionCode(readEnv()) },
  }));
}
