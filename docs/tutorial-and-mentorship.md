# Tutorial & Mentorship

## Beginner Quests
- Endpoint: `GET /api/tutorial/quests?playerId=...` returns active quests and per-task progress.
- Complete tasks: `POST /api/tutorial/tasks/[id]/complete` with `{ playerId }`. Grants resource/premium rewards.
- UI: `/tutorial` shows the quest panel.

Default tasks:
- Build Timber Camp to level 2
- Recruit 10 Spearmen
- Send first attack (barbarian)
- Join a tribe

Note: server-side auto-completion hooks can be added to building/train/attack endpoints; current minimal flow allows players to mark completion and receive rewards.

## Advisor Hints
- Lightweight coachmarks shown on first visit to key screens (Dashboard, Market, Rally Point).
- Stored in browser (localStorage `advisor_seen_<scope>`).
- Toggle help anytime via the Help button in the top navigation or visit `/tutorial`.

## Mentorship
- Volunteers opt in to mentor via `POST /api/mentorship/opt-in`.
- New players request a mentor via `POST /api/mentorship/request`.
- Mentors accept/decline via `POST /api/mentorship/requests/[id]/accept|decline`.
- Available mentors: `GET /api/mentorship/mentors` (sorted by points, with current mentee counts).
- UI: `/mentor` page offers “Request Mentor” and “Volunteer as Mentor”.

Notifications
- Mentor and mentee receive `PlayerNotification` messages on request and acceptance (best-effort dispatch).
