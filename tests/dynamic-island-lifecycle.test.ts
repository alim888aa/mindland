import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as THREE from "three/webgpu";

import { disposeThreeScene } from "../src/lib/three-scene-disposal.ts";

test("scene disposal releases each GPU resource once and clears the scene", () => {
  const scene = new THREE.Scene();
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const texture = new THREE.Texture();
  const material = new THREE.MeshBasicMaterial({ map: texture });
  scene.add(new THREE.Mesh(geometry, material));
  scene.add(new THREE.Mesh(geometry, material));
  let geometryDisposals = 0;
  let materialDisposals = 0;
  let textureDisposals = 0;
  geometry.addEventListener("dispose", () => geometryDisposals += 1);
  material.addEventListener("dispose", () => materialDisposals += 1);
  texture.addEventListener("dispose", () => textureDisposals += 1);

  disposeThreeScene(scene);

  assert.equal(scene.children.length, 0);
  assert.equal(geometryDisposals, 1);
  assert.equal(materialDisposals, 1);
  assert.equal(textureDisposals, 1);
});

test("world remount lifecycle disposes completed and abandoned scenes", () => {
  const source = readFileSync(
    new URL("../src/components/direct-island-world.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    source,
    /componentWillUnmount\(\)[\s\S]*this\.disposeRenderingResources\(\)/,
  );
  assert.match(
    source,
    /disposeRenderingResources[\s\S]*world\?\.dispose\(\)[\s\S]*renderer\?\.dispose\(\)/,
  );
  assert.match(
    source,
    /if \(!this\.mounted \|\| this\.renderer\) \{\s*this\.disposeRenderingResources\(null, world\)/,
  );
  assert.match(
    source,
    /if \(!this\.mounted\) \{\s*this\.disposeRenderingResources\(renderer, world\)/,
  );
});

test("world identity preserves UI state while visual refreshes rebuild only WebGPU", () => {
  const source = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
  assert.match(
    source,
    /<WorldOwnedExperience\s+key=\{islandWorld\.identityKey\}/,
  );
  assert.match(source, /<DirectIslandWorld\s+key=\{islandWorld\.key\}/);
  assert.match(source, /<OnboardingInterviewContainer\s+onReveal=/);
  assert.match(source, /readyWorldKey=\{readyWorldKey\}/);
  assert.match(source, /worldKey=\{islandWorld\.key\}/);
  assert.match(
    source,
    /onReveal=\{\(\) => setOnboardingOverlayVisible\(false\)\}/,
  );
  assert.match(source, /<LegacyIslandRepair interviewId=/);
  assert.doesNotMatch(source, /useEffect/);
});
