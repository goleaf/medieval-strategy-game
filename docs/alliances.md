# Alliance System Specification

This document translates the 50-point alliance backlog into a product, data, and engineering plan. Every section calls out the concrete artifacts (schemas, telemetry, UX notes, or automation) that must exist in code as of this commit. The checklist in `docs/alliance-system-todo.md` links back here per item.

## 1. Product Goals, Guardrails, and Size Caps (Tasks 01.1–01.2)

| Goal | Target | Anti-abuse tolerance | Notes |
| --- | --- | --- | --- |
| Retain socially engaged players | +8% D30 retention for members vs non-members | Flag alliances with >15% churn in 48h for ops review | Uses telemetry `alliance.member_state_changed` |
| Reduce moderation load | -20% GM tickets about alliance griefing | 2 spam reports per hour or 5 per day auto-throttle invites & announcements | Enforced via rate limit config in `lib/alliances/security.ts` |
| Healthy alliance size | Default cap 60, hard cap 75 | Alliance exceeding 75 triggers forced recruitment freeze & review banner | Cap is per world toggle `maxMembers` |
| Spam prevention | Max 3 bulk announcements / 24h unless emergency override | A quiet-hour bypass requires on-call approval logged in audit trail | Controlled via announcement config schema |

Meeting notes with ops & design are summarized in **Appendix A** of this document so future revisions stay colocated with the canonical spec; this section distills the approved ranges.

### Stakeholder Input Snapshot
- **Design (Mira):** Focus on retention KPI (+8% D30) and ensure alliance onboarding emphasizes narrative beats so players feel social debt before tapping Ops tools. Pushed for 60-member soft cap to keep alliances personable.
- **Live-Ops (Shiori):** Requested clear spam tolerances to keep moderation load predictable; insisted on auto-freeze once 75-member hard cap is reached unless override ticket approved.
- **Operations (Dane):** Needed explicit griefing thresholds (15% churn in 48h) to trigger manual review and advocated for audit trails on quiet-hour bypasses.
- **Engineering (Andrej):** Confirmed telemetry/event coverage required for the goals table and highlighted config surface (`lib/alliances/config.ts`) where caps + rate limits live for per-world tuning.

## 2. Membership Model Decisions (Tasks 02.1–02.2)

- Worlds enforce *exclusive alliance membership* by default. An optional toggle `allowMultiAllianceMembership` can be enabled per-event worlds but requires ops approval because diplomacy, rankings, and chat logic assume exclusivity.
- Multi-membership worlds disable alliance leaderboards and replace them with diplomacy snapshots per membership to avoid duplicate scoring. Chat surfaces merge all joined alliances but tag each message with its source group.
- Decision summary doubles as the rollout brief for engineering/live-ops (see Appendix B) and the `lib/alliances/config.ts` schema exposes the per-world flag consumed by provisioning scripts.
- Rollout note: the exclusivity decision and fallback rules were posted to `#alliances` Slack (weekly update 2024-05-18) and mirrored in the Live-Ops runbook so engineering + ops share the same playbook during provisioning.

## 3. Configurable World Toggles (Tasks 03.1–03.2)

The following knobs live in `lib/alliances/config.ts` as strongly typed entries; defaults apply unless a world override is provided inside `prisma.worldConfig` JSON.

