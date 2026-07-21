import type { IslandId } from "../data/islands";

export type IslandScreenPoint = {
  x: number;
  y: number;
  visible: boolean;
};

type WorldViewSnapshot = {
  islandPoints: Partial<Record<IslandId, IslandScreenPoint>>;
  isMoving: boolean;
  labelScale: number;
  labelsVisible: boolean;
};

let snapshot: WorldViewSnapshot = {
  islandPoints: {},
  isMoving: false,
  labelScale: 1,
  labelsVisible: false,
};
const listeners = new Set<() => void>();

export const getWorldViewSnapshot = () => snapshot;

export const subscribeToWorldView = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const publishWorldView = (next: WorldViewSnapshot) => {
  snapshot = next;
  listeners.forEach((listener) => listener());
};

export const resetWorldView = () => {
  publishWorldView({
    islandPoints: {},
    isMoving: false,
    labelScale: 1,
    labelsVisible: false,
  });
};
