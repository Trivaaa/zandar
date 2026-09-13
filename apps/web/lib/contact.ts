/**
 * Kontakt i identitet izdavaca — JEDAN izvor.
 *
 * Adresa i pravni naziv se pojavljuju na tri stranice (`/o-nama`, `/privacy`,
 * `/delete-account`) plus u `mailto:` tijelu. Prepisivanje rucno je nacin da se
 * razidju; Play Organization verification poredi ono sto pise na sajtu sa onim
 * sto stoji u payments profilu, pa jedno mjesto nije udobnost nego tacnost.
 */

/** Javni naziv izdavaca (Play developer name). */
export const PUBLISHER = "Tricom";

/** Pravni naziv iz payments profila — mora biti doslovan. */
export const LEGAL_NAME = '"TRICOM" Igor Trivić s.p. Banja Luka';

export const ADDRESS_STREET = "Petra Mećave 2C";
export const ADDRESS_CITY = "78000 Banja Luka";
export const ADDRESS_COUNTRY = "Bosna i Hercegovina";

/** Jedna linija, za mailto tijelo i mjesta gdje adresa ne moze da se prelomi. */
export const ADDRESS_LINE = `${ADDRESS_STREET}, ${ADDRESS_CITY}, ${ADDRESS_COUNTRY}`;

/**
 * Kontakt adresa. Mora biti ZIVA — Play odbija listing sa adresom koja odbija
 * postu, a ovo je i jedini kanal za zahtjev za brisanje podataka.
 */
export const CONTACT_EMAIL = "igor.triva@gmail.com";

/** Brend proizvoda i prva (trenutno jedina) igra pod njim. */
export const BRAND = "Kartaonica";
export const GAME = "Žandar";
