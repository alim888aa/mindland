import { jsonSchema } from "ai";

import type { ActionCtx } from "./_generated/server";
import {
  isIslandVisualThemeKey,
  type IslandVisualThemeKey,
} from "./islandCatalogue";
import { onboardingAgent } from "./onboardingAgent";

type OnboardingDiscovery = {
  candidateIslands: Array<{
    name: string;
    purpose: string;
    sourceContext: string;
    visualThemeKey: IslandVisualThemeKey;
  }>;
  progressPercent: number;
  readyToCreate: boolean;
};

function validateDiscovery(value: unknown) {
  if (typeof value !== "object" || value === null) {
    return { success: false as const, error: new Error("Expected an object.") };
  }

  const candidate = value as Record<string, unknown>;
  const islands = candidate.candidateIslands;
  const progress = candidate.progressPercent;
  const ready = candidate.readyToCreate;

  if (
    !Array.isArray(islands) ||
    islands.length > 8 ||
    islands.some(
      (island) => {
        if (typeof island !== "object" || island === null) return true;
        const value = island as Record<string, unknown>;
        return (
          typeof value.name !== "string" ||
          value.name.trim().length === 0 ||
          value.name.length > 40 ||
          typeof value.purpose !== "string" ||
          value.purpose.trim().length === 0 ||
          value.purpose.length > 240 ||
          typeof value.sourceContext !== "string" ||
          value.sourceContext.trim().length === 0 ||
          value.sourceContext.length > 500 ||
          !isIslandVisualThemeKey(value.visualThemeKey)
        );
      },
    ) ||
    typeof progress !== "number" ||
    !Number.isFinite(progress) ||
    progress < 0 ||
    progress > 100 ||
    typeof ready !== "boolean" ||
    (ready && (islands.length === 0 || Math.round(progress) !== 100)) ||
    (!ready && Math.round(progress) >= 100)
  ) {
    return {
      success: false as const,
      error: new Error("The onboarding discovery result was invalid."),
    };
  }

  return {
    success: true as const,
    value: {
      candidateIslands: islands.map((island) => {
        const value = island as {
          name: string;
          purpose: string;
          sourceContext: string;
          visualThemeKey: IslandVisualThemeKey;
        };
        return {
          name: value.name.trim(),
          purpose: value.purpose.trim(),
          sourceContext: value.sourceContext.trim(),
          visualThemeKey: value.visualThemeKey,
        };
      }),
      progressPercent: Math.round(progress),
      readyToCreate: ready,
    },
  };
}

const discoverySchema = jsonSchema<OnboardingDiscovery>(
  {
    type: "object",
    additionalProperties: false,
    required: ["candidateIslands", "progressPercent", "readyToCreate"],
    properties: {
      candidateIslands: {
        type: "array",
        maxItems: 8,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "purpose", "sourceContext", "visualThemeKey"],
          properties: {
            name: { type: "string", minLength: 1, maxLength: 40 },
            purpose: { type: "string", minLength: 1, maxLength: 240 },
            sourceContext: { type: "string", minLength: 1, maxLength: 500 },
            visualThemeKey: {
              type: "string",
              enum: ["health", "relationships", "work", "learning"],
            },
          },
        },
      },
      progressPercent: {
        type: "number",
        minimum: 0,
        maximum: 100,
      },
      readyToCreate: {
        type: "boolean",
      },
    },
  },
  { validate: validateDiscovery },
);

const discoveryPrompt = `
Privately interpret the onboarding conversation so far.

Return the meaningful specific life areas that are clear enough to become islands. For each one, provide a short ordinary name, a concise purpose explaining what the person wants to grow, and a sourceContext summary grounded in what they shared. Never use poetic, invented, mysterious, or branded names. Keep the person's distinctions: split a broad topic into its specific parts when the conversation shows those parts matter independently. Do not add filler just to reach a target count.

Choose exactly one supported visualThemeKey for each island: health for green mixed nature, relationships for warm blossom nature, work for restrained pine nature, or learning for sunny palm nature. Select the closest semantic fit from this catalogue. The catalogue key controls visuals only and must not change the island's name or purpose.

Choose progressPercent as your honest estimate of how well Mindland understands what matters to this person and why. You control the progress. It may pause when clarification is needed. Set readyToCreate only after the visible conversation has reached a clear summary, the person has had a chance to correct it, and there is at least one well-supported island. Use 100 progress only when readyToCreate is true.

This interpretation is private metadata. Do not produce conversational text.
`.trim();

export async function discoverOnboardingState(
  ctx: ActionCtx,
  options: {
    threadId: string;
    ownerTokenIdentifier: string;
  },
) {
  const result = await onboardingAgent.generateObject(
    ctx,
    {
      threadId: options.threadId,
      userId: options.ownerTokenIdentifier,
    },
    {
      prompt: discoveryPrompt,
      schema: discoverySchema,
      schemaName: "MindlandOnboardingDiscovery",
      schemaDescription:
        "Private island candidates, adaptive interview progress, and readiness.",
      providerOptions: {
        openai: {
          reasoningEffort: "low",
          store: false,
        },
      },
    },
    {
      contextOptions: {
        recentMessages: 30,
      },
      storageOptions: {
        saveMessages: "none",
      },
    },
  );

  return result.object;
}
