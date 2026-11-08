/**
 * Ilustracija praznog stanja taba Prijatelji — dvoje za stolom u kafani,
 * prazna stolica naprijed čeka tebe. Ivice slike se maskom tope u pozadinu
 * ekrana (CSS `.friends__empty-art`), pa nema vidljivog pravougaonika.
 */
export function FriendsEmptyArt() {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- statična slika; APK export nema next/image optimizaciju
    <img
      className="friends__empty-art"
      src="/illustrations/kafana-sto.webp"
      alt=""
      aria-hidden="true"
      width={960}
      height={640}
      draggable={false}
      decoding="async"
    />
  );
}
