import { z } from "zod";

export const questionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(3).max(200),
  type: z.enum(["short_text", "long_text", "multi_select", "single_select"]),
  options: z.array(z.string()).optional(),
  required: z.boolean().default(true)
});

export const questionnaireSchema = z.object({
  name: z.string().min(3).max(40),
  questions: z.array(questionSchema).max(5)
});

export type AllianceQuestionnaire = z.infer<typeof questionnaireSchema>;

export function validateQuestionnaire(payload: unknown): AllianceQuestionnaire {
  return questionnaireSchema.parse(payload);
}

export const presetQuestionnaires: Record<string, AllianceQuestionnaire> = {
  ONBOARDING_V1: {
    name: "General Onboarding",
    questions: [
      { id: "timezone", prompt: "What timezone do you play from?", type: "short_text", required: true },
      { id: "playstyle", prompt: "Describe your preferred playstyle", type: "long_text", required: true }
    ]
  },
  RAID_FOCUS: {
    name: "Raid Specialist",
    questions: [
      { id: "raid-hours", prompt: "When are you available for coordinated raids?", type: "short_text", required: true },
      { id: "raid-targets", prompt: "Share notable raid targets you've scouted", type: "long_text", required: false }
    ]
  },
  DEFENSE_SPECIALISTS: {
    name: "Defense Candidates",
    questions: [
      { id: "shield", prompt: "How many defensive troops can you sustain?", type: "short_text", required: true },
      { id: "availability", prompt: "Can you cover quiet hours if needed?", type: "single_select", options: ["Yes", "Sometimes", "No"], required: true }
    ]
  }
};

export function resolveQuestionnaire(presetOrPayload: string | AllianceQuestionnaire): AllianceQuestionnaire {
  if (typeof presetOrPayload === "string") {
    const preset = presetQuestionnaires[presetOrPayload];
    if (!preset) {
      throw new Error(`Unknown questionnaire preset: ${presetOrPayload}`);
    }
    return preset;
  }
  return validateQuestionnaire(presetOrPayload);
}
