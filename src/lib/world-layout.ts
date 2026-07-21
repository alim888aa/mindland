export type WorldPoint = {
  x: number;
  z: number;
};

export type WorldBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type WorldLayoutInput<Id extends string = string> = {
  id: Id;
  preferredPosition?: WorldPoint;
  relatedTo?: readonly Id[];
  territoryRadius: number;
};

export type WorldLayoutItem<Id extends string = string> = WorldLayoutInput<Id> & {
  position: WorldPoint;
};

export type TerritoryCell<Id extends string = string> = {
  id: Id;
  points: WorldPoint[];
};

export type WorldLayout<Id extends string = string> = {
  bounds: WorldBounds;
  territoryBounds: WorldBounds;
  items: WorldLayoutItem<Id>[];
  territories: TerritoryCell<Id>[];
};

export const getMinimumTerritoryClearance = <Id extends string>(
  items: readonly WorldLayoutItem<Id>[],
) => {
  let minimum = Infinity;
  for (let firstIndex = 0; firstIndex < items.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < items.length; secondIndex += 1) {
      const first = items[firstIndex];
      const second = items[secondIndex];
      minimum = Math.min(
        minimum,
        Math.hypot(
          second.position.x - first.position.x,
          second.position.z - first.position.z,
        ) - first.territoryRadius - second.territoryRadius,
      );
    }
  }
  return minimum;
};

// Product-sized values remain together while the visual scale is tuned.
export const WORLD_LAYOUT_PROTOTYPE = {
  emptyWidth: 9.2,
  emptyDepth: 12,
  collisionGap: 0.18,
  relatedDistance: 2.42,
  futureIslandReserveInTerritoryDiameters: 1,
  territoryFootprintScale: 1.25,
} as const;

type LatticePoint = readonly [column: number, row: number];

const HEX_DIRECTIONS: readonly LatticePoint[] = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];

// Connected equal-cell shapes keep small worlds compact. Five deliberately
// uses the approved center-and-four-neighbours star.
const LATTICE_TEMPLATES: Record<number, readonly LatticePoint[]> = {
  1: [[0, 0]],
  2: [[0, 0], [1, 0]],
  // A shared-edge triangle reads as a small circular cluster in portrait:
  // two cells above and one centered below after the layout is recentered.
  3: [[-1, 0], [0, 0], [-1, 1]],
  4: [[0, 0], [1, 0], [0, 1], [1, 1]],
  5: [[0, 0], [0, -1], [1, 0], [0, 1], [-1, 0]],
  6: [[-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1], [1, 1]],
  7: [[0, 0], [0, -1], [1, 0], [0, 1], [-1, 0], [1, -1], [-1, 1]],
  8: [[0, 0], [0, -1], [1, 0], [0, 1], [-1, 0], [1, -1], [1, 1], [-1, 1]],
};

const generatedTemplate = (count: number): LatticePoint[] => {
  const result: LatticePoint[] = [[0, 0]];
  for (let radius = 1; result.length < count; radius += 1) {
    let column = -radius;
    let row = radius;
    for (const [stepColumn, stepRow] of HEX_DIRECTIONS) {
      for (let step = 0; step < radius && result.length < count; step += 1) {
        result.push([column, row]);
        column += stepColumn;
        row += stepRow;
      }
    }
  }
  return result;
};

const areNeighbours = (first: LatticePoint, second: LatticePoint) => {
  const column = first[0] - second[0];
  const row = first[1] - second[1];
  return (
    (Math.abs(column) + Math.abs(row) + Math.abs(column + row)) / 2 === 1
  );
};

const assignLatticePoints = <Id extends string>(
  inputs: readonly WorldLayoutInput<Id>[],
) => {
  const template = [...(LATTICE_TEMPLATES[inputs.length] ?? generatedTemplate(inputs.length))];
  const assigned = template.map((_, index) => index);

  // A newly discovered related island takes an available neighbouring cell.
  // Swapping only with later entries keeps earlier placements stable.
  inputs.forEach((input, inputIndex) => {
    const relatedIndex = input.relatedTo
      ?.map((id) => inputs.findIndex((candidate) => candidate.id === id))
      .find((index) => index !== undefined && index >= 0 && index < inputIndex);
    if (relatedIndex === undefined) return;

    const relatedPoint = template[assigned[relatedIndex]];
    if (areNeighbours(template[assigned[inputIndex]], relatedPoint)) return;
    const neighbourIndex = assigned.findIndex(
      (templateIndex, candidateIndex) =>
        candidateIndex > inputIndex &&
        areNeighbours(template[templateIndex], relatedPoint),
    );
    if (neighbourIndex < 0) return;
    [assigned[inputIndex], assigned[neighbourIndex]] = [
      assigned[neighbourIndex],
      assigned[inputIndex],
    ];
  });

  return assigned.map((templateIndex) => template[templateIndex]);
};

