import assert from "node:assert/strict";
import test from "node:test";

import { fallbackVisualThemeKey } from "../convex/islandCatalogue.ts";
import {
  materializeIslandInputs,
  missingMaterializedIslandInputs,
} from "../convex/islandMaterialization.ts";
import type { Id } from "../convex/_generated/dataModel.d.ts";

const interviewId = "interview-123" as Id<"onboardingInterviews">;
const candidates = [
  {
    name: " Sleep ",
    purpose: " Rest consistently ",
    sourceContext: " Better evenings matter. ",
    visualThemeKey: "health" as const,
  },
  {
    name: "Guitar",
    purpose: "Practice songs",
    sourceContext: "Wants a creative habit.",
    visualThemeKey: "learning" as const,
  },
];

test("materialized island keys and visual seeds are stable", () => {
  const first = materializeIslandInputs(interviewId, candidates);
  const second = materializeIslandInputs(interviewId, candidates);

  assert.deepEqual(first, second);
  assert.deepEqual(
    first.map((island) => island.islandKey),
    ["interview-123:0", "interview-123:1"],
  );
  assert.ok(first.every((island) => Number.isInteger(island.visualSeed)));
  assert.equal(first[0].name, "Sleep");
  assert.equal(first[0].purpose, "Rest consistently");
});

test("legacy topic fallback stays inside the approved catalogue", () => {
  assert.equal(fallbackVisualThemeKey("Close friends"), "relationships");
  assert.equal(fallbackVisualThemeKey("Career"), "work");
  assert.equal(fallbackVisualThemeKey("Study"), "learning");
  assert.equal(fallbackVisualThemeKey("Sleep"), "health");
});

test("a legacy revealed interview backfills every missing island", () => {
  const expected = materializeIslandInputs(interviewId, candidates);

  assert.deepEqual(
    missingMaterializedIslandInputs(expected, new Set()),
    expected,
  );
});

test("retries skip existing rows and repair a partial materialization", () => {
  const expected = materializeIslandInputs(interviewId, candidates);
  const afterPartialAttempt = new Set([expected[0].islandKey]);
  const missingAfterPartialAttempt = missingMaterializedIslandInputs(
    expected,
    afterPartialAttempt,
  );

  assert.deepEqual(missingAfterPartialAttempt, [expected[1]]);

  const afterSuccessfulRetry = new Set(
    expected.map((island) => island.islandKey),
  );
  assert.deepEqual(
    missingMaterializedIslandInputs(expected, afterSuccessfulRetry),
    [],
  );
});