| Toggle | Description | Default | Min | Max | Dependencies |
| --- | --- | --- | --- | --- | --- |
| `creationCost` | Resources (wood/clay/iron/crop) deducted when forming an alliance (speed-normalized) | 450k wood/clay/iron + 250k crop | 0 | 1.2M wood/clay/iron + 750k crop | Creation blocked if founder cannot pay |
| `probationLengthHours` | Time before new members gain full privileges | 72h | 12h | 168h | Governs lifecycle transitions + state machine timers |
| `cooldownBetweenCreationsHours` | Delay before same player/tribe can create another alliance | 168h | 24h | 336h | Prevents shell alliances & griefing |
| `maxMembers` | Hard alliance member cap | 60 | 20 | 75 | Combined with `softCapWarning` to trigger governance dashboard alerts |
| `softCapWarning` | Threshold where recruitment warnings start | 54 | 15 | 70 | Auto-sends alerts + locks questionnaires until leadership review |
| `allowMultiAllianceMembership` | Whether players can join multiple alliances | false | false | true | When true, ranks must specify `scope=PER_ALLIANCE` |
| `creationQuestRequirement` | Minimum quest state or player level before creation | `ADVANCED_ADMINISTRATION` | `TUTORIAL_COMPLETE` | `WONDER_ACCESS` | Validated by `lib/alliances/eligibility.ts` |
| `disbandDebtLimit` | Max outstanding alliance debt to allow disband | 50k resources equivalent | 0 | 200k | Blocks disband (Task 17) |
| `inactiveLeaderTimeoutHours` | Time before auto-promotion triggers | 120h | 48h | 240h | Tied to leader health widgets |
| `announcementQuietHours` | Quiet-hour windows tracked per world | `22:00-08:00 local` | disabled | 12h window | Works with targeting matrix + overrides |
| `questionnaireTemplates` | Available question preset bundles | `ONBOARDING_V1` | n/a | n/a | Stored as references to template registry |
| `autoSeedForumPreset` | Template ID for new alliance forums | `DEFAULT_GLOBAL` | - | - | Changing requires migration/backfill |
| `maxConcurrentInvites` | Outstanding pending invites allowed | `memberCount * 1.5` | memberCount | memberCount * 3 | Rate limiter ensures fairness |
| `maxPendingApplications` | Pending applications before auto-closing recruitment | 100 | 10 | 250 | Alerts sent to recruiters when exceeded |

All toggles are surfaced through `lib/alliances/config.ts`, persisted inside `prisma.worldConfig`, and editable via `app/(admin)/worlds/[id]/alliances`. Provisioning scripts (`scripts/provision-world.ts`, `scripts/preview-alliance-config.ts`) plus the live dashboard consume the same schema, so balance changes propagate consistently across automation and admin tooling.

## 4. Success Metrics, Telemetry, and Dashboards (Tasks 04.1–04.2)

| Metric | Definition | Event Sources | Dashboard Owner |
| --- | --- | --- | --- |
| Member retention | % of members who log in 7, 14, 30 days after joining | `alliance.member_state_changed`, `player.login`, membership snapshot job | Product analytics (Looker `AllianceHealth`) |
| Ops participation | # of governance actions (rank edits, probation reviews) per active alliance | `alliance.rank_changed`, `alliance.probation_reviewed`, `alliance.note_added` | Live-ops command center |
| Moderation load | GM tickets referencing alliances per 1k members | Zendesk tag `alliance`, `alliance.report_submitted` events | Community team |

Telemetry events are declared in `lib/alliances/telemetry.ts` with sampling defaults (100% for safety-critical flows, 20% for bulk read receipts). Dashboards: retention sits in the existing retention board with a new \"Alliances\" section, and governance health is tracked in the Looker dashboard slug `alliances-overview` that is linked from Appendix B.
- Product analytics (owner: Mira) signed off on the KPI instrumentation during the 2024-05-20 review, and the dashboards are pinned in the Alliance Health Looker space so PMs + Live-Ops watch the metrics daily.

## 5. Player-Facing Narrative, Glossary, and Tutorial Beats (Tasks 05.1–05.2)

- Narrative: "Alliances are sworn brotherhoods who share intelligence, supply lines, and sovereignty claims. Leaders weave banners called *Sigils* that bind members under shared obligations." UX copy uses this voice in onboarding modals, templates live in `public/locales/*/alliances.json` (see TODO in localization backlog).
- Glossary entries include *Alliance*, *Council*, *Squad*, *Quiet Hours*, *War Mandate*, and *Diplomatic Snapshot*. `lib/alliances/glossary.ts` exports definitions for use in tooltips.
- Tutorial beats: `app/(onboarding)/alliances/page.tsx` (scaffolded) introduces alliances after Tribe questline, with CTA to entry questionnaire.
- Localization checklist (Appendix C) captures review state per language. Copy avoids idioms and uses placeholders the localization vendor validated.
- Localization QA (done 2024-05-22 with EN/DE/FR reviewers) logged minor tone tweaks that now live in `public/locales/*/alliances.json`; Appendix C records the approvals so future edits re-run the same checklist.

## 6. Entity-Relationship Diagram (Tasks 06.1–06.2)

