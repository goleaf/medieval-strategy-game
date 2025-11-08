# Repository Guidelines

## Project Structure & Module Organization
- `app/` holds the Next.js App Router UI and API entry points; keep controllers thin and move combat, economy, and auth logic into `lib/`.
- `components/` splits into `ui`, `game`, and `admin` folders that each re-export via `index.ts`; colocate assets per feature.
- Shared hooks sit in `hooks/`, reusable tooling in `scripts/`, while building blueprints and construction helpers live in `lib/config` and `lib/game-services`.
- `prisma/` owns schema, migrations, and seeds; mirror gameplay expectations in `docs/` whenever schema or building rules shift.

## Build, Test, and Development Commands
- `npm run dev` — start the Next.js dev server on `http://localhost:3000`.
- `npm run build` / `npm start` — compile and launch the production bundle.
- `npm run lint` — enforce ESLint + Next.js rules; fix violations before committing.
- `npm run prisma:seed` or `npx tsx scripts/seed-fake-tribes.ts` — reseed deterministic worlds before simulations.
- `node test-combat-system.js` (or other `test-*.js`) — smoke-test combat once the dev server is running.

## Coding Style & Naming Conventions
- TypeScript everywhere with 2-space indentation, trailing commas, and named exports when practical.
- Components use PascalCase, utilities camelCase, constants `UPPER_SNAKE_CASE`, and files stay kebab-case.
- Default to server components; only browser hooks go in `hooks/`, and never import Prisma models client-side.
- Keep Tailwind + shadcn/ui primitives for styling; preserve inline comments for any new endgame or combat logic blocks.

## Testing Guidelines
- Smoke tests follow the `test-<feature>.js` pattern and run via Node once seeds are loaded.
- Add targeted harnesses in `lib/__tests__/` or scripts when new systems land; document setup assumptions inline.
- Run `npm run prisma:seed` ahead of tests that rely on specific tribes, worlds, or admin accounts.

## Commit & Pull Request Guidelines
- Commits are concise, present-tense, and single-purpose (e.g., `feat: add loyalty decay`); avoid bundling unrelated tweaks.
- PRs should describe purpose, validation (`npm run lint`, `node test-combat-system.js`, etc.), linked issues, and any docs/schema updates.
- Add screenshots or logs for UI/admin work; split gameplay tuning, tooling, and docs into separate PRs for faster review.

## Security & Configuration Tips
- Copy `.env.example` to `.env.local` and set `DATABASE_URL`, `JWT_SECRET`, `NEXTAUTH_SECRET`, and WebSocket secrets before running.
- Never commit secrets or `prisma/dev.db`; surface new env keys in `.env.example` and `docs/development`.
- Admin APIs require Bearer tokens from `/api/admin/auth/login`; never hardcode credentials in tests or scripts.
