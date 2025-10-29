import * as THREE from 'three';

export class RendererManager {
  private renderer: THREE.WebGLRenderer;

  constructor() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      logarithmicDepthBuffer: true,
      powerPreference: "high-performance",
      stencil: false
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  public handleResize(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public appendToDOM(container: HTMLElement): void {
    container.appendChild(this.renderer.domElement);
  }
}
