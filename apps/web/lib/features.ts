/**
 * Nalog, profil i prijatelji (SPEC_IDENTITET) se grade korak po korak na
 * `main`-u, a `main` mora ostati spreman za produkciju u svakom trenutku.
 * Zato je novi UI vidljiv na stagingu i u dev-u, a u produkciji tek kad
 * izdanje R2 (registracija + brisanje naloga) bude kompletno — tada se ovaj
 * red mijenja u `true`.
 */
export const identityUi = process.env.NEXT_PUBLIC_APP_ENV !== "production";
