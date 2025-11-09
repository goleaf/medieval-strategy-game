# Fair Play Detection & Enforcement

Comprehensive detection and enforcement protects the game economy from coordinated abuse and keeps moderation workflows auditable. This document defines the signals, scoring, reporting, and graduated responses required to detect unfair multi-accounting and related account-linking behavior.

## Objectives
- Detect multi-account clusters early with explainable evidence.
- Quantify suspicious activity via deterministic scores rather than manual guesswork.
- Feed actionable reports to moderators while keeping noise manageable.
- Apply proportional enforcement actions with clear player-facing messaging and appeal paths.

## System Overview
1. **Signal Ingestion** — Store login/IP/device events, economy transactions, military support, and behavioral telemetry in append-only tables (Prisma models under `FairPlay*` namespace).
2. **Correlation Engine** — Build an account-link graph by joining players via shared IPs, browser fingerprints, simultaneous logins, and one-way transfers.
3. **Risk Scoring** — Produce a `suspiciousActivityScore` (0–100) each evaluation tick using weighted signals and decay windows (default hourly, burstable on-demand from the admin panel).
4. **Automated Reporting** — Persist snapshots plus moderator-focused summaries (top alerts, regression vs. prior day, cooldown timers).
5. **Graduated Enforcement** — Map scores and manual confirmations into warning/restriction/ban tiers with audit logging and appeal tracking.

## Prohibited Actions & Player-Facing Rules
- **Account Sharing**: Prohibited unless explicit sitter access is configured via the sitter UI. Detection cross-checks sitter tokens to avoid false positives.
- **Bug Exploitation**: Using glitches, unfinished content, or timing exploits for advantage. Reports require timestamps + reproduction details so engineering can patch quickly.
- **Scripting/Automation**: Any external macro, bot, or auto-raider beyond the built-in queue helpers. Device fingerprinting + suspicious action-per-minute spikes feed this signal.
- **Real Money Trading**: Buying/selling accounts, resources, boosting services. Resource flow tracking raises high scores automatically.
- **Harassment/Bullying**: Threatening language, hate speech, or repeated offensive behavior in mail/chat. Reports route to community moderators with chat logs.
- **Cheating Tools**: Modified clients, overlay map hacks, packet manipulation. Client integrity checks feed into the enforcement pipeline.
- **Coordinated Rule Breaking**: Tribe- or alliance-wide violations (e.g., coordinated feeding rings). Requires linking multiple accounts plus leader escalation.

**Display Requirements**
- Rules page (`/rules`, mirrored in `app/rules/page.tsx`) must be reachable from the footer, main nav, pause/off-canvas menu, village screen header, and support modals.
- Each rule includes at least one concrete example and the maximum penalty (“Using bots to queue raids overnight → temporary suspension, repeat → permanent ban”).
- Embed “Report suspicious behavior” CTA blocks that deep-link into the reporting flow with preselected categories.

## Detection Systems

### IP Tracking
- Log every login with `playerId`, `userId`, IPv4/IPv6, ASN, geolocation hash, and timestamp.
- Flag clusters where >2 accounts share the same IP within a 24h rolling window.
- Maintain **exception lists** (families, LAN cafés, traveling teams) with expiry dates; detection ignores flagged IPs but still records linkage for later review.

### Browser Fingerprinting
- Capture hashed device/browser fingerprints (canvas, WebGL, timezone, UA, hardwareConcurrency) during authentication.
- Detect repeated usage of the same fingerprint across distinct accounts; differentiate between identical hardware and shared browser profiles by combining with IP and session cookie reuse.
- Track fingerprint confidence (0–1) to down-weight noisy or partial captures.

### Behavioral Analysis
- Compare action timelines (building, troop training, quests) for suspicious synchronization.
- Compute similarity metrics (Pearson correlation on action buckets, identical queue compositions, mirrored travel orders).
- Identify coordinated account boosting (e.g., low-activity alts only logging in when the main account is vulnerable).

