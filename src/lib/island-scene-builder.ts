import * as THREE from "three/webgpu";
import { Asset } from "expo-asset";

import type {
  IslandDefinition,
  RuntimeIslandWorld,
} from "../data/islands";
import type {
  IslandDetailKey,
  IslandMilestoneDetailKey,
} from "../domain/island-visual-details";
import {
  createWorldRenderBudgets,
  earnedPropCount,
  MAX_RENDERED_MILESTONE_DETAILS,
  MAX_RENDERED_ROCKS,
  MAX_RENDERED_SMALL_DETAILS,
  type IslandRenderBudget,
} from "./island-growth-rendering";
import {
  createDecorationPoints,
  createTerrainGeometry,
} from "./procedural";
import {
  getCameraGroundFootprint,
} from "./map-camera-policy";
import type {
  MapCameraPose,
  UnitGroundFootprint,
} from "./map-camera-controller";
import type { WorldPoint } from "./world-layout";
import { disposeThreeScene } from "./three-scene-disposal";

const initialCameraPosition = new THREE.Vector3(0, 11, 10.75);
const initialCameraTarget = new THREE.Vector3(0, 0, 0.85);
const cameraDirection = initialCameraPosition
  .clone()
  .sub(initialCameraTarget)
  .normalize();

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

type DetailAnchor = {
  x: number;
  z: number;
  scale: number;
  rotation: number;
};

const addThemeTree = (
  parent: THREE.Group,
  island: IslandDefinition,
  anchor: DetailAnchor,
  scale: number,
) => {
  const position: [number, number, number] = [anchor.x, 0.81, anchor.z];
  const treeScale = scale * anchor.scale;
  if (island.treeStyle === "blossom") {
    addBlossom(parent, position, treeScale);
    return;
  }
  if (island.treeStyle === "palm") {
    addPalm(parent, position, treeScale, anchor.rotation);
    return;
  }
  if (island.treeStyle === "mixed" && anchor.rotation > Math.PI) {
    addBroadleaf(parent, position, treeScale);
    return;
  }
  addPine(parent, position, treeScale);
};

const addSmallDetail = (
  parent: THREE.Group,
  island: IslandDefinition,
  detailKey: IslandDetailKey,
  anchor: DetailAnchor,
  index: number,
) => {
  if (detailKey === "sapling") {
    addThemeTree(parent, island, anchor, 0.34);
    return;
  }

  const detail = new THREE.Group();
  detail.position.set(anchor.x, 0.82, anchor.z);
  detail.rotation.y = anchor.rotation;
  detail.scale.setScalar(0.72 + anchor.scale * 0.18);

  if (detailKey === "flowerPatch") {
    for (let flowerIndex = 0; flowerIndex < 4; flowerIndex += 1) {
      const angle = (Math.PI * 2 * flowerIndex) / 4 + index * 0.31;
      detail.add(
        mesh(
          new THREE.IcosahedronGeometry(0.035, 1),
          standard(flowerIndex % 2 === 0 ? island.accentColor : "#fff2cf", {
            emissive: island.accentColor,
            emissiveIntensity: 0.1,
          }),
          [Math.cos(angle) * 0.09, 0.04, Math.sin(angle) * 0.09],
        ),
      );
    }
  } else if (detailKey === "gardenBed") {
    detail.add(
      mesh(
        new THREE.BoxGeometry(0.28, 0.035, 0.18),
        standard("#846344"),
        [0, 0.02, 0],
      ),
    );
    for (let plantIndex = 0; plantIndex < 3; plantIndex += 1) {
      detail.add(
        mesh(
          new THREE.ConeGeometry(0.032, 0.1, 5),
          standard(plantIndex % 2 === 0 ? "#73964b" : island.accentColor),
          [-0.085 + plantIndex * 0.085, 0.08, 0],
        ),
      );
    }
  } else if (detailKey === "trailMarker") {
    detail.add(
      mesh(
        new THREE.CylinderGeometry(0.018, 0.025, 0.24, 6),
        standard("#76513b"),
        [0, 0.12, 0],
      ),
      mesh(
        new THREE.BoxGeometry(0.2, 0.08, 0.035),
        standard("#a57448"),
        [0.05, 0.22, 0],
        [0, 0, -0.08],
      ),
    );
  } else if (detailKey === "restBench") {
    detail.add(
      mesh(
        new THREE.BoxGeometry(0.3, 0.04, 0.1),
        standard("#96633f"),
        [0, 0.12, 0],
      ),
      mesh(
        new THREE.BoxGeometry(0.3, 0.04, 0.05),
        standard("#a7734a"),
        [0, 0.22, -0.05],
        [-0.12, 0, 0],
      ),
      mesh(
        new THREE.BoxGeometry(0.025, 0.12, 0.025),
        standard("#705039"),
        [-0.1, 0.06, 0],
      ),
      mesh(
        new THREE.BoxGeometry(0.025, 0.12, 0.025),
        standard("#705039"),
        [0.1, 0.06, 0],
      ),
    );
  } else if (detailKey === "bookStack") {
    ["#5e7b71", "#bc735e", "#75608c"].forEach((color, bookIndex) => {
      detail.add(
        mesh(
          new THREE.BoxGeometry(0.22, 0.04, 0.15),
          standard(color),
          [bookIndex % 2 === 0 ? 0.01 : -0.01, 0.025 + bookIndex * 0.042, 0],
          [0, bookIndex * 0.08, 0],
        ),
      );
    });
  } else if (detailKey === "practiceMarker") {
    detail.add(
      mesh(
        new THREE.CylinderGeometry(0.1, 0.11, 0.025, 12),
        standard("#e5d6ad"),
        [0, 0.02, 0],
      ),
      mesh(
        new THREE.CylinderGeometry(0.055, 0.06, 0.03, 12),
        standard(island.accentColor),
        [0, 0.045, 0],
      ),
    );
  } else if (detailKey === "warmLantern") {
    detail.add(
      mesh(
        new THREE.CylinderGeometry(0.016, 0.025, 0.2, 6),
        standard("#5f4938"),
        [0, 0.1, 0],
      ),
      mesh(
        new THREE.IcosahedronGeometry(0.055, 1),
        standard("#ffd27a", {
          emissive: "#ff9f4f",
          emissiveIntensity: 1.2,
        }),
        [0, 0.22, 0],
      ),
    );
  }

  parent.add(detail);
};

