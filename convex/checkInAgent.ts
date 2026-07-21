import { openai } from "@ai-sdk/openai";
import { Agent } from "@convex-dev/agent";

import { components } from "./_generated/api";
import { defaultCheckInInstructions } from "./checkInPrompt";

export const dailyCheckInOpeningMessage =
  "How did today go? Tell me what mattered, or choose an island to check in with.";

export const dailyCheckInAgent = new Agent(components.agent, {
  name: "Mindland Daily Guide",
  languageModel: openai.responses("gpt-5.6-luna"),
  instructions: defaultCheckInInstructions,
  contextOptions: {
    recentMessages: 40,
  },
  storageOptions: {
    saveMessages: "promptAndOutput",
  },
});
