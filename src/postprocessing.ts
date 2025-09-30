import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';

export class PostProcessingSystem {
  private composer: EffectComposer;
  private outlinePass: OutlinePass;
  private smaaPass: SMAAPass;
  private renderPass: RenderPass;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    this.composer = new EffectComposer(renderer);
    this.renderPass = new RenderPass(scene, camera);
    this.outlinePass = this.createOutlinePass();
    this.smaaPass = this.createSMAAPass();

    this.setupComposer();
  }

  private createOutlinePass(): OutlinePass {
    const size = new THREE.Vector2();
    this.renderer.getSize(size);

    const outlinePass = new OutlinePass(size, this.scene, this.camera);

    // Configure for stark black outlines
    outlinePass.edgeStrength = 3.0;
    outlinePass.edgeGlow = 0.0;
    outlinePass.edgeThickness = 1.0;
    outlinePass.pulsePeriod = 0;
    outlinePass.usePatternTexture = false;
    outlinePass.visibleEdgeColor.setHex(0x000000); // Black outlines
    outlinePass.hiddenEdgeColor.setHex(0x000000);

    return outlinePass;
  }

  private createSMAAPass(): SMAAPass {
    const size = new THREE.Vector2();
    this.renderer.getSize(size);
    return new SMAAPass(size.x, size.y);
  }

  private setupComposer(): void {
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.outlinePass);
    this.composer.addPass(this.smaaPass);
  }

  setOutlineThickness(thickness: number): void {
    this.outlinePass.edgeThickness = thickness;
  }

  setOutlineStrength(strength: number): void {
    this.outlinePass.edgeStrength = strength;
  }

  addObjectsToOutline(objects: THREE.Object3D[]): void {
    this.outlinePass.selectedObjects = objects;
  }

  clearOutlineObjects(): void {
    this.outlinePass.selectedObjects = [];
  }

  toggleSMAA(enabled: boolean): void {
    this.smaaPass.enabled = enabled;
  }

  render(): void {
    this.composer.render();
  }

  resize(width: number, height: number): void {
    this.composer.setSize(width, height);
    this.outlinePass.setSize(width, height);
    this.smaaPass.setSize(width, height);
  }

  getComposer(): EffectComposer {
    return this.composer;
  }
}