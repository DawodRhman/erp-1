# TRACK360 ERP

TRACK360 is a unified, role-based ERP workspace. This monorepo preserves the
current React application and Node API while the product is migrated phase by
phase to the architecture described in `docs/`.

## Repository layout

- `apps/web` - React and Vite frontend
- `apps/api` - Node and Express API
- `apps/worker` - asynchronous jobs entry point
- `packages/ui` - shared UI package
- `packages/shared` - shared contracts and utilities
- `packages/config` - shared TypeScript and formatting configuration
- `db` - canonical migration and seed documentation
- `infra` - local services, deployment, observability, and load testing
- `docs` - canonical product, design, architecture, and migration documents

## Local setup

Requirements: Node.js 22+, pnpm 11+, PostgreSQL 16+, and Redis 7+. Docker is
optional but recommended for the infrastructure services.

```bash
pnpm install
docker compose -f infra/docker/compose.yaml up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

The web app runs on `http://localhost:8080`, the API on
`http://localhost:3001`, Mailpit on `http://localhost:8025`, and MinIO on
`http://localhost:9001`.

## Quality checks

```bash
pnpm check
```

Business modules are migrated one at a time. Inventory is the first module;
the next module starts only after review and explicit approval.

The compatibility frontend still has historical TypeScript errors outside the
new foundation. `pnpm typecheck` checks the build configuration and all new
typed packages. `pnpm --filter @track360/web typecheck:legacy` reports the
remaining legacy debt, which is removed module by module starting with Inventory.
