export type BioQuestionOption = {
  id: string;
  label: string;
};

export type BioQuestion = {
  id: string;
  prompt: string;
  hint?: string | null;
  kind: "choice" | "text";
  allow_custom: boolean;
  required: boolean;
  options: BioQuestionOption[];
};

export type BioAnswer = {
  option?: string;
  text?: string;
};

export type BioAnswers = Record<string, BioAnswer>;

export type BioAnswerView = {
  id: string;
  prompt: string;
  value: string;
};

export type BioPending = {
  character_id: string;
  character_name: string;
  character_realm: string;
  author_username: string;
  cover_url: string | null;
  answers: BioAnswerView[];
  submitted_at: string | null;
  bio_status: string;
  current_biography: string | null;
  current_personality: string | null;
  current_appearance: string | null;
};

export function emptyAnswers(questions: BioQuestion[]): BioAnswers {
  const out: BioAnswers = {};
  for (const question of questions) out[question.id] = {};
  return out;
}

export function mergeAnswers(questions: BioQuestion[], raw: BioAnswers | null | undefined): BioAnswers {
  const out = emptyAnswers(questions);
  if (!raw) return out;
  for (const question of questions) {
    const item = raw[question.id];
    if (item && typeof item === "object") out[question.id] = { ...item };
  }
  return out;
}

export function questionAnswered(question: BioQuestion, answer: BioAnswer | undefined): boolean {
  const item = answer ?? {};
  if (question.kind === "text") return Boolean(item.text?.trim());
  if (item.option === "custom") return Boolean(item.text?.trim());
  return Boolean(item.option);
}

export function answersComplete(questions: BioQuestion[], answers: BioAnswers): boolean {
  return questions.every((question) => !question.required || questionAnswered(question, answers[question.id]));
}

export function firstUnansweredIndex(questions: BioQuestion[], answers: BioAnswers): number {
  const index = questions.findIndex((question) => question.required && !questionAnswered(question, answers[question.id]));
  return index === -1 ? Math.max(questions.length - 1, 0) : index;
}
