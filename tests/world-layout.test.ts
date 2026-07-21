import assert from "node:assert/strict";
import test from "node:test";

import {
  createWorldLayout,
  getMinimumTerritoryClearance,
  getTerritoryArea,
  getTerritoryCentroid,
  WORLD_LAYOUT_PROTOTYPE,
  type WorldPoint,
} from "../src/lib/world-layout.ts";

const TERRITORY_RADIUS = 1.12;
const makeInputs = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: `island-${index}`,
    territoryRadius: TERRITORY_RADIUS,
  }));

const polygonsOverlap = (first: readonly WorldPoint[], second: readonly WorldPoint[]) => {
  const hasSeparatingAxis = (points: readonly WorldPoint[]) =>
    points.some((point, index) => {
      const next = points[(index + 1) % points.length];
      const axis = { x: -(next.z - point.z), z: next.x - point.x };
      const project = (polygon: readonly WorldPoint[]) =>
        polygon.reduce(
          (range, value) => {
            const projection = value.x * axis.x + value.z * axis.z;
            return {
              minimum: Math.min(range.minimum, projection),
              maximum: Math.max(range.maximum, projection),
            };
          },
          { minimum: Infinity, maximum: -Infinity },
        );
      const firstRange = project(first);
      const secondRange = project(second);
      return (
        firstRange.maximum <= secondRange.minimum + 0.000001 ||
        secondRange.maximum <= firstRange.minimum + 0.000001
      );
    });
  return !hasSeparatingAxis(first) && !hasSeparatingAxis(second);
};

const shareFullEdge = (first: readonly WorldPoint[], second: readonly WorldPoint[]) => {
  const coordinateKey = (value: number) =>
    Math.abs(value) < 0.0000005 ? "0.000000" : value.toFixed(6);
  const edgeKeys = (points: readonly WorldPoint[]) =>
    points.map((point, index) => {
      const next = points[(index + 1) % points.length];
      return [
        `${coordinateKey(point.x)}:${coordinateKey(point.z)}`,
        `${coordinateKey(next.x)}:${coordinateKey(next.z)}`,
      ].sort().join("|");
    });
  const firstEdges = new Set(edgeKeys(first));
  return edgeKeys(second).some((edge) => firstEdges.has(edge));
};

for (let count = 3; count <= 20; count += 1) {
  test(`${count} islands receive equal, centered, non-overlapping territories`, () => {
    const layout = createWorldLayout(makeInputs(count));
    const areas = layout.territories.map((territory) => getTerritoryArea(territory.points));
    assert.ok(Math.max(...areas) - Math.min(...areas) < 0.000001);

    for (const territory of layout.territories) {
      const item = layout.items.find((candidate) => candidate.id === territory.id);
      assert.ok(item);
      const center = getTerritoryCentroid(territory.points);
      assert.ok(Math.hypot(item.position.x - center.x, item.position.z - center.z) < 0.000001);
    }

    for (let first = 0; first < layout.territories.length; first += 1) {
      for (let second = first + 1; second < layout.territories.length; second += 1) {
        assert.equal(
          polygonsOverlap(layout.territories[first].points, layout.territories[second].points),
          false,
        );
      }
    }

    const reached = new Set([0]);
    for (let pass = 0; pass < layout.territories.length; pass += 1) {
      layout.territories.forEach((territory, index) => {
        if (reached.has(index)) return;
        const touchesReachedCell = [...reached].some((reachedIndex) =>
          shareFullEdge(territory.points, layout.territories[reachedIndex].points),
        );
        if (touchesReachedCell) reached.add(index);
      });
    }
    assert.equal(reached.size, count, "territory cells should form one shared-edge cluster");
    assert.ok(
      getMinimumTerritoryClearance(layout.items) >=
        WORLD_LAYOUT_PROTOTYPE.collisionGap - 0.000001,
    );

    const reserve =
      TERRITORY_RADIUS *
      WORLD_LAYOUT_PROTOTYPE.territoryFootprintScale *
      2;
    assert.ok(Math.abs(layout.territoryBounds.minX - layout.bounds.minX - reserve) < 0.001);
    assert.ok(Math.abs(layout.bounds.maxX - layout.territoryBounds.maxX - reserve) < 0.001);
    assert.ok(Math.abs(layout.territoryBounds.minZ - layout.bounds.minZ - reserve) < 0.001);
    assert.ok(Math.abs(layout.bounds.maxZ - layout.territoryBounds.maxZ - reserve) < 0.001);
    assert.deepEqual(layout, createWorldLayout(makeInputs(count)));
  });
}

