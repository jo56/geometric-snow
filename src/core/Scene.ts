import * as THREE from 'three';
import { SHADOW_CONFIG } from '../utils/Constants';

export class SceneManager {
  private scene: THREE.Scene;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.setupLighting();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight.position.set(5, 10, 5);
    this.scene.add(directionalLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.0);
    mainLight.position.set(200, 200, 200);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = SHADOW_CONFIG.mapSize;
    mainLight.shadow.mapSize.height = SHADOW_CONFIG.mapSize;
    mainLight.shadow.camera.near = SHADOW_CONFIG.cameraNear;
    mainLight.shadow.camera.far = SHADOW_CONFIG.cameraFar;
    mainLight.shadow.camera.left = -SHADOW_CONFIG.cameraSize;
    mainLight.shadow.camera.right = SHADOW_CONFIG.cameraSize;
    mainLight.shadow.camera.top = SHADOW_CONFIG.cameraSize;
    mainLight.shadow.camera.bottom = -SHADOW_CONFIG.cameraSize;
    this.scene.add(mainLight);
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public add(object: THREE.Object3D): void {
    this.scene.add(object);
  }
}
