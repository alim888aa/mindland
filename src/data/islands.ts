export type IslandId = "health" | "relationships" | "work" | "learning";

export type IslandDefinition = {
  id: IslandId;
  name: string;
  position: [number, number, number];
  radius: number;
  seed: number;
  topColor: string;
  sandColor: string;
  rockColor: string;
  accentColor: string;
  labelTop: `${number}%`;
  labelLeft: `${number}%`;
  labelRotation: `${number}deg`;
  treeStyle: "pine" | "blossom" | "mixed" | "palm";
  density: number;
};

export const ISLANDS: IslandDefinition[] = [
  {
    id: "health",
    name: "Health",
    position: [-1.06, 0, -0.42],
    radius: 1.27,
    seed: 17,
    topColor: "#88a950",
    sandColor: "#d8c789",
    rockColor: "#7f806e",
    accentColor: "#d5ef99",
    labelTop: "28%",
    labelLeft: "15%",
    labelRotation: "-3deg",
    treeStyle: "mixed",
    density: 14,
  },
  {
    id: "relationships",
    name: "Relationships",
    position: [1.08, 0, -0.4],
    radius: 1.12,
    seed: 29,
    topColor: "#b88a63",
    sandColor: "#e1bf89",
    rockColor: "#8d7263",
    accentColor: "#ee8f86",
    labelTop: "31.5%",
    labelLeft: "57%",
    labelRotation: "3deg",
    treeStyle: "blossom",
    density: 11,
  },
  {
    id: "work",
    name: "Work",
    position: [-1.08, 0, 2.65],
    radius: 0.91,
    seed: 43,
    topColor: "#829953",
    sandColor: "#cdbf8c",
    rockColor: "#74796b",
    accentColor: "#c6d79b",
    labelTop: "52%",
    labelLeft: "19%",
    labelRotation: "2deg",
    treeStyle: "pine",
    density: 8,
  },
  {
    id: "learning",
    name: "Learning",
    position: [1.17, 0, 2.68],
    radius: 0.82,
    seed: 61,
    topColor: "#bca76b",
    sandColor: "#ead39a",
    rockColor: "#887b68",
    accentColor: "#f0ba67",
    labelTop: "54.5%",
    labelLeft: "61%",
    labelRotation: "3deg",
    treeStyle: "palm",
    density: 6,
  },
];

export const ISLAND_BY_ID = Object.fromEntries(
  ISLANDS.map((island) => [island.id, island]),
) as Record<IslandId, IslandDefinition>;
