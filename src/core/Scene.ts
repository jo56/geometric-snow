import * as THREE from 'three';

export class SceneManager {
  private scene: THREE.Scene;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.setupLighting();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight.position.set(5, 10, 5);
    this.scene.add(directionalLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.0);
    mainLight.position.set(200, 200, 200);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    mainLight.shadow.camera.near = 1;
    mainLight.shadow.camera.far = 1200;
    mainLight.shadow.camera.left = -600;
    mainLight.shadow.camera.right = 600;
    mainLight.shadow.camera.top = 600;
    mainLight.shadow.camera.bottom = -600;
    this.scene.add(mainLight);

    const subtleAmbient = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(subtleAmbient);
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public add(object: THREE.Object3D): void {
    this.scene.add(object);
  }
}
