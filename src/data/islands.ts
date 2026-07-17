import {
  createWorldLayout,
  type WorldLayoutInput,
  type WorldPoint,
} from "../lib/world-layout";

export type IslandId = "health" | "relationships" | "work" | "learning";

type IslandVisualDefinition = {
  id: IslandId;
  name: string;
  preferredPosition: WorldPoint;
  relatedTo: readonly IslandId[];
  radius: number;
  territoryRadius: number;
  startingLandScale: number;
  seed: number;
  topColor: string;
  sandColor: string;
  rockColor: string;
  accentColor: string;
  labelRotation: `${number}deg`;
  treeStyle: "pine" | "blossom" | "mixed" | "palm";
  density: number;
};

export type IslandDefinition = IslandVisualDefinition & {
  position: [number, number, number];
};

const INITIAL_ISLANDS: IslandVisualDefinition[] = [
  {
    id: "health",
    name: "Health",
    preferredPosition: { x: -1.18, z: -0.55 },
    relatedTo: ["relationships"],
    radius: 1.27,
    territoryRadius: 0.92,
    startingLandScale: 0.42,
    seed: 17,
    topColor: "#88a950",
    sandColor: "#d8c789",
    rockColor: "#7f806e",
    accentColor: "#d5ef99",
    labelRotation: "-3deg",
    treeStyle: "mixed",
    density: 14,
  },
  {
    id: "relationships",
    name: "Relationships",
    preferredPosition: { x: 1.16, z: -0.48 },
    relatedTo: ["health"],
    radius: 1.12,
    territoryRadius: 0.88,
    startingLandScale: 0.42,
    seed: 29,
    topColor: "#b88a63",
    sandColor: "#e1bf89",
    rockColor: "#8d7263",
    accentColor: "#ee8f86",
    labelRotation: "3deg",
    treeStyle: "blossom",
    density: 11,
  },
  {
    id: "work",
    name: "Work",
    preferredPosition: { x: -1.1, z: 2.22 },
    relatedTo: ["learning"],
    radius: 0.91,
    territoryRadius: 0.82,
    startingLandScale: 0.42,
    seed: 43,
    topColor: "#829953",
    sandColor: "#cdbf8c",
    rockColor: "#74796b",
    accentColor: "#c6d79b",
    labelRotation: "2deg",
    treeStyle: "pine",
    density: 8,
  },
  {
    id: "learning",
    name: "Learning",
    preferredPosition: { x: 1.15, z: 2.27 },
    relatedTo: ["work"],
    radius: 0.82,
    territoryRadius: 0.79,
    startingLandScale: 0.42,
    seed: 61,
    topColor: "#bca76b",
    sandColor: "#ead39a",
    rockColor: "#887b68",
    accentColor: "#f0ba67",
    labelRotation: "3deg",
    treeStyle: "palm",
    density: 6,
  },
];

export const WORLD_LAYOUT = createWorldLayout(
  INITIAL_ISLANDS.map(
    (island): WorldLayoutInput<IslandId> => ({
      id: island.id,
      preferredPosition: island.preferredPosition,
      relatedTo: island.relatedTo,
      territoryRadius: island.territoryRadius,
    }),
  ),
);

export const ISLANDS: IslandDefinition[] = WORLD_LAYOUT.items.map((layoutItem) => {
  const visual = INITIAL_ISLANDS.find((island) => island.id === layoutItem.id)!;
  return {
    ...visual,
    position: [layoutItem.position.x, 0, layoutItem.position.z],
  };
});

export const ISLAND_BY_ID = Object.fromEntries(
  ISLANDS.map((island) => [island.id, island]),
) as Record<IslandId, IslandDefinition>;