- Source diagram: `docs/diagrams/alliances-erd.mmd`
- Exported image: `docs/diagrams/alliances-erd.svg`
- Entities covered: `Alliance`, `AllianceMember`, `AllianceRank`, `AlliancePermission`, `AllianceSquad`, `AllianceForum`, `AllianceBoard`, `AllianceThread`, `AllianceAnnouncement`, `AllianceAuditLog`, `AllianceInvite`, `AllianceApplication`.
- Multiplicities embedded inside the mermaid diagram. Hard deletes only occur on dev seeds; production disbands trigger cascades spelled out in Section 7. ERD validated with gameplay + services teams.
- Diagrams live in version control so designers/engineers regenerate via `npm run diagrams:generate` (see `docs/diagrams/README.md` for instructions) and keep rendered SVGs synced with the mermaid source.

## 7. Conceptual Relationships, Ownership, and Deletion (Tasks 07.1–07.2)

- Ownership: Alliances own members, squads, forums, announcements, audit logs, invites, and applications. Squads own membership join rows, boards own threads/posts.
- Soft delete vs hard delete: Members, ranks, permissions, squads, boards, threads, posts, announcements, invites, and applications all use `deletedAt` columns so audit retention remains. Only system-generated defaults (e.g., seeded ranks) can be hard-deleted during migration.
- Cascades when disbanding:
  - Alliance enters `DISBANDING_PENDING` state; new joins are blocked.
  - Once guardrails in §17 pass, alliance transitions to `DISBANDED`, members move to `FORMER_MEMBER`, squads/forum threads soft-delete, announcements expire, audit logs tagged with final summary.
  - Diplomacy snapshots record `visibility=PUBLIC` portion for history, rest archived to immutable storage described in §48.

## 8. Lifecycle States & Diagrams (Tasks 08.1–08.2)

- State definitions live in `lib/alliances/states.ts`.
- Diagrams: `docs/diagrams/alliances-states.mmd` + exported SVG `docs/diagrams/alliances-states.svg` show transitions for announcements, invites, applications, and member status machines.
- Failure/recovery: Each transition callout includes fallback paths (e.g., Invite `SENT → FAILED_VALIDATION` sends manual review; `ACK_REQUIRED → EXPIRED` triggers escalation to council). Recovery instructions mirrored inside the docstrings for orchestrators in `lib/alliances/workflows.ts`.

## 9. Identifier & Normalization Rules (Tasks 09.1–09.3)

- Alliance names: 3–30 printable characters, no leading/trailing whitespace, collapses repeated whitespace to single spaces. Normalization implemented in `lib/alliances/identifiers.ts` with steps: ASCII folding → profanity filter → reserved-name lookup → uniqueness check (case-insensitive).
- Tags: 2–5 uppercase letters/numbers, stored uppercase with hyphen optional. Slugs: kebab-case, generated from name + random suffix when collision occurs.
- Reserved names live in `config/reserved-alliance-names.json`; live-ops maintain the list via `scripts/alliance-reserve-name.ts` and update `docs/development/reserved-names.md` when new entries appear.

## 10. Indexing Strategy (Tasks 10.1–10.3)

- Index requirements captured in Prisma schema additions (`@@index([...])`).
- Tag lookup: `Alliance` has `tag` (unique) and `slug` (indexed). Unread counts rely on compound indexes `(allianceId, memberId, lastReadAt)`.
- Read/write patterns: member rosters query `(allianceId, lastActiveAt)` heavily; invite pagination hits `(allianceId, status, expiresAt)`; unread counters write frequently (`lastReadPostId` upserts) but read as board summaries, so indexes prioritize mixed workloads without duplicating coverage.
- Storage estimates (Appendix D) use 1k-member alliance assumptions, showing ~12MB/forum/year for attachments (S3) + 1.5MB indexes per alliance.
- Migration steps: `prisma/migrations/202407020001_add_alliance_tables/` contains SQL for index creation plus re-index tasks; run using `npx prisma migrate dev --name add_alliance_tables`.

## 11. Creation Flow UX & API Contract (Tasks 11.1–11.2)

- UX wireframes referenced in Figma file `Alliances – Creation v3`; textual breakdown lives later in this section (eligibility gate, naming, cost summary, confirmation) for easy reference.
- Screen flow: (1) Eligibility gate with quest/age/resource checks + tooltip explanations; (2) Identity screen (name, tag, language, emblem) with inline validation + profanity hints; (3) Cost & recruitment settings summary with quiet-hours info; (4) Confirmation modal capturing irreversible choices + acknowledgements. Error states and helper copy are called out per screen in the Figma/UX doc.
- API contract: `POST /api/alliances` (spec in §code) accepts `name`, `tag`, `slug`, `questionnaireTemplate`, `seedPreset`, `quietHours`, `allowAutoJoin`. Response returns `allianceId`, `initialRanks`, `forumSeed`. Sync actions: eligibility check, resource deduction, reserved-name lock. Async actions: forum seeding, analytics events.

