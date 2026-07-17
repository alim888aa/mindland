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
        ) -
          first.territoryRadius -
          second.territoryRadius,
      );
    }
  }
  return minimum;
};

// These values only tune the current prototype. They are deliberately kept out
// of product/domain data until the map has been tested with more island counts.
export const WORLD_LAYOUT_PROTOTYPE = {
  edgePadding: 1.45,
  minimumWidth: 7.2,
  minimumDepth: 8.4,
  collisionGap: 0.48,
  relatedDistance: 2.1,
  layoutPasses: 56,
} as const;

const deterministicAngle = (id: string) => {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) | 0;
  }
  return ((Math.abs(hash) % 360) * Math.PI) / 180;
};

const initialPosition = <Id extends string>(
  input: WorldLayoutInput<Id>,
  positioned: Map<Id, WorldPoint>,
  index: number,
) => {
  if (input.preferredPosition) return { ...input.preferredPosition };

  const relatedPosition = input.relatedTo
    ?.map((id) => positioned.get(id))
    .find((position): position is WorldPoint => Boolean(position));
  const angle = deterministicAngle(input.id);
  if (relatedPosition) {
    return {
      x: relatedPosition.x + Math.cos(angle) * WORLD_LAYOUT_PROTOTYPE.relatedDistance,
      z: relatedPosition.z + Math.sin(angle) * WORLD_LAYOUT_PROTOTYPE.relatedDistance,
    };
  }

  const column = index % 3;
  const row = Math.floor(index / 3);
  return { x: (column - 1) * 2.35, z: row * 2.5 };
};

const clipPolygon = (
  polygon: WorldPoint[],
  normalX: number,
  normalZ: number,
  limit: number,
) => {
  const result: WorldPoint[] = [];
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const previous = polygon[(index + polygon.length - 1) % polygon.length];
    const currentDistance = current.x * normalX + current.z * normalZ - limit;
    const previousDistance = previous.x * normalX + previous.z * normalZ - limit;
    const currentInside = currentDistance <= 0.0001;
    const previousInside = previousDistance <= 0.0001;

    if (currentInside !== previousInside) {
      const denominator = previousDistance - currentDistance;
      const amount = denominator === 0 ? 0 : previousDistance / denominator;
      result.push({
        x: previous.x + (current.x - previous.x) * amount,
        z: previous.z + (current.z - previous.z) * amount,
      });
    }
    if (currentInside) result.push(current);
  }
  return result;
};

const makeTerritories = <Id extends string>(
  items: WorldLayoutItem<Id>[],
  bounds: WorldBounds,
) =>
  items.map((item): TerritoryCell<Id> => {
    let points: WorldPoint[] = [
      { x: bounds.minX, z: bounds.minZ },
      { x: bounds.maxX, z: bounds.minZ },
      { x: bounds.maxX, z: bounds.maxZ },
      { x: bounds.minX, z: bounds.maxZ },
    ];

    for (const other of items) {
      if (other.id === item.id) continue;
      const normalX = other.position.x - item.position.x;
      const normalZ = other.position.z - item.position.z;
      const limit =
        (other.position.x * other.position.x +
          other.position.z * other.position.z -
          item.position.x * item.position.x -
          item.position.z * item.position.z) /
        2;
      points = clipPolygon(points, normalX, normalZ, limit);
    }

    return { id: item.id, points };
  });