### Resource Flow Tracking
- Monitor market trades, hero adventures, alliance tributes, and direct gifting.
- Flag **one-way resource funnels**: `outgoingResources >> incomingResources` (ratio > 4:1) combined with low village growth on feeder accounts.
- Detect serial rescuing (villages repeatedly zeroed but immediately resupplied by the same benefactor).

### Support & Reinforcement Patterns
- Track reinforcements, sitter support, and long-standing troop garrisons.
- Identify **permanent support arrangements** where one player’s troops reside in another’s village >80% of the time and never return elsewhere.
- Combine with alliance membership; cross-alliance permanent support is especially suspicious.

### Login Patterns
- Record session overlaps. Flag if two accounts consistently log in within the same 2-minute window and log out together, especially when combined with identical IP/device info.
- Detect **parallel play** (multiple accounts attacking or defending in lockstep).

## Account Linking Detection

| Signal | Weight | Notes |
| --- | --- | --- |
| Shared IP (unique, non-whitelisted) | 15 | Weight increases with frequency |
| Shared fingerprint hash | 20 | Reduced to 10 if fingerprint confidence <0.6 |
| Simultaneous logins (>5 occurrences/day) | 10 | Expires after 72h |
| One-way resource funnel | 25 | Based on 7-day rolling transfer ledger |
| Permanent troop support | 15 | Requires >5 consecutive days |
| Coordinated behavior similarity | 15 | Derived from action correlation score |

- Store link edges in `FairPlayLink` with `evidence` arrays so moderators can view raw facts.
- Merge edges into clusters via union-find; clusters above score threshold appear in admin reports with suggested “primary” vs “supporting” accounts.

## Suspicious Activity Scores
- Base risk score = sum of weighted signals (max 100). Decay each signal by 20% per day without recurrence.
- Thresholds:
  - **Score ≥ 30**: Flag for monitoring; surfaced in daily digest only.
  - **Score ≥ 50**: Queue for moderator review with suggested warning template.
  - **Score ≥ 70**: Auto-impose temporary restrictions pending manual confirmation (attacks/trades disabled).
  - **Score ≥ 85**: Recommend suspension; require senior moderator sign-off.
- Store historical scores to chart trendlines in `docs/admin/player-analytics.md` dashboards.

## Automated Reports
- Nightly job writes `fair_play_reports` rows summarizing:
  - Top clusters (score, involved players, alliance, worlds).
  - New vs. resolved cases.
  - Signals contributing >50% of score.
  - Suggested enforcement queue with SLA timers.
- Admin UI pulls `/api/admin/fair-play/reports` to render:
  - Table of active cases with severity badges.
  - Drill-down modal showing IP/fingerprint timeline charts, resource flow graphs, and troop support heatmaps.
- Reports auto-assign to moderators based on workload; Slack/webhook notifications fire for score ≥ 70.

## Reporting System

### Player-Facing Reporting
- **Report Types**: Multi-accounting, bug abuse, harassment/bullying, inappropriate/offensive names, cheating tools, and catch-all “other”.
- **Submission Flow**:
  - Accessible via report buttons on player profiles, villages, in-game mail threads, battle reports, and support pages.
  - Form collects category, free-form description, optional timestamps, and up to 3 attachments (screenshots, combat logs, chat exports).
  - Include contextual metadata automatically (reporter ID, target ID, world, recent interactions) to reduce moderator triage time.
- **Reporter Anonymity**: Default to anonymous (target never sees reporter). Reporters can opt in to share identity for follow-up.
- **Tracking & Feedback**:
  - Generate a reference number shown in confirmation modal + support inbox.
  - `/support/reports` lists the reporter’s submissions, statuses (New, Under Review, Action Taken, Closed), and throttle timers (prevent >5 open spam reports).
  - When moderators take action, send in-game mail summarizing outcome (e.g., “Thank you — we issued a warning for harassment.”).

