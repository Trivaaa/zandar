const KEY = "kartaonica_guest_id";

/**
 * UUID v4 bez zavisnosti od sigurnog konteksta.
 *
 * `crypto.randomUUID()` postoji SAMO na https ili localhost. Na `http://<lan-ip>`
 * (testiranje sa telefona) je undefined, pa je poziv rušio svaki API zahtjev koji
 * nosi guestId — i to prije `fetch`-a, tako da se u logu servera nije vidjelo
 * ništa. `crypto.getRandomValues` radi i u nesigurnom kontekstu; `Math.random`
 * je zadnja linija za stare browsere.
 */
function uuidV4(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (typeof c?.randomUUID === "function") return c.randomUUID();

  const b = new Uint8Array(16);
  if (typeof c?.getRandomValues === "function") {
    c.getRandomValues(b);
  } else {
    for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256);
  }
  b[6] = (b[6]! & 0x0f) | 0x40; // verzija 4
  b[8] = (b[8]! & 0x3f) | 0x80; // varijanta 10xx

  const hex = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function getGuestId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = uuidV4();
    localStorage.setItem(KEY, id);
  }
  return id;
}

/**
 * Procitaj guest ID BEZ generisanja novog.
 *
 * `getGuestId()` je read-or-create, sto je tacno na putanjama koje salju zahtjev
 * serveru. Na stranici za brisanje podataka bi to bilo naopako: otvaranje
 * stranice o privatnosti ne smije da napravi novi identifikator za nekoga ko ga
 * nema. Zato zaseban citac, i zato `null` umjesto praznog stringa — pozivalac
 * mora da razlikuje "nema ga" od "ima ga i prazan je".
 *
 * `localStorage` ume da BACI (WebView sa ugasenim site data, iOS lockdown), ne
 * samo da vrati null — otud try/catch.
 */
export function peekGuestId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
