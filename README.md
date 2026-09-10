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

Server → Railway. Web → Vercel (`kartaonica.com`). Auto-deploy na push u `main`.
