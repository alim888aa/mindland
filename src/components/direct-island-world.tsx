import { Component } from "react";
import {
  PanResponder,
  PixelRatio,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { Canvas, type CanvasRef } from "react-native-webgpu";
import * as THREE from "three/webgpu";

import {
  ISLANDS,
  ISLAND_BY_ID,
  WORLD_LAYOUT,
  type IslandId,
} from "../data/islands";
import { createIslandScene, type IslandScene } from "../lib/island-scene-builder";
import { makeWebGPURenderer } from "../lib/make-webgpu-renderer";
import { publishWorldView, type IslandScreenPoint } from "../lib/world-view-store";

type DirectIslandWorldProps = {
  selectedIsland: IslandId | null;
};

type PanPoint = {
  x: number;
  z: number;
};

// Gesture speed and visible camera footprint are prototype tuning values. They
// can move into a camera policy once the world is tested with more island counts.
const CAMERA_PROTOTYPE = {
  worldUnitsPerPoint: 0.0085,
  inertia: 0.52,
  followStrength: 0.16,
  visibleHalfWidth: 1.45,
  visibleHalfDepth: 2.55,
  overviewTargetZ: 0.45,
} as const;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const makeBoundarySegment = (
  start: { x: number; z: number },
  end: { x: number; z: number },
  material: THREE.Material,
  radius: number,
) => {
  const direction = new THREE.Vector3(end.x - start.x, 0, end.z - start.z);
  const length = direction.length();
  if (length < 0.001) return null;
  const boundary = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, 5, 1),
    material,
  );
  boundary.position.set((start.x + end.x) / 2, 0.045, (start.z + end.z) / 2);
  boundary.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  );
  return boundary;
};

const edgeKey = (first: { x: number; z: number }, second: { x: number; z: number }) => {
  const pointKey = (point: { x: number; z: number }) =>
    `${point.x.toFixed(3)},${point.z.toFixed(3)}`;
  const keys = [pointKey(first), pointKey(second)].sort();
  return `${keys[0]}:${keys[1]}`;
};

export class DirectIslandWorld extends Component<DirectIslandWorldProps> {
  private canvas: CanvasRef | null = null;
  private renderer: THREE.WebGPURenderer | null = null;
  private world: IslandScene | null = null;
  private mounted = false;
  private starting = false;
  private viewport = { width: 0, height: 0 };
  private panStart: PanPoint = { x: 0, z: 0 };
  private desiredPan: PanPoint = { x: 0, z: 0 };
  private currentPan: PanPoint = { x: 0, z: 0 };
  private appliedPan: PanPoint = { x: 0, z: 0 };
  private lastScreenPoints: Partial<Record<IslandId, IslandScreenPoint>> = {};
  private lastMoving = false;
  private lastSelectedIsland: IslandId | null = null;
  private selectionLookTarget = new THREE.Vector3(0, 0.2, CAMERA_PROTOTYPE.overviewTargetZ);

