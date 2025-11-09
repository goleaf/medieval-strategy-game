# Moderation: Multi‑Accounting Prevention

This system detects and enforces against unfair multi‑accounting using:

- IP tracking: flags multiple accounts from the same IP (allowlist supported).
- Device fingerprint: flags the same trusted device used across accounts.
- Behavioral signals: resource flow imbalance, persistent support, and simultaneous logins.
- Automated reports: generated for moderator review with suspicious scores.
- Graduated enforcement: warnings, action‑scoped restrictions, suspensions, bans, and IP bans.

## Data Model Additions

New schema fields and models are defined in `prisma/schema.prisma`:

- `User.suspendedUntil`, `User.ipBanUntil`, `User.suspicionScore`
- `Player.attackRestrictedUntil`, `Player.tradeRestrictedUntil`, `Player.suspendedUntil`
- `AccountLinkEvidence`, `ModerationReport`, `EnforcementAction`
- `MultiAccountAllowlist`, `IpBan`, `ModerationAppeal`

Run migrations after pulling changes.

## Admin APIs

- `GET /api/admin/moderation/multi-account/reports` — compute and persist a report
- `POST /api/admin/moderation/enforce` — apply enforcement
  - body: `{ action, reason, playerIds?, userIds?, ipAddresses?, durationHours? }`
- `POST /api/admin/moderation/allowlist` — add allowlist entries (IP/DEVICE/PAIR)
- `GET /api/admin/moderation/allowlist` — list allowlist entries

Player report queue (human reports):
- `GET /api/admin/moderation/reports?status=OPEN` — prioritized queue by severity/time
- `GET /api/admin/moderation/reports/[id]` — report details + lightweight investigation context
- `PATCH /api/admin/moderation/reports/[id]` — update status, add notes (triggers reporter feedback on ACTION_TAKEN)

## Player/Public APIs

- `GET /api/moderation/bans` — public (optional) ban list
- `POST /api/moderation/appeals` — submit appeal (requires auth)
- `POST /api/reports/moderation` — submit a moderation report
- `GET /api/reports/moderation?mine=1` — my report history

## Enforcement Checks

- Attacks blocked when `Player.attackRestrictedUntil` or `Player.suspendedUntil` is active.
- Trading blocked when `Player.tradeRestrictedUntil` or `Player.suspendedUntil` is active.
- Login blocked when IP is banned or `User.suspendedUntil` is active.
- Registration blocked when IP is banned.

## Detection Notes

Report combines weighted signals over the last 14 days:

- IP and device overlaps
- Resource shipments imbalance (≥4:1 net one‑way flow)
- Repeated reinforcements between the same pair
- Simultaneous daily activity patterns

Use the allowlist for households/cafes to prevent false positives.

## Player Reports

- Types: multi-accounting, bug abuse, harassment, inappropriate names, other
- Attach evidence: URLs, message IDs, or notes
- Anonymity: set `isAnonymous` to hide your identity from other players (moderators can still see it)
- Tracking: a `reference` code is returned on submission and is visible in your report history

## Warnings & Appeals

Warnings are delivered via `PlayerNotification` with a direct link to the appeals endpoint. Moderators can review `ModerationReport` snapshots and `ModerationAppeal` records.
