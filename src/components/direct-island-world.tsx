import { Component } from "react";
import { PixelRatio, StyleSheet, View } from "react-native";
import { Canvas, type CanvasRef } from "react-native-webgpu";
import * as THREE from "three/webgpu";

import type { IslandId } from "../data/islands";
import { createIslandScene, type IslandScene } from "../lib/island-scene-builder";
import { makeWebGPURenderer } from "../lib/make-webgpu-renderer";

type DirectIslandWorldProps = {
  selectedIsland: IslandId | null;
};

export class DirectIslandWorld extends Component<DirectIslandWorldProps> {
  private canvas: CanvasRef | null = null;
  private renderer: THREE.WebGPURenderer | null = null;
  private world: IslandScene | null = null;
  private mounted = false;
  private starting = false;

  componentDidMount() {
    this.mounted = true;
    void this.start();
  }

  componentWillUnmount() {
    this.mounted = false;
    this.renderer?.setAnimationLoop(null);
    this.renderer?.dispose();
  }

  private setCanvas = (canvas: CanvasRef | null) => {
    this.canvas = canvas;
    void this.start();
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
      world.update(time, this.props.selectedIsland);
      renderer.render(world.scene, world.camera);
      context.present();
    });
  };

  render() {
    return (
      <View style={StyleSheet.absoluteFill}>
        <Canvas ref={this.setCanvas} style={styles.canvas} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  canvas: { flex: 1 },
});