test("layout is deterministic", () => {
  const inputs = makeInputs(20);
  assert.deepEqual(createWorldLayout(inputs), createWorldLayout(inputs));
});

test("territory footprint is enlarged by the approved tuning factor", () => {
  const layout = createWorldLayout(makeInputs(1));
  const width = layout.territoryBounds.maxX - layout.territoryBounds.minX;
  const expectedHexagonRadius =
    (TERRITORY_RADIUS *
      WORLD_LAYOUT_PROTOTYPE.territoryFootprintScale *
      2 +
      WORLD_LAYOUT_PROTOTYPE.collisionGap) /
    Math.sqrt(3);
  assert.ok(Math.abs(width - expectedHexagonRadius * Math.sqrt(3)) < 0.000001);
});

test("three islands form a centered two-above-one-below triangle", () => {
  const layout = createWorldLayout(makeInputs(3));
  const [upperLeft, upperRight, lowerCenter] = layout.items.map(
    (item) => item.position,
  );

  assert.ok(upperLeft.z < lowerCenter.z);
  assert.ok(upperRight.z < lowerCenter.z);
  assert.ok(upperLeft.x < lowerCenter.x);
  assert.ok(upperRight.x > lowerCenter.x);
  assert.ok(Math.abs(upperLeft.z - upperRight.z) < 0.000001);
  assert.ok(Math.abs(lowerCenter.x) < 0.000001);

  const clusterCenter = layout.items.reduce(
    (center, item) => ({
      x: center.x + item.position.x / layout.items.length,
      z: center.z + item.position.z / layout.items.length,
    }),
    { x: 0, z: 0 },
  );
  assert.ok(Math.hypot(clusterCenter.x, clusterCenter.z) < 0.000001);
});

test("five islands use a center-and-four-neighbours star", () => {
  const layout = createWorldLayout(makeInputs(5));
  const center = layout.items[0].position;
  const expectedDistance =
    TERRITORY_RADIUS *
      WORLD_LAYOUT_PROTOTYPE.territoryFootprintScale *
      2 +
    WORLD_LAYOUT_PROTOTYPE.collisionGap;
  assert.ok(Math.hypot(center.x, center.z) < 0.000001);
  for (const item of layout.items.slice(1)) {
    assert.ok(
      Math.abs(Math.hypot(item.position.x, item.position.z) - expectedDistance) < 0.000001,
    );
  }
});

test("a later related island receives an adjacent cell", () => {
  const inputs = makeInputs(8).map((input, index) =>
    index === 7 ? { ...input, relatedTo: ["island-0"] } : input,
  );
  const layout = createWorldLayout(inputs);
  const first = layout.items[0].position;
  const related = layout.items[7].position;
  const expectedDistance =
    TERRITORY_RADIUS *
      WORLD_LAYOUT_PROTOTYPE.territoryFootprintScale *
      2 +
    WORLD_LAYOUT_PROTOTYPE.collisionGap;
  assert.ok(
    Math.abs(Math.hypot(first.x - related.x, first.z - related.z) - expectedDistance) <
      0.000001,
  );
});

test("a late relationship never moves already arranged islands", () => {
  const baseline = createWorldLayout(makeInputs(9));
  const withLateRelationship = createWorldLayout(
    makeInputs(9).map((input, index) =>
      index === 8 ? { ...input, relatedTo: ["island-0"] } : input,
    ),
  );

  assert.deepEqual(
    withLateRelationship.items.slice(0, 8).map((item) => item.position),
    baseline.items.slice(0, 8).map((item) => item.position),
  );
});

test("neutral ocean reserves one full territory diameter", () => {
  const layout = createWorldLayout(makeInputs(5));
  const expected =
    TERRITORY_RADIUS *
    WORLD_LAYOUT_PROTOTYPE.territoryFootprintScale *
    2;
  assert.ok(Math.abs(layout.territoryBounds.minX - layout.bounds.minX - expected) < 0.001);
  assert.ok(Math.abs(layout.bounds.maxX - layout.territoryBounds.maxX - expected) < 0.001);
  assert.ok(Math.abs(layout.territoryBounds.minZ - layout.bounds.minZ - expected) < 0.001);
  assert.ok(Math.abs(layout.bounds.maxZ - layout.territoryBounds.maxZ - expected) < 0.001);
});