const addMilestoneDetail = (
  parent: THREE.Group,
  island: IslandDefinition,
  detailKey: IslandMilestoneDetailKey,
  anchor: DetailAnchor,
  index: number,
) => {
  if (detailKey === "grove") {
    for (let treeIndex = 0; treeIndex < 3; treeIndex += 1) {
      const angle = anchor.rotation + (Math.PI * 2 * treeIndex) / 3;
      addThemeTree(
        parent,
        island,
        {
          ...anchor,
          x: anchor.x + Math.cos(angle) * 0.13,
          z: anchor.z + Math.sin(angle) * 0.13,
          rotation: angle,
          scale: 0.82 + treeIndex * 0.08,
        },
        0.46,
      );
    }
    return;
  }

  const detail = new THREE.Group();
  detail.position.set(anchor.x, 0.82, anchor.z);
  detail.rotation.y = anchor.rotation;
  detail.scale.setScalar(0.82 + anchor.scale * 0.16);

  if (detailKey === "hill") {
    const hill = mesh(
      new THREE.IcosahedronGeometry(0.22, 1),
      standard(island.topColor),
      [0, 0.09, 0],
    );
    hill.scale.set(1.2, 0.58, 1);
    detail.add(hill);
  } else if (detailKey === "windingPath") {
    const bend = index % 2 === 0 ? 1 : -1;
    addPath(
      detail,
      [
        [-0.28, -0.18],
        [-0.16, -0.1 * bend],
        [-0.04, 0.01],
        [0.08, 0.1 * bend],
        [0.22, 0.18],
      ],
      "#d1bd91",
    );
    detail.children.forEach((child) => {
      child.position.y -= 0.79;
    });
  } else if (detailKey === "smallShelter") {
    detail.add(
      mesh(
        new THREE.BoxGeometry(0.38, 0.25, 0.3),
        standard("#ae7b50"),
        [0, 0.13, 0],
      ),
      mesh(
        new THREE.ConeGeometry(0.3, 0.2, 4),
        standard("#687556"),
        [0, 0.34, 0],
        [0, Math.PI / 4, 0],
      ),
    );
  } else if (detailKey === "lookout") {
    for (let legIndex = 0; legIndex < 4; legIndex += 1) {
      const x = legIndex % 2 === 0 ? -0.09 : 0.09;
      const z = legIndex < 2 ? -0.07 : 0.07;
      detail.add(
        mesh(
          new THREE.CylinderGeometry(0.018, 0.025, 0.34, 6),
          standard("#78543a"),
          [x, 0.17, z],
        ),
      );
    }
    detail.add(
      mesh(
        new THREE.BoxGeometry(0.3, 0.035, 0.25),
        standard("#a9794d"),
        [0, 0.35, 0],
      ),
      mesh(
        new THREE.ConeGeometry(0.25, 0.13, 4),
        standard("#6c7554"),
        [0, 0.45, 0],
        [0, Math.PI / 4, 0],
      ),
    );
  }

  parent.add(detail);
};