## 12. Profanity, Impersonation, Reserved Names (Tasks 12.1–12.2)

- Filtering service: We default to CleanSpeak (self-hosted). `lib/alliances/filters.ts` wraps it and allows environment-level dictionary overrides.
- Tuning knobs: `FILTER_STRENGTH` (medium default), `ALLOWED_OVERRIDE_RANKS` for leaders to bypass after manual review.
- Manual review queue: borderline cases go to `AllianceNameReview` records; SLA (4h) and escalation (community on-call) are documented in Appendix E.

## 13. Auto-Seeded Alliance Defaults (Tasks 13.1–13.2)

- Seed script `scripts/seed-alliance-defaults.ts` provisions ranks (Leader, Council, Captain, Member), squads (Defense, Offense), forum boards (Announcements, Strategy, Diplomacy), MOTD placeholder, entry questionnaire stub.
- Template contents described in `lib/alliances/seeding.ts`, localized via `public/locales/*/alliances.json` entries.
- Migration/backfill plan (Appendix F) outlines steps—create new defaults, run script to backfill `AllianceBaseline` rows, send announcements to notify leaders. Rolling update uses feature flag `allianceDefaultPresetVersion`.

## 14. Entry Questionnaire Templates (Tasks 14.1–14.2)

- Leaders pick from presets `ONBOARDING_V1`, `RAID_FOCUS`, `DEFENSE_SPECIALISTS`, or craft up to 5 custom prompts (200 chars each). Input validated client-side and server-side (`lib/alliances/questionnaires.ts`).
- Templates saved separately from active questionnaires so alliances reopening recruitment can reuse saved sets. Table `AllianceQuestionnaireTemplate` stores history and references allowed ranks for editing.

## 15. Confirmation Summary UX (Tasks 15.1–15.2)

- Summary modal enumerates resource costs, obligations (quiet hours, code of conduct), irreversible choices (tag + slug). Includes anti-fraud warning referencing shared leadership responsibilities and support contact.
- `I acknowledge` checkbox (required) gates final submission; backend enforces `acceptedTermsVersion` storage for audits.

## 16. Leadership Transfer UX & Audit (Tasks 16.1–16.2)

- Flow: Leader selects successor filtered by ranks with `canLead=true`. UI shows warnings about cooldowns and optional MFA prompt (uses existing WebAuthn pipeline when enabled).
- Backend audit payload stored in `AllianceAuditLog` with shape `{ type: "LEADERSHIP_TRANSFER", actorId, recipientId, priorRankId, newRankId, confirmationToken, deviceFingerprint }`.

## 17. Disband Guardrails (Tasks 17.1–17.2)

- Checklist enforced server-side: member count <= 5, outstanding debt <= `disbandDebtLimit`, wonders or world wonders transferred, open wars resolved, treasury zeroed, queued announcements sent/cancelled.
- If blocked, UI lists failing checks with CTA to documentation. Fallback instructions detail asset transfer, debt settlement, leadership fallback triggers.

## 18. Leader Fallback Auto-Promotion (Tasks 18.1–18.2)

- Auto-promotion order: (1) ranks with `isCouncil`, sorted by highest rank weight; (2) longest tenure; (3) highest contribution score (donations + ops participation). Excludes members flagged `isBarredFromLeadership`.
- Simulation harness in `lib/alliances/leadership.ts` runs nightly to verify top candidate and logs to audit stream. Documented scenarios include mass ban, leader deletion, and manual demotion.

## 19. Governance Dashboard (Tasks 19.1–19.2)

- Dashboard components described in `app/(admin)/alliances/governance-dashboard.tsx` spec. Widgets: pending transfers, lone-leader warnings, audit hotspots, recruitment bottlenecks.
- Quick actions: add co-leader, update ranks, send reminder. Dashboard fetches `AllianceGovernanceSummary` view in Prisma.

## 20. Leadership/Disband Audit Events & Admin Review UI (Tasks 20.1–20.2)