export const createWorldLayout = <Id extends string>(
  inputs: readonly WorldLayoutInput<Id>[],
): WorldLayout<Id> => {
  if (inputs.length === 0) {
    const halfWidth = WORLD_LAYOUT_PROTOTYPE.minimumWidth / 2;
    const halfDepth = WORLD_LAYOUT_PROTOTYPE.minimumDepth / 2;
    return {
      bounds: { minX: -halfWidth, maxX: halfWidth, minZ: -halfDepth, maxZ: halfDepth },
      items: [],
      territories: [],
    };
  }

  const positioned = new Map<Id, WorldPoint>();
  const items = inputs.map((input, index): WorldLayoutItem<Id> => {
    const position = initialPosition(input, positioned, index);
    positioned.set(input.id, position);
    return { ...input, position };
  });

  for (let pass = 0; pass < WORLD_LAYOUT_PROTOTYPE.layoutPasses; pass += 1) {
    for (let firstIndex = 0; firstIndex < items.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < items.length; secondIndex += 1) {
        const first = items[firstIndex];
        const second = items[secondIndex];
        let deltaX = second.position.x - first.position.x;
        let deltaZ = second.position.z - first.position.z;
        let distance = Math.hypot(deltaX, deltaZ);
        if (distance < 0.0001) {
          const angle = deterministicAngle(`${first.id}:${second.id}`);
          deltaX = Math.cos(angle) * 0.01;
          deltaZ = Math.sin(angle) * 0.01;
          distance = 0.01;
        }

        const minimumDistance =
          first.territoryRadius +
          second.territoryRadius +
          WORLD_LAYOUT_PROTOTYPE.collisionGap;
        if (distance < minimumDistance) {
          const correction = (minimumDistance - distance) * 0.52;
          const shiftX = (deltaX / distance) * correction;
          const shiftZ = (deltaZ / distance) * correction;
          first.position.x -= shiftX;
          first.position.z -= shiftZ;
          second.position.x += shiftX;
          second.position.z += shiftZ;
        }

        const related =
          first.relatedTo?.includes(second.id) || second.relatedTo?.includes(first.id);
        if (related && distance > WORLD_LAYOUT_PROTOTYPE.relatedDistance) {
          const correction =
            (distance - WORLD_LAYOUT_PROTOTYPE.relatedDistance) * 0.045;
          const shiftX = (deltaX / distance) * correction;
          const shiftZ = (deltaZ / distance) * correction;
          first.position.x += shiftX;
          first.position.z += shiftZ;
          second.position.x -= shiftX;
          second.position.z -= shiftZ;
        }
      }
    }

    for (const item of items) {
      if (!item.preferredPosition) continue;
      item.position.x += (item.preferredPosition.x - item.position.x) * 0.025;
      item.position.z += (item.preferredPosition.z - item.position.z) * 0.025;
    }
  }

  // Attraction and preferred-position forces can reintroduce tiny overlaps on
  // their final pass. Finish with collision-only passes so the returned layout
  // always owns the clearance guarantee.
  for (let pass = 0; pass < 24; pass += 1) {
    for (let firstIndex = 0; firstIndex < items.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < items.length; secondIndex += 1) {
        const first = items[firstIndex];
        const second = items[secondIndex];
        let deltaX = second.position.x - first.position.x;
        let deltaZ = second.position.z - first.position.z;
        let distance = Math.hypot(deltaX, deltaZ);
        if (distance < 0.0001) {
          const angle = deterministicAngle(`${first.id}:${second.id}`);
          deltaX = Math.cos(angle) * 0.01;
          deltaZ = Math.sin(angle) * 0.01;
          distance = 0.01;
        }
        const required =
          first.territoryRadius +
          second.territoryRadius +
          WORLD_LAYOUT_PROTOTYPE.collisionGap;
        if (distance >= required) continue;
        const correction = (required - distance) / 2 + 0.0001;
        const shiftX = (deltaX / distance) * correction;
        const shiftZ = (deltaZ / distance) * correction;
        first.position.x -= shiftX;
        first.position.z -= shiftZ;
        second.position.x += shiftX;
        second.position.z += shiftZ;
      }
    }
  }

  const extents = items.reduce(
    (value, item) => ({
      minX: Math.min(value.minX, item.position.x - item.territoryRadius),
      maxX: Math.max(value.maxX, item.position.x + item.territoryRadius),
      minZ: Math.min(value.minZ, item.position.z - item.territoryRadius),
      maxZ: Math.max(value.maxZ, item.position.z + item.territoryRadius),
    }),
    { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity },
  );
  const centerX = (extents.minX + extents.maxX) / 2;
  const centerZ = (extents.minZ + extents.maxZ) / 2;
  const width = Math.max(
    WORLD_LAYOUT_PROTOTYPE.minimumWidth,
    extents.maxX - extents.minX + WORLD_LAYOUT_PROTOTYPE.edgePadding * 2,
  );
  const depth = Math.max(
    WORLD_LAYOUT_PROTOTYPE.minimumDepth,
    extents.maxZ - extents.minZ + WORLD_LAYOUT_PROTOTYPE.edgePadding * 2,
  );
  const bounds = {
    minX: centerX - width / 2,
    maxX: centerX + width / 2,
    minZ: centerZ - depth / 2,
    maxZ: centerZ + depth / 2,
  };

  return { items, bounds, territories: makeTerritories(items, bounds) };
};
