# Security Hardening Playbook

This playbook codifies the cross-cutting security controls that every feature must respect. It combines validation rules, anti-cheat detection requirements, and session management expectations so implementers can wire defenses close to the business logic while keeping auditors happy.

## Input Validation

Server handlers under `app/api/` must treat client payloads as untrusted and lean on shared validators in `lib/utils/validators.ts` or Zod schemas under `lib/utils/validation.ts`.

- **Coordinate validation**: clamp `x`/`y` to integer values between `0` and `999` (continents are 100×100 blocks). Reject anything outside that window during village placement, rally-point targeting, teleport scrolls, or admin teleports.
- **Resource validation**:
  - Ensure the acting player has enough wood/stone/iron/gold before subtracting costs.
  - Reject negative transfers and clamp marketplace, merchant, and gifting payloads to `warehouse`/`granary` capacity.
  - When forwarding resources or queuing builds, recompute capacity from `CapacityService` rather than trusting the client.
- **Timing validation**: movement/troop/production timers cannot start in the past or extend beyond the configured scheduling horizon (default 24 h for attacks, 7 d for construction). Clamp or reject if the request timestamp is desynced >5 s.
- **Permission checks**: confirm the authenticated player owns the issuing village, has sitter/dual permission, and that diplomacy rules allow the requested target (e.g., cannot attack allies during a mandatory ceasefire).
- **Rate limiting**: apply per-action throttles in Redis (e.g., ≤10 hostile attacks per minute, ≤30 trades per hour per account). Emit structured logs when limits trigger so anti-cheat can correlate spikes.
- **Command validation**:
  - Troop counts must be integers ≥0 and not exceed available troops in the village after reserves.
  - Noble trains require the configured gold coin cost and academy prerequisites.
  - Building upgrades cannot exceed blueprint max levels and must honor prerequisites from `lib/config/construction.ts`.

Document any deviations next to the handler, and add regression tests under `lib/__tests__/` or `tests/` before shipping.

## Anti-Cheat Detection

Detection services write to the `FairPlay*` Prisma models and reuse the scoring/enforcement workflow defined in `docs/admin/fair-play-detection.md`.

- **Multi-accounting**:
  - Correlate shared IPs, device fingerprints, overlapping session windows, and one-way trade routes.
  - Track one-direction resource funnels (ratio >4:1) combined with suppressed growth to flag feeders.
  - Surface `suspiciousActivityScore` deltas and attach evidence IDs per cluster.
- **Bot detection**:
  - Record action intervals; flag machine-perfect gaps or superhuman reaction times.
  - Note improbable play windows (e.g., 24/7 activity across days) and repeated identical command payloads.
  - Compare UI telemetry vs. API usage to spot modified/automated clients.
- **Bug exploitation**:
  - Reject impossible states (negative resources, duplicated troops) at validation time and log them.
  - When anomalies leak through (e.g., impossible haul > capacity), capture the payload, player, server tick, and rollback window for engineers.
- **API abuse**:
  - Monitor malformed or excessive requests by endpoint, IP, and auth token; throttle and temporarily block offenders.
  - Require signed headers from first-party clients and downgrade suspicious sessions to limited-mode when tampering is detected.
- **Scoring & enforcement**:
  - Every signal rolls into suspicion scores with decay. Scores ≥50 trigger moderator review, ≥70 auto-restrict high-risk actions, and ≥80 can auto-suspend until human confirmation.
  - Send moderator alerts with condensed evidence plus a remediation checklist; expose state in the admin dashboard.

All anti-cheat code paths must be observable (logs, metrics, traces) so operations can tune thresholds without redeploying code.

## Session Management

Sessions span player, sitter, dual, and admin tokens. All authentication flows live in `app/api/auth/*` and `app/api/admin/*`; shared helpers sit in `lib/auth.ts` and `app/api/auth/middleware.ts`.

- **Token hygiene**:
  - Generate 256-bit, cryptographically secure random tokens. Rotate tokens automatically every 15 minutes of activity or when sensitive actions occur (e.g., password change).
  - Store session cookies with `httpOnly`, `Secure`, and `SameSite=Lax` (or `Strict` for admin).
- **Timeouts & rotation**: expire inactive sessions after 30–60 minutes, with refresh-on-activity up to the configured max lifetime (default 24 h). Force logout for banned or deleted accounts immediately.
- **Validation per request**:
  - Check token signatures, ensure the user still exists, and verify the account is not suspended.
  - Attach session metadata (IP, user agent, last activity) so downstream handlers can enforce geo or device policies.
- **Session metadata & audit trails**:
  - Persist IP, ASN, UA hash, device fingerprint, issued-at, and last-activity timestamps for each token.
  - Surface “log out all devices” in account settings; administrators can revoke specific tokens via `/api/admin/player-management`.
- **Hijacking detection**:
  - Require re-authentication when IP or user agent shifts drastically mid-session.
  - Compare cookie binding data with ActivityTracker updates; flag and lock sessions showing impossible travel speeds or simultaneous usage across continents.

Logout endpoints must revoke tokens server-side, and all privileged APIs should double-check session state even if upstream middleware already authenticated the request.

Keep this playbook updated whenever validation rules, detection thresholds, or auth flows change so engineers, QA, and moderators refer to a single canonical source.
