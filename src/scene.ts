import * as THREE from 'three';
import { BinaryMaterialSystem } from './materials';

export class SceneBuilder {
  private scene: THREE.Scene;
  private materials: BinaryMaterialSystem;
  private geometryObjects: THREE.Object3D[] = [];

  constructor(scene: THREE.Scene, materials: BinaryMaterialSystem) {
    this.scene = scene;
    this.materials = materials;
    this.createScene();
  }

  private createScene(): void {
    // Set black background
    this.scene.background = new THREE.Color(0x000000);

    // Create floor plane
    this.createFloor();

    // Create geometric primitives
    this.createGeometricPrimitives();

    // Create void border
    this.createVoidBorder();
  }

  private createFloor(): void {
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floor = new THREE.Mesh(floorGeometry, this.materials.getToonMaterial());

    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;

    this.scene.add(floor);
    this.geometryObjects.push(floor);
  }

  private createGeometricPrimitives(): void {
    // Create cubes
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);

    for (let i = 0; i < 3; i++) {
      const cube = new THREE.Mesh(cubeGeometry, this.materials.getToonMaterial());
      cube.position.set(-3 + i * 3, 0.5, 2);
      cube.castShadow = true;
      cube.receiveShadow = true;
      this.scene.add(cube);
      this.geometryObjects.push(cube);
    }

    // Create columns
    const columnGeometry = new THREE.CylinderGeometry(0.3, 0.3, 3, 8);

    for (let i = 0; i < 2; i++) {
      const column = new THREE.Mesh(columnGeometry, this.materials.getToonMaterial());
      column.position.set(-4 + i * 8, 1.5, -2);
      column.castShadow = true;
      column.receiveShadow = true;
      this.scene.add(column);
      this.geometryObjects.push(column);
    }

    // Create stairs
    this.createStairs();

    // Create arch
    this.createArch();
  }

  private createStairs(): void {
    const stepWidth = 2;
    const stepHeight = 0.2;
    const stepDepth = 0.5;
    const numSteps = 5;

    for (let i = 0; i < numSteps; i++) {
      const stepGeometry = new THREE.BoxGeometry(stepWidth, stepHeight, stepDepth);
      const step = new THREE.Mesh(stepGeometry, this.materials.getToonMaterial());

      step.position.set(
        3,
        stepHeight * 0.5 + i * stepHeight,
        -3 + i * stepDepth
      );

      step.castShadow = true;
      step.receiveShadow = true;
      this.scene.add(step);
      this.geometryObjects.push(step);
    }
  }

  private createArch(): void {
    // Create arch using torus geometry
    const archGeometry = new THREE.TorusGeometry(1.5, 0.3, 8, 16, Math.PI);
    const arch = new THREE.Mesh(archGeometry, this.materials.getToonMaterial());

    arch.position.set(0, 2, -5);
    arch.rotation.x = Math.PI / 2;
    arch.castShadow = true;
    arch.receiveShadow = true;

    this.scene.add(arch);
    this.geometryObjects.push(arch);

    // Add arch supports
    const supportGeometry = new THREE.BoxGeometry(0.3, 2, 0.3);

    for (let i = 0; i < 2; i++) {
      const support = new THREE.Mesh(supportGeometry, this.materials.getToonMaterial());
      support.position.set(-1.5 + i * 3, 1, -5);
      support.castShadow = true;
      support.receiveShadow = true;
      this.scene.add(support);
      this.geometryObjects.push(support);
    }
  }

  private createVoidBorder(): void {
    // Create large black boxes around the scene to create infinite darkness
    const voidGeometry = new THREE.BoxGeometry(50, 20, 50);
    const voidMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

    const voidBox = new THREE.Mesh(voidGeometry, voidMaterial);
    voidBox.position.set(0, -5, 0);
    this.scene.add(voidBox);
  }

  getGeometryObjects(): THREE.Object3D[] {
    return this.geometryObjects;
  }

  switchMaterials(useToon: boolean): void {
    this.geometryObjects.forEach(obj => {
      if (obj instanceof THREE.Mesh && obj.material !== undefined) {
        this.materials.applyMaterialToMesh(obj, useToon);
      }
    });
  }
}