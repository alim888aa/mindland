import * as THREE from "three/webgpu";

export type DecorationPoint = {
  x: number;
  z: number;
  scale: number;
  rotation: number;
};

const seededValue = (seed: number, index: number) => {
  const value = Math.sin(seed * 97.13 + index * 41.77) * 43758.5453;
  return value - Math.floor(value);
};

export const createTerrainGeometry = (
  radiusTop: number,
  radiusBottom: number,
  height: number,
  seed: number,
  segments = 14,
) => {
  const geometry = new THREE.CylinderGeometry(
    radiusTop,
    radiusBottom,
    height,
    segments,
    1,
    false,
  );
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const z = positions.getZ(index);
    const angle = Math.atan2(z, x);
    const wobble =
      1 +
      Math.sin(angle * 3 + seed) * 0.045 +
      Math.cos(angle * 5 - seed * 0.7) * 0.035 +
      (seededValue(seed, index % segments) - 0.5) * 0.035;
    positions.setX(index, x * wobble);
    positions.setZ(index, z * wobble);
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
};

export const createDecorationPoints = (
  seed: number,
  count: number,
  radius: number,
) =>
  Array.from({ length: count }, (_, index): DecorationPoint => {
    const angle = seededValue(seed, index * 3) * Math.PI * 2;
    const distance =
      (0.32 + seededValue(seed, index * 3 + 1) * 0.46) * radius;
    return {
      x: Math.cos(angle) * distance,
      z: Math.sin(angle) * distance,
      scale: 0.72 + seededValue(seed, index * 3 + 2) * 0.55,
      rotation: seededValue(seed + 11, index) * Math.PI * 2,
    };
  });

const territoryCurve = (points: [number, number][]) =>
  new THREE.CatmullRomCurve3(
    points.map(([x, z]) => new THREE.Vector3(x, 0.034, z)),
    true,
    "catmullrom",
    0.18,
  );

export const TERRITORY_GEOMETRIES = [
  new THREE.TubeGeometry(
    territoryCurve([
      [-3.35, 4.35],
      [-1.54, 4.28],
      [0.02, 3.9],
      [-0.05, 0.9],
      [-1.62, 0.84],
      [-3.2, 0.9],
    ]),
    48,
    0.018,
    5,
    true,
  ),
  new THREE.TubeGeometry(
    territoryCurve([
      [0.02, 3.9],
      [1.55, 4.28],
      [3.35, 4.18],
      [3.22, 0.9],
      [1.58, 0.86],
      [-0.05, 0.9],
    ]),
    48,
    0.018,
    5,
    true,
  ),
  new THREE.TubeGeometry(
    territoryCurve([
      [-3.2, 0.9],
      [-1.62, 0.84],
      [-0.05, 0.9],
      [-0.02, -2.94],
      [-1.55, -3.15],
      [-3.32, -3.08],
    ]),
    48,
    0.018,
    5,
    true,
  ),
  new THREE.TubeGeometry(
    territoryCurve([
      [-0.05, 0.9],
      [1.58, 0.86],
      [3.22, 0.9],
      [3.3, -3.1],
      [1.55, -3.16],
      [-0.02, -2.94],
    ]),
    48,
    0.018,
    5,
    true,
  ),
];