- Audit schema covers `beforeState`, `afterState`, `confirmationToken`, `ipAddress`, `deviceInfo`, `geo`. See `lib/alliances/audit.ts` for serializer.
- Admin review UI spec summarized in Appendix G and references Next.js route `app/admin/alliances/[id]/audits/page.tsx`.

## 21. Admission Flows (Tasks 21.1–21.2)

- Invites: recruiter search, canned responses, bulk actions (approve, expire). Applications: queue view with triage filters, auto-reminders at 24h/48h/72h.
- Auto-join: optional if alliance toggle `allowAutoJoin` true and membership < soft cap. Each pathway described in `lib/alliances/admission.ts` orchestrations.

## 22. Member States & Capability Matrix (Tasks 22.1–22.3)

- States: `PROSPECT`, `INVITED`, `APPLICANT`, `PROBATION`, `ACTIVE`, `SUSPENDED`, `BANNED`, `FORMER_MEMBER`, `AUTO_PROMOTION_CANDIDATE`.
- Capability matrix stored as JSON in `lib/alliances/capabilities.ts`; UI surfaces badges and restrictions (e.g., `SUSPENDED` read-only forums).
- Automated transitions (`probation → active`, `inactive → former`) executed by cron job defined in `scripts/process-alliance-states.ts` with audit entries via `AllianceAuditLog`.

## 23. Probation Timers, Auto-Promote Suggestions, Contribution Goals (Tasks 23.1–23.3)

- Contribution metrics aggregated from ops attendance, donations, quest completions; data pipeline described in `lib/alliances/contributions.ts`.
- Notification rules: when probation days > toggle or contributions < threshold, leaders get inbox + email reminder; Appendix H captures the full reviewer checklist.

## 24. Leave/Kick/Ban Confirmations (Tasks 24.1–24.3)

- Modal outlines reason codes (inactivity, conduct, strategic). Each action applies cooldown before rejoining.
- Affected players receive ingame mail with templated explanation referencing support docs.
- Asset checks: cannot kick players currently owning wonders, sitting as wonder guard, or holding alliance debt tokens.

## 25. Private Member Notes (Tasks 25.1–25.2)

- Timeline UI specification lives in Appendix I. Tags per note (discipline, availability, specialty) with search + filter chips.
- Sensitive notes flagged `confidential=true` require ranks with `canViewSensitiveNotes`. All accesses recorded for audit with redact-on-export flag.

## 26. Permission Catalog (Tasks 26.1–26.2)

- Permissions grouped: Governance, Recruitment, Military, Diplomacy, Communications, Moderation. Each has allow/deny toggles defined in `lib/alliances/permissions.ts` with descriptions.
- Version history stored in `AlliancePermissionVersion` table so ops can trace changes across patches.

## 27. Ranks & Overrides (Tasks 27.1–27.3)

- Ranks ordered by weight; inheritance semantics described in `lib/alliances/ranks.ts`. Overrides stored per-member for exceptional cases.
- UI cues display why a member has/doesn’t have permission (bubble listing inherited + overrides). Export to CSV available for offline planning.

## 28. Safety Rails (Tasks 28.1–28.2)

- Simulation API `/api/alliances/ranks/simulate` previews permission changes + warnings (orphaned leadership, privilege escalations). Blocks self-demotion below thresholds unless other leaders present.
- Implementation documented in `lib/alliances/safety.ts`; the UI spec sits in Appendix J for quick iteration notes.

## 29. Rank Management UI (Tasks 29.1–29.2)

- Rank editor supports cloning, templates (from preset library), conflict resolution when merging proposals. Diff view highlights additions/removals.
- Optimistic locking uses `updatedAt` checks; if mismatch occurs we raise `CONFLICT_RETRY_REQUIRED` toast.

## 30. Audit for Rank/Permission Changes (Tasks 30.1–30.2)

- Every change emits `AllianceAuditLog` entry with acting user, target rank/member, field deltas, optional reason text. Filters available per permission category.

## 31. Forum Hierarchy (Tasks 31.1–31.3)

- `AllianceForum` holds metadata, `AllianceBoard` defines visibility rules referencing ranks, squads, or allowlists. Enforcement middleware in `lib/alliances/forums.ts` checks membership + capabilities.
- Admin preview mode toggles role impersonation to verify what each rank sees before publishing changes.

## 32. Board Metadata & Defaults (Tasks 32.1–32.3)

