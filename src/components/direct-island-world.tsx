import { Component, type ReactNode } from "react";
import {
  PixelRatio,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  type GestureStateChangeEvent,
  type GestureUpdateEvent,
  type PanGestureHandlerEventPayload,
  type PinchGestureHandlerEventPayload,
  type TapGestureHandlerEventPayload,
} from "react-native-gesture-handler";
import { Canvas, type CanvasRef } from "react-native-webgpu";
import * as THREE from "three/webgpu";

import { type IslandId, type RuntimeIslandWorld } from "../data/islands";
import {
  clampCameraPoseToWorld,
  cancelCameraTransition,
  createHomeCameraTarget,
  createIslandCameraTarget,
  createWorldCameraTarget,
  expandBoundsToContainCameraPose,
  followMovingFocalPoint,
  getCameraTransitionResponseRate,
  getDistanceToFrameBounds,
  isCameraPoseSettled,
  preserveFocalPointWhileZooming,
  stepCameraPose,
  type MapCameraDistanceRange,
  type MapCameraPose,
  type UnitGroundFootprint,
} from "../lib/map-camera-controller";
import {
  createIslandScene,
  type IslandScene,
} from "../lib/island-scene-builder";
import { makeWebGPURenderer } from "../lib/make-webgpu-renderer";
import type { WorldBounds, WorldPoint } from "../lib/world-layout";
import {
  publishWorldView,
  resetWorldView,
  type IslandScreenPoint,
} from "../lib/world-view-store";

type DirectIslandWorldProps = {
  islandWorld: RuntimeIslandWorld;
  selectedIsland: IslandId | null;
  navigationEnabled?: boolean;
  onRequestOverview?: () => void;
  onReady?: (worldKey: string) => void;
  children?: ReactNode;
};

type DirectIslandWorldState = {
  startupFailed: boolean;
  canvasGeneration: number;
};

const PINCH_TO_OVERVIEW_MULTIPLIER = 1.24;
const MINIMUM_HOME_TERRITORY_WIDTH_RATIO = 0.3;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const makeBoundarySegment = (
  start: WorldPoint,
  end: WorldPoint,
  material: THREE.Material,
  radius: number,
) => {
  const direction = new THREE.Vector3(end.x - start.x, 0, end.z - start.z);
  const length = direction.length();
  if (length < 0.001) return null;
  const boundary = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, 7, 1),
    material,
  );
  boundary.position.set((start.x + end.x) / 2, 0.045, (start.z + end.z) / 2);
  boundary.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  );
  return boundary;
};

const makeBoundaryJoint = (
  point: WorldPoint,
  material: THREE.Material,
  radius: number,
) => {
  const joint = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 8, 5),
    material,
  );
  joint.position.set(point.x, 0.045, point.z);
  joint.scale.y = 0.5;
  return joint;
};

const edgeKey = (first: WorldPoint, second: WorldPoint) => {
  const pointKey = (point: WorldPoint) =>
    `${point.x.toFixed(3)},${point.z.toFixed(3)}`;
  const keys = [pointKey(first), pointKey(second)].sort();
  return `${keys[0]}:${keys[1]}`;
};

const pointKey = (point: WorldPoint) =>
  `${point.x.toFixed(3)},${point.z.toFixed(3)}`;

const copyPose = (pose: MapCameraPose): MapCameraPose => ({
  center: { ...pose.center },
  distance: pose.distance,
});

export class DirectIslandWorld extends Component<
  DirectIslandWorldProps,
  DirectIslandWorldState
