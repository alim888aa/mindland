import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sourceUrl = new URL(
  "../src/components/direct-island-world.tsx",
  import.meta.url,
);

test("WebGPU device loss only tears down the active rendering generation", async () => {
  const source = await readFile(sourceUrl, "utf8");

  assert.match(source, /private renderingGeneration = 0/);
  assert.match(
    source,
    /private disposeRenderingResources[\s\S]*?this\.renderingGeneration \+= 1/,
    "disposing resources must invalidate pending GPU callbacks",
  );
  assert.match(
    source,
    /const generation = \+\+this\.renderingGeneration/,
    "each startup attempt must own a distinct rendering generation",
  );
  assert.match(
    source,
    /backend\.device\?\.lost[\s\S]*?this\.renderingGeneration !== generation[\s\S]*?this\.renderer !== renderer[\s\S]*?this\.world !== world/,
    "device loss must ignore stale or already disposed renderers",
  );
  assert.match(
    source,
    /this\.observeDeviceLoss\(activeRenderer, activeWorld, generation\)/,
    "the active GPU device must be observed after renderer initialization",
  );
  assert.match(
    source,
    /activeRenderer\.setAnimationLoop\(\(time\) => \{\s*if \(this\.renderingGeneration !== generation\) return/,
    "stale animation callbacks must stop using disposed resources",
  );
});
