# Email Notification System

The email notification pipeline keeps offline players informed about critical events. It complements the in-game notification hub without spamming active players.

## Capabilities

- **Attack alerts** – Incoming attack warnings include attacker identity, landing time, and direct links to the threatened village. Battle reports are emailed after resolution.
- **Conquest intelligence** – Loyalty drops below 15 trigger urgent warnings; defenders receive conquest summaries when a village is captured.
- **Alliance broadcasts** – Tribe-wide announcements sent via the alliance composer optionally generate email fan-out, respecting per-player opt-ins.
- **Completion notices** – Major building milestones (Palace, Residence, Command Center, Academy, Workshop, Treasury, Wonder) and administrator unit training (Nobleman, Senator, Logades, Nomarch, Chief) produce messages plus optional emails.
- **Digests** – Players can choose immediate delivery or hourly/daily digests. Daily digests append an aggregate summary when the `dailySummary` preference is enabled.
- **Deep links** – Each email includes a direct path back into the relevant screen (`/village/{id}/buildings`, `/reports`, `/messages`, etc.) plus a plain-text summary for clients without HTML.
- **Compliance** – Every notification carries an unsubscribe link and honors per-player rate limits (default 20 emails/hour). Email verification is required before delivery.

## Configuration Surface

| Setting | Location | Notes |
| --- | --- | --- |
| Email address + verification | `PATCH /api/email-notifications/preferences` (body: `email`) then `POST /api/email-notifications/verify` | Changing the email resets `emailVerifiedAt` until the verification link is visited. |
| Delivery schedule | `deliverySchedule` (`IMMEDIATE`, `HOURLY`, `DAILY`) | Schedule applies to all enabled topics. |
| Preferences | `preferences` JSON (`attackIncoming`, `attackReport`, `conquestWarning`, `conquestLost`, `tribeMessage`, `trainingComplete`, `buildingComplete`, `dailySummary`) | Defaults enable everything except the daily summary. |
| Language | `language` (`EN`, `DE`) | Controls template strings. |
| Digest hour | `dailyDigestHour` (0-23) | Used for the daily summary window. |
| Unsubscribe | `/api/email-notifications/unsubscribe?token=...` | Link is rotated for every email. |

## Data Model

Prisma additions:

- `EmailNotificationSetting` – per-player preferences, verification tokens, rate limit counters.
- `EmailNotificationEvent` – queued work items per topic.
- `EmailNotificationDelivery` – audit log of outbound emails.
- Extends `MessageType` with `BUILDING_COMPLETE`, `TRAINING_COMPLETE`, `TRIBE_BROADCAST`, `LOYALTY_ALERT`, `CONQUEST_REPORT`, `DAILY_SUMMARY`.

## Worker Flow

1. Controllers and services queue events through `EmailNotificationService.queueEvent`.
2. `lib/jobs/email-notifications.ts` runs every minute (scheduler) to:
   - Send immediate notifications for offline players.
   - Flush hourly and daily digest batches when `readyAt <= now`.
3. `EmailNotificationService` enforces rate limits and renders templates via `lib/email/templates.ts`.
4. Each email includes deep links, a summary body, and an unsubscribe footer. Verification + unsubscribe routes live under `/api/email-notifications/*`.

## Environment Variables

| Key | Purpose | Example |
| --- | --- | --- |
| `APP_ORIGIN` | Base URL for deep links | `http://localhost:3000` |
| `EMAIL_SMTP_HOST` / `EMAIL_SMTP_PORT` / `EMAIL_SMTP_USER` / `EMAIL_SMTP_PASS` | SMTP transport | `smtp.sendgrid.net` |
| `EMAIL_FROM` | Default from header | `Medieval Strategy HQ <alerts@medievalstrategy.game>` |
| `EMAIL_RATE_LIMIT_MAX` / `EMAIL_RATE_LIMIT_WINDOW_MINUTES` | Rate limiting | `20`, `60` |
| `EMAIL_OFFLINE_THRESHOLD_MINUTES` | Offline detection window | `10` |
| `EMAIL_DISPATCH_BATCH_SIZE`, `EMAIL_DIGEST_BATCH_SIZE`, `EMAIL_DIGEST_EVENT_CAP` | Optional tuning knobs | - |

Update `docs/README.md` and `.env` templates whenever new keys are introduced.
