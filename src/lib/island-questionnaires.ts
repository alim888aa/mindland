export type IslandQuestion =
  | {
      id: string;
      prompt: string;
      detail?: string;
      kind: "choice";
      options: string[];
    }
  | {
      id: string;
      prompt: string;
      detail?: string;
      kind: "text" | "number" | "time";
      placeholder: string;
      unit?: string;
    };

export type QuestionnaireIsland = {
  id: string;
  name: string;
  visualThemeKey: "health" | "relationships" | "work" | "learning";
  questionnaire?: readonly IslandQuestion[] | null;
};

const commonFinalQuestion = (island: QuestionnaireIsland): IslandQuestion => ({
  id: `${island.id}:note`,
  prompt: `What should ${island.name} remember about today?`,
  detail: "A short note is plenty.",
  kind: "text",
  placeholder: "What happened today?",
});

export const createFallbackIslandQuestionnaire = (
  island: QuestionnaireIsland,
): IslandQuestion[] => {
  switch (island.visualThemeKey) {
    case "health":
      return [
        {
          id: `${island.id}:feeling`,
          prompt: `How did ${island.name} go today?`,
          kind: "choice",
          options: ["Good", "Okay", "Rough"],
        },
        {
          id: `${island.id}:support`,
          prompt: `What supported ${island.name} most?`,
          kind: "text",
          placeholder: "Something I did today…",
        },
        {
          id: `${island.id}:friction`,
          prompt: `Did anything work against ${island.name}?`,
          kind: "choice",
          options: ["No", "A little", "Yes"],
        },
        commonFinalQuestion(island),
      ];
    case "relationships":
      return [
        {
          id: `${island.id}:connection`,
          prompt: `How connected did ${island.name} feel today?`,
          kind: "choice",
          options: ["Very", "Somewhat", "Not much"],
        },
        {
          id: `${island.id}:moment`,
          prompt: "What moment stood out?",
          kind: "text",
          placeholder: "A moment I want to remember…",
        },
        {
          id: `${island.id}:effect`,
          prompt: "How did it leave you feeling?",
          kind: "choice",
          options: ["Lighter", "Neutral", "Drained"],
        },
        commonFinalQuestion(island),
      ];
    case "work":
      return [
        {
          id: `${island.id}:progress`,
          prompt: `Did something move forward in ${island.name}?`,
          kind: "choice",
          options: ["Yes", "A little", "No"],
        },
        {
          id: `${island.id}:focus`,
          prompt: "How long did you get to focus?",
          detail: "An estimate is fine.",
          kind: "number",
          placeholder: "45",
          unit: "minutes",
        },
        {
          id: `${island.id}:friction`,
          prompt: `Did anything make ${island.name} harder today?`,
          kind: "choice",
          options: ["No", "A little", "Yes"],
        },
        commonFinalQuestion(island),
      ];
    case "learning":
      return [
        {
          id: `${island.id}:practice`,
          prompt: `Did you practise or learn for ${island.name} today?`,
          kind: "choice",
          options: ["Yes", "A little", "Not today"],
        },
        {
          id: `${island.id}:time`,
          prompt: "Roughly how long?",
          kind: "number",
          placeholder: "30",
          unit: "minutes",
        },
        {
          id: `${island.id}:insight`,
          prompt: "What clicked for you?",
          kind: "text",
          placeholder: "I understood why…",
        },
        {
          id: `${island.id}:friction`,
          prompt: `Did anything work against ${island.name} today?`,
          kind: "choice",
          options: ["No", "A little", "Yes"],
        },
        commonFinalQuestion(island),
      ];
  }
};

export const createIslandQuestionnaire = (
  island: QuestionnaireIsland,
): IslandQuestion[] => {
  const saved = island.questionnaire;
  if (saved !== null && saved !== undefined && saved.length >= 3) {
    return [...saved];
  }
  return createFallbackIslandQuestionnaire(island);
};