export const getTerritoryArea = (points: readonly WorldPoint[]) => {
  let doubledArea = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    doubledArea += current.x * next.z - next.x * current.z;
  }
  return Math.abs(doubledArea) / 2;
};

export const getTerritoryCentroid = (points: readonly WorldPoint[]) => {
  if (points.length === 0) return { x: 0, z: 0 };
  let signedDoubledArea = 0;
  let weightedX = 0;
  let weightedZ = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const cross = current.x * next.z - next.x * current.z;
    signedDoubledArea += cross;
    weightedX += (current.x + next.x) * cross;
    weightedZ += (current.z + next.z) * cross;
  }
  if (Math.abs(signedDoubledArea) < 0.0001) {
    return points.reduce(
      (center, point) => ({
        x: center.x + point.x / points.length,
        z: center.z + point.z / points.length,
      }),
      { x: 0, z: 0 },
    );
  }
  return {
    x: weightedX / (3 * signedDoubledArea),
    z: weightedZ / (3 * signedDoubledArea),
  };
};

const boundsAroundTerritories = <Id extends string>(
  territories: readonly TerritoryCell<Id>[],
) =>
  territories.reduce<WorldBounds>(
    (bounds, territory) =>
      territory.points.reduce<WorldBounds>(
        (cellBounds, point) => ({
          minX: Math.min(cellBounds.minX, point.x),
          maxX: Math.max(cellBounds.maxX, point.x),
          minZ: Math.min(cellBounds.minZ, point.z),
          maxZ: Math.max(cellBounds.maxZ, point.z),
        }),
        bounds,
      ),
    { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity },
  );

const makeHexagon = (center: WorldPoint, radius: number): WorldPoint[] =>
  Array.from({ length: 6 }, (_, index) => {
    const angle = Math.PI / 6 + (Math.PI * index) / 3;
    return {
      x: center.x + Math.cos(angle) * radius,
      z: center.z + Math.sin(angle) * radius,
    };
  });

export const createWorldLayout = <Id extends string>(
  inputs: readonly WorldLayoutInput<Id>[],
): WorldLayout<Id> => {
  if (inputs.length === 0) {
    const halfWidth = WORLD_LAYOUT_PROTOTYPE.emptyWidth / 2;
    const halfDepth = WORLD_LAYOUT_PROTOTYPE.emptyDepth / 2;
    const bounds = {
      minX: -halfWidth,
      maxX: halfWidth,
      minZ: -halfDepth,
      maxZ: halfDepth,
    };
    return { bounds, territoryBounds: bounds, items: [], territories: [] };
  }

  const largestRadius = Math.max(...inputs.map((input) => input.territoryRadius));
  const effectiveTerritoryRadius =
    largestRadius * WORLD_LAYOUT_PROTOTYPE.territoryFootprintScale;
  const cellCenterDistance =
    effectiveTerritoryRadius * 2 + WORLD_LAYOUT_PROTOTYPE.collisionGap;
  const hexagonRadius = cellCenterDistance / Math.sqrt(3);
  const latticePoints = assignLatticePoints(inputs);
  const rawPositions = latticePoints.map(([column, row]) => ({
    x: Math.sqrt(3) * hexagonRadius * (column + row / 2),
    z: 1.5 * hexagonRadius * row,
  }));
  const center = rawPositions.reduce(
    (sum, position) => ({
      x: sum.x + position.x / rawPositions.length,
      z: sum.z + position.z / rawPositions.length,
    }),
    { x: 0, z: 0 },
  );
  const positions = rawPositions.map((position) => ({
    x: position.x - center.x,
    z: position.z - center.z,
  }));
  const items = inputs.map((input, index): WorldLayoutItem<Id> => ({
    ...input,
    position: positions[index],
  }));
  const territories = items.map((item): TerritoryCell<Id> => ({
    id: item.id,
    points: makeHexagon(item.position, hexagonRadius),
  }));
  const territoryBounds = boundsAroundTerritories(territories);
  const reserve =
    effectiveTerritoryRadius *
    2 *
    WORLD_LAYOUT_PROTOTYPE.futureIslandReserveInTerritoryDiameters;
  const bounds = {
    minX: territoryBounds.minX - reserve,
    maxX: territoryBounds.maxX + reserve,
    minZ: territoryBounds.minZ - reserve,
    maxZ: territoryBounds.maxZ + reserve,
  };

  return { items, bounds, territoryBounds, territories };
};
