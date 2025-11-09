# Changelog

All notable changes to this project are documented here.

This file follows a lightweight Keep a Changelog style and conventional commit types.

## Unreleased

- feat(profiles): public player profile pages and social APIs
  - files: app/players/[player]/page.tsx, app/api/players/profile/route.ts, app/api/social/friends/route.ts, app/api/social/notes/route.ts, app/api/social/blocks/route.ts, app/api/social/endorsements/route.ts, app/api/social/mentorships/route.ts, app/api/social/feed/route.ts, lib/game-services/player-profile-service.ts, lib/game-services/social-service.ts
  - details: Add profile data endpoint, territory summary, badges/endorsements, friend/notes/block/endorsement/mentorship/feed endpoints, and service layer. Map and tribe lists already link to profiles.
  - date: 2025-11-09

- feat(achievements): add achievement system with categories, progress, rewards, rarity, and UI
  - files: prisma/schema.prisma, lib/config/achievements.ts, lib/game-services/achievement-service.ts, app/api/players/achievements/route.ts, app/api/players/achievements/claim/route.ts, app/api/players/achievements/favorite/route.ts, lib/game-services/player-profile-service.ts, app/players/[player]/achievements/page.tsx, app/players/[player]/page.tsx
  - details: Define AchievementDefinition and PlayerAchievement models; service to sync definitions, record metrics, compute rarity, claim rewards, and set favorites; API to fetch/claim/favorite; profile showcases favorites; dedicated achievements page with progress bars.
  - date: 2025-11-09

- feat(events-worlds): world events system + seasonal worlds metadata and UIs
  - files: prisma/schema.prisma, lib/game-services/event-service.ts, app/api/events/route.ts, app/api/events/[id]/route.ts, app/api/events/[id]/leaderboard/route.ts, app/events/page.tsx, app/events/[id]/page.tsx, app/api/worlds/route.ts, app/worlds/page.tsx
  - details: Event models (WorldEvent, EventScore, EventReward) with leaderboards and live countdown; event calendar and details pages. Extend GameWorld with SeasonType and seasonal metadata; add world selection interface listing speed, type, age, and player counts.
  - date: 2025-11-09

- chore(seed): add seed script for events and achievement definitions; hook conquest achievements and event scoring
  - files: scripts/seed-events.ts, lib/game-services/expansion-service.ts, lib/game-services/event-service.ts
  - details: Upserts sample events, seeds sample leaderboard entries, and increments conquests for active events on village transfer.
  - date: 2025-11-09

- chore(tooling): align Cursor rules with AGENTS.md and add changelog automation script
  - files: .cursorrules, scripts/update-changelog.ts, package.json, CHANGELOG.md
  - details: Introduce `scripts/update-changelog.ts` and `npm run changelog:update` to append entries and enforce root changelog usage for agent edits.
  - date: 2025-11-09
