import * as THREE from "three/webgpu";
import { Asset } from "expo-asset";

import { ISLANDS, type IslandDefinition, type IslandId } from "../data/islands";
import {
  createDecorationPoints,
  createTerrainGeometry,
  TERRITORY_GEOMETRIES,
} from "./procedural";

const overviewPosition = new THREE.Vector3(0, 9.25, 8.6);
const overviewTarget = new THREE.Vector3(0, 0.2, 0.45);

const standard = (color: string, options: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 0.9,
    flatShading: true,
    ...options,
  });

const mesh = (
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number] = [0, 0, 0],
  rotation: [number, number, number] = [0, 0, 0],
) => {
  const value = new THREE.Mesh(geometry, material);
  value.position.set(...position);
  value.rotation.set(...rotation);
  value.castShadow = false;
  value.receiveShadow = false;
  return value;
};

const addPine = (
  parent: THREE.Group,
  position: [number, number, number],
  scale: number,
  color = "#4f793f",
) => {
  const tree = new THREE.Group();
  tree.position.set(...position);
  tree.scale.setScalar(scale);
  tree.add(mesh(new THREE.CylinderGeometry(0.035, 0.06, 0.3, 7), standard("#76533a"), [0, 0.15, 0]));
  tree.add(mesh(new THREE.ConeGeometry(0.19, 0.44, 7), standard(color), [0, 0.38, 0]));
  tree.add(mesh(new THREE.ConeGeometry(0.14, 0.35, 7), standard(color), [0, 0.58, 0]));
  parent.add(tree);
};

const addBlossom = (
  parent: THREE.Group,
  position: [number, number, number],
  scale: number,
) => {
  const tree = new THREE.Group();
  tree.position.set(...position);
  tree.scale.setScalar(scale);
  tree.add(mesh(new THREE.CylinderGeometry(0.045, 0.075, 0.42, 7), standard("#78503a"), [0, 0.2, 0]));
  const colors = ["#f4a29a", "#ea8885", "#f6afa3", "#df787b"];
  const crowns: [number, number, number][] = [
    [-0.12, 0.47, 0.01],
    [0.11, 0.49, 0.05],
    [0, 0.6, -0.04],
    [0.02, 0.49, -0.13],
  ];
  crowns.forEach((point, index) => {
    tree.add(mesh(new THREE.IcosahedronGeometry(0.18, 1), standard(colors[index]), point));
  });
  parent.add(tree);
};

const addBroadleaf = (
  parent: THREE.Group,
  position: [number, number, number],
  scale: number,
) => {
  const tree = new THREE.Group();
  tree.position.set(...position);
  tree.scale.setScalar(scale);
  tree.add(mesh(new THREE.CylinderGeometry(0.09, 0.16, 0.78, 8), standard("#785139"), [0, 0.38, 0]));
  const crowns: [number, number, number, number, string][] = [
    [0, 0.88, 0, 0.36, "#8ea94b"],
    [-0.24, 0.8, 0.03, 0.28, "#769844"],
    [0.24, 0.8, 0.05, 0.29, "#9eb452"],
    [-0.08, 1.08, -0.03, 0.28, "#a7bb59"],
    [0.12, 0.99, -0.18, 0.28, "#839f47"],
  ];
  crowns.forEach(([x, y, z, radius, color]) => {
    tree.add(mesh(new THREE.IcosahedronGeometry(radius, 2), standard(color), [x, y, z]));
  });
  parent.add(tree);
};

const addPalm = (
  parent: THREE.Group,
  position: [number, number, number],
  scale: number,
  rotation: number,
) => {
  const tree = new THREE.Group();
  tree.position.set(...position);
  tree.rotation.y = rotation;
  tree.scale.setScalar(scale);
  tree.add(mesh(new THREE.CylinderGeometry(0.035, 0.065, 0.52, 7), standard("#a1784c"), [0, 0.25, 0], [0, 0, -0.1]));
  for (let index = 0; index < 6; index += 1) {
    const leaf = mesh(new THREE.ConeGeometry(0.075, 0.46, 5), standard(index % 2 ? "#809b48" : "#6f913e"), [0, 0.51, 0]);
    leaf.rotation.set(-0.35, (Math.PI * 2 * index) / 6, 0.38);
    tree.add(leaf);
  }
  parent.add(tree);
};

