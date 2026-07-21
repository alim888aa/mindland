import { v } from "convex/values";

export {
  isIslandDetailKey,
  isIslandMilestoneDetailKey,
  islandDetailKeys,
  islandMilestoneDetailKeys,
  type IslandDetailKey,
  type IslandMilestoneDetailKey,
} from "../src/domain/island-visual-details";

export const islandDetailKeyValidator = v.union(
  v.literal("sapling"),
  v.literal("flowerPatch"),
  v.literal("gardenBed"),
  v.literal("trailMarker"),
  v.literal("restBench"),
  v.literal("bookStack"),
  v.literal("practiceMarker"),
  v.literal("warmLantern"),
);

export const islandMilestoneDetailKeyValidator = v.union(
  v.literal("grove"),
  v.literal("hill"),
  v.literal("windingPath"),
  v.literal("smallShelter"),
  v.literal("lookout"),
);
