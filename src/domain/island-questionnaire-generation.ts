import type { IslandQuestion } from "../lib/island-questionnaires.ts";

export type QuestionnaireGenerationIsland = {
  id: string;
  islandKey: string;
};

export type GeneratedQuestion = {
  prompt: string;
  detail: string | null;
  kind: "choice" | "text" | "number" | "time";
  options: string[];
  placeholder: string | null;
  unit: string | null;
};

export type GeneratedIslandQuestionnaire = {
  islandKey: string;
  questions: GeneratedQuestion[];
};

export type GeneratedQuestionnaireBatch = {
  questionnaires: GeneratedIslandQuestionnaire[];
};

const clean = (value: string) => value.trim();

function validQuestion(value: unknown): value is GeneratedQuestion {
  if (typeof value !== "object" || value === null) return false;
  const question = value as Record<string, unknown>;
  const kind = question.kind;
  const options = question.options;
  const placeholder = question.placeholder;
  const unit = question.unit;
  if (
    typeof question.prompt !== "string" ||
    clean(question.prompt).length === 0 ||
    question.prompt.length > 180 ||
    (question.detail !== null &&
      (typeof question.detail !== "string" || question.detail.length > 180)) ||
    (kind !== "choice" &&
      kind !== "text" &&
      kind !== "number" &&
      kind !== "time") ||
    !Array.isArray(options) ||
    options.some(
      (option) =>
        typeof option !== "string" ||
        clean(option).length === 0 ||
        option.length > 48,
    ) ||
    (placeholder !== null && typeof placeholder !== "string") ||
    (unit !== null && typeof unit !== "string")
  ) {
    return false;
  }
  if (kind === "choice") {
    return (
      options.length >= 2 &&
      options.length <= 5 &&
      placeholder === null &&
      unit === null
    );
  }
  return (
    options.length === 0 &&
    typeof placeholder === "string" &&
    clean(placeholder).length > 0 &&
    placeholder.length <= 80 &&
    (unit === null || unit.length <= 32)
  );
}

export function parseGeneratedQuestionnaireBatch(
  value: unknown,
  islands: readonly QuestionnaireGenerationIsland[],
) {
  if (typeof value !== "object" || value === null) return null;
  const questionnaires = (value as Record<string, unknown>).questionnaires;
  if (!Array.isArray(questionnaires) || questionnaires.length !== islands.length) {
    return null;
  }
  const expectedKeys = new Set(islands.map((island) => island.islandKey));
  const seenKeys = new Set<string>();
  const parsed: GeneratedIslandQuestionnaire[] = [];
  for (const value of questionnaires) {
    if (typeof value !== "object" || value === null) return null;
    const questionnaire = value as Record<string, unknown>;
    if (
      typeof questionnaire.islandKey !== "string" ||
      !expectedKeys.has(questionnaire.islandKey) ||
      seenKeys.has(questionnaire.islandKey) ||
      !Array.isArray(questionnaire.questions) ||
      questionnaire.questions.length < 3 ||
      questionnaire.questions.length > 7 ||
      questionnaire.questions.some((question) => !validQuestion(question))
    ) {
      return null;
    }
    seenKeys.add(questionnaire.islandKey);
    parsed.push({
      islandKey: questionnaire.islandKey,
      questions: questionnaire.questions.map((question) => {
        const valid = question as GeneratedQuestion;
        return {
          prompt: clean(valid.prompt),
          detail: valid.detail === null ? null : clean(valid.detail),
          kind: valid.kind,
          options: valid.options.map(clean),
          placeholder:
            valid.placeholder === null ? null : clean(valid.placeholder),
          unit: valid.unit === null ? null : clean(valid.unit),
        };
      }),
    });
  }
  return seenKeys.size === expectedKeys.size
    ? { questionnaires: parsed } satisfies GeneratedQuestionnaireBatch
    : null;
}

export function materializeGeneratedQuestions(
  islandId: string,
  questions: readonly GeneratedQuestion[],
): IslandQuestion[] {
  return questions.map((question, index) => {
    const base = {
      id: `${islandId}:agent:${index + 1}`,
      prompt: question.prompt,
      ...(question.detail ? { detail: question.detail } : {}),
    };
    if (question.kind === "choice") {
      return {
        ...base,
        kind: "choice",
        options: [...question.options],
      };
    }
    return {
      ...base,
      kind: question.kind,
      placeholder: question.placeholder ?? "Your answer…",
      ...(question.unit ? { unit: question.unit } : {}),
    };
  });
}