const addFlowers = (parent: THREE.Group, seed: number, radius: number, color: string) => {
  const points = createDecorationPoints(seed + 101, 10, radius);
  points.forEach((point, index) => {
    const flower = mesh(
      new THREE.IcosahedronGeometry(0.045, 1),
      standard(index % 3 === 0 ? "#fff3d1" : color, {
        emissive: color,
        emissiveIntensity: 0.08,
      }),
      [point.x, 0.79, point.z],
    );
    parent.add(flower);
  });
};

const addPath = (
  parent: THREE.Group,
  points: [number, number][],
  color = "#cbb586",
) => {
  points.forEach(([x, z], index) => {
    const slab = mesh(
      new THREE.BoxGeometry(0.2, 0.035, 0.14),
      standard(index % 2 ? color : "#d8c397"),
      [x, 0.815, z],
      [0, index * 0.13, 0],
    );
    slab.scale.x = 0.86 + (index % 3) * 0.08;
    parent.add(slab);
  });
};

const addCabin = (parent: THREE.Group) => {
  const cabin = new THREE.Group();
  cabin.position.set(-0.18, 0.82, 0.02);
  cabin.rotation.y = -0.22;
  cabin.add(mesh(new THREE.BoxGeometry(0.55, 0.34, 0.45), standard("#b98755"), [0, 0.17, 0]));
  cabin.add(mesh(new THREE.ConeGeometry(0.44, 0.28, 4), standard("#6f7653"), [0, 0.43, 0], [0, Math.PI / 4, 0]));
  cabin.add(mesh(new THREE.BoxGeometry(0.1, 0.2, 0.025), standard("#5c402f"), [0.14, 0.13, 0.238]));
  cabin.add(mesh(new THREE.BoxGeometry(0.12, 0.1, 0.025), standard("#cbe0c4", { emissive: "#f5d79b", emissiveIntensity: 0.15 }), [-0.14, 0.2, 0.238]));
  parent.add(cabin);
};

const addCampfire = (parent: THREE.Group) => {
  const fire = new THREE.Group();
  fire.position.set(0.08, 0.82, 0.04);
  for (let index = 0; index < 10; index += 1) {
    const angle = (Math.PI * 2 * index) / 10;
    fire.add(mesh(new THREE.DodecahedronGeometry(0.055, 0), standard("#8b7867"), [Math.cos(angle) * 0.22, 0.04, Math.sin(angle) * 0.22]));
  }
  const flame = mesh(
    new THREE.OctahedronGeometry(0.14, 0),
    standard("#ffb24e", { emissive: "#ff6b2d", emissiveIntensity: 2 }),
    [0, 0.16, 0],
  );
  fire.add(flame);
  const glow = new THREE.PointLight("#ff9a52", 2.8, 2.2);
  glow.position.set(0, 0.3, 0);
  fire.add(glow);
  for (let index = 0; index < 5; index += 1) {
    const angle = (Math.PI * 2 * index) / 5;
    const bench = mesh(new THREE.BoxGeometry(0.4, 0.07, 0.12), standard("#9a6843"), [Math.cos(angle) * 0.46, 0.08, Math.sin(angle) * 0.46], [0, -angle, 0]);
    fire.add(bench);
  }
  parent.add(fire);
};

const addBooks = (parent: THREE.Group) => {
  const books = new THREE.Group();
  books.position.set(0.02, 0.84, 0.02);
  books.rotation.y = -0.25;
  const colors = ["#8c6c55", "#5d7d69", "#b86e60", "#526c87"];
  colors.forEach((color, index) => {
    books.add(mesh(new THREE.BoxGeometry(0.43, 0.075, 0.31), standard(color), [index * 0.012 - 0.02, index * 0.078, 0]));
  });
  const open = new THREE.Group();
  open.position.set(-0.35, 0.84, 0.27);
  open.rotation.y = 0.2;
  open.add(mesh(new THREE.BoxGeometry(0.24, 0.025, 0.28), standard("#f2e2bd"), [-0.12, 0, 0], [0, 0, 0.08]));
  open.add(mesh(new THREE.BoxGeometry(0.24, 0.025, 0.28), standard("#f2e2bd"), [0.12, 0, 0], [0, 0, -0.08]));
  parent.add(books, open);
};

