/**
 * Kome vjerujemo za `X-Forwarded-For`: TAČNO jednom skoku — onome ko nam je
 * otvorio konekciju. Na Railwayu je to njihov edge proxy, pa je `request.ip`
 * adresa koju je ON dopisao, a ne ono što je klijent sam upisao u zaglavlje.
 *
 * Zašto funkcija, a ne `trustProxy: 1` kao ranije: Fastify od 5.12 broj tiho
 * pretvara u „ne vjeruj nikome" (bezbjednosna izmjena — sam broj skokova ne
 * provjerava ko je neposredni sagovornik). Posljedica bi ovdje bila da
 * `request.ip` postane adresa PROXYJA, tj. da svi igrači dijele jedan
 * rate-limit na prijavama (`signupIpLimiter`) i da ga prvih 30 potroši za sve.
 *
 * Zašto ne `true`: tad se uzima KRAJNJE LIJEVI unos, koji klijent sam piše —
 * limit bi se zaobilazio izmišljenom adresom.
 *
 * Fastify upozorava da je provjera samo po skoku nesigurna kad se do servera
 * može doći MIMO proxyja. Ovdje ne može: servis nema javnu adresu osim kroz
 * Railwayev edge. Ako se hosting promijeni tako da to više ne važi, ovo treba
 * zamijeniti listom adresa proxyja.
 */
export function trustFirstHop(_address: string, hop: number): boolean {
  return hop === 0;
}