- Metadata includes posting rules (allow polls, attachments), pin limits, archive timers, quotas. Config objects validated with zod schema.
- Defaults defined per template; inheritance flows from parent categories. Documented fallback matrix appended to `lib/alliances/forums.ts`.

## 33. Thread Features (Tasks 33.1–33.2)

- Threads support tags, polls, attachments (max 15MB), mentions, revision history, soft delete. UX for editing retains revisions, diff view accessible to moderators.
- Attachments scanned via ClamAV; allowed types enumerated in config.

## 34. Unread Tracking (Tasks 34.1–34.2)

- Data model uses per-thread pointer table `AllianceThreadReadState` with `lastReadPostId`. For large alliances we shard by member ID mod 16.
- APIs provide summary endpoints `GET /api/alliances/:id/forums/unread` returning board counts without loading threads.

## 35. Search Facets (Tasks 35.1–35.2)

- Search backend defaults to Postgres trigram; Elastic optional for mega-worlds. Permission-aware filtering applies `WHERE visibilityScope` logic to ensure no leaks.
- Advanced search UI supports saved officer queries, pinned filters, and exports to CSV.

## 36. Moderation Toolkit (Tasks 36.1–36.2)

- Toolset: pin, lock, move, merge, split, approve, soft-delete, restore, purge. Locking explains effect to viewers; merges keep authorship timeline referencing original thread ID.

## 37. Member-Level Mutes & Restrictions (Tasks 37.1–37.2)

- Leaders can impose mutes (read-only) or probation write limits with duration presets (12h, 24h, 3d, 7d). Escalation policy auto-increases duration.
- Profiles and posts show mute badges for transparency.

## 38. Content Filters & Moderator Review (Tasks 38.1–38.2)

- Content pipeline uses CleanSpeak + custom heuristics. Auto-hold queue surfaces flagged posts. Analytics report highlight rate, false positives.

## 39. Moderator Action Logging (Tasks 39.1–39.2)

- Actions logged per thread/board with reasons. Timeline UI co-exists with audit log; global export includes these records for compliance.

## 40. Forum Performance Levers (Tasks 40.1–40.2)

- Benchmarks: 1k-member alliance, 20k posts/day, 200 concurrent readers. SLA 150ms median board load, 500ms P95 post load.
- Performance levers: pagination, cursor-based scrolling, lazy loading attachments, nightly archive job streaming to cold storage with monitoring + alerts.

## 41. Announcement Types (Tasks 41.1–41.3)

- Types: Info, Alert, War Mandate, Require-Ack, Emergency Override. Config table maps type → allowed ranks, quotas, quiet-hour bypass rules.
- Emergency workflow documented with on-call escalation path; requires duo approval recorded in audit log.

## 42. Composer Fields (Tasks 42.1–42.2)

- Composer supports severity, targeting, scheduling windows, localization packages, attachments, CTAs. Preview mode shows localized variants + delivery scope summary. Attachment validation ensures safe MIME types.

## 43. Targeting Matrix & Quiet Hours (Tasks 43.1–43.2)

- Targeting matrix allows rank, squad, timezone, contribution tier filters. Quiet hours stored per member; overrides logged with reason + actor.
- Emergency bypass requires justification and logs to `AllianceAnnouncementTargetingLog` for audits.

## 44. Read Receipts & Escalation (Tasks 44.1–44.2)

- Pipeline tracks acknowledgments, surfaces progress bars, and schedules reminders at +4h/+12h with optional escalation to council or SMS (if opted in).

## 45. Notification Channels (Tasks 45.1–45.2)

- Announcements map to in-game mail, push, email. Dedupe ensures single notification per member per announcement; opt-in preferences respected while enforcing require-ack logic.

## 46. Diplomacy Snapshot Module (Tasks 46.1–46.2)

- CRUD UI for relations with visibility limited to Leader/Council/Diplomat ranks. Public profile shows sanitized data; private view includes notes and trust levels.

## 47. Security Measures (Tasks 47.1–47.2)

- Rate limiter tokens per permission scope; analytics track hits/misses for tuning. Report submission flow routes to alliance moderators + global staff when severity high.

## 48. Audit Log Coverage (Tasks 48.1–48.2)

- Filters for time, actor, category; export to CSV/JSON. Retention: 18 months online, 5 years archived to S3 with immutability + bucket policy summarized in Appendix K.

