import type { IslandId } from "../data/islands.ts";
import type { IslandQuestion } from "./island-questionnaires.ts";

export type QuestionnaireAnswerRecord = {
  questionId: string;
  prompt: string;
  kind: IslandQuestion["kind"];
  skipped: boolean;
  answer: string | null;
};

export type QuestionnaireSubmission = {
  islandId: IslandId;
  answers: QuestionnaireAnswerRecord[];
};

export function questionnaireAnswer(
  question: IslandQuestion,
  answer: string | null,
  skipped: boolean,
): QuestionnaireAnswerRecord {
  return {
    questionId: question.id,
    prompt: question.prompt,
    kind: question.kind,
    skipped,
    answer,
  };
}

export function answersForStructuredCheckIn(
  answers: readonly QuestionnaireAnswerRecord[],
) {
  return answers.map((answer) => ({
    questionId: answer.questionId,
    question: [
      answer.prompt,
      `Input kind: ${answer.kind}`,
      `Skipped: ${answer.skipped ? "yes" : "no"}`,
    ].join("\n"),
    answer: answer.answer,
  }));
}
