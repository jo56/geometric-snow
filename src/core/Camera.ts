import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CAMERA_CONFIG, OVERVIEW_CAMERA_POSITION } from '../utils/Constants';

export class CameraManager {
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;

  constructor(renderer: THREE.WebGLRenderer) {
    this.camera = new THREE.PerspectiveCamera(
      CAMERA_CONFIG.fov,
      window.innerWidth / window.innerHeight,
      CAMERA_CONFIG.near,
      CAMERA_CONFIG.far
    );
    this.camera.position.set(20, 20, 20);

    this.controls = new OrbitControls(this.camera, renderer.domElement);
    this.controls.target.set(0, 10, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = CAMERA_CONFIG.dampingFactor;
    this.controls.minDistance = CAMERA_CONFIG.minDistance;
    this.controls.maxDistance = CAMERA_CONFIG.maxDistance;
    this.controls.minPolarAngle = 0;
    this.controls.maxPolarAngle = Math.PI;
    this.controls.update();
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public getControls(): OrbitControls {
    return this.controls;
  }

  public update(): void {
    this.controls.update();
  }

  public handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  public resetToOverview(): void {
    const originalPos = new THREE.Vector3(
      OVERVIEW_CAMERA_POSITION.position.x,
      OVERVIEW_CAMERA_POSITION.position.y,
      OVERVIEW_CAMERA_POSITION.position.z
    );
    const originalTarget = new THREE.Vector3(
      OVERVIEW_CAMERA_POSITION.target.x,
      OVERVIEW_CAMERA_POSITION.target.y,
      OVERVIEW_CAMERA_POSITION.target.z
    );

    const direction = originalPos.clone().sub(originalTarget).normalize();
    const overviewPosition = originalTarget.clone().add(
      direction.multiplyScalar(originalPos.distanceTo(originalTarget))
    );
    const overviewTarget = originalTarget.clone();

    this.camera.position.copy(overviewPosition);
    this.controls.target.copy(overviewTarget);
    this.controls.update();
  }

  public focusOnPosition(position: THREE.Vector3, diamondIndex: number): void {
    const offset = 15;
    const height = 8;
    const angleOffset = diamondIndex * (Math.PI / 3);

    const cameraPosition = new THREE.Vector3(
      position.x + Math.cos(angleOffset) * offset,
      position.y + height,
      position.z + Math.sin(angleOffset) * offset
    );

    this.animateToPosition(cameraPosition, position.clone(), 2000);
  }

  public animateToPosition(position: THREE.Vector3, target: THREE.Vector3, duration: number = 2000): void {
    const startPosition = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      this.camera.position.lerpVectors(startPosition, position, easeProgress);
      this.controls.target.lerpVectors(startTarget, target, easeProgress);
      this.controls.update();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  public moveCamera(direction: 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down'): void {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const right = new THREE.Vector3();
    right.crossVectors(this.camera.up, dir).normalize();

    switch (direction) {
      case 'forward':
        this.camera.position.addScaledVector(dir, 1);
        this.controls.target.addScaledVector(dir, 1);
        break;
      case 'backward':
        this.camera.position.addScaledVector(dir, -1);
        this.controls.target.addScaledVector(dir, -1);
        break;
      case 'left':
        this.camera.position.addScaledVector(right, 1);
        this.controls.target.addScaledVector(right, 1);
        break;
      case 'right':
        this.camera.position.addScaledVector(right, -1);
        this.controls.target.addScaledVector(right, -1);
        break;
      case 'up':
        this.camera.position.y += 1;
        this.controls.target.y += 1;
        break;
      case 'down':
        this.camera.position.y -= 1;
        this.controls.target.y -= 1;
        break;
    }

    this.controls.update();
  }
}