## 49. Concurrency & Idempotency (Tasks 49.1–49.2)

- Version columns used on ranks, announcements, moderation operations. Clients receive `ETag` and must send `If-Match`. Invites/broadcast endpoints accept idempotency tokens stored in Redis fallback to DB when not available.

## 50. Internationalization & Accessibility (Tasks 50.1–50.2)

- Alliance-level language setting drives default forum/announcement locale. UI offers dual time displays (local + alliance time), RTL styles, non-color severity cues, screen-reader annotations for icons.

## Appendices

### Appendix A — Stakeholder Alignment Notes
- Participants: Product (Mira), Ops (Dane), Live-Ops (Shiori), Engineering (Andrej).
- Key decisions: alliances remain exclusive except for limited seasonal worlds; caps fixed at 60/75; spam tolerances defined in §1.
- Open questions tracked: extend diplomacy snapshot to world map overlay (owned by Live-Ops).

### Appendix B — Rollout & Dashboard Summary
- Rollout phases: Dev (feature flags off), Closed Beta (World X1), Global (waves of 3 worlds each). Each phase requires governance dashboard checklist run.
- Communication: Engineering updates weekly via #alliances Slack, Live-Ops uses same summary for shift handoff.
- Dashboards: Looker `alliances-overview` includes tiles for retention, governance actions, moderation load; embed ID recorded here for quick reference.

### Appendix C — Localization Checklist
- Supported languages: en, de, fr, es, ar, tr, zh-Hans.
- Status table maintained via YAML snippet in `lib/alliances/localization-progress.ts` (true/false per locale).
- Each locale requires: glossary review, template translation, QA on RTL languages, audio cues (where applicable).

### Appendix D — Storage Estimates
- Assumptions: 1k members, 12 boards, 15k posts/month, 10% attachments (average 500KB), 180-day audit retention online.
- Results: 12MB/year attachments (after compression), 3MB/year text, 1.5MB indexes, 500MB/year S3 audit archive (compressed JSONL).
- Scaling plan: auto-tier attachments older than 120 days to infrequent access.

### Appendix E — Alliance Name Review Workflow
1. Request enters queue when CleanSpeak returns `borderline`.
2. Ops reviews within 4 hours; statuses: APPROVED, REJECTED, ESCALATED.
3. Escalation pings on-call community; final decision logged to `AllianceNameReview` with agent notes.
4. SLA breach sends reminder to #ops-critical.

### Appendix F — Migration & Backfill Plan
- Step 1: Deploy schema + code (feature flag `alliances.v1`).
- Step 2: Run `npm run migrate:alliances` to add tables.
- Step 3: Execute `npm run seed:alliances-defaults` to add Leader/Council/Captain/Member ranks, default forums, MOTD template.
- Step 4: For existing alliances, run `scripts/backfill-alliance-baselines.ts` to inject defaults (idempotent) and post summary announcement.
- Step 5: Remove flag once monitoring shows healthy metrics.

### Appendix G — Admin Audit Review UI Notes
- Page layout: filter rail (time range, actor, action type), results table with expandable rows, right-side inspector showing before/after JSON.
- Actions: approve escalation, export evidence, mark as resolved. Sensitive data masked unless user has `canViewSensitiveAuditDetails`.

### Appendix H — Probation Review Checklist
- Ensure contribution score >= threshold OR manual note explaining exception.
- Verify probation timer elapsed (>= `probationLengthHours`).
- Confirm member acknowledged alliance code of conduct.
- Choose action: promote to Active, extend probation (requires reason), or remove member.

### Appendix I — Member Notes UX Notes
- Timeline grouped by month with infinite scroll.
- Tags displayed as colored pills (discipline, availability, specialty). Filter chips drive server-side query.
- Sensitive notes display lock icon; clicking requires confirmation + logs reason.

### Appendix J — Rank Editor UX Notes
- Layout: left list of ranks (sortable), right panel with permissions grouped by category.
- Cloning duplicates settings + appends "(copy)" suffix.
- Conflict resolution diff view shows old vs new, highlighting net changes and requiring confirmation comment.

### Appendix K — Audit Storage Policy
- Online storage (Postgres): 18 months, auto-pruned nightly.
- Cold storage (S3 + Glacier): compressed JSONL rotated monthly, bucket uses object lock + 5-year retention.
- Access: only compliance role, requests go through ticket with dual approval.
