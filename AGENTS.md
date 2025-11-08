# Repository Guidelines

## Project Structure & Module Organization
- `app/` hosts the Next.js App Router UI and API handlers; keep handlers thin and push combat, economy, and auth logic into `lib/`.
- `components/` splits into `ui`, `game`, and `admin`; colocate feature files and re-export from each folder’s `index.ts`.
- `hooks/` stores shared state and client utilities, while `scripts/` reuses `lib/` helpers for seeding, data repair, or simulation tooling.
- `prisma/` owns the schema, migrations, and seeds—update `docs/` in tandem so gameplay/admin expectations match the database.

## Build, Test, and Development Commands
- `npm run dev`: start the dev server on `http://localhost:3000`.
- `npm run build` / `npm start`: compile and serve the production bundle.
- `npm run lint`: enforce ESLint + Next.js rules; fix issues before committing.
- `npx prisma migrate dev --name <label>`: create and apply schema changes.
- `npm run prisma:seed` or `npx tsx scripts/seed-fake-tribes.ts`: reseed deterministic worlds.

## Coding Style & Naming Conventions
- TypeScript everywhere with 2-space indentation, trailing commas, and named exports when practical.
- Components use PascalCase, utilities camelCase, files kebab-case, and constants `UPPER_SNAKE_CASE`.
- Prefer server components for loading, keep client hooks in `hooks/`, never touch Prisma from browser bundles, and rely on Tailwind + shadcn/ui primitives.
- Comment only around non-obvious combat/admin orchestration; leave straightforward code uncluttered.
- **Override (current tasks):** Maintain inline comments for new logic blocks so downstream reviewers can trace the freshly introduced endgame engine easily.

## Building Blueprint Maintenance
- `lib/config/construction.ts` now generates level data for Smithy, Stable, Workshop, Market, Rally Point, Wall, Watchtower, Church, Farm, and Hiding Place using helper factories—keep any new structures on the same helper path so effects stay declarative.
- Update `lib/game-services/construction-helpers.ts` whenever a new building type appears so queue cost/time lookups resolve correctly.
- When population rules change, adjust both the Farm blueprint and `BuildingService.calculatePopulationLimit` to preserve parity with docs.

## Testing Guidelines
- Smoke tests follow the `test-<feature>.js` pattern; execute them with `node test-combat-system.js` (or similar) once `npm run dev` is running.
- Run `npm run prisma:seed` before any test that assumes specific tribes, worlds, or admin accounts.
- New systems need another `test-*.js` harness or a lightweight `lib/__tests__/` suite that documents fetch flows and setup notes.

## Commit & Pull Request Guidelines
- Commits are concise, present-tense, and single-purpose (e.g., `feat: add loyalty decay`); branch names follow `feature/<summary>` or `fix/<summary>`.
- Rebase before opening a PR and include purpose, validation commands (`npm run lint`, `node test-combat-system.js`, etc.), and any linked docs/schema updates.
- Add screenshots or logs for UI/admin work, and split gameplay tuning, tooling, and docs edits into separate PRs for fast reviews.

## Security & Configuration Tips
- Copy `.env.example` to `.env.local`, then set `DATABASE_URL`, `JWT_SECRET`, `NEXTAUTH_SECRET`, and WebSocket secrets before running the app.
- Never commit secrets or `prisma/dev.db`; surface new env keys in `.env.example` and `docs/development`.
- Admin APIs require Bearer tokens from `/api/admin/auth/login`; never hardcode credentials in tests or scripts.