  private panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) =>
      !this.props.selectedIsland && Math.abs(gesture.dx) + Math.abs(gesture.dy) > 5,
    onPanResponderGrant: () => {
      this.panStart = { ...this.desiredPan };
    },
    onPanResponderMove: (_, gesture) => {
      if (this.props.selectedIsland) return;
      this.setDesiredPan(
        this.panStart.x - gesture.dx * CAMERA_PROTOTYPE.worldUnitsPerPoint,
        this.panStart.z - gesture.dy * CAMERA_PROTOTYPE.worldUnitsPerPoint,
      );
    },
    onPanResponderRelease: (_, gesture) => {
      this.setDesiredPan(
        this.desiredPan.x - gesture.vx * CAMERA_PROTOTYPE.inertia,
        this.desiredPan.z - gesture.vy * CAMERA_PROTOTYPE.inertia,
      );
    },
    onPanResponderTerminate: () => {
      this.panStart = { ...this.desiredPan };
    },
  });

  componentDidMount() {
    this.mounted = true;
    void this.start();
  }

  componentWillUnmount() {
    this.mounted = false;
    this.renderer?.setAnimationLoop(null);
    this.renderer?.dispose();
  }

  private getPanLimits = () => ({
    minimumX:
      WORLD_LAYOUT.bounds.minX + CAMERA_PROTOTYPE.visibleHalfWidth,
    maximumX:
      WORLD_LAYOUT.bounds.maxX - CAMERA_PROTOTYPE.visibleHalfWidth,
    minimumZ:
      WORLD_LAYOUT.bounds.minZ +
      CAMERA_PROTOTYPE.visibleHalfDepth -
      CAMERA_PROTOTYPE.overviewTargetZ,
    maximumZ:
      WORLD_LAYOUT.bounds.maxZ -
      CAMERA_PROTOTYPE.visibleHalfDepth -
      CAMERA_PROTOTYPE.overviewTargetZ,
  });

  private setDesiredPan = (x: number, z: number) => {
    const limits = this.getPanLimits();
    this.desiredPan = {
      x: clamp(x, limits.minimumX, limits.maximumX),
      z: clamp(z, limits.minimumZ, limits.maximumZ),
    };
  };

  private setCanvas = (canvas: CanvasRef | null) => {
    this.canvas = canvas;
    void this.start();
  };

  private setViewport = (event: LayoutChangeEvent) => {
    this.viewport = {
      width: event.nativeEvent.layout.width,
      height: event.nativeEvent.layout.height,
    };
  };

  private configureScene = (world: IslandScene) => {
    world.scene.traverse((object) => {
      if (
        object instanceof THREE.Mesh &&
        object.geometry instanceof THREE.TubeGeometry
      ) {
        object.visible = false;
      }
    });

    for (const island of ISLANDS) {
      const group = world.scene.children.find(
        (child) =>
          child instanceof THREE.Group &&
          Math.abs(child.position.x - island.position[0]) < 0.001 &&
          Math.abs(child.position.z - island.position[2]) < 0.001,
      );
      if (group) {
        group.scale.set(
          island.overviewScale,
          island.overviewScale,
          island.overviewScale * 0.92,
        );
      }
    }

    const territoryMaterial = new THREE.MeshBasicMaterial({
      color: "#d7fff8",
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
    });
    const sharedEdges = new Map<
      string,
      { start: { x: number; z: number }; end: { x: number; z: number }; count: number }
    >();
    for (const territory of WORLD_LAYOUT.territories) {
      for (let index = 0; index < territory.points.length; index += 1) {
        const start = territory.points[index];
        const end = territory.points[(index + 1) % territory.points.length];
        const key = edgeKey(start, end);
        const existing = sharedEdges.get(key);
        if (existing) existing.count += 1;
        else sharedEdges.set(key, { start, end, count: 1 });
      }
    }
    for (const edge of sharedEdges.values()) {
      if (edge.count < 2) continue;
      const boundary = makeBoundarySegment(edge.start, edge.end, territoryMaterial, 0.014);
      if (boundary) world.scene.add(boundary);
    }

    const perimeterMaterial = new THREE.MeshBasicMaterial({
      color: "#e8fffa",
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
    });
    const { minX, maxX, minZ, maxZ } = WORLD_LAYOUT.bounds;
    const perimeterPoints = [
      { x: minX, z: minZ },
      { x: maxX, z: minZ },
      { x: maxX, z: maxZ },
      { x: minX, z: maxZ },
    ];
    for (let index = 0; index < perimeterPoints.length; index += 1) {
      const boundary = makeBoundarySegment(
        perimeterPoints[index],
        perimeterPoints[(index + 1) % perimeterPoints.length],
        perimeterMaterial,
        0.026,
      );
      if (boundary) world.scene.add(boundary);
    }
  };

  private publishScreenPositions = (camera: THREE.PerspectiveCamera, isMoving: boolean) => {
    if (this.viewport.width <= 0 || this.viewport.height <= 0) return;
    const islandPoints: Partial<Record<IslandId, IslandScreenPoint>> = {};
    let changed = isMoving !== this.lastMoving;

    for (const island of ISLANDS) {
      const projected = new THREE.Vector3(
        island.position[0],
        0.78 * island.overviewScale,
        island.position[2],
      ).project(camera);
      const point = {
        x: ((projected.x + 1) / 2) * this.viewport.width,
        y: ((1 - projected.y) / 2) * this.viewport.height,
        visible: projected.z > -1 && projected.z < 1,
      };
      const previous = this.lastScreenPoints[island.id];
      if (
        !previous ||
        Math.abs(previous.x - point.x) > 0.6 ||
        Math.abs(previous.y - point.y) > 0.6 ||
        previous.visible !== point.visible
      ) {
        changed = true;
      }
      islandPoints[island.id] = point;
    }

    if (changed) {
      this.lastScreenPoints = islandPoints;
      this.lastMoving = isMoving;
      publishWorldView({ islandPoints, isMoving });
    }
  };

  private start = async () => {
    if (!this.mounted || !this.canvas || this.renderer || this.starting) return;
    this.starting = true;

    const context = this.canvas.getContext("webgpu");
    if (!context) {
      this.starting = false;
      return;
    }

    const width = context.canvas.width;
    const height = context.canvas.height;
    const world = await createIslandScene(width, height);
    if (!this.mounted || this.renderer) {
      this.starting = false;
      return;
    }
    this.configureScene(world);
    const renderer = makeWebGPURenderer(context);
    this.world = world;
    this.renderer = renderer;
    renderer.setPixelRatio(Math.min(PixelRatio.get(), 2));
    renderer.shadowMap.enabled = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    await renderer.init();
    this.starting = false;
    if (!this.mounted) return;

    renderer.setAnimationLoop((time) => {
      const enteringSelection =
        Boolean(this.props.selectedIsland) && !this.lastSelectedIsland;
      if (!enteringSelection) {
        world.camera.position.x -= this.appliedPan.x;
        world.camera.position.z -= this.appliedPan.z;
      } else {
        this.selectionLookTarget.set(
          this.appliedPan.x,
          0.2,
          CAMERA_PROTOTYPE.overviewTargetZ + this.appliedPan.z,
        );
      }
      world.update(time, this.props.selectedIsland);

      if (this.props.selectedIsland) {
        const island = ISLAND_BY_ID[this.props.selectedIsland];
        this.selectionLookTarget.lerp(
          new THREE.Vector3(island.position[0], 0.55, island.position[2]),
          0.075,
        );
        world.camera.lookAt(this.selectionLookTarget);
        this.appliedPan = { x: 0, z: 0 };
        if (enteringSelection) {
          this.currentPan = { x: 0, z: 0 };
          this.desiredPan = { x: 0, z: 0 };
          this.panStart = { x: 0, z: 0 };
        }
      } else {
        this.currentPan.x +=
          (this.desiredPan.x - this.currentPan.x) * CAMERA_PROTOTYPE.followStrength;
        this.currentPan.z +=
          (this.desiredPan.z - this.currentPan.z) * CAMERA_PROTOTYPE.followStrength;
        this.appliedPan = { ...this.currentPan };
        world.camera.position.x += this.appliedPan.x;
        world.camera.position.z += this.appliedPan.z;
        world.camera.lookAt(
          this.appliedPan.x,
          0.2,
          CAMERA_PROTOTYPE.overviewTargetZ + this.appliedPan.z,
        );
      }

      const isMoving =
        Math.abs(this.desiredPan.x - this.currentPan.x) > 0.004 ||
        Math.abs(this.desiredPan.z - this.currentPan.z) > 0.004;
      this.publishScreenPositions(world.camera, isMoving);
      renderer.render(world.scene, world.camera);
      context.present();
      this.lastSelectedIsland = this.props.selectedIsland;
    });
  };

  render() {
    return (
      <View
        {...this.panResponder.panHandlers}
        onLayout={this.setViewport}
        style={StyleSheet.absoluteFill}
      >
        <Canvas ref={this.setCanvas} style={styles.canvas} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  canvas: { flex: 1 },
});
