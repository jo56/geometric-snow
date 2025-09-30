import * as THREE from 'three';
import { BinaryMaterialSystem } from './materials';
import { LightingSystem } from './lighting';
import { PostProcessingSystem } from './postprocessing';
import { SceneBuilder } from './scene';
import { CameraSystem } from './camera';
import { UIManager } from './ui';

class Killer7Scene {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private materials!: BinaryMaterialSystem;
  private lighting!: LightingSystem;
  private postProcessing!: PostProcessingSystem;
  private sceneBuilder!: SceneBuilder;
  private cameraSystem!: CameraSystem;
  private ui!: UIManager;

  private smaaEnabled: boolean = true;

  constructor() {
    this.initializeCore();
    this.initializeSystems();
    this.setupUI();
    this.setupEventListeners();
    this.animate();
  }

  private initializeCore(): void {
    // Create scene
    this.scene = new THREE.Scene();

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap; // Hard shadows
    this.renderer.setClearColor(0x000000);

    // Add to DOM
    const app = document.getElementById('app');
    if (app) {
      app.appendChild(this.renderer.domElement);
    }
  }

  private initializeSystems(): void {
    // Initialize materials system
    this.materials = new BinaryMaterialSystem();

    // Initialize lighting
    this.lighting = new LightingSystem(this.scene);

    // Initialize camera
    const aspect = window.innerWidth / window.innerHeight;
    this.cameraSystem = new CameraSystem(this.renderer, aspect);

    // Initialize scene builder
    this.sceneBuilder = new SceneBuilder(this.scene, this.materials);

    // Initialize post-processing
    this.postProcessing = new PostProcessingSystem(
      this.renderer,
      this.scene,
      this.cameraSystem.getCamera()
    );

    // Add all geometry objects to outline
    this.postProcessing.addObjectsToOutline(this.sceneBuilder.getGeometryObjects());
  }

  private setupUI(): void {
    this.ui = new UIManager();

    // Outline thickness control
    this.ui.onOutlineThicknessChanged((value) => {
      this.postProcessing.setOutlineThickness(value);
    });

    // Shader mode toggle
    this.ui.onShaderModeChanged((useToon) => {
      this.sceneBuilder.switchMaterials(useToon);
    });

    // Rim light toggle
    this.ui.onRimLightToggled(() => {
      const enabled = this.lighting.toggleRimLight();
      this.ui.setRimLightState(enabled);
    });

    // SMAA toggle
    this.ui.onSMAAToggled(() => {
      this.smaaEnabled = !this.smaaEnabled;
      this.postProcessing.toggleSMAA(this.smaaEnabled);
      this.ui.setSMAAState(this.smaaEnabled);
    });

    // Set initial UI states
    this.ui.setRimLightState(this.lighting.isRimLightEnabled());
    this.ui.setSMAAState(this.smaaEnabled);
  }

  private setupEventListeners(): void {
    // Window resize
    window.addEventListener('resize', () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      this.cameraSystem.resize(width / height);
      this.renderer.setSize(width, height);
      this.postProcessing.resize(width, height);
    });

    // Camera preset cycling (spacebar)
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        const presetName = this.cameraSystem.nextPreset();
        console.log(`Switched to camera preset: ${presetName}`);
      }

      // Toggle UI with 'H' key
      if (e.key.toLowerCase() === 'h') {
        this.ui.toggleVisibility();
      }
    });

    // Log controls info
    console.log('Controls:');
    console.log('- Mouse: Orbit camera');
    console.log('- Spacebar: Cycle camera presets');
    console.log('- H: Toggle UI');
    console.log('- 1/2: Switch shader modes');
    console.log('- R: Toggle rim light');
    console.log('- A: Toggle anti-aliasing');
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    // Update camera controls
    this.cameraSystem.update();

    // Render with post-processing
    this.postProcessing.render();
  };
}

// Initialize the scene when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new Killer7Scene();
});