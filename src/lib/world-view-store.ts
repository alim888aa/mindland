import type { IslandId } from "../data/islands";

export type IslandScreenPoint = {
  x: number;
  y: number;
  visible: boolean;
};

type WorldViewSnapshot = {
  islandPoints: Partial<Record<IslandId, IslandScreenPoint>>;
  isMoving: boolean;
};

let snapshot: WorldViewSnapshot = { islandPoints: {}, isMoving: false };
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
