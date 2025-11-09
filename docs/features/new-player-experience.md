# New Player Experience & Tutorial System

A cohesive onboarding flow ensures that players understand core mechanics while staying protected. This document captures the guided quests, advisory systems, helper UI, and mentor programs that run alongside Beginner Protection.

## Objectives
- Teach core mechanics (economy, military, diplomacy) through actionable quests.
- Reward progress with meaningful resources/premium boosts without creating pay-to-win gaps.
- Deliver contextual guidance (advisor popups, tooltips) exactly when the player explores a feature.
- Offer optional safe spaces (Beginner Worlds) and mentor pairing for players who want extra help.
- Ensure help surfaces (quest panel, advisor, help button) are visible from every screen.

## Guided Questline

| Sequence | Quest | Goal | Reward |
| --- | --- | --- | --- |
| 1 | Build Timber Camp to level 2 | Introduce resource upgrading | +1,000 wood + 5 premium points |
| 2 | Upgrade Granary to level 2 | Teach storage/balance | +800 crop + 200 clay |
| 3 | Recruit 10 Spearmen | Highlight barracks/queues | +10 spears + training speed buff |
| 4 | Scout barbarians | Explain rally point + scouting | +1 scout + 500 iron |
| 5 | Send first attack vs. barbarian camp | Teach combat basics | Instant heal for wounded + hero XP |
| 6 | Join a tribe | Demonstrate social tools | +1 tribe chest + alliance chat unlock |
| 7 | Construct Marketplace level 1 | Enable trading | Free merchant slot + trade tutorial |
| 8 | Build Academy & research Nobles | Showcase mid-game objectives | +1 noble draft + loyalty primer |

- Quest data stored in `TutorialQuestDefinition` table with steps, requirements, rewards, and tutorial copy.
- Quests unlock sequentially; auto-claim if player already met requirements before seeing the quest.
- Protection integration: milestone quest “Attack a non-protected player” warns about ending protection early and requires explicit confirmation.

## Reward Progression
- Rewards escalate gradually; early quests focus on basics (resources, troops), mid quests unlock premium boosts (1–5 gold per quest) without exceeding 30 gold total.
- Completing entire chapter grants a “Newcomer’s Chest” with random cosmetic/banner items.
- Rewards delivered via `/api/tutorial/claim` endpoint to keep audit logs and prevent double-claiming.

## Advisor System
- NPC advisors (Economy, Military, Diplomacy) trigger modal/tooltips the first time a player opens related UI.
- Advisors are authored in `TutorialAdvisorScript` entries with triggers (`onView:buildingQueue`, `onOpen:market`, etc.).
- Advisors detect if the player is still under Beginner Protection; advanced tips unlock only after protection expires.
- Players can snooze advisors for 24h; snooze state stored per advisor tag.

## Contextual Tooltips & Help Button
- Every complex UI (building queue, rally point, alliance screen, world map) has inline “?” icons describing mechanics.
- Hover/click reveals Markdown-driven help text; mobile uses bottom sheet.
- Global help button sits in the nav bar, opens `/support/help` overlay with search, rules, and “Contact Mentor” CTA.
- Tooltips include quick links to quest entries, relevant docs, or video clips (local static assets).

## Beginner-Only World (Optional)
- Config flag `WORLD_CONFIG.beginnerWorldEnabled` controls whether a separate slow-paced shard is available.
- Characteristics:
  - Speed x0.75 (slower growth, relaxed gameplay).
  - Beginner Protection lasts 10 days but still ends when hitting 6,000 points or attacking non-protected players.
  - Enhanced tutorial rewards (extra premium currency baseline) to encourage experimentation.
  - Opt-in at registration; transferring out requires closing quests + reaching 5 villages.

## Mentor Matching
- Opt-in checkbox shown during onboarding (“Pair me with an experienced mentor”).
- Mentor pool curated from veteran volunteers; data stored in `MentorProfile` with availability/time zones.
- Matching logic pairs new players based on language, region, and activity window.
- In-game mail thread auto-created between mentor/mentee with canned intro prompts.
- Mentors receive badges + small cosmetic rewards for successful mentees (e.g., reaching 10k points).
- Abuse guardrails: mentors limited to a set number of mentees concurrently and monitored via fair-play detection signals.

## Display Requirements
- **Quest Panel**: Persistent sidebar module (desktop) / bottom drawer (mobile) listing active quest, progress bars, and claimed rewards. Accessible from HUD, plus hotkey `Q`.
- **Progress Tracking**: Each quest step shows numeric progress (e.g., “Spearmen trained: 6/10”). Completed quests highlight until claimed.
- **Advisor Popups**: Modal with character art + step-by-step instructions; includes “Show me later” and “Don’t remind me” options.
- **Help Button**: Fixed entry point in top nav and pause menu; includes quick links to rules, reporting, and beginner guides.
- **Protection Timer**: Displayed adjacent to quest panel when protection active; clicking opens detailed protection infobox.
- **Warnings**: Attempting actions that end protection early (e.g., attacking non-protected player, starting noble conquest) surfaces a confirmation dialog referencing the protection timer/tutorial.

## APIs & Data
- `GET /api/tutorial/quests` — Returns quest states, rewards, and dependencies.
- `POST /api/tutorial/claim` — Claims completed quest rewards (idempotent).
- `POST /api/tutorial/mentor-request` — Opt-in/out of mentor program and refresh matching.
- `GET /api/tutorial/advisors` — Lists pending advisor prompts for the session.
- Analytics emit events (`tutorial_step_completed`, `advisor_dismissed`, `mentor_chat_opened`) for onboarding KPIs.

## Testing
- Add unit tests covering quest progression, reward claiming idempotency, mentor assignment limits, and protection-triggered warnings.
- Storybook stories for quest panel + advisor modal ensure consistent UX.
- Run smoke tests ensuring timers/warnings update correctly after attacks, point gains, or world switches.