const addHealthFeatures = (group: THREE.Group, island: IslandDefinition) => {
  addBroadleaf(group, [-0.42, 0.75, -0.38], 1.02);
  addPath(group, [
    [0.2, 0.58], [0.17, 0.42], [0.13, 0.26], [0.1, 0.1], [0.05, -0.08],
    [0.02, -0.27], [-0.02, -0.46], [-0.08, -0.62],
  ]);
  const pool = mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.025, 14), standard("#5ec9cf", { metalness: 0.08, roughness: 0.25 }), [-0.55, 0.81, 0.18]);
  pool.scale.z = 1.5;
  group.add(pool);
  for (let index = 0; index < 4; index += 1) {
    const fall = mesh(new THREE.BoxGeometry(0.1, 0.025, 0.22), standard("#b7f1e9", { emissive: "#7fddd7", emissiveIntensity: 0.35 }), [-0.72 + index * 0.03, 0.82 - index * 0.07, 0.42 + index * 0.12], [-0.42, 0, 0]);
    group.add(fall);
  }
  addFlowers(group, island.seed, island.radius, "#ef9caa");
};

const addRelationshipFeatures = (group: THREE.Group, island: IslandDefinition) => {
  addCampfire(group);
  addFlowers(group, island.seed, island.radius, "#ffd0c7");
  const boat = new THREE.Group();
  boat.position.set(-0.62, 0.16, -0.78);
  boat.rotation.y = 0.55;
  boat.add(mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.38, 8), standard("#9b6239"), [0, 0, 0], [0, 0, Math.PI / 2]));
  boat.add(mesh(new THREE.BoxGeometry(0.04, 0.04, 0.32), standard("#f1d09a"), [0, 0.07, 0]));
  group.add(boat);
};

const addWorkFeatures = (group: THREE.Group) => {
  addCabin(group);
  addPath(group, [
    [0.08, 0.35], [0.12, 0.19], [0.15, 0.02], [0.17, -0.14], [0.2, -0.3],
    [0.22, -0.47], [0.22, -0.62],
  ]);
  const notice = new THREE.Group();
  notice.position.set(0.42, 0.82, 0.18);
  notice.add(mesh(new THREE.BoxGeometry(0.38, 0.25, 0.05), standard("#8c653f"), [0, 0.25, 0]));
  notice.add(mesh(new THREE.BoxGeometry(0.03, 0.38, 0.03), standard("#6f4b31"), [-0.13, 0.03, 0]));
  notice.add(mesh(new THREE.BoxGeometry(0.03, 0.38, 0.03), standard("#6f4b31"), [0.13, 0.03, 0]));
  group.add(notice);
};

const addLearningFeatures = (group: THREE.Group, island: IslandDefinition) => {
  addBooks(group);
  addFlowers(group, island.seed, island.radius, "#f3b45c");
};

const buildIsland = (island: IslandDefinition) => {
  const group = new THREE.Group();
  group.position.set(...island.position);
  group.scale.set(
    island.startingLandScale,
    island.startingLandScale,
    island.startingLandScale * 0.92,
  );

  const foam = mesh(
    createTerrainGeometry(island.radius * 1.1, island.radius * 1.1, 0.035, island.seed + 13),
    standard("#c7f7ec", {
      emissive: "#8de3db",
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.72,
    }),
    [0, 0.035, 0],
  );
  const rock = mesh(
    createTerrainGeometry(island.radius * 0.97, island.radius * 0.84, 0.42, island.seed),
    standard(island.rockColor),
    [0, 0.24, 0],
  );
  const sand = mesh(
    createTerrainGeometry(island.radius * 0.92, island.radius, 0.17, island.seed + 3),
    standard(island.sandColor),
    [0, 0.48, 0],
  );
  const topColor = island.id === "learning" ? island.sandColor : island.topColor;
  const top = mesh(
    createTerrainGeometry(island.radius * 0.79, island.radius * 0.91, 0.31, island.seed + 7),
    standard(topColor),
    [0, 0.69, 0],
  );
  group.add(foam, rock, sand, top);

  return group;
};

