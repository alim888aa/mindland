import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sourceUrl = new URL(
  "../src/components/direct-island-world.tsx",
  import.meta.url,
);

test("native gesture builders use stable bound JavaScript handlers", async () => {
  const source = await readFile(sourceUrl, "utf8");

  const mappings = [
    ["onStart", "handlePanStart"],
    ["onUpdate", "handlePanUpdate"],
    ["onFinalize", "handlePanFinalize"],
    ["onStart", "handlePinchStart"],
    ["onUpdate", "handlePinchUpdate"],
    ["onFinalize", "handlePinchFinalize"],
    ["onEnd", "handleHomeEnd"],
  ] as const;

  const registrations = source.match(
    /\.(?:onStart|onUpdate|onEnd|onFinalize)\(/g,
  );
  assert.equal(registrations?.length, mappings.length);

  for (const [builderMethod, handler] of mappings) {
    assert.match(
      source,
      new RegExp(`private\\s+${handler}\\s*=\\s*\\([^)]*\\)\\s*=>`),
      `${handler} must remain a lexically bound class arrow field`,
    );
    assert.match(
      source,
      new RegExp(`\\.${builderMethod}\\(this\\.${handler}\\)`),
      `${builderMethod} must register ${handler} by reference`,
    );
  }
});

test("a recognized pan cancels double-tap home", async () => {
  const source = await readFile(sourceUrl, "utf8");

  assert.match(
    source,
    /Gesture\.Race\(this\.panGesture, this\.homeGesture\)/,
  );
});
