# API Overview

The Medieval Strategy Game exposes a REST-style API that powers the in-game clients, admin dashboard, and automated tooling. This guide documents the most important endpoints, request flows, and conventions so engineers can safely extend the platform.

## Base URLs

| Environment | Base URL |
|-------------|----------|
| Local Dev   | `http://localhost:3000` |
| Production  | `https://YOUR_DOMAIN` |

All routes listed below are relative to the base URL. Admin endpoints live under `/api/admin/*`, while public gameplay endpoints are mounted at `/api/*`.

## Authentication

### Player Sessions
- Endpoints under `/api/auth/*` issue and validate JWT access tokens.
- Use `POST /api/auth/login` to exchange credentials for a session token.
- Include the token with each request via the `Authorization: Bearer <token>` header.

### Admin Sessions
- Admins authenticate with `POST /api/admin/auth/login`.
- Admin-only routes verify the same `Authorization` header and also enforce role-based permission checks defined in `lib/auth/admin.ts`.

## Common Response Shape

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

- `success`: boolean flag describing if the request completed successfully.
- `data`: payload that varies per endpoint.
- `error`: string explaining what went wrong when `success` is `false`.

Consistent response envelopes make it easy for the dashboard and tests in `/test-*.js` to assert behaviour.

## Error Handling

Errors bubble up through `lib/errors.ts` helpers and are also captured by `app/api/admin/error-logs/route.ts`. When extending API handlers, always:
1. Validate input with zod schemas from `lib/validators/*`.
2. Throw typed errors so the admin dashboard can display user-friendly messaging.
3. Call `trackAction()` (see `/docs/admin/action-tracking.md`) when an admin performs a mutation.

## Key Admin Endpoints

### World Configuration
- `GET /api/admin/world/config` – Fetch current world configuration object.
- `PUT /api/admin/world/config` – Update global speed, resource, and protection values. Uses `lib/world/config.ts` for validation.

### Unit Balance
- `GET /api/admin/units/balance` – Returns every troop template, including upkeep and combat stats.
- `PUT /api/admin/units/balance` – Persists stat changes with guardrails described in `/docs/admin/unit-balance.md`.

### Speed Templates
- `GET /api/admin/speed-templates` – List predefined pacing templates.
- `POST /api/admin/speed-templates` – Apply a template atomically. See `/docs/admin/speed-templates.md` for details.

### Player Moderation
- `GET /api/admin/players` – Search players with pagination and fuzzy matching.
- `POST /api/admin/players/[id]/ban` – Ban player with a reason string.
- `POST /api/admin/players/[id]/unban` – Lift ban record.
- `POST /api/admin/players/[id]/rename` – Rename player after validation.
- `POST /api/admin/players/[id]/move-village` – Teleport a village to provided coordinates.
- `POST /api/admin/players/bulk` – Execute scripted batch actions (import, ban, resource grants).

### Map Operations
- `POST /api/admin/map/spawn-barbarian` – Spawn a barbarian-controlled village with custom troops.
- `POST /api/admin/map/relocate-tile` – Move any village to new coordinates.
- `POST /api/admin/map/wipe-empty` – Remove inactive low-level villages.

### Observability
- `GET /api/admin/stats` – Returns online players, queue depths, and error log snapshots.
- `GET /api/admin/error-logs` – Paginated error log view for the dashboard.

## Gameplay Endpoints

### Villages & Resources
- `GET /api/villages` – List villages for the authenticated player.
- `POST /api/buildings/[villageId]/upgrade` – Queue a building upgrade.
- `POST /api/villages/[villageId]/recruit` – Train troops.

### Combat & Movements
- `POST /api/attacks/send` – Dispatch an attack command.
- `GET /api/attacks/queue` – View outgoing and incoming commands.
- `POST /api/reinforcements/send` – Send support troops.

### Messaging & Social
- `GET /api/messages` – Fetch inbox threads.
- `POST /api/messages` – Send a new message.
- `GET /api/tribes` / `POST /api/tribes` – Manage player tribes, invites, and diplomacy.

### Task System
- `GET /api/tasks` – Retrieve the current task list for the player.
- `POST /api/tasks/claim` – Claim completed rewards.

### Protection & Respawn
- `GET /api/protection` – Read current beginner protection timers.
- `POST /api/protection` – Extend or disable protection based on eligibility rules defined in `app/api/protection/route.ts`.

## Pagination & Filtering

- Most collection endpoints support `?page`, `?limit`, and simple filters (`?search=` or `?status=`).
- Keep payloads small: admin tables default to 25 rows to protect DB performance.

## Rate Limiting

Basic rate limiting middleware is implemented in `app/api/middleware.ts`. Requests exceeding configured thresholds receive HTTP 429 responses with `Retry-After` headers. Respect these headers in automation to avoid temporary bans.

## Useful Testing Scripts

The repository ships with integration helpers:
- `node test-admin.js` exercises the admin dashboard APIs end-to-end.
- `node test-task-system.js` simulates player task flows.
- `node test-combat-system.js` stress tests combat endpoints.

Run these scripts after any API change to validate regressions.

## Adding New Endpoints

1. Create a handler inside `app/api/.../route.ts` naming folders after the path segments.
2. Validate inputs with zod, enforce authentication via helpers in `lib/auth/*`.
3. Add documentation in `/docs/api` and update relevant feature docs.
4. Extend automated tests or create a new `test-*.js` script.
5. Update `/docs/CHANGELOG.md` when the API surface changes.

---
Need more detail on a specific route? Add a new markdown file inside `docs/api/` and the docs site will automatically pick it up.
