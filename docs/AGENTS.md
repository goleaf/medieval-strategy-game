# Documentation Guidelines

- Keep documentation synchronized with gameplay systems and admin tooling updates.
- Treat `docs/features/resource-system.md` as the canonical resource economy reference; update it when rules change and when Prisma/config seeds shift. Mirror the implementation in `lib/game-services/resource-economy.ts` whenever the helper logic evolves.
- Mirror cross-links so related sections (admin, features, development) stay consistent.
- Capture both backend flow (jobs, seeds, services) and player-facing rules whenever documenting gameplay systems so support, QA, and live-ops speak from the same spec.