### Moderator Workflow
- **Report Queue**:
  - `/app/admin/reports` fetches `/api/admin/reports?sort=severity` with default ordering: exploit > multi-account > harassment > naming.
  - Severity auto-increases when linked fair-play clusters exceed thresholds or when multiple unique reporters flag the same player.
- **Investigation Tools**:
  - Inline panels showing account history, login/IP timeline, action logs, chat transcripts, and economy deltas.
  - Buttons to attach new evidence (screenshots, notes) and link the report to existing fair-play cases.
- **Action Implementation**:
  - One-click actions for warning, restriction, suspension, rename enforcement, or escalation to senior moderators.
  - All actions require selecting a rules violation category to keep analytics consistent.
- **Spam Prevention**:
  - Cooldown per reporter; if >3 reports dismissed as “invalid” in 7 days, degrade priority and show educational tooltip on the report form.

### UI Hooks
- Report buttons must be visible wherever player interaction occurs (profile header, village sidebar, message thread actions, alliance roster rows).
- Include contextual tooltips clarifying what each report type covers and link to the rules page.
- Surfaced feedback banners inform players when their report triggered action (without exposing sensitive details).

## Graduated Enforcement

| Stage | Trigger | Automatic Action | Moderator Task |
| --- | --- | --- | --- |
| Monitor | Score ≥ 30 | None | Review within 72h |
| Warning | Score ≥ 50 | Send warning notification template | Confirm or dismiss |
| Restriction | Score ≥ 70 | Disable attacking/trading for 48h | Investigate & escalate |
| Point Reset | Score ≥ 75 + confirmed feeding | Reset illegitimate gains | Document rationale |
| Suspension | Score ≥ 80 + repeat offense | 3–14 day ban | Approve + schedule reactivation |
| Permanent Ban | Score ≥ 90 or 3 strikes | Account termination, IP ban option | Legal/lead review |

- Every enforcement writes to audit logs with `evidenceIds` referencing detection records.
- Appeals pause escalation timers but keep restrictions active until resolved.

## Enforcement Actions

### Warning
- Sent in-game + email; includes evidence summary and link to rules.
- Stored as strike 1 with 6-month expiry if no additional offenses.

### Account Restrictions
- Temporarily disable market trades, resource transfers, and offensive troop movements.
- Duration defaults to 48h, extendable via admin UI; restrictions auto-lift when investigation clears the player.

### Point Reset
- Removes points/resources/trophies gained during flagged window.
- Requires resource delta snapshot to prevent over-resetting; log adjustments per resource type.

### Account Suspension
- Soft-lock login, queue cancellations optional.
- Duration tiers: 3 days (first severe offense), 7 days (second), 14 days (third).
- Notifies alliance leadership to prevent confusion.

### Permanent Ban
- Hard delete session tokens, block user login, and optionally anonymize profile.
- Always double-signed by two moderators; publish on optional ban list when policy allows.

### IP Ban
- Blocks registration/login from offending IPs/subnets for configurable duration.
- Cascade to device fingerprint ban when repeated circumvention occurs.

## Player-Facing Communication
- **Warning Modal**: Summarizes violation, start/end of restrictions, and appeals link.
- **Appeals Process**: `/support/appeal` form captures case ID; automation attaches detection evidence for review.
- **Public Ban List (optional)**: Renders banned player names + reason snippets in `app/rules/page.tsx` if enabled via config flag.

## Audit & Logging
- Store immutable evidence per action. `FairPlayActionLog` records: moderatorId, playerId, action type, score snapshot, and referenced signals.
- Maintain retention (e.g., 12 months) and redact IP/device data for GDPR requests while preserving hash references.

## Testing & Validation
- Add smoke tests under `lib/__tests__/fair-play-detection.test.ts` to simulate:
  - IP/fingerprint collisions.
  - Resource funnel scenarios.
  - Support arrangement alerts.
- Seed scripts (`scripts/seed-fake-tribes.ts`) should include shared-IP families to validate exception handling.
- Regression suite ensures scoring thresholds trigger expected enforcement stage transitions.