const addGrowthDetails = (
  group: THREE.Group,
  island: IslandDefinition,
  renderBudget: IslandRenderBudget,
) => {
  const visiblePropCount = Math.min(
    earnedPropCount(island.growth.lifetimePositivePoints),
    MAX_RENDERED_SMALL_DETAILS,
    renderBudget.smallDetails,
  );
  const smallDetails =
    visiblePropCount === 0
      ? []
      : island.growth.smallDetailKeys.slice(-visiblePropCount);
  const smallAnchors = createDecorationPoints(
    island.seed + 2_101,
    smallDetails.length,
    island.radius * 0.78,
  );
  smallDetails.forEach((detailKey, index) => {
    addSmallDetail(group, island, detailKey, smallAnchors[index], index);
  });

  const milestoneDetails = island.growth.milestoneDetailKeys.slice(
    0,
    Math.min(
      MAX_RENDERED_MILESTONE_DETAILS,
      renderBudget.milestoneDetails,
    ),
  );
  const milestoneAnchors = createDecorationPoints(
    island.seed + 7_301,
    milestoneDetails.length,
    island.radius * 0.62,
  );
  milestoneDetails.forEach((detailKey, index) => {
    addMilestoneDetail(
      group,
      island,
      detailKey,
      milestoneAnchors[index],
      index,
    );
  });
};

const addVisibleRocks = (
  group: THREE.Group,
  island: IslandDefinition,
  renderBudget: IslandRenderBudget,
) => {
  const visibleCount = Math.min(
    island.growth.rockCount,
    MAX_RENDERED_ROCKS,
    renderBudget.rocks,
  );
  const anchors = createDecorationPoints(
    island.seed + 11_909,
    visibleCount,
    island.radius * 0.92,
  );
  const overflowScale =
    1 + Math.min(0.48, Math.max(0, island.growth.rockCount - visibleCount) * 0.025);
  anchors.forEach((anchor, index) => {
    const rock = mesh(
      new THREE.DodecahedronGeometry(0.15 + (index % 3) * 0.015, 0),
      standard(index % 2 === 0 ? "#66675d" : island.rockColor),
      [anchor.x, 0.88, anchor.z],
      [anchor.rotation * 0.16, anchor.rotation, index * 0.17],
    );
    rock.scale
      .set(1.05, 0.82 + anchor.scale * 0.12, 0.9)
      .multiplyScalar(overflowScale);
    group.add(rock);
  });
};

const applySunkAppearance = (group: THREE.Group) => {
  const waterGrey = new THREE.Color("#66888a");
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const material = object.material;
    const materials = Array.isArray(material) ? material : [material];
    materials.forEach((value) => {
      if (!(value instanceof THREE.MeshStandardMaterial)) return;
      value.color.lerp(waterGrey, 0.58);
      value.emissive.multiplyScalar(0.24);
      value.roughness = Math.max(value.roughness, 0.94);
    });
  });
};

