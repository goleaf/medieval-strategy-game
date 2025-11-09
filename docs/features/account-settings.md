# Account Settings & Preferences

## Overview

Players can customize display, gameplay, privacy, performance, and notification preferences. Settings are stored per player and exposed via REST APIs with a dedicated `/settings` UI.

## Database

- `PlayerSettings` model stores:
  - Display: `language`, `timeZone`, `dateTimeFormat`, `numberFormat`, `theme`
  - Gameplay: `defaultAttackType`, `unitFormationTemplates` (JSON), `enableAutoComplete`, `confirmDialogs` (JSON)
  - Privacy: `onlineStatusVisible`, `contactPreferences` (JSON), `dataSharingOptIn`
  - Performance: `mapQuality`, `animationsEnabled`, `autoRefreshSeconds`, `bandwidthSaver`
- `NotificationPreference` extended with:
  - `globalEnabled`, `doNotDisturbEnabled`, `groupSimilar`, `retentionDays`
  - `groupingWindowMinutes` to tune grouping window (default 60)

## API Endpoints

### Preferences
- GET `/api/settings/preferences` — returns `PlayerSettings` (auto-creates with defaults)
- PUT `/api/settings/preferences` — update allowed fields; partial updates supported

### Notification Preferences
- GET `/api/settings/notifications` — returns `NotificationPreference` (auto-creates)
- PUT `/api/settings/notifications` — update allowed fields; partial updates supported

## UI

- `/settings` page provides:
  - Categories (Display, Gameplay, Privacy, Performance, Notifications)
  - Search filter, Reset to defaults, Save confirmation toast
  - Theme selector integrates with app theme provider (client may apply `theme`)

## Notes

- Existing `Player.profileVisibility`, `allowFriendRequests`, `allowMentorship` remain authoritative; the privacy section mirrors adjacent toggles via `contactPreferences` and `onlineStatusVisible`.
- Email notification language is driven by `EmailNotificationSetting.language`; display `language` in `PlayerSettings` controls UI.
- Retention and grouping are captured in `NotificationPreference`; a follow‑up job can purge historical notifications older than `retentionDays` and group similar events in feeds.
