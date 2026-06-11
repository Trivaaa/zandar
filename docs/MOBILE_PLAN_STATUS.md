# Mobile Plan — Status & Procjena

> Tablić - Žandar · plan za native mobilne aplikacije (Android + iOS)
> Datum procjene: 2026-06-11 · Stack: Next.js 16 + React 19 + Tailwind 4 + socket.io-client

---

## TL;DR

Frontend je **već de facto SPA** koji priča s eksternim serverom preko `fetch` + socket.io.
PWA je **gotov i kvalitetan**. Zato native mobilne app **nisu gradnja nego pakovanje**.
Preporuka: **TWA za Android + Capacitor za iOS**. Nema React Native, nema rewrite-a.

---

## 1. Šta već postoji (PWA — gotovo)

PWA sloj (DS §9 Faza D1) je kompletan i dobro urađen:

| Dio | Status | Fajl |
|-----|--------|------|
| Web manifest (ime, ikone 192/512, maskable, standalone, portrait, theme) | ✅ | `apps/web/app/manifest.ts` |
| Ikone (192, 512, maskable-512, apple-icon) | ✅ | `apps/web/public/` |
| Service worker — kešira **samo statiku**, nikad API/socket/state | ✅ | `apps/web/public/sw.js` |
| SW registracija + install prompt ("Dodaj na ekran") | ✅ | `apps/web/components/PwaManager.tsx` |
| Update prompt ("Nova verzija → Osvježi") | ✅ | `apps/web/components/PwaManager.tsx` |

PWA prolazi instalabilnost → odmah je kandidat za TWA pakovanje.

---

## 2. Zašto je pakovanje lako (arhitektura je kooperativna)

| Provjera | Nalaz |
|----------|-------|
| Rendering | **Sve rute su `"use client"`** (page, brza, create, room, matching). Nema SSR-a, nema server komponenti. |
| Data fetching | Sve kroz `apps/web/lib/api.ts` → `fetch(API_BASE...)` na eksterni server + socket.io. Nula Next server-side fetch-a, nula server actions. |
| API_BASE | Konfigurabilan preko `NEXT_PUBLIC_API_URL` (`api.ts:3`). Na telefonu samo pokažeš na produkcijski URL. |
| Server | `apps/server` ostaje u cloudu. App priča s njim isto kao web sad. |

Zaključak: frontend je SPA koji slučajno koristi Next — tačno ono što Capacitor/TWA žele.

---

## 3. Blokeri za statički export (sve sitno)

Da bi `output: export` (potreban za Capacitor/TWA) prošao, treba riješiti 3 stvari:

1. **Sentry demo fajlovi** — `app/api/sentry-example-api/route.ts` + `app/sentry-example-page/page.tsx`.
   API route ne radi sa `output: export`. → **Obrisati** (demo).

2. **Redirect u next.config** — `next.config.ts:6` (`/zandar/room/:roomId` → `/room/:roomId`).
   `redirects()` ne radi u statičkom exportu. → Izbaciti ili riješiti na CDN/hosting nivou (samo za web).

3. **Dinamičke rute** — `room/[roomId]`, `matching/[roomId]`.
   `output: export` traži `generateStaticParams`, a roomId se ne zna unaprijed.
   → SPA fallback (catch-all + client routing) ILI roomId u query param (`/room?id=...`). **Jedini pravi zadatak (par sati).**

---

## 4. Opcije i procjena

| Platforma | Pristup | Posao | Vrijeme |
|-----------|---------|-------|---------|
| **Android** | TWA preko PWABuilder/Bubblewrap (omota postojeći PWA) | Ne dira kod | ~pola dana |
| **Android** | Capacitor (ako treba push/IAP) | 3 fix-a iznad + setup | 1–2 dana |
| **iOS** | Capacitor (Apple ne pušta čisti PWA u App Store) | Isto + Mac/Xcode/Apple nalog ($99/god) | +1 dan (uz Mac) |

**React Native: ne preporučuje se** — značio bi rewrite cijelog UI sloja (SeatChip, GameTable, Card, pozicijski grid…). Za 2D kartašku igru nema dovoljno benefita vs. Capacitor.

---

## 5. Šta native sloj dodaje preko PWA-a

Relevantno za stvari koje DS već spominje (push, reconnect §D2, background povratak §5):
- **Prave push notifikacije** (iOS PWA push je ograničen).
- **Native background/reconnect** handling.
- **In-app purchases** rails (ako "coins" ekonomija ikad ode u scope — §7.7).
- **Store prisustvo** (Play Store + App Store) → discovery + recenzije.

---

## 6. Sljedeći korak (kad se odluči)

Predloženi redoslijed:
1. **Android TWA** — najbrži win, postojeći PWA → Play Store.
2. **Capacitor grana** — obrisati Sentry demo, dodati `output: export`, riješiti dinamičke rute, dodati Capacitor.
3. **iOS** — kroz istu Capacitor granu, uz Mac/Xcode/Apple Developer nalog.

**Status: PROCJENA ZAVRŠENA — čeka odluku da li kreće gradnja.**
