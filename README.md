# Žandar (Kartaonica)

Multiplayer web verzija kartaške igre **Žandar**. pnpm monorepo.

## Struktura

| Paket | Opis |
| --- | --- |
| `apps/web` | Next.js 16 (App Router) + React 19 + Tailwind 4 — klijent |
| `apps/server` | Fastify 5 + socket.io — autoritativni game server |
| `packages/game-core` | Čista TS logika igre (špil, kupljenje, bodovanje, bot) + vitest |
| `packages/shared-types` | Tipovi dijeljeni između klijenta i servera |

## Pokretanje

```bash
pnpm install

# server (port 3001)
pnpm --filter @zandar/server dev

# web (port 3000)
pnpm --filter web dev
```

Skice i dizajn-harness rute su na `/dev/*` — rade samo lokalno, u produkciji vraćaju 404.

## Provjere

```bash
pnpm -r typecheck
pnpm -r test
pnpm --filter web build
```

## Dokumentacija

- [`CLAUDE.md`](CLAUDE.md) — standing rules i status snapshot
- [`docs/PRD_Zandar-v3-1.md`](docs/PRD_Zandar-v3-1.md) — spec / source of truth (v3.2)
- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) — design system (v3.2)
- [`docs/MOBILE_PLAN_STATUS.md`](docs/MOBILE_PLAN_STATUS.md) — procjena native pakovanja
- [`docs/archive/`](docs/archive/) — prethodne verzije

## Deployment

Dva okruženja, oba auto-deploy na push:

| | Grana | Server (Railway) | Web (Vercel) |
|---|---|---|---|
| Staging | `main` | `zandar-staging.up.railway.app` | `zandar-staging.vercel.app` |
| Produkcija | `production` | `zandar-test.up.railway.app` | `kartaonica.com` |

`git push origin main` diže **staging**. Objava na produkciju:

```
git checkout production && git merge --ff-only main && git push origin production
```

APK: `pnpm --filter web apk:staging` / `apk:prod`. Detalji u [`CLAUDE.md`](CLAUDE.md#deployment-dva-okruženja-github-auto-deploy).
