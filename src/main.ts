import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';

class Killer7Scene {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private composer!: EffectComposer;
  private outlinePass!: OutlinePass;
  private geometryObjects: THREE.Object3D[] = [];
  private animatedObjects: THREE.Object3D[] = [];
  private clock = new THREE.Clock();
  private animationPaused = false;

  constructor() {
    this.init();
    this.createScene();
    this.setupPostProcessing();
    this.animate();
  }

  private init(): void {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(8, 6, 8);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 1, 0);
    this.controls.update();

    // Add to DOM
    document.getElementById('app')?.appendChild(this.renderer.domElement);

    // Window resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.composer.setSize(window.innerWidth, window.innerHeight);
    });

    // Animation toggle controls
    window.addEventListener('keydown', (e) => {
      if (e.key === 'p' || e.key === 'P') {
        this.toggleAnimation();
      }
    });
  }

  private setupPostProcessing(): void {
    // Create composer
    this.composer = new EffectComposer(this.renderer);

    // Render pass
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Outline pass
    this.outlinePass = new OutlinePass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.scene,
      this.camera
    );

    // Configure outline for stark black lines
    this.outlinePass.edgeStrength = 3.0;
    this.outlinePass.edgeGlow = 0.0;
    this.outlinePass.edgeThickness = 1.0;
    this.outlinePass.pulsePeriod = 0;
    this.outlinePass.visibleEdgeColor.setHex(0x000000);
    this.outlinePass.hiddenEdgeColor.setHex(0x000000);

    // Add geometry objects to outline
    this.outlinePass.selectedObjects = this.geometryObjects;

    this.composer.addPass(this.outlinePass);
  }

  private createScene(): void {
    // Create binary toon material
    const material = this.createBinaryToonMaterial();

    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), material);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.geometryObjects.push(floor);

    // Cubes
    for (let i = 0; i < 3; i++) {
      const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
      cube.position.set(-3 + i * 3, 0.5, 2);
      cube.castShadow = true;
      cube.receiveShadow = true;
      this.scene.add(cube);
      this.geometryObjects.push(cube);
    }

    // Columns
    for (let i = 0; i < 2; i++) {
      const column = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3, 8), material);
      column.position.set(-4 + i * 8, 1.5, -2);
      column.castShadow = true;
      column.receiveShadow = true;
      this.scene.add(column);
      this.geometryObjects.push(column);
    }

    // Lighting - harsh directional for stark shadows
    const light = new THREE.DirectionalLight(0xffffff, 2.0);
    light.position.set(5, 10, 5);
    light.castShadow = true;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 50;
    light.shadow.camera.left = -10;
    light.shadow.camera.right = 10;
    light.shadow.camera.top = 10;
    light.shadow.camera.bottom = -10;
    this.scene.add(light);

    // NO ambient light for pure blacks

    // Add background architecture
    this.createBackground();

    // Add floating animated objects
    this.createFloatingObjects();
  }

  private createBackground(): void {
    const material = this.createBinaryToonMaterial();

    // Create wall panels in the background
    for (let i = 0; i < 5; i++) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(3, 6, 0.2), material);
      wall.position.set(-12 + i * 6, 3, -8);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.scene.add(wall);
      this.geometryObjects.push(wall);
    }

    // Create some backdrop pillars
    for (let i = 0; i < 3; i++) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 8, 0.8), material);
      pillar.position.set(-8 + i * 8, 4, -12);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      this.scene.add(pillar);
      this.geometryObjects.push(pillar);
    }

    // Create stepped platforms at different levels
    for (let i = 0; i < 4; i++) {
      const platform = new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 2), material);
      platform.position.set(-6 + i * 4, 0.25 + i * 0.5, -5);
      platform.castShadow = true;
      platform.receiveShadow = true;
      this.scene.add(platform);
      this.geometryObjects.push(platform);
    }

    // Add some geometric backdrop elements
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2, 0.3, 8, 16), material);
    ring.position.set(0, 4, -10);
    ring.rotation.x = Math.PI / 4;
    ring.castShadow = true;
    ring.receiveShadow = true;
    this.scene.add(ring);
    this.geometryObjects.push(ring);
  }

  private createFloatingObjects(): void {
    const material = this.createBinaryToonMaterial();

    // Floating spinning cubes
    for (let i = 0; i < 4; i++) {
      const cube = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), material);
      cube.position.set(
        -6 + Math.random() * 12,
        4 + Math.random() * 3,
        -2 + Math.random() * 4
      );
      cube.castShadow = true;
      cube.receiveShadow = true;
      this.scene.add(cube);
      this.geometryObjects.push(cube);
      this.animatedObjects.push(cube);
    }

    // Floating spheres
    for (let i = 0; i < 3; i++) {
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), material);
      sphere.position.set(
        -4 + Math.random() * 8,
        2 + Math.random() * 4,
        1 + Math.random() * 3
      );
      sphere.castShadow = true;
      sphere.receiveShadow = true;
      this.scene.add(sphere);
      this.geometryObjects.push(sphere);
      this.animatedObjects.push(sphere);
    }

    // Floating pyramids
    for (let i = 0; i < 2; i++) {
      const pyramid = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.2, 4), material);
      pyramid.position.set(
        -3 + Math.random() * 6,
        3 + Math.random() * 2,
        0 + Math.random() * 2
      );
      pyramid.castShadow = true;
      pyramid.receiveShadow = true;
      this.scene.add(pyramid);
      this.geometryObjects.push(pyramid);
      this.animatedObjects.push(pyramid);
    }

    // Large floating ring
    const bigRing = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.2, 6, 12), material);
    bigRing.position.set(4, 5, 1);
    bigRing.castShadow = true;
    bigRing.receiveShadow = true;
    this.scene.add(bigRing);
    this.geometryObjects.push(bigRing);
    this.animatedObjects.push(bigRing);
  }

  private createBinaryToonMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        lightDirection: { value: new THREE.Vector3(5, 10, 5).normalize() }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 lightDirection;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vec3 normal = normalize(vNormal);
          float NdotL = max(dot(normal, lightDirection), 0.0);

          // Binary step - no grays!
          float shade = step(0.5, NdotL);

          gl_FragColor = vec4(vec3(shade), 1.0);
        }
      `
    });
  }

  private toggleAnimation(): void {
    this.animationPaused = !this.animationPaused;
    console.log(`Animation ${this.animationPaused ? 'paused' : 'resumed'}`);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    if (!this.animationPaused) {
      const time = this.clock.getElapsedTime();

      // Animate floating objects
      this.animatedObjects.forEach((obj, index) => {
        if (obj.geometry.type === 'BoxGeometry') {
          // Spinning cubes
          obj.rotation.x = time * 0.5 + index;
          obj.rotation.y = time * 0.7 + index;
          obj.position.y += Math.sin(time * 1.5 + index * 2) * 0.01;
        } else if (obj.geometry.type === 'SphereGeometry') {
          // Floating spheres - slow bob
          obj.position.y += Math.sin(time * 0.8 + index * 3) * 0.02;
          obj.rotation.z = time * 0.3 + index;
        } else if (obj.geometry.type === 'ConeGeometry') {
          // Pyramids - rotate and slight movement
          obj.rotation.y = time * 1.2 + index;
          obj.position.x += Math.sin(time * 0.6 + index * 4) * 0.01;
        } else if (obj.geometry.type === 'TorusGeometry') {
          // Rings - complex rotation
          obj.rotation.x = time * 0.4 + index;
          obj.rotation.y = time * 0.6 + index;
          obj.rotation.z = time * 0.2 + index;
        }
      });
    }

    this.controls.update();
    this.composer.render();
  };
}

document.addEventListener('DOMContentLoaded', () => {
  new Killer7Scene();
});