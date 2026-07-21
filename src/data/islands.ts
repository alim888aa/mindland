import {
  createWorldLayout,
  type WorldLayout,
  type WorldLayoutInput,
} from "../lib/world-layout.ts";
import {
  calculateIslandLandScale,
  EMPTY_ISLAND_GROWTH,
  growthVisualKey,
  normalizeStoredIslandGrowth,
  type IslandGrowthVisualState,
  type StoredIslandGrowth,
} from "../lib/island-growth-rendering.ts";
import { LAND_GROWTH_POINT_CAP } from "../domain/island-growth.ts";
import type { IslandQuestion } from "../lib/island-questionnaires.ts";

export type IslandId = string;

export type IslandVisualThemeKey =
  | "health"
  | "relationships"
  | "work"
  | "learning";

export type OwnedIslandRecord = {
  id: string;
  islandKey: string;
  name: string;
  purpose: string;
  visualThemeKey: IslandVisualThemeKey;
  visualSeed: number;
  createdAt: number;
  questionnaire?: readonly IslandQuestion[] | null;
};

export type IslandGrowthRecord = StoredIslandGrowth;

type IslandVisualTheme = {
  topColor: string;
  sandColor: string;
  rockColor: string;
  accentColor: string;
  treeStyle: "pine" | "blossom" | "mixed" | "palm";
  density: number;
};

export type IslandDefinition = IslandVisualTheme & {
  id: IslandId;
  islandKey: string;
  name: string;
  purpose: string;
  visualThemeKey: IslandVisualThemeKey;
  position: [number, number, number];
  relatedTo: readonly IslandId[];
  radius: number;
  territoryRadius: number;
  startingLandScale: number;
  maximumLandScale: number;
  landScale: number;
  growth: IslandGrowthVisualState;
  seed: number;
  labelRotation: `${number}deg`;
  isPreview: boolean;
  questionnaire: readonly IslandQuestion[] | null;
};

export type IslandTerritoryBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type RuntimeIslandWorld = {
  identityKey: string;
  key: string;
  islands: IslandDefinition[];
  islandById: Readonly<Record<IslandId, IslandDefinition>>;
  layout: WorldLayout<IslandId>;
  territoryBoundsById: Readonly<Record<IslandId, IslandTerritoryBounds>>;
  isPreview: boolean;
};

const ISLAND_RADIUS = 1.12;
const TERRITORY_RADIUS = 1.12;
// The terrain mesh has its own base radius. These scales make the rendered
// shoreline occupy roughly 30% to 80% of the enlarged territory hexagon.
const STARTING_LAND_SCALE = 0.42;
const MAXIMUM_LAND_SCALE = 1.12;

const VISUAL_THEMES: Record<IslandVisualThemeKey, IslandVisualTheme> = {
  health: {
    topColor: "#88a950",
    sandColor: "#d8c789",
    rockColor: "#7f806e",
    accentColor: "#d5ef99",
    treeStyle: "mixed",
    density: 14,
  },
  relationships: {
    topColor: "#b88a63",
    sandColor: "#e1bf89",
    rockColor: "#8d7263",
    accentColor: "#ee8f86",
    treeStyle: "blossom",
    density: 11,
  },
  work: {
    topColor: "#829953",
    sandColor: "#cdbf8c",
    rockColor: "#74796b",
    accentColor: "#c6d79b",
    treeStyle: "pine",
    density: 8,
  },
  learning: {
    topColor: "#bca76b",
    sandColor: "#ead39a",
    rockColor: "#887b68",
    accentColor: "#f0ba67",
    treeStyle: "palm",
    density: 6,
  },
};

const labelRotationForSeed = (seed: number): `${number}deg` => {
  const degrees = ((Math.abs(Math.trunc(seed)) % 7) - 3) as number;
  return `${degrees}deg`;
};

const territoryBounds = (
  layout: WorldLayout<IslandId>,
): Record<IslandId, IslandTerritoryBounds> =>
  Object.fromEntries(
    layout.territories.map((territory) => [
      territory.id,
      territory.points.reduce<IslandTerritoryBounds>(
        (value, point) => ({
          minX: Math.min(value.minX, point.x),
          maxX: Math.max(value.maxX, point.x),
          minZ: Math.min(value.minZ, point.z),
          maxZ: Math.max(value.maxZ, point.z),
        }),
        {
          minX: Infinity,
          maxX: -Infinity,
          minZ: Infinity,
          maxZ: -Infinity,
        },
      ),
    ]),
  );

