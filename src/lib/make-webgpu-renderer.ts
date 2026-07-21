import type { NativeCanvas } from "react-native-webgpu";
import * as THREE from "three/webgpu";

export class ReactNativeCanvas {
  constructor(private readonly canvas: NativeCanvas) {}

  get width() {
    return this.canvas.width;
  }

  set width(width: number) {
    this.canvas.width = width;
  }

  get height() {
    return this.canvas.height;
  }

  set height(height: number) {
    this.canvas.height = height;
  }

  get clientWidth() {
    return this.canvas.width;
  }

  set clientWidth(width: number) {
    this.canvas.width = width;
  }

  get clientHeight() {
    return this.canvas.height;
  }

  set clientHeight(height: number) {
    this.canvas.height = height;
  }

  addEventListener(_type: string, _listener: EventListener) {}
  removeEventListener(_type: string, _listener: EventListener) {}
  dispatchEvent(_event: Event) {}
  setPointerCapture() {}
  releasePointerCapture() {}
}

export const makeWebGPURenderer = (
  context: GPUCanvasContext,
  { antialias = true }: { antialias?: boolean } = {},
) =>
  new THREE.WebGPURenderer({
    antialias,
    canvas: new ReactNativeCanvas(
      context.canvas as unknown as NativeCanvas,
    ) as unknown as HTMLCanvasElement,
    context,
  });
