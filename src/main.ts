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
  private diamonds: THREE.Mesh[] = [];
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

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

    // Camera - updated for much larger terrain with better culling
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(8, 6, 8);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      logarithmicDepthBuffer: true  // Better depth precision for large scenes
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;

    // Controls - updated for much larger terrain
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 1, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // Allow much more zooming for the larger terrain
    this.controls.minDistance = 2;
    this.controls.maxDistance = 800; // Much larger to see full terrain and mountains

    // Allow full rotation
    this.controls.minPolarAngle = 0;
    this.controls.maxPolarAngle = Math.PI;

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

    // Animation toggle controls and camera switching
    window.addEventListener('keydown', (e) => {
      if (e.key === 'p' || e.key === 'P') {
        this.toggleAnimation();
      } else if (e.key === 'Escape') {
        this.setOverviewCamera();
      }
    });

    // Mouse click detection for diamonds
    window.addEventListener('click', (e) => {
      this.onMouseClick(e);
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
    // Create massive mountain valley terrain
    const terrainSize = 800; // Massive terrain to reach mountain ring
    const segments = 120; // High detail for varied terrain
    const terrainGeometry = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);

    // Add mountainous valley terrain with irregular features throughout
    const positions = terrainGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];

      // Distance from center for valley effect
      const distanceFromCenter = Math.sqrt(x * x + z * z);

      // Create valley bowl effect - higher at edges, lower in center
      const valleyDepth = Math.min(distanceFromCenter / 350, 1); // Gradual rise to mountain ring
      const valleyHeight = valleyDepth * valleyDepth * 8; // Quadratic rise to edges

      // Multiple layers of terrain generation across entire valley
      let height = valleyHeight;

      // Large scale valley features - rolling hills throughout
      height += Math.sin(x * 0.012) * Math.cos(z * 0.012) * 8;
      height += Math.sin(x * 0.008) * Math.sin(z * 0.009) * 12;
      height += Math.cos(x * 0.006) * Math.cos(z * 0.007) * 6;

      // Medium scale terrain variety - ridges and valleys
      height += Math.sin(x * 0.025) * Math.cos(z * 0.028) * 4;
      height += Math.cos(x * 0.02) * Math.sin(z * 0.022) * 5;
      height += Math.sin(x * 0.035) * Math.sin(z * 0.03) * 3;

      // Small scale detail across entire valley
      height += Math.sin(x * 0.08) * Math.cos(z * 0.07) * 2;
      height += Math.cos(x * 0.12) * Math.sin(z * 0.11) * 1.5;
      height += (Math.random() - 0.5) * 2;

      // Create interesting terrain features in different zones
      if (distanceFromCenter < 150) {
        // Central valley - gentle rolling terrain
        height += Math.sin(x * 0.04) * Math.cos(z * 0.04) * 6;
        height += Math.sin(x * 0.06) * Math.sin(z * 0.055) * 4;
      } else if (distanceFromCenter < 280) {
        // Mid valley - more dramatic features
        height += Math.sin(x * 0.015) * Math.cos(z * 0.018) * 10;
        height += Math.cos(x * 0.025) * Math.sin(z * 0.02) * 8;
      } else {
        // Approaching mountain ring - steep rises and dramatic features
        const edgeEffect = (distanceFromCenter - 280) / 70;
        height += Math.sin(x * 0.008) * Math.cos(z * 0.008) * 15 * edgeEffect;
        height += Math.sin(x * 0.005) * Math.sin(z * 0.006) * 20 * edgeEffect;
      }

      positions[i + 1] = height;
    }
    terrainGeometry.computeVertexNormals();

    const terrain = new THREE.Mesh(terrainGeometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    this.scene.add(terrain);
    this.geometryObjects.push(terrain);

    // Add distant mountain silhouettes on the horizon
    this.createHorizonMountains(material);
  }

  private createHorizonMountains(material: THREE.ShaderMaterial): void {
    // Create distant mountain ranges on horizon
    const mountainRanges = 8;
    const baseRadius = 350;

    for (let range = 0; range < mountainRanges; range++) {
      const angle = (range / mountainRanges) * Math.PI * 2;
      const rangeRadius = baseRadius + Math.random() * 100;

      // Create mountain range with multiple peaks
      const peaksInRange = 5 + Math.floor(Math.random() * 8);

      for (let peak = 0; peak < peaksInRange; peak++) {
        const peakAngle = angle + (peak - peaksInRange/2) * 0.3;
        const peakRadius = rangeRadius + (Math.random() - 0.5) * 50;

        const mountain = new THREE.Mesh(
          new THREE.ConeGeometry(
            8 + Math.random() * 12,  // Base radius
            20 + Math.random() * 40,  // Height
            6 + Math.floor(Math.random() * 4) // Segments
          ),
          material
        );

        mountain.position.set(
          Math.cos(peakAngle) * peakRadius,
          10 + Math.random() * 15,
          Math.sin(peakAngle) * peakRadius
        );

        mountain.rotation.y = Math.random() * Math.PI;
        mountain.castShadow = true;
        mountain.receiveShadow = true;
        this.scene.add(mountain);
        this.geometryObjects.push(mountain);
      }
    }

    // Add some massive backdrop peaks for drama
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const distance = 450 + Math.random() * 100;

      const massivePeak = new THREE.Mesh(
        new THREE.ConeGeometry(25, 80 + Math.random() * 40, 8),
        material
      );

      massivePeak.position.set(
        Math.cos(angle) * distance,
        40,
        Math.sin(angle) * distance
      );

      massivePeak.castShadow = true;
      massivePeak.receiveShadow = true;
      this.scene.add(massivePeak);
      this.geometryObjects.push(massivePeak);
    }
  }

  private createTerrainElements(material: THREE.ShaderMaterial): void {
    // Add scattered platform pieces at different levels - spread across larger area
    for (let i = 0; i < 40; i++) { // Increased from 15 to 40
      const platformSize = 3 + Math.random() * 6;
      const platformHeight = 0.3 + Math.random() * 1.2;
      const platform = new THREE.Mesh(
        new THREE.BoxGeometry(platformSize, platformHeight, platformSize),
        material
      );

      platform.position.set(
        (Math.random() - 0.5) * 350, // Increased spread for mountainous terrain
        platformHeight / 2 + Math.random() * 3,
        (Math.random() - 0.5) * 350  // Increased spread for mountainous terrain
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

        const baseX = (Math.random() - 0.5) * 300; // Increased for larger terrain
        const baseZ = (Math.random() - 0.5) * 300; // Increased for larger terrain

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
        (Math.random() - 0.5) * 320, // Spread across mountainous terrain
        3 + Math.random() * 4,
        (Math.random() - 0.5) * 320
      );

      landmark.rotation.y = Math.random() * Math.PI;
      landmark.castShadow = true;
      landmark.receiveShadow = true;
      this.scene.add(landmark);
      this.geometryObjects.push(landmark);
    }

    // Add vertical stacks of rectangles for dramatic verticality
    this.createVerticalStacks(material);
  }

  private createVerticalStacks(material: THREE.ShaderMaterial): void {
    // Create irregular piles of rectangular blocks
    for (let pile = 0; pile < 30; pile++) {
      const pileSize = 8 + Math.floor(Math.random() * 15); // 8-22 blocks per pile
      const baseSize = 2 + Math.random() * 4;

      // Pile center position
      const pileX = (Math.random() - 0.5) * 300;
      const pileZ = (Math.random() - 0.5) * 300;

      // Create irregular pile with blocks scattered around center
      for (let block = 0; block < pileSize; block++) {
        // Much more varied block dimensions
        const blockWidth = baseSize + (Math.random() - 0.5) * 3;
        const blockHeight = 0.5 + Math.random() * 2;
        const blockDepth = baseSize + (Math.random() - 0.5) * 3;

        const pileBlock = new THREE.Mesh(
          new THREE.BoxGeometry(blockWidth, blockHeight, blockDepth),
          material
        );

        // Random scatter around pile center with increasing spread
        const scatterRadius = Math.random() * 4;
        const scatterAngle = Math.random() * Math.PI * 2;
        const scatterX = Math.cos(scatterAngle) * scatterRadius;
        const scatterZ = Math.sin(scatterAngle) * scatterRadius;

        // Height based on distance from center (pile effect) with randomness
        const distanceFromCenter = Math.sqrt(scatterX * scatterX + scatterZ * scatterZ);
        const pileHeight = Math.max(0, (4 - distanceFromCenter) * 2 + Math.random() * 3);

        pileBlock.position.set(
          pileX + scatterX,
          pileHeight + blockHeight / 2,
          pileZ + scatterZ
        );

        // Much more random rotations for chaotic look
        pileBlock.rotation.x = (Math.random() - 0.5) * 0.6;
        pileBlock.rotation.y = Math.random() * Math.PI;
        pileBlock.rotation.z = (Math.random() - 0.5) * 0.4;

        pileBlock.castShadow = true;
        pileBlock.receiveShadow = true;
        this.scene.add(pileBlock);
        this.geometryObjects.push(pileBlock);
      }
    }

    // Create some extremely tall spire-like stacks
    for (let spire = 0; spire < 8; spire++) {
      const spireHeight = 15 + Math.floor(Math.random() * 20); // Very tall
      const baseSize = 1.5 + Math.random() * 2;

      const spireX = (Math.random() - 0.5) * 250;
      const spireZ = (Math.random() - 0.5) * 250;

      let currentHeight = 0;

      for (let block = 0; block < spireHeight; block++) {
        // Taper the spire as it goes up
        const taper = 1 - (block / spireHeight) * 0.6;
        const blockWidth = baseSize * taper;
        const blockHeight = 0.6 + Math.random() * 0.8;
        const blockDepth = baseSize * taper;

        const spireBlock = new THREE.Mesh(
          new THREE.BoxGeometry(blockWidth, blockHeight, blockDepth),
          material
        );

        spireBlock.position.set(
          spireX + (Math.random() - 0.5) * 0.2,
          currentHeight + blockHeight / 2,
          spireZ + (Math.random() - 0.5) * 0.2
        );

        spireBlock.rotation.y = (Math.random() - 0.5) * 0.1;

        spireBlock.castShadow = true;
        spireBlock.receiveShadow = true;
        this.scene.add(spireBlock);
        this.geometryObjects.push(spireBlock);

        currentHeight += blockHeight;
      }
    }

    // Create some stepped pyramid-like structures
    for (let pyramid = 0; pyramid < 6; pyramid++) {
      const levels = 4 + Math.floor(Math.random() * 6);
      const baseSize = 6 + Math.random() * 4;

      const pyramidX = (Math.random() - 0.5) * 280;
      const pyramidZ = (Math.random() - 0.5) * 280;

      for (let level = 0; level < levels; level++) {
        const levelSize = baseSize * (1 - level / levels * 0.7);
        const levelHeight = 1.5 + Math.random() * 1;

        const pyramidLevel = new THREE.Mesh(
          new THREE.BoxGeometry(levelSize, levelHeight, levelSize),
          material
        );

        pyramidLevel.position.set(
          pyramidX,
          level * levelHeight + levelHeight / 2,
          pyramidZ
        );

        pyramidLevel.rotation.y = level * 0.2; // Slight rotation per level

        pyramidLevel.castShadow = true;
        pyramidLevel.receiveShadow = true;
        this.scene.add(pyramidLevel);
        this.geometryObjects.push(pyramidLevel);
      }
    }
  }

  private createScene(): void {
    // Create binary toon material
    const material = this.createBinaryToonMaterial();

    // Create massive mountainous terrain
    this.createTerrain(material);

    // Create terrain elements (platforms, steps, landmarks)
    this.createTerrainElements(material);

    // Basic scene objects
    for (let i = 0; i < 3; i++) {
      const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
      cube.position.set(-3 + i * 3, 0.5, 2);
      cube.castShadow = true;
      cube.receiveShadow = true;
      this.scene.add(cube);
      this.geometryObjects.push(cube);
    }

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
    light.position.set(200, 200, 200); // Much higher and further for massive terrain
    light.castShadow = true;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 800; // Much larger for full terrain coverage
    light.shadow.camera.left = -400; // Massive shadow coverage
    light.shadow.camera.right = 400;
    light.shadow.camera.top = 400;
    light.shadow.camera.bottom = -400;
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

    // Ring 1: Outer ring of cubes (radius 25, high altitude)
    const cubeCount = 8;
    const cubeRadius = 25;
    const baseHeight = 35; // Much higher floating height
    for (let i = 0; i < cubeCount; i++) {
      const angle = (i / cubeCount) * Math.PI * 2;
      const cube = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), material);
      cube.position.set(
        Math.cos(angle) * cubeRadius,
        baseHeight + Math.sin(i * 0.5) * 4, // Higher with more variation
        Math.sin(angle) * cubeRadius
      );
      cube.castShadow = true;
      cube.receiveShadow = true;
      this.scene.add(cube);
      this.geometryObjects.push(cube);
      this.animatedObjects.push(cube);
    }

    // Ring 2: Middle ring of spheres (radius 18, high altitude)
    const sphereCount = 6;
    const sphereRadius = 18;
    for (let i = 0; i < sphereCount; i++) {
      const angle = (i / sphereCount) * Math.PI * 2;
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 6), material);
      sphere.position.set(
        Math.cos(angle) * sphereRadius,
        baseHeight - 2 + Math.cos(i * 0.8) * 3, // Slightly lower than cubes
        Math.sin(angle) * sphereRadius
      );
      sphere.castShadow = true;
      sphere.receiveShadow = true;
      this.scene.add(sphere);
      this.geometryObjects.push(sphere);
      this.animatedObjects.push(sphere);
    }

    // Ring 3: Inner ring of pyramids (radius 12, high altitude)
    const pyramidCount = 5;
    const pyramidRadius = 12;
    for (let i = 0; i < pyramidCount; i++) {
      const angle = (i / pyramidCount) * Math.PI * 2;
      const pyramid = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.8, 4), material);
      pyramid.position.set(
        Math.cos(angle) * pyramidRadius,
        baseHeight - 5 + Math.sin(i * 1.2) * 2, // Lower than spheres
        Math.sin(angle) * pyramidRadius
      );
      pyramid.castShadow = true;
      pyramid.receiveShadow = true;
      this.scene.add(pyramid);
      this.geometryObjects.push(pyramid);
      this.animatedObjects.push(pyramid);
    }

    // Additional scattered debris around the diamond
    for (let i = 0; i < 15; i++) {
      const debrisTypes = [
        new THREE.BoxGeometry(0.5 + Math.random() * 0.8, 0.5 + Math.random() * 0.8, 0.5 + Math.random() * 0.8),
        new THREE.TetrahedronGeometry(0.6 + Math.random() * 0.4),
        new THREE.ConeGeometry(0.4 + Math.random() * 0.3, 0.8 + Math.random() * 0.6, 5),
        new THREE.OctahedronGeometry(0.4 + Math.random() * 0.3)
      ];

      const geometry = debrisTypes[Math.floor(Math.random() * debrisTypes.length)];
      const debris = new THREE.Mesh(geometry, material);

      // Random positions around the diamond at high altitude
      const angle = Math.random() * Math.PI * 2;
      const radius = 6 + Math.random() * 20;
      const height = baseHeight + 8 + (Math.random() - 0.5) * 12;

      debris.position.set(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );

      debris.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      debris.castShadow = true;
      debris.receiveShadow = true;
      this.scene.add(debris);
      this.geometryObjects.push(debris);
      this.animatedObjects.push(debris);
    }

    // Central focal point - massive floating diamond
    const centerPiece = new THREE.Mesh(new THREE.OctahedronGeometry(4), material); // Much larger
    centerPiece.position.set(0, baseHeight + 8, 0); // High in the sky
    centerPiece.castShadow = true;
    centerPiece.receiveShadow = true;
    centerPiece.userData = { diamondIndex: 0 }; // Mark as clickable diamond
    this.scene.add(centerPiece);
    this.geometryObjects.push(centerPiece);
    this.animatedObjects.push(centerPiece);
    this.diamonds.push(centerPiece);

    // Additional floating diamonds with their own debris fields
    this.createAdditionalDiamonds(material, baseHeight);
  }

  private createAdditionalDiamonds(material: THREE.ShaderMaterial, baseHeight: number): void {
    // Create 6 additional diamonds scattered around the valley - lower heights
    const diamondPositions = [
      { x: 80, z: 40, height: baseHeight + 5 },
      { x: -60, z: 70, height: baseHeight + 8 },
      { x: 45, z: -85, height: baseHeight + 3 },
      { x: -90, z: -30, height: baseHeight + 10 },
      { x: 20, z: 100, height: baseHeight + 6 },
      { x: -40, z: -70, height: baseHeight + 7 }
    ];

    diamondPositions.forEach((pos, index) => {
      // Create smaller diamond (varied sizes)
      const diamondSize = 2.5 + Math.random() * 1.5; // 2.5-4 units
      const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(diamondSize), material);
      diamond.position.set(pos.x, pos.height, pos.z);
      diamond.castShadow = true;
      diamond.receiveShadow = true;
      diamond.userData = { diamondIndex: index + 1 }; // Mark as clickable diamond
      this.scene.add(diamond);
      this.geometryObjects.push(diamond);
      this.animatedObjects.push(diamond);
      this.diamonds.push(diamond);

      // Create debris field around each diamond
      const debrisCount = 8 + Math.floor(Math.random() * 7); // 8-14 debris pieces per diamond

      for (let i = 0; i < debrisCount; i++) {
        const debrisTypes = [
          new THREE.BoxGeometry(0.3 + Math.random() * 0.6, 0.3 + Math.random() * 0.6, 0.3 + Math.random() * 0.6),
          new THREE.TetrahedronGeometry(0.4 + Math.random() * 0.3),
          new THREE.ConeGeometry(0.3 + Math.random() * 0.2, 0.6 + Math.random() * 0.4, 5),
          new THREE.OctahedronGeometry(0.3 + Math.random() * 0.2),
          new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.2),
          new THREE.IcosahedronGeometry(0.3 + Math.random() * 0.2)
        ];

        const geometry = debrisTypes[Math.floor(Math.random() * debrisTypes.length)];
        const debris = new THREE.Mesh(geometry, material);

        // Position debris around each diamond
        const angle = Math.random() * Math.PI * 2;
        const radius = 4 + Math.random() * 12; // Closer orbit around smaller diamonds
        const height = pos.height + (Math.random() - 0.5) * 8;

        debris.position.set(
          pos.x + Math.cos(angle) * radius,
          height,
          pos.z + Math.sin(angle) * radius
        );

        debris.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );

        debris.castShadow = true;
        debris.receiveShadow = true;
        this.scene.add(debris);
        this.geometryObjects.push(debris);
        this.animatedObjects.push(debris);
      }

      // Add some larger orbital objects around each diamond
      const orbitalCount = 3 + Math.floor(Math.random() * 3); // 3-5 orbital objects
      for (let i = 0; i < orbitalCount; i++) {
        const orbitalTypes = [
          new THREE.SphereGeometry(0.6 + Math.random() * 0.4, 8, 6),
          new THREE.CylinderGeometry(0.3, 0.3, 1.2 + Math.random() * 0.8, 6),
          new THREE.TorusGeometry(0.8, 0.2, 6, 12)
        ];

        const geometry = orbitalTypes[Math.floor(Math.random() * orbitalTypes.length)];
        const orbital = new THREE.Mesh(geometry, material);

        // Larger orbital radius for bigger objects
        const angle = (i / orbitalCount) * Math.PI * 2 + Math.random() * 0.5;
        const radius = 8 + Math.random() * 8;
        const height = pos.height + (Math.random() - 0.5) * 6;

        orbital.position.set(
          pos.x + Math.cos(angle) * radius,
          height,
          pos.z + Math.sin(angle) * radius
        );

        orbital.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );

        orbital.castShadow = true;
        orbital.receiveShadow = true;
        this.scene.add(orbital);
        this.geometryObjects.push(orbital);
        this.animatedObjects.push(orbital);
      }
    });
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

  private onMouseClick(event: MouseEvent): void {
    // Calculate mouse position in normalized device coordinates
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the raycaster with camera and mouse position
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Check for intersections with diamonds
    const intersects = this.raycaster.intersectObjects(this.diamonds);

    if (intersects.length > 0) {
      const clickedDiamond = intersects[0].object as THREE.Mesh;
      const diamondIndex = clickedDiamond.userData.diamondIndex;
      this.focusOnDiamond(diamondIndex);
    }
  }

  private focusOnDiamond(diamondIndex: number): void {
    if (diamondIndex < 0 || diamondIndex >= this.diamonds.length) return;

    const diamond = this.diamonds[diamondIndex];
    const diamondPos = diamond.position;

    // Calculate camera position for dramatic angle
    const offset = 15; // Distance from diamond
    const height = 8; // Height above diamond

    // Create different angles for each diamond
    const angleOffset = diamondIndex * (Math.PI / 3); // Different angle for each diamond
    const cameraPosition = new THREE.Vector3(
      diamondPos.x + Math.cos(angleOffset) * offset,
      diamondPos.y + height,
      diamondPos.z + Math.sin(angleOffset) * offset
    );

    const targetPosition = diamondPos.clone();

    // Smooth camera transition
    this.animateToPosition(cameraPosition, targetPosition, 2000);

    console.log(`Focusing on diamond ${diamondIndex}`);
  }

  private setOverviewCamera(): void {
    // High overview position to see all diamonds
    const overviewPosition = new THREE.Vector3(0, 80, 80);
    const overviewTarget = new THREE.Vector3(0, 40, 0);

    this.animateToPosition(overviewPosition, overviewTarget, 2500);
    console.log('Overview camera activated');
  }

  private animateToPosition(position: THREE.Vector3, target: THREE.Vector3, duration: number = 2000): void {
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