const makeWorld = (
  records: readonly OwnedIslandRecord[],
  isPreview: boolean,
  growthRecords: readonly IslandGrowthRecord[],
  growthStepsToMaximum: number | null,
): RuntimeIslandWorld => {
  const orderedRecords = [...records].sort(
    (first, second) =>
      first.createdAt - second.createdAt ||
      first.islandKey.localeCompare(second.islandKey),
  );
  const layout = createWorldLayout(
    orderedRecords.map(
      (record): WorldLayoutInput<IslandId> => ({
        id: record.id,
        relatedTo: [],
        territoryRadius: TERRITORY_RADIUS,
      }),
    ),
  );
  const recordById = Object.fromEntries(
    orderedRecords.map((record) => [record.id, record]),
  );
  const growthByIslandId = new Map(
    growthRecords.map((growth) => [growth.islandId, growth]),
  );
  const islands = layout.items.map((item): IslandDefinition => {
    const record = recordById[item.id];
    const theme = VISUAL_THEMES[record.visualThemeKey];
    const growth = isPreview
      ? EMPTY_ISLAND_GROWTH
      : normalizeStoredIslandGrowth(growthByIslandId.get(record.id));
    return {
      ...theme,
      id: record.id,
      islandKey: record.islandKey,
      name: record.name,
      purpose: record.purpose,
      visualThemeKey: record.visualThemeKey,
      position: [item.position.x, 0, item.position.z],
      relatedTo: [],
      radius: ISLAND_RADIUS,
      territoryRadius: TERRITORY_RADIUS,
      startingLandScale: STARTING_LAND_SCALE,
      maximumLandScale: MAXIMUM_LAND_SCALE,
      landScale: calculateIslandLandScale({
        growthStepCount: Math.min(
          growth.lifetimePositivePoints,
          LAND_GROWTH_POINT_CAP,
        ),
        startingLandScale: STARTING_LAND_SCALE,
        maximumLandScale: MAXIMUM_LAND_SCALE,
        growthStepsToMaximum,
      }),
      growth,
      seed: record.visualSeed,
      labelRotation: labelRotationForSeed(record.visualSeed),
      isPreview,
      questionnaire: record.questionnaire ?? null,
    };
  });
  const islandById = Object.fromEntries(
    islands.map((island) => [island.id, island]),
  );
  const sourceKey = orderedRecords
    .map((record) => {
      const growth = isPreview
        ? EMPTY_ISLAND_GROWTH
        : normalizeStoredIslandGrowth(growthByIslandId.get(record.id));
      return `${record.id}:${record.visualThemeKey}:${record.visualSeed}:${record.name}:${growthVisualKey(growth)}`;
    })
    .join("|");

  return {
    identityKey: `${isPreview ? "preview" : "owned"}:${orderedRecords
      .map((record) => record.id)
      .join("|")}`,
    key: `${isPreview ? "preview" : "owned"}:${sourceKey}`,
    islands,
    islandById,
    layout,
    territoryBoundsById: territoryBounds(layout),
    isPreview,
  };
};

export const createRuntimeIslandWorld = (
  records: readonly OwnedIslandRecord[],
  growthRecords: readonly IslandGrowthRecord[] = [],
  options: { growthStepsToMaximum: number | null } = {
    growthStepsToMaximum: LAND_GROWTH_POINT_CAP,
  },
) => makeWorld(records, false, growthRecords, options.growthStepsToMaximum);

export const createPreviewIslandWorld = (count: number) => {
  const safeCount = Math.max(0, Math.min(8, Math.trunc(count)));
  const themes = Object.keys(VISUAL_THEMES) as IslandVisualThemeKey[];
  const records = Array.from({ length: safeCount }, (_, index) => ({
    id: `preview-${index}`,
    islandKey: `preview-${index}`,
    name: "",
    purpose: "",
    visualThemeKey: themes[index % themes.length],
    visualSeed: 7_919 + index * 104_729,
    createdAt: index,
    questionnaire: null,
  }));
  return makeWorld(records, true, [], null);
};

export const selectVisibleIslandWorld = (
  records: readonly OwnedIslandRecord[],
  options: { onboardingActive: boolean; candidateCount: number },
  growthRecords: readonly IslandGrowthRecord[] = [],
) => {
  if (records.length > 0) {
    return createRuntimeIslandWorld(records, growthRecords);
  }
  if (options.onboardingActive) {
    return createPreviewIslandWorld(options.candidateCount);
  }
  return createRuntimeIslandWorld([]);
};

export const needsIslandMaterializationRepair = (value: {
  interviewStatus: "interviewing" | "readyToCreate" | "revealed" | "completed";
  candidateCount: number;
  ownedIslandCount: number;
}) =>
  (value.interviewStatus === "revealed" ||
    value.interviewStatus === "completed") &&
  value.candidateCount > 0 &&
  value.ownedIslandCount === 0;
