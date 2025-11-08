# Repository Guidelines

## Project Structure & Module Organization
- `app/` hosts the Next.js App Router UI plus API handlers; keep handlers thin and delegate heavy logic to `lib/`.
- `components/` is grouped into `ui`, `game`, and `admin`; colocate feature files and re-export via `index.ts`.
- `lib/` + `hooks/` store domain logic and shared state, and scripts in `scripts/` reuse the same helpers.
- `prisma/` owns the schema, migrations, and seeds, while `docs/` records gameplay/admin behavior—update both together.

## Build, Test, and Development Commands
- `npm run dev` — start the dev server on `http://localhost:3000`.
- `npm run build` / `npm start` — compile and serve the production bundle.
- `npm run lint` — apply the shared ESLint + Next.js rules.
- `npx prisma migrate dev --name <label>` — create and apply migrations.
- `npm run prisma:seed` or `npx tsx scripts/seed-fake-tribes.ts` — reseed deterministic data.

## Coding Style & Naming Conventions
- TypeScript everywhere with 2-space indentation, trailing commas, and named exports when practical.
- Components use PascalCase, utilities camelCase, files kebab-case, and constants `UPPER_SNAKE_CASE`.
- Use server components for data loading, keep client hooks under `hooks/`, never access Prisma from browser code, and rely on Tailwind + shadcn/ui for styling.
- Run ESLint before committing and comment only around non-obvious combat/admin logic.

## Testing Guidelines
- Keep HTTP smoke tests in the root `test-<feature>.js` format and run them with `node` once the dev server is live.
- Run `npm run prisma:seed` before tests that assume specific worlds or admin accounts.
- New systems need either another `test-*.js` script or a lightweight `lib/__tests__/` harness that mirrors the fetch-driven pattern and documents setup notes.

## Commit & Pull Request Guidelines
- Write concise, present-tense commits (`feat: add loyalty decay`) and keep each commit scoped to one concern.
- Branch names follow `feature/<summary>` or `fix/<summary>`; rebase before opening a PR.
- PRs should list purpose, testing (`npm run lint`, `node test-combat-system.js`), related docs/schema, and UI proof when relevant.
- Split gameplay balance, tooling, and docs changes into separate PRs for faster reviews.

## Security & Configuration Tips
- Copy `.env.example` to `.env.local` and set `DATABASE_URL`, `JWT_SECRET`, `NEXTAUTH_SECRET`, and WebSocket secrets before booting the server.
- Never commit secrets or `prisma/dev.db`; surface new env keys in `.env.example` and `docs/development`.
- Admin APIs need Bearer tokens from `/api/admin/auth/login`; avoid hardcoding credentials in tests or scripts.
