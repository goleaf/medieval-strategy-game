export type SecurityQuestionDefinition = {
  id: string
  prompt: string
}

export const SECURITY_QUESTIONS: SecurityQuestionDefinition[] = [
  { id: "first_village", prompt: "What was the name of your first village?" },
  { id: "favorite_hero", prompt: "Who is your favorite hero or unit?" },
  { id: "childhood_nickname", prompt: "What was your childhood nickname?" },
  { id: "first_pet", prompt: "What was the name of your first pet?" },
  { id: "mother_birthplace", prompt: "Where was your mother born?" },
  { id: "first_school", prompt: "What is the name of your first school?" },
]

export function getSecurityQuestion(id: string) {
  return SECURITY_QUESTIONS.find(question => question.id === id)
}