const buildIsland = (
  island: IslandDefinition,
  renderBudget: IslandRenderBudget,
) => {
  const group = new THREE.Group();
  group.position.set(...island.position);
  group.position.y = island.growth.isSunk ? -island.landScale * 0.62 : 0;
  group.scale.set(
    island.landScale,
    island.landScale,
    island.landScale * 0.92,
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
  const topColor =
    island.visualThemeKey === "learning" ? island.sandColor : island.topColor;
  const top = mesh(
    createTerrainGeometry(island.radius * 0.79, island.radius * 0.91, 0.31, island.seed + 7),
    standard(topColor),
    [0, 0.69, 0],
  );
  group.add(foam, rock, sand, top);
  addGrowthDetails(group, island, renderBudget);
  addVisibleRocks(group, island, renderBudget);
  if (island.growth.isSunk) applySunkAppearance(group);

  return group;
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

const makeWater = (texture: THREE.Texture, islandWorld: RuntimeIslandWorld) => {
  const width = islandWorld.layout.bounds.maxX - islandWorld.layout.bounds.minX;
  const depth = islandWorld.layout.bounds.maxZ - islandWorld.layout.bounds.minZ;
  const geometry = new THREE.PlaneGeometry(
    Math.max(22, width + 4),
    Math.max(26, depth + 4),
    52,
    68,
  );
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
  dispose: () => void;
  getGroundPointForPose: (
    screenX: number,
    screenY: number,
    pose: MapCameraPose,
  ) => WorldPoint | null;
  getUnitGroundFootprint: () => UnitGroundFootprint;
  resize: (width: number, height: number) => void;
  update: (time: number, pose: MapCameraPose) => void;
};

export const createIslandScene = async (
  width: number,
  height: number,
  islandWorld: RuntimeIslandWorld,
): Promise<IslandScene> => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#6fd4d9");

  const worldWidth =
    islandWorld.layout.bounds.maxX - islandWorld.layout.bounds.minX;
  const worldDepth =
    islandWorld.layout.bounds.maxZ - islandWorld.layout.bounds.minZ;
  const worldDiagonal = Math.hypot(worldWidth, worldDepth);
  const cameraFar = Math.max(60, worldDiagonal * 4);
  scene.fog = new THREE.Fog(
    "#6fd4d9",
    cameraFar * 0.7,
    cameraFar * 0.94,
  );

  const camera = new THREE.PerspectiveCamera(
    38,
    width / height,
    0.05,
    cameraFar,
  );
  camera.position.copy(initialCameraPosition);
  camera.lookAt(initialCameraTarget);

  scene.add(new THREE.HemisphereLight("#fff8df", "#477d89", 2.1));
  const sun = new THREE.DirectionalLight("#ffefca", 4.3);
  sun.position.set(-4, 8, 5);
  sun.castShadow = false;
  scene.add(sun);
  const fill = new THREE.DirectionalLight("#83eef0", 0.75);
  fill.position.set(4, 4, -3);
  scene.add(fill);

  const waterTexture = await loadWaterTexture();
  const water = makeWater(waterTexture, islandWorld);
  scene.add(water);
  const renderBudgets = createWorldRenderBudgets(
    islandWorld.islands.map((island) => ({
      id: island.id,
      smallDetails: earnedPropCount(island.growth.lifetimePositivePoints),
      milestoneDetails: island.growth.milestoneDetailKeys.length,
      rocks: island.growth.rockCount,
    })),
  );
  islandWorld.islands.forEach((island) => {
    scene.add(buildIsland(island, renderBudgets[island.id]));
  });

  let viewportWidth = width;
  let viewportHeight = height;
  const projectionCamera = camera.clone();
  const target = new THREE.Vector3();
  const rayPoint = new THREE.Vector3();
  const rayDirection = new THREE.Vector3();
  const applyPose = (
    value: THREE.PerspectiveCamera,
    pose: MapCameraPose,
  ) => {
    target.set(pose.center.x, 0, pose.center.z);
    value.position.copy(cameraDirection).multiplyScalar(pose.distance).add(target);
    value.lookAt(target);
    value.updateProjectionMatrix();
    value.updateMatrixWorld(true);
  };
  const prepareProjectionCamera = (pose: MapCameraPose) => {
    projectionCamera.fov = camera.fov;
    projectionCamera.aspect = camera.aspect;
    projectionCamera.near = camera.near;
    projectionCamera.far = camera.far;
    applyPose(projectionCamera, pose);
  };
  const getGroundPointForPose = (
    screenX: number,
    screenY: number,
    pose: MapCameraPose,
  ) => {
    if (viewportWidth <= 0 || viewportHeight <= 0) return null;
    prepareProjectionCamera(pose);
    rayPoint
      .set(
        (screenX / viewportWidth) * 2 - 1,
        1 - (screenY / viewportHeight) * 2,
        0.5,
      )
      .unproject(projectionCamera);
    rayDirection.copy(rayPoint).sub(projectionCamera.position).normalize();
    if (rayDirection.y >= -0.0001) return null;
    const distance = -projectionCamera.position.y / rayDirection.y;
    rayPoint
      .copy(projectionCamera.position)
      .add(rayDirection.multiplyScalar(distance));
    return { x: rayPoint.x, z: rayPoint.z };
  };
  const getUnitGroundFootprint = () => {
    prepareProjectionCamera({ center: { x: 0, z: 0 }, distance: 1 });
    return getCameraGroundFootprint(projectionCamera);
  };
  const resize = (nextWidth: number, nextHeight: number) => {
    if (nextWidth <= 0 || nextHeight <= 0) return;
    viewportWidth = nextWidth;
    viewportHeight = nextHeight;
    camera.aspect = nextWidth / nextHeight;
    camera.updateProjectionMatrix();
  };
  const update = (time: number, pose: MapCameraPose) => {
    applyPose(camera, pose);
    waterTexture.offset.x = (time * 0.000002) % 1;
    waterTexture.offset.y = (time * -0.0000015) % 1;
  };

  return {
    scene,
    camera,
    dispose: () => disposeThreeScene(scene),
    getGroundPointForPose,
    getUnitGroundFootprint,
    resize,
    update,
  };
};
