import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const generationSources = [
  "convex/checkInGeneration.ts",
  "convex/onboardingInterviewGeneration.ts",
  "convex/activityInterpretation.ts",
  "convex/structuredCheckIn.ts",
];

test("AI generation failures never log raw error messages or payloads", () => {
  for (const sourcePath of generationSources) {
    const source = readFileSync(sourcePath, "utf8");

    assert.doesNotMatch(source, /error\.message/);
    assert.doesNotMatch(source, /console\.error\([^)]*,\s*error\s*\)/s);
    assert.match(source, /logSafeFailure/);
  }
});

test("the shared safe logger emits only a stable category", () => {
  const source = readFileSync("convex/safeErrorLog.ts", "utf8");

  assert.doesNotMatch(source, /error\.message/);
  assert.doesNotMatch(source, /console\.error\([^)]*,\s*error\s*\)/s);
  assert.match(
    source,
    /console\.error\(event, \{ category: safeErrorCategory\(error\) \}\)/,
  );
});
