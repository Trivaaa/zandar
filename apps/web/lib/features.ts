import { FIREBASE_CONFIG } from "@/lib/firebaseConfig";

/**
 * Nalog, profil i prijatelji (SPEC_IDENTITET). UI postoji tačno onda kad
 * postoji Firebase projekat za ovo okruženje — bez njega `auth.ts` nema
 * prijavu i ekrani naloga bi bili mrtva dugmad. Staging i dev ga uvijek imaju;
 * produkcija ga dobija upisom `PRODUCTION` u `firebaseConfig.ts` (izdanje
 * 1.2.0), i tek tada se UI naloga pali i tamo. Do tada je `main` spreman za
 * produkciju bez naloga.
 */
export const identityUi = FIREBASE_CONFIG !== null;
