import * as THREE from "three/webgpu";

import type { WorldBounds } from "./world-layout";

export type MapPanLimits = {
  minimumX: number;
  maximumX: number;
  minimumZ: number;
  maximumZ: number;
};

type GroundFootprint = WorldBounds;

const projectToGround = (
  camera: THREE.PerspectiveCamera,
  normalizedX: number,
  normalizedY: number,
) => {
  const point = new THREE.Vector3(normalizedX, normalizedY, 0.5).unproject(
    camera,
  );
  const direction = point.sub(camera.position).normalize();
  if (direction.y >= -0.0001) return null;

  const distance = -camera.position.y / direction.y;
  return camera.position.clone().add(direction.multiplyScalar(distance));
};

export const getCameraGroundFootprint = (
  camera: THREE.PerspectiveCamera,
): GroundFootprint => {
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);

  const points = [
    projectToGround(camera, -1, -1),
    projectToGround(camera, 1, -1),
    projectToGround(camera, -1, 1),
    projectToGround(camera, 1, 1),
  ].filter((point): point is THREE.Vector3 => point !== null);

  if (points.length !== 4) {
    throw new Error("The overview camera must point fully toward the map.");
  }

  return points.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      maxX: Math.max(bounds.maxX, point.x),
      minZ: Math.min(bounds.minZ, point.z),
      maxZ: Math.max(bounds.maxZ, point.z),
    }),
    {
      minX: Infinity,
      maxX: -Infinity,
      minZ: Infinity,
      maxZ: -Infinity,
    },
  );
};

const fitAxis = (
  worldMinimum: number,
  worldMaximum: number,
  footprintMinimum: number,
  footprintMaximum: number,
) => {
  const minimum = worldMinimum - footprintMinimum;
  const maximum = worldMaximum - footprintMaximum;
  if (minimum <= maximum) return { minimum, maximum };

  const centered =
    (worldMinimum + worldMaximum) / 2 -
    (footprintMinimum + footprintMaximum) / 2;
  return { minimum: centered, maximum: centered };
};

export const getCameraPanLimits = (
  camera: THREE.PerspectiveCamera,
  worldBounds: WorldBounds,
): MapPanLimits => {
  const footprint = getCameraGroundFootprint(camera);
  const horizontal = fitAxis(
    worldBounds.minX,
    worldBounds.maxX,
    footprint.minX,
    footprint.maxX,
  );
  const vertical = fitAxis(
    worldBounds.minZ,
    worldBounds.maxZ,
    footprint.minZ,
    footprint.maxZ,
  );

  return {
    minimumX: horizontal.minimum,
    maximumX: horizontal.maximum,
    minimumZ: vertical.minimum,
    maximumZ: vertical.maximum,
  };
};
