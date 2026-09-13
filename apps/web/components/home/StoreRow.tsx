import { STORE_LINKS, STORE_ORDER } from "@/lib/stores";
import { sr } from "@/lib/sr";

/**
 * „Kartaonica na telefonu" — samo web; host je ne renderuje u APK-u.
 *
 * Bez URL-a mjesto je obična oznaka (ne dugme, ne link) sa „Još nije dostupno"
 * ISPOD, a ne unutar pločice: kad stigne zvanična oznaka prodavnice, ona ide u
 * pločicu, a objašnjenje se ne smije crtati preko tuđeg artworka.
 */
export function StoreRow() {
  return (
    <section className="stores" aria-labelledby="stores-title">
      <h2 id="stores-title" className="stores__title">
        {sr.stores.title}
      </h2>
      <ul className="stores__list">
        {STORE_ORDER.map((id) => {
          const url = STORE_LINKS[id];
          return (
            <li key={id} className="stores__item">
              {url ? (
                <a className="stores__tile" href={url} target="_blank" rel="noopener noreferrer">
                  {sr.stores[id]}
                </a>
              ) : (
                <>
                  <span className="stores__tile" data-unavailable="true">
                    {sr.stores[id]}
                  </span>
                  <span className="stores__note">{sr.stores.unavailable}</span>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
