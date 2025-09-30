import * as THREE from 'three';

export class LightingSystem {
  private scene: THREE.Scene;
  private keyLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private rimLightEnabled: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.keyLight = this.createKeyLight();
    this.rimLight = this.createRimLight();
    this.setupLighting();
  }

  private createKeyLight(): THREE.DirectionalLight {
    const light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position.set(5, 10, 5);
    light.target.position.set(0, 0, 0);

    // Enable shadows
    light.castShadow = true;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 50;
    light.shadow.camera.left = -10;
    light.shadow.camera.right = 10;
    light.shadow.camera.top = 10;
    light.shadow.camera.bottom = -10;
    light.shadow.normalBias = 0.02;

    return light;
  }

  private createRimLight(): THREE.DirectionalLight {
    const light = new THREE.DirectionalLight(0xffffff, 0.3);
    light.position.set(-5, 8, -5);
    light.target.position.set(0, 0, 0);

    // Enable shadows for rim light too
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 50;
    light.shadow.camera.left = -5;
    light.shadow.camera.right = 5;
    light.shadow.camera.top = 5;
    light.shadow.camera.bottom = -5;

    return light;
  }

  private setupLighting(): void {
    // Very low ambient light to keep blacks black
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.02);
    this.scene.add(ambientLight);

    // Add key light
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    // Add rim light but don't enable it by default
    this.scene.add(this.rimLight);
    this.scene.add(this.rimLight.target);
    this.rimLight.visible = false;
  }

  toggleRimLight(): boolean {
    this.rimLightEnabled = !this.rimLightEnabled;
    this.rimLight.visible = this.rimLightEnabled;
    return this.rimLightEnabled;
  }

  isRimLightEnabled(): boolean {
    return this.rimLightEnabled;
  }

  updateLightDirection(x: number, y: number, z: number): void {
    this.keyLight.position.set(x, y, z);
  }

  getKeyLight(): THREE.DirectionalLight {
    return this.keyLight;
  }

  getRimLight(): THREE.DirectionalLight {
    return this.rimLight;
  }
}