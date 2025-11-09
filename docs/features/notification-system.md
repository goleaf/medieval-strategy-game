# Player Notification System

The real-time notification hub keeps players aware of urgent world events while letting them tailor the noise floor to their play style.

## Priority Levels

| Priority | Color | Sample triggers | Delivery |
|----------|-------|-----------------|----------|
| **Critical / Red Alert** | `CRITICAL` | Noble attack detected, loyalty under 50%, war declarations, active conquests | Immediate popup, loud siren, desktop + push + email |
| **High / Orange Alert** | `HIGH` | Incoming attacks, tribe support requests, noble training ready, expensive building finishes | Prominent UI card, optional sound, persists until acknowledgement |
| **Medium / Yellow** | `MEDIUM` | Troop queues finishing, trades arriving, reports available, leadership mails | Counts toward bell badge, cleared after viewing |
| **Low / Blue Info** | `LOW` | Troops returning, small trades, minor building work, global game news | Subtle info chip that auto-dismisses unless muted |

Priority metadata is declared in `lib/config/notification-types.ts` and consumed by both the backend service and UI.

## Persistence & Preferences

The new Prisma models:

```prisma
model PlayerNotification { ... }
model NotificationPreference { ... }
```

store the canonical notification feed plus per-type prefs (enabled flag, sound preset, channel overrides), quiet hours, and importance threshold. Preferences can be updated through `PATCH /api/notifications/preferences`.

## Delivery Pipeline

- `NotificationService.emit` normalizes type config, evaluates preferences + quiet hours, and persists delivery metadata.
- Game systems call the service from attacks, building completions, reinforcements, alliance SOS pings, etc.
- The REST feed (`GET /api/notifications`) returns prioritized results + unread counters for UI rendering.

## UI Surfaces

- **Notification Bell** in the global navbar shows unread count, quick list, and “mark all” action.
- **Notification Center** card on the dashboard provides filters (priority + type), per-priority stats, and acknowledgement controls.
- **Settings → Notifications** exposes quiet hours, per-type toggles, sound previews, desktop push permissions, and a historical log for auditing.

## Customization Highlights

- Quiet hours can optionally suppress non-critical alerts; start/end stored as minutes from midnight.
- Per-priority sound profiles plus per-type overrides let competitive players distinguish nobles vs. reports.
- Email digest frequency can be toggled between daily summaries, critical-only, or disabled entirely.

## Extending

1. Add new types to `NOTIFICATION_TYPE_CONFIG` with labels, default channels, and icons.
2. Emit from gameplay services via `NotificationService.emit`.
3. If a new channel/setting is required, extend `NotificationPreference` and the settings panel accordingly.
