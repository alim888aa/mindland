import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const overlayUrl = new URL(
  "../src/components/map-overlay.tsx",
  import.meta.url,
);
const worldUrl = new URL(
  "../src/components/direct-island-world.tsx",
  import.meta.url,
);

test("visible island land has a direct touch target", async () => {
  const overlay = await readFile(overlayUrl, "utf8");

  assert.match(overlay, /key=\{`land-\$\{island\.id\}`\}/);
  assert.match(overlay, /onPress=\{\(\) => onSelect\(island\.id\)\}/);
  assert.match(overlay, /Math\.max\(72, 76 \* worldView\.labelScale/);
});

test("the map no longer uses a territory-wide press surface", async () => {
  const world = await readFile(worldUrl, "utf8");

  assert.doesNotMatch(world, /handleTerritoryPress/);
  assert.doesNotMatch(world, /selectTerritoryAtScreenPoint/);
});
