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
    this.scene.background = new THREE.Color(0xffffff);

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

  private createTerrain(material: THREE.ShaderMaterial): void {
    // Create main large platform with varied heights - VASTLY EXPANDED
    const terrainSize = 200; // Increased from 60 to 200
    const segments = 80; // Increased segments for more detail
    const terrainGeometry = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);

    // Add height variation to vertices
    const positions = terrainGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];
      // Create varied terrain with noise-like patterns
      positions[i + 1] = Math.sin(x * 0.03) * Math.cos(z * 0.03) * 3 +
                         Math.sin(x * 0.015) * Math.sin(z * 0.02) * 2.5 +
                         Math.sin(x * 0.08) * Math.cos(z * 0.07) * 1 +
                         (Math.random() - 0.5) * 0.8;
    }
    terrainGeometry.computeVertexNormals();

    const terrain = new THREE.Mesh(terrainGeometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    this.scene.add(terrain);
    this.geometryObjects.push(terrain);

    // Add scattered platform pieces at different levels - spread across larger area
    for (let i = 0; i < 40; i++) { // Increased from 15 to 40
      const platformSize = 3 + Math.random() * 6;
      const platformHeight = 0.3 + Math.random() * 1.2;
      const platform = new THREE.Mesh(
        new THREE.BoxGeometry(platformSize, platformHeight, platformSize),
        material
      );

      platform.position.set(
        (Math.random() - 0.5) * 180, // Increased spread from 50 to 180
        platformHeight / 2 + Math.random() * 3,
        (Math.random() - 0.5) * 180  // Increased spread from 50 to 180
      );
      platform.rotation.y = Math.random() * Math.PI;
      platform.castShadow = true;
      platform.receiveShadow = true;
      this.scene.add(platform);
      this.geometryObjects.push(platform);
    }

    // Create elevated areas with steps - more scattered across larger space
    for (let i = 0; i < 20; i++) { // Increased from 8 to 20
      const stepCount = 3 + Math.floor(Math.random() * 5);
      const stepWidth = 2 + Math.random() * 3;

      for (let j = 0; j < stepCount; j++) {
        const step = new THREE.Mesh(
          new THREE.BoxGeometry(stepWidth, 0.4, stepWidth * 0.8),
          material
        );

        const baseX = (Math.random() - 0.5) * 160; // Increased from 40 to 160
        const baseZ = (Math.random() - 0.5) * 160; // Increased from 40 to 160

        step.position.set(
          baseX,
          0.2 + j * 0.4,
          baseZ + j * (stepWidth * 0.6)
        );
        step.castShadow = true;
        step.receiveShadow = true;
        this.scene.add(step);
        this.geometryObjects.push(step);
      }
    }

    // Add some larger landmark structures across the expanded terrain
    for (let i = 0; i < 12; i++) {
      const landmarkTypes = [
        new THREE.BoxGeometry(8, 6, 8),          // Large blocks
        new THREE.CylinderGeometry(3, 3, 8, 8),  // Towers
        new THREE.ConeGeometry(4, 10, 6),        // Spires
        new THREE.TorusGeometry(4, 1, 8, 16)     // Large rings
      ];

      const geometry = landmarkTypes[Math.floor(Math.random() * landmarkTypes.length)];
      const landmark = new THREE.Mesh(geometry, material);

      landmark.position.set(
        (Math.random() - 0.5) * 170, // Spread across the terrain
        3 + Math.random() * 4,
        (Math.random() - 0.5) * 170
      );

      landmark.rotation.y = Math.random() * Math.PI;
      landmark.castShadow = true;
      landmark.receiveShadow = true;
      this.scene.add(landmark);
      this.geometryObjects.push(landmark);
    }
  }

  private createScene(): void {
    // Create binary toon material
    const material = this.createBinaryToonMaterial();

    // Create larger, more varied terrain
    this.createTerrain(material);

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

    // Create scattered background elements instead of a wall dome
    // Add floating geometric shapes in the far background
    for (let i = 0; i < 15; i++) {
      const shapes = [
        new THREE.BoxGeometry(3, 3, 3),
        new THREE.SphereGeometry(1.5, 8, 6),
        new THREE.ConeGeometry(1.5, 3, 6),
        new THREE.CylinderGeometry(1, 1, 4, 8)
      ];

      const geometry = shapes[Math.floor(Math.random() * shapes.length)];
      const shape = new THREE.Mesh(geometry, material);

      // Place them far away and low to avoid blocking view
      const angle = Math.random() * Math.PI * 2;
      const distance = 70 + Math.random() * 30; // Further away

      shape.position.set(
        Math.cos(angle) * distance,
        -2 + Math.random() * 8, // Lower height range to avoid blocking
        Math.sin(angle) * distance
      );

      shape.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      shape.castShadow = true;
      this.scene.add(shape);
      this.geometryObjects.push(shape);
    }

    // Add some distant architectural elements (optional)
    for (let i = 0; i < 6; i++) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(2, 12, 2), material);
      const angle = (i / 6) * Math.PI * 2;
      const distance = 90;

      pillar.position.set(
        Math.cos(angle) * distance,
        6,
        Math.sin(angle) * distance
      );

      pillar.castShadow = true;
      this.scene.add(pillar);
      this.geometryObjects.push(pillar);
    }
  }

  private createFloatingObjects(): void {
    const material = this.createBinaryToonMaterial();

    // Ring 1: Outer ring of cubes (radius 18)
    const cubeCount = 8;
    const cubeRadius = 18;
    for (let i = 0; i < cubeCount; i++) {
      const angle = (i / cubeCount) * Math.PI * 2;
      const cube = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), material);
      cube.position.set(
        Math.cos(angle) * cubeRadius,
        5 + Math.sin(i * 0.5) * 2, // Varied heights in wave pattern
        Math.sin(angle) * cubeRadius
      );
      cube.castShadow = true;
      cube.receiveShadow = true;
      this.scene.add(cube);
      this.geometryObjects.push(cube);
      this.animatedObjects.push(cube);
    }

    // Ring 2: Middle ring of spheres (radius 12)
    const sphereCount = 6;
    const sphereRadius = 12;
    for (let i = 0; i < sphereCount; i++) {
      const angle = (i / sphereCount) * Math.PI * 2;
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), material);
      sphere.position.set(
        Math.cos(angle) * sphereRadius,
        4 + Math.cos(i * 0.8) * 1.5, // Different wave pattern
        Math.sin(angle) * sphereRadius
      );
      sphere.castShadow = true;
      sphere.receiveShadow = true;
      this.scene.add(sphere);
      this.geometryObjects.push(sphere);
      this.animatedObjects.push(sphere);
    }

    // Ring 3: Inner ring of pyramids (radius 8)
    const pyramidCount = 5;
    const pyramidRadius = 8;
    for (let i = 0; i < pyramidCount; i++) {
      const angle = (i / pyramidCount) * Math.PI * 2;
      const pyramid = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.2, 4), material);
      pyramid.position.set(
        Math.cos(angle) * pyramidRadius,
        3 + Math.sin(i * 1.2) * 1, // Subtle height variation
        Math.sin(angle) * pyramidRadius
      );
      pyramid.castShadow = true;
      pyramid.receiveShadow = true;
      this.scene.add(pyramid);
      this.geometryObjects.push(pyramid);
      this.animatedObjects.push(pyramid);
    }


    // Central focal point - single large object
    const centerPiece = new THREE.Mesh(new THREE.OctahedronGeometry(1.5), material);
    centerPiece.position.set(0, 7, 0);
    centerPiece.castShadow = true;
    centerPiece.receiveShadow = true;
    this.scene.add(centerPiece);
    this.geometryObjects.push(centerPiece);
    this.animatedObjects.push(centerPiece);
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