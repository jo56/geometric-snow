import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class CameraSystem {
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private presetPositions: { name: string; position: THREE.Vector3; target: THREE.Vector3 }[];
  private currentPreset: number = 0;

  constructor(renderer: THREE.WebGLRenderer, aspect: number) {
    this.camera = this.createCamera(aspect);
    this.controls = this.createControls(renderer);
    this.presetPositions = this.createPresets();
    this.setPreset(0);
  }

  private createCamera(aspect: number): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    camera.position.set(8, 6, 8);
    return camera;
  }

  private createControls(renderer: THREE.WebGLRenderer): OrbitControls {
    const controls = new OrbitControls(this.camera, renderer.domElement);

    // Configure for cinematic movement
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = true;

    // Limit vertical rotation
    controls.minPolarAngle = Math.PI / 6; // 30 degrees
    controls.maxPolarAngle = Math.PI / 2.2; // ~80 degrees

    // Set distance limits
    controls.minDistance = 3;
    controls.maxDistance = 20;

    // Set target
    controls.target.set(0, 1, 0);

    return controls;
  }

  private createPresets(): { name: string; position: THREE.Vector3; target: THREE.Vector3 }[] {
    return [
      {
        name: "Wide Shot",
        position: new THREE.Vector3(8, 6, 8),
        target: new THREE.Vector3(0, 1, 0)
      },
      {
        name: "Low Angle",
        position: new THREE.Vector3(5, 2, 5),
        target: new THREE.Vector3(0, 2, 0)
      },
      {
        name: "High Angle",
        position: new THREE.Vector3(3, 8, 3),
        target: new THREE.Vector3(0, 0, 0)
      },
      {
        name: "Side View",
        position: new THREE.Vector3(10, 4, 0),
        target: new THREE.Vector3(0, 1, 0)
      },
      {
        name: "Dramatic",
        position: new THREE.Vector3(-6, 3, 6),
        target: new THREE.Vector3(2, 1, -2)
      }
    ];
  }

  setPreset(index: number): void {
    if (index >= 0 && index < this.presetPositions.length) {
      const preset = this.presetPositions[index];
      this.camera.position.copy(preset.position);
      this.controls.target.copy(preset.target);
      this.controls.update();
      this.currentPreset = index;
    }
  }

  nextPreset(): string {
    this.currentPreset = (this.currentPreset + 1) % this.presetPositions.length;
    this.setPreset(this.currentPreset);
    return this.presetPositions[this.currentPreset].name;
  }

  getCurrentPresetName(): string {
    return this.presetPositions[this.currentPreset].name;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getControls(): OrbitControls {
    return this.controls;
  }

  update(): void {
    this.controls.update();
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  animateToPosition(position: THREE.Vector3, target: THREE.Vector3, duration: number = 2000): void {
    const startPosition = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth easing function
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      // Interpolate position and target
      this.camera.position.lerpVectors(startPosition, position, easeProgress);
      this.controls.target.lerpVectors(startTarget, target, easeProgress);
      this.controls.update();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }
}