import type { WorldBounds, WorldPoint } from "./world-layout";

export type MapCameraPose = {
  center: WorldPoint;
  distance: number;
};

export type MapCameraDistanceRange = {
  minimum: number;
  maximum: number;
};

/**
 * The visible ground rectangle when the camera is one distance unit from its
 * target. Values are relative to the target. A renderer can measure this once
 * from its real perspective camera, then keep all gesture math in this module.
 */
export type UnitGroundFootprint = WorldBounds;

export type CameraFrameSubject<Id extends string = string> = {
  id: Id;
  position: WorldPoint;
  radius: number;
};

export type HomeCameraTarget<Id extends string = string> = {
  pose: MapCameraPose;
  subjectIds: Id[];
};

const EPSILON = 0.000001;

export const ISLAND_ENTRY_CAMERA_RESPONSE_RATE = 8.5;
export const OVERVIEW_CAMERA_RESPONSE_RATE = 6.2;

export const getCameraTransitionResponseRate = (
  selectedIsland: string | null,
) =>
  selectedIsland
    ? ISLAND_ENTRY_CAMERA_RESPONSE_RATE
    : OVERVIEW_CAMERA_RESPONSE_RATE;

/** Freezes an animated camera at the exact rendered pose before direct input. */
export const cancelCameraTransition = (current: MapCameraPose): MapCameraPose => ({
  center: { ...current.center },
  distance: current.distance,
});

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const midpoint = (minimum: number, maximum: number) =>
  (minimum + maximum) / 2;

const boundsWidth = (bounds: WorldBounds) => bounds.maxX - bounds.minX;
const boundsDepth = (bounds: WorldBounds) => bounds.maxZ - bounds.minZ;

const scaleBoundsAroundCenter = (
  bounds: WorldBounds,
  scale: number,
): WorldBounds => {
  const centerX = midpoint(bounds.minX, bounds.maxX);
  const centerZ = midpoint(bounds.minZ, bounds.maxZ);
  const halfWidth = (boundsWidth(bounds) * scale) / 2;
  const halfDepth = (boundsDepth(bounds) * scale) / 2;
  return {
    minX: centerX - halfWidth,
    maxX: centerX + halfWidth,
    minZ: centerZ - halfDepth,
    maxZ: centerZ + halfDepth,
  };
};

const clampAxis = (
  desiredCenter: number,
  worldMinimum: number,
  worldMaximum: number,
  footprintMinimum: number,
  footprintMaximum: number,
  distance: number,
) => {
  const minimumCenter = worldMinimum - footprintMinimum * distance;
  const maximumCenter = worldMaximum - footprintMaximum * distance;
  if (minimumCenter <= maximumCenter) {
    return clamp(desiredCenter, minimumCenter, maximumCenter);
  }

  return (
    midpoint(worldMinimum, worldMaximum) -
    midpoint(footprintMinimum, footprintMaximum) * distance
  );
};

export const clampCameraDistance = (
  distance: number,
  range: MapCameraDistanceRange,
) => clamp(distance, range.minimum, range.maximum);

/** Expands invisible navigation bounds so an approved camera pose is valid. */
export const expandBoundsToContainCameraPose = (
  worldBounds: WorldBounds,
  unitFootprint: UnitGroundFootprint,
  pose: MapCameraPose,
): WorldBounds => ({
  minX: Math.min(
    worldBounds.minX,
    pose.center.x + unitFootprint.minX * pose.distance,
  ),
  maxX: Math.max(
    worldBounds.maxX,
    pose.center.x + unitFootprint.maxX * pose.distance,
  ),
  minZ: Math.min(
    worldBounds.minZ,
    pose.center.z + unitFootprint.minZ * pose.distance,
  ),
  maxZ: Math.max(
    worldBounds.maxZ,
    pose.center.z + unitFootprint.maxZ * pose.distance,
  ),
});

/** Keeps the camera footprint inside the world at the current zoom level. */
export const clampCameraPoseToWorld = (
  pose: MapCameraPose,
  worldBounds: WorldBounds,
  unitFootprint: UnitGroundFootprint,
  range: MapCameraDistanceRange,
): MapCameraPose => {
  const distance = clampCameraDistance(pose.distance, range);
  return {
    distance,
    center: {
      x: clampAxis(
        pose.center.x,
        worldBounds.minX,
        worldBounds.maxX,
        unitFootprint.minX,
        unitFootprint.maxX,
        distance,
      ),
      z: clampAxis(
        pose.center.z,
        worldBounds.minZ,
        worldBounds.maxZ,
        unitFootprint.minZ,
        unitFootprint.maxZ,
        distance,
      ),
    },
  };
};

/**
 * Returns the zoom required to contain a set of world bounds. The footprint
 * can be asymmetric because Mindland keeps its strong diagonal camera angle.
 */
export const getDistanceToFrameBounds = (
  bounds: WorldBounds,
  unitFootprint: UnitGroundFootprint,
  range: MapCameraDistanceRange,
  padding = 1,
) => {
  const footprintWidth = Math.max(boundsWidth(unitFootprint), EPSILON);
  const footprintDepth = Math.max(boundsDepth(unitFootprint), EPSILON);
  const paddedBounds = scaleBoundsAroundCenter(bounds, Math.max(1, padding));
  return clampCameraDistance(
    Math.max(
      boundsWidth(paddedBounds) / footprintWidth,
      boundsDepth(paddedBounds) / footprintDepth,
    ),
    range,
  );
};

