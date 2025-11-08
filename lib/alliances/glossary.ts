export type GlossaryKey =
  | "alliance"
  | "council"
  | "squad"
  | "quiet-hours"
  | "war-mandate"
  | "diplomatic-snapshot";

const glossary: Record<GlossaryKey, string> = {
  alliance: "A sovereign collective of players bound by shared goals and obligations.",
  council: "Leaders entrusted with governance duties such as rank approvals and diplomacy.",
  squad: "A sub-group within the alliance focused on a particular discipline (offense, defense, ops).",
  "quiet-hours": "Predetermined times when announcements throttle to protect member downtime.",
  "war-mandate": "High-priority announcement that mobilizes squads for coordinated strikes.",
  "diplomatic-snapshot": "A curated view of alliance relations (allies, rivals) with visibility controls."
};

export function explain(key: GlossaryKey): string {
  const entry = glossary[key];
  if (!entry) throw new Error(`Missing glossary entry for ${key}`);
  return entry;
}