const addTerritories = (scene: THREE.Scene) => {
  const underlayMaterial = new THREE.MeshBasicMaterial({
    color: "#a8fff3",
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
  });
  const lineMaterial = new THREE.MeshBasicMaterial({
    color: "#d3fff7",
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
  });

  TERRITORY_GEOMETRIES.forEach((geometry) => {
    const underlay = new THREE.Mesh(geometry.clone(), underlayMaterial);
    underlay.scale.set(1.006, 1, 1.006);
    scene.add(underlay);
    scene.add(new THREE.Mesh(geometry, lineMaterial));
  });
};

const loadWaterTexture = async () => {
  const asset = Asset.fromModule(require("../../assets/water-texture.png"));
  await asset.downloadAsync();
  const response = await fetch(asset.localUri ?? asset.uri);
  const bytes = await response.arrayBuffer();
  const image = await (
    createImageBitmap as unknown as (data: ArrayBuffer) => Promise<ImageBitmap>
  )(bytes);
  const texture = new THREE.Texture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.25, 3.8);
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
};

const makeWater = (texture: THREE.Texture) => {
  const geometry = new THREE.PlaneGeometry(18, 20, 52, 68);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshStandardMaterial({
    color: "#88e0dd",
    map: texture,
    roughness: 0.52,
    metalness: 0.02,
  });
  const water = new THREE.Mesh(geometry, material);
  water.position.y = -0.02;
  water.receiveShadow = false;
  return water;
};

export type IslandScene = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  update: (time: number, selectedIsland: IslandId | null) => void;
};

export const createIslandScene = async (width: number, height: number): Promise<IslandScene> => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#6fd4d9");
  scene.fog = new THREE.Fog("#6fd4d9", 15, 25);

  const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 40);
  camera.position.copy(overviewPosition);
  camera.lookAt(overviewTarget);

  scene.add(new THREE.HemisphereLight("#fff8df", "#477d89", 2.1));
  const sun = new THREE.DirectionalLight("#ffefca", 4.3);
  sun.position.set(-4, 8, 5);
  sun.castShadow = false;
  scene.add(sun);
  const fill = new THREE.DirectionalLight("#83eef0", 0.75);
  fill.position.set(4, 4, -3);
  scene.add(fill);

  const waterTexture = await loadWaterTexture();
  const water = makeWater(waterTexture);
  scene.add(water);
  addTerritories(scene);
  ISLANDS.forEach((island) => scene.add(buildIsland(island)));

  const cameraTarget = overviewTarget.clone();
  const desiredPosition = overviewPosition.clone();
  const desiredTarget = overviewTarget.clone();
  const update = (time: number, selectedIsland: IslandId | null) => {
    if (selectedIsland) {
      const island = ISLANDS.find((value) => value.id === selectedIsland)!;
      const visibleRadius = island.radius * island.startingLandScale;
      desiredPosition.set(
        island.position[0],
        1.85 + visibleRadius * 0.85,
        island.position[2] + 1.45 + visibleRadius * 0.85,
      );
      desiredTarget.set(
        island.position[0],
        0.38 * island.startingLandScale,
        island.position[2],
      );
    } else {
      desiredPosition.copy(overviewPosition);
      desiredTarget.copy(overviewTarget);
    }

    camera.position.lerp(desiredPosition, 0.075);
    cameraTarget.lerp(desiredTarget, 0.075);
    camera.lookAt(cameraTarget);

    waterTexture.offset.x = (time * 0.000002) % 1;
    waterTexture.offset.y = (time * -0.0000015) % 1;
  };

  return { scene, camera, update };
};