export const createFrameCameraTarget = (
  bounds: WorldBounds,
  unitFootprint: UnitGroundFootprint,
  range: MapCameraDistanceRange,
  padding = 1,
): MapCameraPose => {
  const distance = getDistanceToFrameBounds(
    bounds,
    unitFootprint,
    range,
    padding,
  );
  return {
    distance,
    center: {
      x:
        midpoint(bounds.minX, bounds.maxX) -
        midpoint(unitFootprint.minX, unitFootprint.maxX) * distance,
      z:
        midpoint(bounds.minZ, bounds.maxZ) -
        midpoint(unitFootprint.minZ, unitFootprint.maxZ) * distance,
    },
  };
};

export const createWorldCameraTarget = (
  worldBounds: WorldBounds,
  unitFootprint: UnitGroundFootprint,
  range: MapCameraDistanceRange,
) => createFrameCameraTarget(worldBounds, unitFootprint, range);

export const createIslandCameraTarget = (
  territoryBounds: WorldBounds,
  unitFootprint: UnitGroundFootprint,
  range: MapCameraDistanceRange,
  padding = 1.08,
) => createFrameCameraTarget(territoryBounds, unitFootprint, range, padding);

const subjectBounds = <Id extends string>(
  subjects: readonly CameraFrameSubject<Id>[],
): WorldBounds =>
  subjects.reduce(
    (bounds, subject) => ({
      minX: Math.min(bounds.minX, subject.position.x - subject.radius),
      maxX: Math.max(bounds.maxX, subject.position.x + subject.radius),
      minZ: Math.min(bounds.minZ, subject.position.z - subject.radius),
      maxZ: Math.max(bounds.maxZ, subject.position.z + subject.radius),
    }),
    { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity },
  );

/** Selects a stable group of up to five subjects nearest the world center. */
export const createHomeCameraTarget = <Id extends string>(
  subjects: readonly CameraFrameSubject<Id>[],
  worldBounds: WorldBounds,
  unitFootprint: UnitGroundFootprint,
  range: MapCameraDistanceRange,
  maximumSubjects = 5,
  padding = 1.04,
): HomeCameraTarget<Id> => {
  const center = {
    x: midpoint(worldBounds.minX, worldBounds.maxX),
    z: midpoint(worldBounds.minZ, worldBounds.maxZ),
  };
  const selected = [...subjects]
    .sort((first, second) => {
      const firstDistance = Math.hypot(
        first.position.x - center.x,
        first.position.z - center.z,
      );
      const secondDistance = Math.hypot(
        second.position.x - center.x,
        second.position.z - center.z,
      );
      return firstDistance - secondDistance || first.id.localeCompare(second.id);
    })
    .slice(0, Math.max(1, maximumSubjects));

  if (selected.length === 0) {
    return {
      pose: createWorldCameraTarget(worldBounds, unitFootprint, range),
      subjectIds: [],
    };
  }

  return {
    pose: createFrameCameraTarget(
      subjectBounds(selected),
      unitFootprint,
      range,
      padding,
    ),
    subjectIds: selected.map((subject) => subject.id),
  };
};

/**
 * Moves the camera center while changing distance so the touched world point
 * remains under the user's fingers during a pinch.
 */
export const preserveFocalPointWhileZooming = (
  pose: MapCameraPose,
  focalPoint: WorldPoint,
  nextDistance: number,
  range: MapCameraDistanceRange,
): MapCameraPose => {
  const distance = clampCameraDistance(nextDistance, range);
  const ratio = distance / Math.max(pose.distance, EPSILON);
  return {
    distance,
    center: {
      x: focalPoint.x + (pose.center.x - focalPoint.x) * ratio,
      z: focalPoint.z + (pose.center.z - focalPoint.z) * ratio,
    },
  };
};

/** Moves a pose so a stable world anchor follows a moving finger midpoint. */
export const followMovingFocalPoint = (
  pose: MapCameraPose,
  worldAnchor: WorldPoint,
  groundPointUnderFingers: WorldPoint,
): MapCameraPose => ({
  distance: pose.distance,
  center: {
    x: pose.center.x + worldAnchor.x - groundPointUnderFingers.x,
    z: pose.center.z + worldAnchor.z - groundPointUnderFingers.z,
  },
});

/** Frame-rate-independent exponential easing toward a camera target. */
export const stepCameraPose = (
  current: MapCameraPose,
  target: MapCameraPose,
  elapsedSeconds: number,
  responseRate = 10,
): MapCameraPose => {
  const amount = 1 - Math.exp(-Math.max(0, responseRate) * Math.max(0, elapsedSeconds));
  return {
    center: {
      x: current.center.x + (target.center.x - current.center.x) * amount,
      z: current.center.z + (target.center.z - current.center.z) * amount,
    },
    distance: current.distance + (target.distance - current.distance) * amount,
  };
};

export const isCameraPoseSettled = (
  current: MapCameraPose,
  target: MapCameraPose,
  tolerance = 0.001,
) =>
  Math.abs(current.center.x - target.center.x) <= tolerance &&
  Math.abs(current.center.z - target.center.z) <= tolerance &&
  Math.abs(current.distance - target.distance) <= tolerance;