> {
  state: DirectIslandWorldState = {
    startupFailed: false,
    canvasGeneration: 0,
  };
  private canvas: CanvasRef | null = null;
  private renderer: THREE.WebGPURenderer | null = null;
  private world: IslandScene | null = null;
  private mounted = false;
  private starting = false;
  private renderingGeneration = 0;
  private viewport = { width: 0, height: 0 };
  private distanceRange: MapCameraDistanceRange = {
    minimum: 2,
    maximum: 16,
  };
  private unitFootprint: UnitGroundFootprint = {
    minX: -0.4,
    maxX: 0.4,
    minZ: -0.5,
    maxZ: 0.5,
  };
  private currentPose: MapCameraPose = {
    center: { x: 0, z: 0 },
    distance: 10,
  };
  private targetPose: MapCameraPose = copyPose(this.currentPose);
  private cameraResponseRate = getCameraTransitionResponseRate(null);
  private homePose: MapCameraPose = copyPose(this.currentPose);
  private navigationBounds: WorldBounds = {
    minX: -1,
    maxX: 1,
    minZ: -1,
    maxZ: 1,
  };
  private islandPoses = {} as Record<IslandId, MapCameraPose>;
  private lastFrameTime = 0;
  private panAnchor: WorldPoint | null = null;
  private pinchStartPose: MapCameraPose | null = null;
  private pinchFocalPoint: WorldPoint | null = null;
  private gestureActive = false;
  private preservePoseOnNextClear = false;
  private lastScreenPoints: Partial<Record<IslandId, IslandScreenPoint>> = {};
  private lastMoving = false;
  private lastLabelScale = 1;
  private lastLabelsVisible = true;
  private readyPublished = false;
  private projectionPoint = new THREE.Vector3();
  private screenPointScratch: Record<IslandId, IslandScreenPoint> = {};

  // Keep these callbacks outside the gesture builder. Reanimated's builder
  // transform can strip a class instance from inline callbacks even when the
  // gesture is explicitly configured for the JavaScript thread.
  private handlePanStart = (
    event: GestureStateChangeEvent<PanGestureHandlerEventPayload>,
  ) => {
    if (this.props.navigationEnabled === false) return;
    this.gestureActive = true;
    this.targetPose = cancelCameraTransition(this.currentPose);
    this.panAnchor =
      this.world?.getGroundPointForPose(event.x, event.y, this.currentPose) ??
      null;
  };

  private handlePanUpdate = (
    event: GestureUpdateEvent<PanGestureHandlerEventPayload>,
  ) => {
    if (
      this.props.navigationEnabled === false ||
      !this.panAnchor ||
      !this.world
    ) {
      return;
    }
    const point = this.world.getGroundPointForPose(
      event.x,
      event.y,
      this.targetPose,
    );
    if (!point) return;
    const clamped = clampCameraPoseToWorld(
      {
        distance: this.targetPose.distance,
        center: {
          x: this.targetPose.center.x + this.panAnchor.x - point.x,
          z: this.targetPose.center.z + this.panAnchor.z - point.z,
        },
      },
      this.navigationBounds,
      this.unitFootprint,
      this.distanceRange,
    );
    this.targetPose = clamped;
    this.currentPose = copyPose(clamped);
  };

  private handlePanFinalize = () => {
    this.panAnchor = null;
    this.gestureActive = false;
  };

  private handlePinchStart = (
    event: GestureStateChangeEvent<PinchGestureHandlerEventPayload>,
  ) => {
    if (this.props.navigationEnabled === false || !this.world) return;
    this.gestureActive = true;
    const renderedPose = cancelCameraTransition(this.currentPose);
    this.targetPose = copyPose(renderedPose);
    this.pinchStartPose = copyPose(renderedPose);
    this.pinchFocalPoint = this.world.getGroundPointForPose(
      event.focalX,
      event.focalY,
      renderedPose,
    );
  };

  private handlePinchUpdate = (
    event: GestureUpdateEvent<PinchGestureHandlerEventPayload>,
  ) => {
    if (
      this.props.navigationEnabled === false ||
      !this.pinchStartPose ||
      !this.pinchFocalPoint ||
      !this.world
    ) {
      return;
    }
    const zoomed = preserveFocalPointWhileZooming(
      this.pinchStartPose,
      this.pinchFocalPoint,
      this.pinchStartPose.distance / Math.max(event.scale, 0.01),
      this.distanceRange,
    );
    const currentGroundPoint = this.world.getGroundPointForPose(
      event.focalX,
      event.focalY,
      zoomed,
    );
    const next = currentGroundPoint
      ? followMovingFocalPoint(zoomed, this.pinchFocalPoint, currentGroundPoint)
      : zoomed;
    const clamped = clampCameraPoseToWorld(
      next,
      this.navigationBounds,
      this.unitFootprint,
      this.distanceRange,
    );
    this.targetPose = clamped;
    this.currentPose = copyPose(clamped);

    const selected = this.props.selectedIsland;
    const selectedPose = selected ? this.islandPoses[selected] : undefined;
    if (
      selectedPose &&
      clamped.distance > selectedPose.distance * PINCH_TO_OVERVIEW_MULTIPLIER
    ) {
      this.preservePoseOnNextClear = true;
      this.props.onRequestOverview?.();
    }
  };

  private handlePinchFinalize = () => {
    this.pinchStartPose = null;
    this.pinchFocalPoint = null;
    this.gestureActive = false;
  };

  private handleHomeEnd = (
    _event: GestureStateChangeEvent<TapGestureHandlerEventPayload>,
    success: boolean,
  ) => {
    if (!success || this.props.navigationEnabled === false) return;
    this.targetPose = copyPose(this.homePose);
    this.preservePoseOnNextClear = false;
    this.props.onRequestOverview?.();
  };

  private panGesture = Gesture.Pan()
    .maxPointers(1)
    .minDistance(5)
    .cancelsTouchesInView(false)
    .runOnJS(true)
    .onStart(this.handlePanStart)
    .onUpdate(this.handlePanUpdate)
    .onFinalize(this.handlePanFinalize);

  private pinchGesture = Gesture.Pinch()
    .cancelsTouchesInView(false)
    .runOnJS(true)
    .onStart(this.handlePinchStart)
    .onUpdate(this.handlePinchUpdate)
    .onFinalize(this.handlePinchFinalize);

  private homeGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDistance(18)
    .maxDelay(280)
    .cancelsTouchesInView(false)
    .runOnJS(true)
    .onEnd(this.handleHomeEnd);

  private mapGesture = Gesture.Simultaneous(
    this.pinchGesture,
    Gesture.Race(this.panGesture, this.homeGesture),
  );

  componentDidMount() {
    this.mounted = true;
    resetWorldView();
    void this.start();
  }

  componentDidUpdate(previousProps: DirectIslandWorldProps) {
    if (previousProps.selectedIsland !== this.props.selectedIsland) {
      this.cameraResponseRate = getCameraTransitionResponseRate(
        this.props.selectedIsland,
      );
      if (this.props.selectedIsland) {
        const selectedPose = this.islandPoses[this.props.selectedIsland];
        if (selectedPose) this.targetPose = copyPose(selectedPose);
      } else if (this.preservePoseOnNextClear) {
        this.preservePoseOnNextClear = false;
      } else {
        this.targetPose = copyPose(this.homePose);
      }
    }
  }

  componentWillUnmount() {
    this.mounted = false;
    resetWorldView();
    this.disposeRenderingResources();
  }

  private clampPose(pose: MapCameraPose) {
    return clampCameraPoseToWorld(
      pose,
      this.navigationBounds,
      this.unitFootprint,
      this.distanceRange,
    );
  }

  private setCanvas = (canvas: CanvasRef | null) => {
    this.canvas = canvas;
    void this.start();
  };

  private disposeRenderingResources = (
    renderer = this.renderer,
    world = this.world,
  ) => {
    this.renderingGeneration += 1;
    try {
      renderer?.setAnimationLoop(null);
    } catch {
      // A partially initialized WebGPU renderer may reject cleanup calls.
    }
    try {
      world?.dispose();
    } catch {
      // Continue releasing the renderer even if scene disposal fails.
    }
    try {
      renderer?.dispose();
    } catch {
      // Cleanup must never turn a recoverable rendering failure into a crash.
    }
    if (this.renderer === renderer) this.renderer = null;
    if (this.world === world) this.world = null;
  };

  private retryStart = () => {
    if (this.starting) return;
    this.disposeRenderingResources();
    this.canvas = null;
    this.lastFrameTime = 0;
    resetWorldView();
    this.setState((state) => ({
      startupFailed: false,
      canvasGeneration: state.canvasGeneration + 1,
    }));
  };

  private reportRenderingFailure = (
    error: unknown,
    renderer: THREE.WebGPURenderer | null,
    world: IslandScene | null,
  ) => {
    this.disposeRenderingResources(renderer, world);
    resetWorldView();
    if (this.mounted) this.setState({ startupFailed: true });
    console.warn(
      "Mindland map rendering paused and can be retried.",
      error instanceof Error ? error.message : "Unknown WebGPU error",
    );
  };

  private observeDeviceLoss = (
    renderer: THREE.WebGPURenderer,
    world: IslandScene,
    generation: number,
  ) => {
    const backend = renderer.backend as unknown as { device?: GPUDevice };
    const deviceLost = backend.device?.lost;
    if (!deviceLost) return;

    void deviceLost.then(
      (info) => {
        if (
          !this.mounted ||
          this.renderingGeneration !== generation ||
          this.renderer !== renderer ||
          this.world !== world
        ) {
          return;
        }
        const detail = info.message || info.reason || "Unknown GPU device loss";
        this.reportRenderingFailure(
          new Error(`The GPU device was lost: ${detail}`),
          renderer,
          world,
        );
      },
      (error: unknown) => {
        if (
          !this.mounted ||
          this.renderingGeneration !== generation ||
          this.renderer !== renderer ||
          this.world !== world
        ) {
          return;
        }
        this.reportRenderingFailure(error, renderer, world);
      },
    );
  };

  private setViewport = (event: LayoutChangeEvent) => {
    this.viewport = {
      width: event.nativeEvent.layout.width,
      height: event.nativeEvent.layout.height,
    };
    if (!this.world) return;
    this.world.resize(this.viewport.width, this.viewport.height);
    this.recalculateCameraTargets(false);
  };

  private recalculateCameraTargets = (initial: boolean) => {
    if (!this.world) return;
    this.unitFootprint = this.world.getUnitGroundFootprint();
    const unrestricted = { minimum: 0.2, maximum: 100 };
    const provisionalWorld = createWorldCameraTarget(
      this.props.islandWorld.layout.bounds,
      this.unitFootprint,
      unrestricted,
    );
    const islands = this.props.islandWorld.islands;
    const closeUpRadius =
      Math.max(1.12, ...islands.map((island) => island.territoryRadius)) * 0.8;
    const closeUpBounds = {
      minX: -closeUpRadius,
      maxX: closeUpRadius,
      minZ: -closeUpRadius,
      maxZ: closeUpRadius,
    };
    this.distanceRange = {
      minimum: getDistanceToFrameBounds(
        closeUpBounds,
        this.unitFootprint,
        unrestricted,
        1.08,
      ),
      maximum: provisionalWorld.distance,
    };
    const homeTarget = createHomeCameraTarget(
      islands.map((island) => ({
        id: island.id,
        position: { x: island.position[0], z: island.position[2] },
        radius: island.territoryRadius,
      })),
      this.props.islandWorld.layout.bounds,
      this.unitFootprint,
      this.distanceRange,
      5,
      1.35,
    );
    const horizontalUnitFootprint =
      this.unitFootprint.maxX - this.unitFootprint.minX;
    const smallestTerritoryDiameter = Math.min(
      ...islands.map((island) => island.territoryRadius * 2),
    );
    const largestDistanceForMinimumTerritoryWidth =
      smallestTerritoryDiameter /
      (horizontalUnitFootprint * MINIMUM_HOME_TERRITORY_WIDTH_RATIO);
    const homeDistance = Math.min(
      homeTarget.pose.distance,
      largestDistanceForMinimumTerritoryWidth,
    );
    const footprintCenter = {
      x: (this.unitFootprint.minX + this.unitFootprint.maxX) / 2,
      z: (this.unitFootprint.minZ + this.unitFootprint.maxZ) / 2,
    };
    const framedCenter = {
      x:
        homeTarget.pose.center.x +
        footprintCenter.x * homeTarget.pose.distance,
      z:
        homeTarget.pose.center.z +
        footprintCenter.z * homeTarget.pose.distance,
    };
    this.distanceRange.maximum = homeDistance;
    this.homePose = {
      distance: homeDistance,
      // The diagonal camera makes the ground footprint asymmetric. Target the
      // island cluster itself so its visual center stays near screen center.
      center: framedCenter,
    };
    this.navigationBounds = expandBoundsToContainCameraPose(
      this.props.islandWorld.layout.bounds,
      this.unitFootprint,
      this.homePose,
    );
    this.islandPoses = Object.fromEntries(
      islands.map((island) => {
        const framed = createIslandCameraTarget(
          this.props.islandWorld.territoryBoundsById[island.id],
          this.unitFootprint,
          this.distanceRange,
          1.24,
        );
        return [island.id, copyPose(framed)];
      }),
    ) as Record<IslandId, MapCameraPose>;

    if (initial) {
      const selectedPose = this.props.selectedIsland
        ? this.islandPoses[this.props.selectedIsland]
        : undefined;
      const initialPose = selectedPose ?? this.homePose;
      this.currentPose = copyPose(initialPose);
      this.targetPose = copyPose(initialPose);
    } else {
      this.currentPose = this.clampPose(this.currentPose);
      const selectedPose = this.props.selectedIsland
        ? this.islandPoses[this.props.selectedIsland]
        : undefined;
      this.targetPose = selectedPose
        ? copyPose(selectedPose)
        : this.clampPose(this.targetPose);
    }
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

    const sharedMaterial = new THREE.MeshBasicMaterial({
      color: "#d7fff8",
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    const outerMaterial = new THREE.MeshBasicMaterial({
      color: "#d7fff8",
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    });
    const edges = new Map<
      string,
      { start: WorldPoint; end: WorldPoint; count: number }
    >();
    for (const territory of this.props.islandWorld.layout.territories) {
      for (let index = 0; index < territory.points.length; index += 1) {
        const start = territory.points[index];
        const end = territory.points[(index + 1) % territory.points.length];
        const key = edgeKey(start, end);
        const existing = edges.get(key);
        if (existing) existing.count += 1;
        else edges.set(key, { start, end, count: 1 });
      }
    }
    const joints = new Map<
      string,
      { point: WorldPoint; material: THREE.Material; radius: number }
    >();
    for (const edge of edges.values()) {
      const material = edge.count > 1 ? sharedMaterial : outerMaterial;
      const radius = edge.count > 1 ? 0.014 : 0.012;
      const boundary = makeBoundarySegment(
        edge.start,
        edge.end,
        material,
        radius,
      );
      if (boundary) world.scene.add(boundary);
      for (const point of [edge.start, edge.end]) {
        const key = pointKey(point);
        const existing = joints.get(key);
        if (!existing || edge.count > 1) {
          joints.set(key, { point, material, radius: radius * 1.6 });
        }
      }
    }
    for (const joint of joints.values()) {
      world.scene.add(
        makeBoundaryJoint(joint.point, joint.material, joint.radius),
      );
    }
  };

  private publishScreenPositions = (
    camera: THREE.PerspectiveCamera,
    isMoving: boolean,
  ) => {
    if (this.viewport.width <= 0 || this.viewport.height <= 0) return;
    const labelScale = clamp(
      this.homePose.distance / Math.max(this.currentPose.distance, 0.01),
      0.62,
      1.45,
    );
    const labelsVisible =
      this.currentPose.distance <= this.homePose.distance * 1.32;
    let changed =
      isMoving !== this.lastMoving ||
      Math.abs(labelScale - this.lastLabelScale) > 0.015 ||
      labelsVisible !== this.lastLabelsVisible;

    for (const island of this.props.islandWorld.islands) {
      const projected = this.projectionPoint.set(
        island.position[0],
        0.78 * island.landScale,
        island.position[2],
      );
      projected.project(camera);
      const point = this.screenPointScratch[island.id];
      point.x = ((projected.x + 1) / 2) * this.viewport.width;
      point.y = ((1 - projected.y) / 2) * this.viewport.height;
      point.visible = projected.z > -1 && projected.z < 1;
      const previous = this.lastScreenPoints[island.id];
      if (
        !previous ||
        Math.abs(previous.x - point.x) > 0.6 ||
        Math.abs(previous.y - point.y) > 0.6 ||
        previous.visible !== point.visible
      ) {
        changed = true;
      }
    }

    if (changed) {
      const islandPoints = Object.fromEntries(
        this.props.islandWorld.islands.map((island) => [
          island.id,
          { ...this.screenPointScratch[island.id] },
        ]),
      ) as Record<IslandId, IslandScreenPoint>;
      this.lastScreenPoints = islandPoints;
      this.lastMoving = isMoving;
      this.lastLabelScale = labelScale;
      this.lastLabelsVisible = labelsVisible;
      publishWorldView({
        islandPoints,
        isMoving,
        labelScale,
        labelsVisible,
      });
    }
  };

  private start = async () => {
    if (!this.mounted || !this.canvas || this.renderer || this.starting) return;
    this.starting = true;
    const generation = ++this.renderingGeneration;
    let world: IslandScene | null = null;
    let renderer: THREE.WebGPURenderer | null = null;
    try {
      const context = this.canvas.getContext("webgpu");
      if (!context) throw new Error("WebGPU context is unavailable");

      this.screenPointScratch = Object.fromEntries(
        this.props.islandWorld.islands.map((island) => [
          island.id,
          { x: 0, y: 0, visible: false } satisfies IslandScreenPoint,
        ]),
      );
      world = await createIslandScene(
        context.canvas.width,
        context.canvas.height,
        this.props.islandWorld,
      );
      if (!this.mounted || this.renderer) {
        this.disposeRenderingResources(null, world);
        return;
      }
      if (this.viewport.width > 0 && this.viewport.height > 0) {
        world.resize(this.viewport.width, this.viewport.height);
      }
      this.world = world;
      this.configureScene(world);
      this.recalculateCameraTargets(true);
      world.update(0, this.currentPose);

      renderer = makeWebGPURenderer(context);
      this.renderer = renderer;
      renderer.setPixelRatio(Math.min(PixelRatio.get(), 2));
      renderer.shadowMap.enabled = false;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      await renderer.init();
      if (!this.mounted) {
        this.disposeRenderingResources(renderer, world);
        return;
      }
      if (this.state.startupFailed) this.setState({ startupFailed: false });
      const activeWorld = world;
      const activeRenderer = renderer;
      this.observeDeviceLoss(activeRenderer, activeWorld, generation);

      activeRenderer.setAnimationLoop((time) => {
        if (this.renderingGeneration !== generation) return;
        try {
          const elapsedSeconds = this.lastFrameTime
            ? Math.min((time - this.lastFrameTime) / 1000, 0.05)
            : 1 / 60;
          this.lastFrameTime = time;
          if (!this.gestureActive) {
            this.currentPose = stepCameraPose(
              this.currentPose,
              this.targetPose,
              elapsedSeconds,
              this.cameraResponseRate,
            );
          }
          activeWorld.update(time, this.currentPose);

          const isMoving =
            this.gestureActive ||
            !isCameraPoseSettled(this.currentPose, this.targetPose, 0.002);
          this.publishScreenPositions(activeWorld.camera, isMoving);
          activeRenderer.render(activeWorld.scene, activeWorld.camera);
          context.present();
          if (!this.readyPublished) {
            this.readyPublished = true;
            this.props.onReady?.(this.props.islandWorld.key);
          }
        } catch (error) {
          this.reportRenderingFailure(error, activeRenderer, activeWorld);
        }
      });
    } catch (error) {
      this.reportRenderingFailure(error, renderer, world);
    } finally {
      this.starting = false;
    }
  };

  render() {
    return (
      <GestureDetector gesture={this.mapGesture}>
        <View
          collapsable={false}
          onLayout={this.setViewport}
          style={StyleSheet.absoluteFill}
        >
          <Canvas
            key={this.state.canvasGeneration}
            ref={this.setCanvas}
            pointerEvents="none"
            style={styles.canvas}
          />
          {this.props.children}
          {this.state.startupFailed ? (
            <View style={styles.fallback}>
              <Text style={styles.fallbackTitle}>
                The water needs a moment.
              </Text>
              <Pressable onPress={this.retryStart} style={styles.retryButton}>
                <Text style={styles.retryLabel}>Try again</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </GestureDetector>
    );
  }
}

const styles = StyleSheet.create({
  canvas: { flex: 1 },
  fallback: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(140, 222, 218, 0.72)",
    gap: 16,
  },
  fallbackTitle: {
    color: "#244947",
    fontSize: 18,
    fontWeight: "600",
  },
  retryButton: {
    borderColor: "rgba(255, 255, 255, 0.72)",
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "rgba(255, 255, 255, 0.42)",
    paddingHorizontal: 22,
    paddingVertical: 11,
  },
  retryLabel: {
    color: "#244947",
    fontSize: 16,
    fontWeight: "700",
  },
});
