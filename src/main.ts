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
  private diamondDebris: Map<number, THREE.Object3D[]> = new Map();
  private clock = new THREE.Clock();
  private animationPaused = false;
  private diamonds: THREE.Mesh[] = [];
  private diamondLights: Map<number, THREE.PointLight> = new Map();
  private diamondAuras: Map<number, THREE.Points> = new Map();
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private spinningDiamonds = new Set<number>();
  private listener!: THREE.AudioListener;
  private playingAudios: Map<number, THREE.PositionalAudio> = new Map();
  private positionalAudios: Map<number, THREE.PositionalAudio> = new Map();
  private focusedDiamond: number = -1;
  private particles!: THREE.Points;
  private particleVelocities!: Float32Array;
  private isLoaded = false;

  constructor() {
    this.initWithLoading();
  }

  private isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  private async initWithLoading(): Promise<void> {
    this.updateLoadingProgress(10, 'Initializing renderer...');
    this.init();

    this.updateLoadingProgress(30, 'Creating scene geometry...');
    await this.createSceneAsync();

    this.updateLoadingProgress(70, 'Setting up post-processing...');
    this.setupPostProcessing();

    this.updateLoadingProgress(90, 'Finalizing...');
    this.animate();

    // Complete loading
    this.updateLoadingProgress(100, 'Complete!');

    // Set camera to overview position immediately (no animation)
    // Adjusted to be higher to compensate for raised diamonds
    const originalPos = new THREE.Vector3(-138.64, 161.27, 41.32);// Raised Y from 52 to 82
    const originalTarget = new THREE.Vector3(45.28, 96.57, -25.90);// Raised Y from 20 to 50
    const direction = originalPos.clone().sub(originalTarget).normalize();
    const overviewPosition = originalTarget.clone().add(direction.multiplyScalar(originalPos.distanceTo(originalTarget)));
    const overviewTarget = originalTarget.clone();

    this.camera.position.copy(overviewPosition);
    this.controls.target.copy(overviewTarget);
    this.controls.update();

    setTimeout(() => {
      // Start canvas fade first
      const canvasContainer = document.getElementById('canvas-container');
      if (canvasContainer) {
        canvasContainer.style.opacity = '1';
      }
      this.hideLoadingScreen();

      // Start menu fade 2 seconds after canvas starts
      setTimeout(() => {
        const musicPlayer = document.getElementById('music-player');
        if (musicPlayer) {
          musicPlayer.style.opacity = '1';
        }
      }, 2000);
    }, 500);
  }

  private updateLoadingProgress(_progress: number, _text: string): void {
    // Loading spinner doesn't need progress updates
  }

  private hideLoadingScreen(): void {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.style.opacity = '0';
      loadingScreen.style.transition = 'opacity 1.5s ease';
      setTimeout(() => {
        loadingScreen.style.display = 'none';
        this.isLoaded = true;
        // Show controls tooltip after loading
        this.showControlsTooltip();
      }, 1500);
    }
  }

  private showControlsTooltip(): void {
    const tooltip = document.getElementById('controls-tooltip');
    if (tooltip) {
      tooltip.classList.add('visible');
      this.setupTooltipClickOutside();
    }
  }

  private hideControlsTooltip(): void {
    const tooltip = document.getElementById('controls-tooltip');
    if (tooltip) {
      tooltip.classList.remove('visible');
    }
  }

  private toggleControlsTooltip(): void {
    const tooltip = document.getElementById('controls-tooltip');
    if (tooltip) {
      if (tooltip.classList.contains('visible')) {
        this.hideControlsTooltip();
      } else {
        this.showControlsTooltip();
      }
    }
  }

  private setupTooltipClickOutside(): void {
    const tooltip = document.getElementById('controls-tooltip');
    if (!tooltip) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (tooltip && !tooltip.contains(e.target as Node) && tooltip.classList.contains('visible')) {
        this.hideControlsTooltip();
        document.removeEventListener('click', handleClickOutside);
      }
    };

    // Add listener after a short delay to prevent immediate dismissal
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);
  }

  private init(): void {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000); // Black background

    // Add ambient light for diamond patterns only
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight.position.set(5, 10, 5);
    this.scene.add(directionalLight);

    // Add white ground plane with toon shading (created after materials are available)
    // This will be added in createSceneAsync after materials are set up

    // Camera - updated for much larger terrain with better culling
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    // Start with a different position for the animation to work
    this.camera.position.set(20, 20, 20);

    // Audio listener for spatial audio
    this.listener = new THREE.AudioListener();
    this.camera.add(this.listener);

    // Optimized Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      logarithmicDepthBuffer: true,
      powerPreference: "high-performance",
      stencil: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap; // Fastest shadow type
    this.renderer.shadowMap.autoUpdate = false; // Manual shadow updates for better performance

    // Controls - updated for much larger terrain
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 10, 0); // Start with lower target for animation
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // Allow much more zooming for the larger terrain
    this.controls.minDistance = 2;
    this.controls.maxDistance = 1200; // Much larger to see full expanded terrain and mountains

    // Allow full rotation
    this.controls.minPolarAngle = 0;
    this.controls.maxPolarAngle = Math.PI;

    this.controls.update();

    // Add to DOM wrapped in a container for fade effect
    const appElement = document.getElementById('app');
    if (appElement) {
      const canvasContainer = document.createElement('div');
      canvasContainer.id = 'canvas-container';
      canvasContainer.style.position = 'absolute';
      canvasContainer.style.top = '0';
      canvasContainer.style.left = '0';
      canvasContainer.style.width = '100%';
      canvasContainer.style.height = '100%';
      canvasContainer.style.zIndex = '1';
      canvasContainer.style.opacity = '0';
      canvasContainer.style.transition = 'opacity 4s ease-in-out';
      canvasContainer.appendChild(this.renderer.domElement);
      appElement.appendChild(canvasContainer);
      console.log('Canvas container created with opacity:', canvasContainer.style.opacity);
    }

    // Window resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.composer.setSize(window.innerWidth, window.innerHeight);
    });

    // Animation toggle controls and camera switching
    window.addEventListener('keydown', (e) => {
      if (e.key === 'h' || e.key === 'H') {
        this.toggleControlsTooltip();
      } else if (e.key === 'Escape') {
        // ESC hides tooltip if visible, otherwise resets camera
        const tooltip = document.getElementById('controls-tooltip');
        if (tooltip && tooltip.classList.contains('visible')) {
          this.hideControlsTooltip();
        } else {
          this.resetToOverview();
        }
      } else if (e.key === 'q' || e.key === 'Q') {
        this.stopAllTracks();
      } else if (e.key === 'r' || e.key === 'R') {
        this.resetToOverview();
      } else if (e.key === 'p' || e.key === 'P') {
        // Toggle play/pause for currently selected track
        const activeTrack = document.querySelector('.track-name.active');
        if (activeTrack) {
          const trackIndex = parseInt((activeTrack as HTMLElement).dataset.diamond || '0');
          this.toggleTrack(trackIndex);
        }
      } else if (e.key >= '1' && e.key <= '7') {
        // Number keys for play/pause without camera focus
        // 1=NEXUS(3), 2=DRIFT(0), 3=STATIC(1), 4=VOID(2), 5=FRAGMENT(4), 6=PULSE(5), 7=ECHO(6)
        const numberKeyMap: { [key: string]: number } = {
          '1': 3, '2': 0, '3': 1, '4': 2, '5': 4, '6': 5, '7': 6
        };
        const trackIndex = numberKeyMap[e.key];
        if (trackIndex !== undefined) {
          this.toggleTrack(trackIndex, false);
        }
      } else if ('zxcvbnm'.includes(e.key.toLowerCase())) {
        // zxcvbnm keys map to tracks - camera + highlight, no play/pause
        // Z=NEXUS(3), X=DRIFT(0), C=STATIC(1), V=VOID(2), B=FRAGMENT(4), N=PULSE(5), M=ECHO(6)
        const keyMap: { [key: string]: number } = {
          'z': 3, 'x': 0, 'c': 1, 'v': 2, 'b': 4, 'n': 5, 'm': 6
        };
        const trackIndex = keyMap[e.key.toLowerCase()];
        if (trackIndex !== undefined) {
          if (trackIndex === this.focusedDiamond) {
            // If pressing key for currently focused diamond, go back to overview
            this.resetToOverview();
          } else {
            // Otherwise, focus on this diamond
            this.focusOnDiamond(trackIndex);
            this.setTrackNameHighlight(trackIndex);
          }
        }
      } else if (e.key === 'e' || e.key === 'E') {
        // Move camera up (strafe vertically)
        this.camera.position.y += 1;
        this.controls.target.y += 1;
        this.controls.update();
      } else if (e.key === 'a' || e.key === 'A') {
        // Move camera left (strafe)
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        const right = new THREE.Vector3();
        right.crossVectors(this.camera.up, direction).normalize();
        this.camera.position.addScaledVector(right, 1);
        this.controls.target.addScaledVector(right, 1);
        this.controls.update();
      } else if (e.key === 'f' || e.key === 'F') {
        // Move camera down (strafe vertically)
        this.camera.position.y -= 1;
        this.controls.target.y -= 1;
        this.controls.update();
      } else if (e.key === 'd' || e.key === 'D') {
        // Move camera right (strafe)
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        const right = new THREE.Vector3();
        right.crossVectors(this.camera.up, direction).normalize();
        this.camera.position.addScaledVector(right, -1);
        this.controls.target.addScaledVector(right, -1);
        this.controls.update();
      } else if (e.key === 'w' || e.key === 'W') {
        // Move camera forward
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        this.camera.position.addScaledVector(direction, 1);
        this.controls.target.addScaledVector(direction, 1);
        this.controls.update();
      } else if (e.key === 's' || e.key === 'S') {
        // Move camera backward
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        this.camera.position.addScaledVector(direction, -1);
        this.controls.target.addScaledVector(direction, -1);
        this.controls.update();
      }
    });

    // Mouse click detection for diamonds
    window.addEventListener('click', (e) => {
      this.onMouseClick(e);
    });

    // Log camera position when mouse is released after dragging
    window.addEventListener('mouseup', () => {
      console.log('=== Camera Position ===');
      console.log('Position:', this.camera.position);
      console.log('Target:', this.controls.target);
      console.log('\n=== Copy this to set as starting view (replaces lines 51-52 AND 1928-1929) ===');
      console.log(`const originalPos = new THREE.Vector3(${this.camera.position.x.toFixed(2)}, ${this.camera.position.y.toFixed(2)}, ${this.camera.position.z.toFixed(2)});`);
      console.log(`const originalTarget = new THREE.Vector3(${this.controls.target.x.toFixed(2)}, ${this.controls.target.y.toFixed(2)}, ${this.controls.target.z.toFixed(2)});`);
      console.log('this.camera.position.copy(originalPos);');
      console.log('this.controls.target.copy(originalTarget);');
    });

    // Music player event listeners
    this.setupMusicPlayer();
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
    // Create massive mountain valley terrain that reaches all the way to mountains
    const terrainSize = 1600; // Much larger to reach mountain rings at ~750 radius
    const segments = 160; // Higher detail for the expanded terrain
    const terrainGeometry = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);

    // Add mountainous valley terrain with irregular features throughout
    const positions = terrainGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];

      // Distance from center for valley effect
      const distanceFromCenter = Math.sqrt(x * x + z * z);

      // Create valley bowl effect that reaches mountain bases - higher at edges, lower in center
      const valleyDepth = Math.min(distanceFromCenter / 500, 1); // Gradual rise to reach mountain ring at ~500-750
      const valleyHeight = valleyDepth * valleyDepth * 15; // Steeper rise to connect with mountain bases

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

      // Create interesting terrain features in different zones across expanded valley
      if (distanceFromCenter < 200) {
        // Central valley - gentle rolling terrain
        height += Math.sin(x * 0.04) * Math.cos(z * 0.04) * 6;
        height += Math.sin(x * 0.06) * Math.sin(z * 0.055) * 4;
      } else if (distanceFromCenter < 400) {
        // Mid valley - more dramatic features
        height += Math.sin(x * 0.015) * Math.cos(z * 0.018) * 12;
        height += Math.cos(x * 0.025) * Math.sin(z * 0.02) * 10;
      } else if (distanceFromCenter < 600) {
        // Outer valley - transitioning to mountain foothills
        const transitionEffect = (distanceFromCenter - 400) / 200;
        height += Math.sin(x * 0.008) * Math.cos(z * 0.008) * 18 * transitionEffect;
        height += Math.sin(x * 0.005) * Math.sin(z * 0.006) * 25 * transitionEffect;
      } else {
        // Mountain foothills - dramatic rises that connect to mountain bases
        const foothillEffect = Math.min((distanceFromCenter - 600) / 150, 1);
        height += Math.sin(x * 0.003) * Math.cos(z * 0.003) * 30 * foothillEffect;
        height += Math.sin(x * 0.002) * Math.sin(z * 0.0025) * 40 * foothillEffect;
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

  private createComplexMountain(material: THREE.Material, totalHeight: number, baseRadius: number): THREE.Mesh {
    const mountainType = Math.random();
    let mountainGeometry;

    if (mountainType < 0.4) {
      // Irregular cones with complex vertex manipulation
      mountainGeometry = new THREE.ConeGeometry(baseRadius, totalHeight, 12, 1);

      // Add noise to vertices for irregular peaks and ridges
      const positions = mountainGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];

        // Only modify vertices that aren't at the base (y > -totalHeight/2)
        if (y > -totalHeight/2 + 0.1) {
          const noise = (Math.random() - 0.5) * 0.3;
          const heightFactor = (y + totalHeight/2) / totalHeight; // 0 at base, 1 at peak

          positions[i] = x * (1 + noise * heightFactor);
          positions[i + 2] = z * (1 + noise * heightFactor);

          // Add vertical noise but ensure it doesn't go below base
          const verticalNoise = (Math.random() - 0.5) * totalHeight * 0.1 * heightFactor;
          positions[i + 1] = Math.max(y + verticalNoise, -totalHeight/2);
        }
      }
      mountainGeometry.computeVertexNormals();

    } else if (mountainType < 0.7) {
      // Complex cylinders with tapered irregular tops
      mountainGeometry = new THREE.CylinderGeometry(
        baseRadius * (0.2 + Math.random() * 0.3), // Variable top radius
        baseRadius,
        totalHeight,
        12,
        3 // Multiple height segments for complexity
      );

      // Add irregularity to the cylinder
      const positions = mountainGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];

        if (y > -totalHeight/2 + 0.1) {
          const heightFactor = (y + totalHeight/2) / totalHeight;
          const radialNoise = 1 + (Math.random() - 0.5) * 0.4 * heightFactor;

          positions[i] = x * radialNoise;
          positions[i + 2] = z * radialNoise;
        }
      }
      mountainGeometry.computeVertexNormals();

    } else {
      // Deformed octahedrons for angular, crystalline peaks
      mountainGeometry = new THREE.OctahedronGeometry(baseRadius * 0.8, 1);
      mountainGeometry.scale(1, totalHeight / (baseRadius * 1.6), 1);

      // Add asymmetric deformation
      const positions = mountainGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];

        // Deform but ensure base stays at or above y = -totalHeight/2
        const deformX = (Math.random() - 0.5) * 0.3;
        const deformZ = (Math.random() - 0.5) * 0.3;

        positions[i] = x * (1 + deformX);
        positions[i + 2] = z * (1 + deformZ);

        // Ensure no vertex goes below the intended base
        positions[i + 1] = Math.max(y, -totalHeight/2);
      }
      mountainGeometry.computeVertexNormals();
    }

    return new THREE.Mesh(mountainGeometry, material);
  }

  private createHorizonMountains(_material: THREE.ShaderMaterial): void {
    // Dense mountain system to create a complete mountain wall - positioned far from open field
    const mountainMaterial = this.createMountainMaterial();

    // Inner mountain ring - moved further from center to avoid floating near open field
    const innerCount = 24;
    const innerRadius = 500; // Increased from 350 to push mountains back

    for (let i = 0; i < innerCount; i++) {
      const angle = (i / innerCount) * Math.PI * 2;
      const radius = innerRadius + (Math.random() - 0.5) * 60;

      const mountainHeight = 180 + Math.random() * 120;

      // Create interesting mountain shapes that never go below ground
      const mountain = this.createComplexMountain(mountainMaterial, mountainHeight, 50 + Math.random() * 60);

      // Position mountain so its absolute bottom is at ground level (y=0)
      const groundOffset = mountainHeight / 2; // This puts the center at height/2, bottom at 0

      mountain.position.set(
        Math.cos(angle) * radius,
        groundOffset,
        Math.sin(angle) * radius
      );

      // Only Y rotation to prevent any tilting that could create underground parts
      mountain.rotation.x = 0;
      mountain.rotation.y = Math.random() * Math.PI;
      mountain.rotation.z = 0;

      // No scaling to ensure predictable geometry bounds
      mountain.scale.set(1, 1, 1);

      mountain.castShadow = false;
      mountain.receiveShadow = false;
      this.scene.add(mountain);
      this.geometryObjects.push(mountain);
    }

    // Middle mountain ring - main wall with complex shapes
    const middleCount = 20;
    const middleRadius = 600; // Increased from 450 to push further back

    for (let i = 0; i < middleCount; i++) {
      const angle = (i / middleCount) * Math.PI * 2;
      const radius = middleRadius + (Math.random() - 0.5) * 80;

      const mountainHeight = 220 + Math.random() * 150;

      // Create interesting mountain shapes that never go below ground
      const mountain = this.createComplexMountain(mountainMaterial, mountainHeight, 70 + Math.random() * 80);

      // Position mountain so its absolute bottom is at ground level (y=0)
      const groundOffset = mountainHeight / 2; // This puts the center at height/2, bottom at 0

      mountain.position.set(
        Math.cos(angle) * radius,
        groundOffset,
        Math.sin(angle) * radius
      );

      // Only Y rotation to prevent any tilting that could create underground parts
      mountain.rotation.x = 0;
      mountain.rotation.y = Math.random() * Math.PI;
      mountain.rotation.z = 0;

      // No scaling to ensure predictable geometry bounds
      mountain.scale.set(1, 1, 1);

      mountain.castShadow = false;
      mountain.receiveShadow = false;
      this.scene.add(mountain);
      this.geometryObjects.push(mountain);
    }

    // Outer mountain ring - backdrop wall
    const outerCount = 16;
    const outerRadius = 750; // Increased from 550 to push to proper distance

    for (let i = 0; i < outerCount; i++) {
      const angle = (i / outerCount) * Math.PI * 2;
      const radius = outerRadius + (Math.random() - 0.5) * 100;

      const mountainHeight = 280 + Math.random() * 200;
      const mountain = new THREE.Mesh(
        new THREE.ConeGeometry(
          90 + Math.random() * 100,
          mountainHeight,
          6
        ),
        mountainMaterial
      );

      mountain.position.set(
        Math.cos(angle) * radius,
        mountainHeight / 2,
        Math.sin(angle) * radius
      );

      mountain.rotation.y = Math.random() * Math.PI;
      mountain.castShadow = false;
      mountain.receiveShadow = false;
      this.scene.add(mountain);
      this.geometryObjects.push(mountain);
    }

    // Fill gaps with extra mountains - positioned far from open field
    const gapFillers = 20; // Reduced count
    for (let i = 0; i < gapFillers; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 550 + Math.random() * 200; // Much further from center, between middle and outer rings

      const mountainHeight = 150 + Math.random() * 180;
      const mountain = new THREE.Mesh(
        new THREE.ConeGeometry(
          40 + Math.random() * 70,
          mountainHeight,
          6
        ),
        mountainMaterial
      );

      mountain.position.set(
        Math.cos(angle) * radius,
        mountainHeight / 2,
        Math.sin(angle) * radius
      );

      mountain.rotation.y = Math.random() * Math.PI;
      mountain.castShadow = false;
      mountain.receiveShadow = false;
      this.scene.add(mountain);
      this.geometryObjects.push(mountain);
    }
  }

  private createTerrainElements(material: THREE.ShaderMaterial): void {
    // Add scattered platform pieces at different levels - spread across full valley
    for (let i = 0; i < 120; i++) { // Much more platforms for full valley coverage
      const platformSize = 3 + Math.random() * 6;
      const platformHeight = 0.3 + Math.random() * 1.2;
      const platform = new THREE.Mesh(
        new THREE.BoxGeometry(platformSize, platformHeight, platformSize),
        material
      );

      platform.position.set(
        (Math.random() - 0.5) * 1400, // Spread across full expanded terrain
        platformHeight / 2 + Math.random() * 3,
        (Math.random() - 0.5) * 1400  // Spread across full expanded terrain
      );
      platform.rotation.y = Math.random() * Math.PI;
      platform.castShadow = true;
      platform.receiveShadow = true;
      this.scene.add(platform);
      this.geometryObjects.push(platform);
    }

    // Create elevated areas with steps - scattered across full valley
    for (let i = 0; i < 60; i++) { // Many more step areas for full coverage
      const stepCount = 3 + Math.floor(Math.random() * 5);
      const stepWidth = 2 + Math.random() * 3;

      for (let j = 0; j < stepCount; j++) {
        const step = new THREE.Mesh(
          new THREE.BoxGeometry(stepWidth, 0.4, stepWidth * 0.8),
          material
        );

        const baseX = (Math.random() - 0.5) * 1200; // Spread across expanded terrain
        const baseZ = (Math.random() - 0.5) * 1200; // Spread across expanded terrain

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

    // Add many larger landmark structures across the full expanded terrain
    for (let i = 0; i < 40; i++) { // Much more landmarks for full valley
      const landmarkTypes = [
        new THREE.BoxGeometry(8, 6, 8),          // Large blocks
        new THREE.CylinderGeometry(3, 3, 8, 8),  // Towers
        new THREE.ConeGeometry(4, 10, 6),        // Spires
        new THREE.TorusGeometry(4, 1, 8, 16)     // Large rings
      ];

      const geometry = landmarkTypes[Math.floor(Math.random() * landmarkTypes.length)];
      const landmark = new THREE.Mesh(geometry, material);

      landmark.position.set(
        (Math.random() - 0.5) * 1300, // Spread across full expanded terrain
        3 + Math.random() * 4,
        (Math.random() - 0.5) * 1300
      );

      landmark.rotation.y = Math.random() * Math.PI;
      landmark.castShadow = true;
      landmark.receiveShadow = true;
      this.scene.add(landmark);
      this.geometryObjects.push(landmark);
    }

    // Add vertical stacks of rectangles for dramatic verticality
    this.createVerticalStacks(material);

    // Add ground panels to break up empty white spaces
    this.createGroundPanels(material);
  }

  private createVerticalStacks(material: THREE.ShaderMaterial): void {
    // Create irregular piles of rectangular blocks across full valley
    for (let pile = 0; pile < 80; pile++) { // More piles for full coverage
      const pileSize = 8 + Math.floor(Math.random() * 15); // 8-22 blocks per pile
      const baseSize = 2 + Math.random() * 4;

      // Pile center position across expanded terrain
      const pileX = (Math.random() - 0.5) * 1200;
      const pileZ = (Math.random() - 0.5) * 1200;

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

    // Create some extremely tall spire-like stacks across expanded valley
    for (let spire = 0; spire < 25; spire++) { // More spires for full coverage
      const spireHeight = 15 + Math.floor(Math.random() * 20); // Very tall
      const baseSize = 1.5 + Math.random() * 2;

      const spireX = (Math.random() - 0.5) * 1100;
      const spireZ = (Math.random() - 0.5) * 1100;

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

    // Create some stepped pyramid-like structures across full valley
    for (let pyramid = 0; pyramid < 20; pyramid++) { // More pyramids for full coverage
      const levels = 4 + Math.floor(Math.random() * 6);
      const baseSize = 6 + Math.random() * 4;

      const pyramidX = (Math.random() - 0.5) * 1000;
      const pyramidZ = (Math.random() - 0.5) * 1000;

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

  private createGroundPanels(material: THREE.ShaderMaterial): void {
    // Create angular ground structures - more architectural and less flat

    // 1. Angular ground structures - tilted rectangular blocks
    for (let i = 0; i < 60; i++) {
      const structureWidth = 15 + Math.random() * 25;
      const structureDepth = 12 + Math.random() * 20;
      const structureHeight = 2 + Math.random() * 4; // Much taller for angular look

      const structure = new THREE.Mesh(
        new THREE.BoxGeometry(structureWidth, structureHeight, structureDepth),
        material
      );

      structure.position.set(
        (Math.random() - 0.5) * 1300,
        structureHeight / 2,
        (Math.random() - 0.5) * 1300
      );

      // Add dramatic angular rotations
      structure.rotation.set(
        (Math.random() - 0.5) * 0.6, // Tilt forward/back
        Math.random() * Math.PI,     // Rotate around Y
        (Math.random() - 0.5) * 0.4  // Tilt left/right
      );

      structure.castShadow = true;
      structure.receiveShadow = true;
      this.scene.add(structure);
      this.geometryObjects.push(structure);
    }

    // 2. Elevated angular platforms - dramatic geometric shapes
    for (let i = 0; i < 45; i++) {
      const platformTypes = [
        new THREE.BoxGeometry(
          8 + Math.random() * 15,
          1.5 + Math.random() * 3,
          6 + Math.random() * 12
        ),
        new THREE.CylinderGeometry(
          6 + Math.random() * 8,
          4 + Math.random() * 6,
          2 + Math.random() * 4,
          8
        ),
        new THREE.ConeGeometry(
          8 + Math.random() * 6,
          3 + Math.random() * 3,
          6
        )
      ];

      const geometry = platformTypes[Math.floor(Math.random() * platformTypes.length)];
      const platform = new THREE.Mesh(geometry, material);

      platform.position.set(
        (Math.random() - 0.5) * 1300,
        1 + Math.random() * 2,
        (Math.random() - 0.5) * 1300
      );

      platform.rotation.set(
        (Math.random() - 0.5) * 0.5,
        Math.random() * Math.PI,
        (Math.random() - 0.5) * 0.3
      );

      platform.castShadow = true;
      platform.receiveShadow = true;
      this.scene.add(platform);
      this.geometryObjects.push(platform);
    }

    // 3. Geometric ground fragments - varied angular pieces
    for (let i = 0; i < 35; i++) {
      const fragmentTypes = [
        new THREE.BoxGeometry(5 + Math.random() * 8, 0.8 + Math.random() * 1.5, 5 + Math.random() * 8),
        new THREE.TetrahedronGeometry(4 + Math.random() * 4),
        new THREE.OctahedronGeometry(3 + Math.random() * 3)
      ];

      const geometry = fragmentTypes[Math.floor(Math.random() * fragmentTypes.length)];
      const fragment = new THREE.Mesh(geometry, material);

      fragment.position.set(
        (Math.random() - 0.5) * 1300,
        0.5 + Math.random() * 1,
        (Math.random() - 0.5) * 1300
      );

      fragment.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      fragment.castShadow = true;
      fragment.receiveShadow = true;
      this.scene.add(fragment);
      this.geometryObjects.push(fragment);
    }
  }


  private async createSceneAsync(): Promise<void> {
    // Create binary toon material
    const material = this.createBinaryToonMaterial();

    // Create scene in chunks with yield points for loading progress
    await this.yieldToMain();

    // Add stars to black background first (render order)
    this.createStars();
    await this.yieldToMain();

    // Create massive mountainous terrain
    this.createTerrain(material);
    await this.yieldToMain();

    // Create terrain elements (platforms, steps, landmarks)
    this.createTerrainElements(material);
    await this.yieldToMain();

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

    // Optimized Lighting
    const light = new THREE.DirectionalLight(0xffffff, 2.0);
    light.position.set(200, 200, 200);
    light.castShadow = true;
    light.shadow.mapSize.width = 1024; // Reduced for better performance
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 1200; // Reduced range
    light.shadow.camera.left = -600; // Reduced coverage for performance
    light.shadow.camera.right = 600;
    light.shadow.camera.top = 600;
    light.shadow.camera.bottom = -600;
    this.scene.add(light);

    // Add subtle ambient light to ensure visibility from all angles
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    await this.yieldToMain();

    // Add white ground plane with toon shading
    this.createWhiteGroundPlane(material);
    await this.yieldToMain();

    // Add background architecture
    this.createBackground();
    await this.yieldToMain();

    // Add floating animated objects
    this.createFloatingObjects();
    await this.yieldToMain();

    // Add optimized particle system
    this.createOptimizedParticleSystem();
    await this.yieldToMain();
  }

  private yieldToMain(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, 0);
    });
  }

  private createStars(): void {
    // Create small static stars in the black background
    const starCount = 1000;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;

      const radius = 1200 + Math.random() * 400; // Far away, beyond mountains
      const theta = Math.random() * Math.PI * 2;

      // Create belt of stars around mountains with some higher stars
      let y;
      if (i < starCount * 0.65) {
        // 65% in belt around mountain height (200-500)
        y = 200 + Math.random() * 300;
        const horizontalRadius = Math.sqrt(radius * radius - y * y);
        starPositions[i3] = horizontalRadius * Math.cos(theta);
        starPositions[i3 + 1] = y;
        starPositions[i3 + 2] = horizontalRadius * Math.sin(theta);
      } else {
        // 35% higher in sky
        const phi = Math.random() * Math.PI * 0.5;
        starPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        starPositions[i3 + 1] = radius * Math.cos(phi);
        starPositions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      }
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 4.0,
      sizeAttenuation: false,
      transparent: false,
      depthTest: true,
      depthWrite: false
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    stars.renderOrder = -1; // Render stars first
    this.scene.add(stars);
  }

  private createWhiteGroundPlane(_material: THREE.ShaderMaterial): void {
    // Create inverted toon material for white ground (bright base, dark shadows)
    const groundMaterial = new THREE.ShaderMaterial({
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

          // Inverted toon: subtle off-white with gray shadows
          float shade = step(0.5, NdotL);
          vec3 color = mix(vec3(0.5), vec3(0.92), shade);  // Gray shadows to subtle off-white

          gl_FragColor = vec4(color, 1.0);
        }
      `
    });

    const groundGeometry = new THREE.PlaneGeometry(3000, 3000);
    const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.position.y = -1;
    groundPlane.receiveShadow = true;
    this.scene.add(groundPlane);
  }

  private createOptimizedParticleSystem(): void {
    // Optimized particle system with more particles for smaller size
    const particleCount = 1500; // Increased for better coverage with smaller particles
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    // Initialize particle positions and velocities
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // Spread particles throughout the expanded valley
      positions[i3] = (Math.random() - 0.5) * 1600;     // X
      positions[i3 + 1] = Math.random() * 200;          // Y (height)
      positions[i3 + 2] = (Math.random() - 0.5) * 1600; // Z

      // Faster downward drift with some randomness
      velocities[i3] = (Math.random() - 0.5) * 0.4;     // X velocity
      velocities[i3 + 1] = -0.5 - Math.random() * 1.0;  // Y velocity (falling much faster)
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.4; // Z velocity
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    // Optimized particle material
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x808080,        // Light gray for soft appearance
      size: 2.0,              // Smaller particles
      transparent: true,
      opacity: 0.6,           // Slightly more opaque to compensate
      blending: THREE.NormalBlending,
      sizeAttenuation: true,
      vertexColors: false,
      alphaTest: 0.1          // Performance optimization
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(particles);

    // Store references for animation
    this.particles = particles;
    this.particleVelocities = velocities;
  }

  private createDiamondAura(): THREE.Points {
    // Create radiant particle aura around diamond
    const particleCount = 150;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    // Create sphere of particles around diamond
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // Random spherical distribution
      const radius = 8 + Math.random() * 6; // Particles between radius 8-14
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.5,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending, // Additive blending for glow effect
      sizeAttenuation: true
    });

    return new THREE.Points(geometry, material);
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
    const debrisMaterial = this.createBinaryToonMaterial();

    // Ring 1: Outer ring of cubes (radius 25, high altitude)
    const cubeCount = 8;
    const cubeRadius = 25;
    const baseHeight = 135; // Raised floating height
    for (let i = 0; i < cubeCount; i++) {
      const angle = (i / cubeCount) * Math.PI * 2;
      const cube = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), debrisMaterial);
      cube.position.set(
        Math.cos(angle) * cubeRadius,
        baseHeight + Math.sin(i * 0.5) * 6, // Higher with more variation
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
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 6), debrisMaterial);
      sphere.position.set(
        Math.cos(angle) * sphereRadius,
        baseHeight + 3 + Math.cos(i * 0.8) * 4, // Higher than before
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
      const pyramid = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.8, 4), debrisMaterial);
      pyramid.position.set(
        Math.cos(angle) * pyramidRadius,
        baseHeight + 8 + Math.sin(i * 1.2) * 3, // Higher than spheres
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
      const debris = new THREE.Mesh(geometry, debrisMaterial);

      // Random positions around the diamond at high altitude
      const angle = Math.random() * Math.PI * 2;
      const radius = 6 + Math.random() * 20;
      const height = baseHeight + 15 + (Math.random() - 0.5) * 15;

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

    // Add structures underneath the central diamond position
    this.createCenterStructures(material, debrisMaterial);

    // Create all diamonds (including center) with their own debris fields
    this.createAdditionalDiamonds(material, debrisMaterial, baseHeight);
  }

  private createCenterStructures(material: THREE.ShaderMaterial, debrisMaterial: THREE.ShaderMaterial): void {
    // Create architectural structures underneath the central diamond

    // 1. Central pedestal platform
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(8, 12, 6, 8),
      material
    );
    pedestal.position.set(0, 3, 0);
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;
    this.scene.add(pedestal);
    this.geometryObjects.push(pedestal);

    // 2. Surrounding angular support structures
    const supportCount = 6;
    for (let i = 0; i < supportCount; i++) {
      const angle = (i / supportCount) * Math.PI * 2;
      const radius = 15 + Math.random() * 5;

      const supportTypes = [
        new THREE.BoxGeometry(3 + Math.random() * 2, 8 + Math.random() * 6, 3 + Math.random() * 2),
        new THREE.ConeGeometry(2 + Math.random() * 1.5, 10 + Math.random() * 5, 6),
        new THREE.CylinderGeometry(1.5, 3, 12 + Math.random() * 4, 8)
      ];

      const geometry = supportTypes[Math.floor(Math.random() * supportTypes.length)];
      const support = new THREE.Mesh(geometry, material);

      support.position.set(
        Math.cos(angle) * radius,
        5 + Math.random() * 3,
        Math.sin(angle) * radius
      );

      support.rotation.set(
        (Math.random() - 0.5) * 0.3,
        angle + (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.2
      );

      support.castShadow = true;
      support.receiveShadow = true;
      this.scene.add(support);
      this.geometryObjects.push(support);
    }

    // 3. Ground-level angular structures radiating from center
    const groundStructureCount = 12;
    for (let i = 0; i < groundStructureCount; i++) {
      const angle = (i / groundStructureCount) * Math.PI * 2;
      const radius = 8 + Math.random() * 12;

      const structure = new THREE.Mesh(
        new THREE.BoxGeometry(
          2 + Math.random() * 3,
          1 + Math.random() * 2,
          6 + Math.random() * 4
        ),
        material
      );

      structure.position.set(
        Math.cos(angle) * radius,
        0.5 + Math.random() * 0.5,
        Math.sin(angle) * radius
      );

      structure.rotation.set(
        (Math.random() - 0.5) * 0.4,
        angle + (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.2
      );

      structure.castShadow = true;
      structure.receiveShadow = true;
      this.scene.add(structure);
      this.geometryObjects.push(structure);
    }

    // 4. Elevated black debris platforms around center
    const platformCount = 8;
    for (let i = 0; i < platformCount; i++) {
      const angle = (i / platformCount) * Math.PI * 2 + Math.random() * 0.5;
      const radius = 20 + Math.random() * 10;

      const platform = new THREE.Mesh(
        new THREE.BoxGeometry(
          4 + Math.random() * 3,
          0.3 + Math.random() * 0.4,
          4 + Math.random() * 3
        ),
        debrisMaterial
      );

      platform.position.set(
        Math.cos(angle) * radius,
        2 + Math.random() * 3,
        Math.sin(angle) * radius
      );

      platform.rotation.set(
        (Math.random() - 0.5) * 0.3,
        Math.random() * Math.PI,
        (Math.random() - 0.5) * 0.2
      );

      platform.castShadow = true;
      platform.receiveShadow = true;
      this.scene.add(platform);
      this.geometryObjects.push(platform);
    }

    // 5. Connecting bridge elements
    const bridgeCount = 4;
    for (let i = 0; i < bridgeCount; i++) {
      const angle = (i / bridgeCount) * Math.PI * 2;
      const startRadius = 12;
      const endRadius = 25;

      const bridge = new THREE.Mesh(
        new THREE.BoxGeometry(
          endRadius - startRadius,
          0.5,
          1.5 + Math.random() * 1
        ),
        material
      );

      const midRadius = (startRadius + endRadius) / 2;
      bridge.position.set(
        Math.cos(angle) * midRadius,
        2.5 + Math.random() * 1,
        Math.sin(angle) * midRadius
      );

      bridge.rotation.y = angle;

      bridge.castShadow = true;
      bridge.receiveShadow = true;
      this.scene.add(bridge);
      this.geometryObjects.push(bridge);
    }
  }

  private createAdditionalDiamonds(material: THREE.ShaderMaterial, debrisMaterial: THREE.ShaderMaterial, baseHeight: number): void {
    // Create all 7 diamonds including center
    // Order: DRIFT, STATIC, VOID, NEXUS (center), FRAGMENT, PULSE, ECHO
    const diamondPositions = [
      { x: -90, z: -30, height: baseHeight + 10, size: 7 },   // 0: DRIFT (bottom-left area)
      { x: -40, z: -70, height: baseHeight + 7, size: 7 },    // 1: STATIC (bottom-left)
      { x: 45, z: -85, height: baseHeight + 3, size: 7 },     // 2: VOID (bottom-right)
      { x: 0, z: 0, height: baseHeight + 15, size: 9 },       // 3: NEXUS (center - larger)
      { x: 80, z: 40, height: baseHeight + 5, size: 7 },      // 4: FRAGMENT (right)
      { x: 20, z: 100, height: baseHeight + 6, size: 7 },     // 5: PULSE (top)
      { x: -60, z: 70, height: baseHeight + 8, size: 7 }      // 6: ECHO (top-left)
    ];

    diamondPositions.forEach((pos, index) => {
      const diamond = this.createHalfDiamond(pos.size, this.createDiamondMaterial());
      diamond.position.set(pos.x, pos.height, pos.z);
      diamond.castShadow = true;
      diamond.receiveShadow = true;
      diamond.userData = { diamondIndex: index };
      this.scene.add(diamond);
      this.geometryObjects.push(diamond);
      this.animatedObjects.push(diamond);
      this.diamonds.push(diamond);

      // Create point light for this diamond (initially off)
      const lightDistance = index === 3 ? 50 : 40; // Center diamond has larger light distance
      const light = new THREE.PointLight(0xffffff, 0, lightDistance);
      light.position.set(pos.x, pos.height, pos.z);
      this.scene.add(light);
      this.diamondLights.set(index, light);

      // Create aura particle system for this diamond
      const aura = this.createDiamondAura();
      aura.position.set(pos.x, pos.height, pos.z);
      aura.visible = false; // Initially hidden
      this.scene.add(aura);
      this.diamondAuras.set(index, aura);

      // Create positional audio for this diamond
      const positionalAudio = new THREE.PositionalAudio(this.listener);
      positionalAudio.setRefDistance(10);  // Smaller ref distance for more controlled volume
      positionalAudio.setRolloffFactor(0.5);  // Gentle rolloff for gradual fade
      positionalAudio.setMaxDistance(10000);  // Very large max distance - audible from far away
      positionalAudio.setDistanceModel('exponential');  // Exponential gives more natural, gradual falloff
      positionalAudio.setLoop(true);

      // Load audio file using AudioLoader
      const isMobile = this.isMobileDevice();
      const audioFiles = isMobile 
        ? ['014_1.m4a', '015_1.m4a', '016_1.m4a', '007_1.m4a', '020_1.m4a', '018_1.m4a', '019_1.m4a']
        : ['014_1.ogg', '015_1.ogg', '016_1.ogg', '007_1.ogg', '020_1.ogg', '018_1.ogg', '019_1.ogg'];
      const audioPath = isMobile ? './mobile_audio' : './audio';
      
      if (index === 0) {
        console.log(`Audio loading: ${isMobile ? 'Mobile' : 'Desktop'} device detected, using ${audioPath}/${audioFiles[index]}`);
      }
      const audioLoader = new THREE.AudioLoader();
      audioLoader.load(`${audioPath}/${audioFiles[index]}`, (buffer) => {
        positionalAudio.setBuffer(buffer);
        // Set volume - 25% louder overall, fragment at 75%, nexus extra 75%
        if (index === 3) {
          positionalAudio.setVolume(1.25 * 1.75); // Nexus: 2.1875
        } else if (index === 4) {
          positionalAudio.setVolume(0.75 * 1.25); // Fragment: 0.9375
        } else {
          positionalAudio.setVolume(1.25);
        }
      });

      diamond.add(positionalAudio);
      this.positionalAudios.set(index, positionalAudio);

      // Initialize debris array for this diamond
      const debrisArray: THREE.Object3D[] = [];

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
        const debris = new THREE.Mesh(geometry, debrisMaterial);

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
        debrisArray.push(debris); // Store in conditional debris array
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
        const orbital = new THREE.Mesh(geometry, debrisMaterial);

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
        debrisArray.push(orbital); // Store in conditional debris array
      }

      // Store debris array for this diamond
      this.diamondDebris.set(index + 1, debrisArray);
    });

    // Add special structures under all diamonds
    diamondPositions.forEach((pos, index) => {
      this.createDiamondStructures(material, debrisMaterial, pos, index);
    });
  }

  private createDiamondStructures(material: THREE.ShaderMaterial, debrisMaterial: THREE.ShaderMaterial, position: { x: number, z: number, height: number }, _diamondIndex: number): void {
    // Create consistent debris piles under each diamond
    this.createDebrisPile(material, debrisMaterial, position);
  }

  private createDebrisPile(material: THREE.ShaderMaterial, debrisMaterial: THREE.ShaderMaterial, position: { x: number, z: number, height: number }): void {
    // Create debris pile like the original ground structures
    const pileSize = 8 + Math.floor(Math.random() * 10); // 8-17 blocks per pile
    const baseSize = 3 + Math.random() * 2;

    // Create irregular pile with blocks scattered around center
    for (let block = 0; block < pileSize; block++) {
      // Varied block dimensions
      const blockWidth = baseSize + (Math.random() - 0.5) * 2;
      const blockHeight = 1 + Math.random() * 3;
      const blockDepth = baseSize + (Math.random() - 0.5) * 2;

      const pileBlock = new THREE.Mesh(
        new THREE.BoxGeometry(blockWidth, blockHeight, blockDepth),
        Math.random() > 0.6 ? debrisMaterial : material
      );

      // Random scatter around pile center
      const scatterRadius = Math.random() * 6;
      const scatterAngle = Math.random() * Math.PI * 2;
      const scatterX = Math.cos(scatterAngle) * scatterRadius;
      const scatterZ = Math.sin(scatterAngle) * scatterRadius;

      // Height based on distance from center (pile effect) with randomness
      const distanceFromCenter = Math.sqrt(scatterX * scatterX + scatterZ * scatterZ);
      const pileHeight = Math.max(0, (6 - distanceFromCenter) * 1.5 + Math.random() * 2);

      pileBlock.position.set(
        position.x + scatterX,
        pileHeight + blockHeight / 2,
        position.z + scatterZ
      );

      // Random rotations for chaotic look
      pileBlock.rotation.x = (Math.random() - 0.5) * 0.4;
      pileBlock.rotation.y = Math.random() * Math.PI;
      pileBlock.rotation.z = (Math.random() - 0.5) * 0.3;

      pileBlock.castShadow = true;
      pileBlock.receiveShadow = true;
      this.scene.add(pileBlock);
      this.geometryObjects.push(pileBlock);
    }

    // Add a few larger platform pieces around each pile
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 + Math.random() * 0.5;
      const radius = 8 + Math.random() * 4;

      const platform = new THREE.Mesh(
        new THREE.BoxGeometry(
          4 + Math.random() * 3,
          0.5 + Math.random() * 0.8,
          3 + Math.random() * 2
        ),
        material
      );

      platform.position.set(
        position.x + Math.cos(angle) * radius,
        0.3 + Math.random() * 0.5,
        position.z + Math.sin(angle) * radius
      );

      platform.rotation.set(
        (Math.random() - 0.5) * 0.3,
        Math.random() * Math.PI,
        (Math.random() - 0.5) * 0.2
      );

      platform.castShadow = true;
      platform.receiveShadow = true;
      this.scene.add(platform);
      this.geometryObjects.push(platform);
    }
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

          // Binary step - pure black and white
          float shade = step(0.5, NdotL);
          vec3 color = mix(vec3(0.0), vec3(1.0), shade);  // Pure black and white

          gl_FragColor = vec4(color, 1.0);
        }
      `
    });
  }

  private createMountainMaterial(): THREE.ShaderMaterial {
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

          // Binary step with grayer colors for mountains
          float shade = step(0.5, NdotL);
          vec3 color = mix(vec3(0.4), vec3(0.9), shade);  // Gray instead of very dark for mountains

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      depthWrite: true,
      depthTest: true
    });
  }

  private createDiamondMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {},
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
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vec3 normal = normalize(vNormal);

          // Solid black base with solid white edge pattern
          float edgeIntensity = 1.0 - abs(dot(normal, normalize(vPosition)));
          float edge = step(0.6, edgeIntensity); // Binary step for solid white edges

          vec3 color = mix(vec3(0.0), vec3(1.0), edge);

          gl_FragColor = vec4(color, 1.0);
        }
      `
    });
  }

  // @ts-expect-error - Unused but kept for potential future use
  private createDebrisMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {},
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
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vec3 normal = normalize(vNormal);

          // Solid black base with solid white edge pattern
          float edgeIntensity = 1.0 - abs(dot(normal, normalize(vPosition)));
          float edge = step(0.6, edgeIntensity); // Binary step for solid white edges

          vec3 color = mix(vec3(0.0), vec3(1.0), edge);

          gl_FragColor = vec4(color, 1.0);
        }
      `
    });
  }

  private createHalfDiamond(size: number, _material: THREE.Material): THREE.Mesh {
    const geometry = new THREE.BufferGeometry();

    const vertices = new Float32Array([
      // Bottom point (vertex 0)
      0, -size, 0,

      // Middle ring (8 points around the equator) - vertices 1-8
      size, 0, 0,
      size * 0.707, 0, size * 0.707,
      0, 0, size,
      -size * 0.707, 0, size * 0.707,
      -size, 0, 0,
      -size * 0.707, 0, -size * 0.707,
      0, 0, -size,
      size * 0.707, 0, -size * 0.707
    ]);

    const indices = [
      // Bottom triangles (8 triangular faces from bottom point to ring)
      0, 2, 1,
      0, 3, 2,
      0, 4, 3,
      0, 5, 4,
      0, 6, 5,
      0, 7, 6,
      0, 8, 7,
      0, 1, 8,

      // Top face (octagon split into 6 triangles)
      1, 2, 3,
      1, 3, 4,
      1, 4, 5,
      1, 5, 6,
      1, 6, 7,
      1, 7, 8
    ];

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const blackMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, blackMaterial);

    // Add black edges to blend with shape
    const edges = new THREE.EdgesGeometry(geometry, 1);
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
    mesh.add(edgeLines);

    const patternGroup = new THREE.Group();
    const whiteMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide
    });

    // 1. Two horizontal white bands - positioned to partially wrap around cone
    const beltThickness = size * 0.08;

    // Upper band
    const upperBeltY = -size * 0.25;
    const upperBeltRadius = size * 0.625;
    const upperBeltGeometry = new THREE.TorusGeometry(upperBeltRadius, beltThickness, 16, 64);
    const upperBelt = new THREE.Mesh(upperBeltGeometry, whiteMaterial);
    upperBelt.rotation.x = Math.PI / 2;
    upperBelt.position.y = upperBeltY;
    patternGroup.add(upperBelt);

    // Lower band (same style, smaller radius for partial wrap effect)
    const lowerBeltY = -size * 0.6;
    const lowerBeltRadius = size * 0.28;
    const lowerBeltGeometry = new THREE.TorusGeometry(lowerBeltRadius, beltThickness, 16, 64);
    const lowerBelt = new THREE.Mesh(lowerBeltGeometry, whiteMaterial);
    lowerBelt.rotation.x = Math.PI / 2;
    lowerBelt.position.y = lowerBeltY;
    patternGroup.add(lowerBelt);

    // 2. Top face pattern - fragmented ring with gaps
    const topY = 0.01;

    // Center fragmented ring - partial torus segments with gaps
    const centerRingRadius = size * 0.5;
    const numSegments = 8;
    const arcLength = (Math.PI * 2) / numSegments;
    const gapRatio = 0.3;

    for (let i = 0; i < numSegments; i++) {
      const startAngle = i * arcLength;
      const endAngle = startAngle + arcLength * (1 - gapRatio);

      const segmentGeometry = new THREE.TorusGeometry(
        centerRingRadius,
        beltThickness,
        16,
        16,
        endAngle - startAngle
      );
      const segment = new THREE.Mesh(segmentGeometry, whiteMaterial);
      segment.rotation.x = Math.PI / 2;
      segment.rotation.z = startAngle;
      segment.position.y = topY;
      patternGroup.add(segment);
    }

    // Edge border - 2D flat ring near the edge on top face
    const edgeRingRadius = size * 0.9;
    const edgeRingWidth = beltThickness * 1.5;
    const edgeRingGeometry = new THREE.RingGeometry(edgeRingRadius - edgeRingWidth/2, edgeRingRadius + edgeRingWidth/2, 32);
    const edgeRing = new THREE.Mesh(edgeRingGeometry, whiteMaterial);
    edgeRing.rotation.x = -Math.PI / 2;
    edgeRing.position.y = topY;
    patternGroup.add(edgeRing);

    mesh.add(patternGroup);

    return mesh;
  }

  // @ts-expect-error - Unused but kept for potential future use
  private toggleAnimation(): void {
    this.animationPaused = !this.animationPaused;
    console.log(`Animation ${this.animationPaused ? 'paused' : 'resumed'}`);
  }

  private onMouseClick(event: MouseEvent): void {
    // Check if click is on music player UI
    const musicPlayer = document.getElementById('music-player');
    if (musicPlayer) {
      const rect = musicPlayer.getBoundingClientRect();
      if (event.clientX >= rect.left && event.clientX <= rect.right &&
          event.clientY >= rect.top && event.clientY <= rect.bottom) {
        return; // Don't process diamond clicks if clicking on menu
      }
    }

    // Calculate mouse position in normalized device coordinates
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the raycaster with camera and mouse position
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Check for intersections with diamonds
    const intersects = this.raycaster.intersectObjects(this.diamonds, true);

    if (intersects.length > 0) {
      // Find the diamond mesh (could be clicking on child pattern geometry)
      let diamondIndex = -1;

      for (const intersect of intersects) {
        let obj = intersect.object;
        // Traverse up to find the diamond mesh
        while (obj && diamondIndex === -1) {
          if (obj.userData && obj.userData.diamondIndex !== undefined) {
            diamondIndex = obj.userData.diamondIndex;
            break;
          }
          obj = obj.parent as THREE.Object3D;
        }
        if (diamondIndex !== -1) break;
      }

      if (diamondIndex !== -1) {
        // If clicking on already focused diamond, reset to overview
        if (diamondIndex === this.focusedDiamond) {
          this.resetToOverview();
        } else {
          // Click acts like clicking the track name - focus camera and update UI
          this.focusOnDiamond(diamondIndex);
          this.setTrackNameHighlight(diamondIndex);
        }
      }
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

  private resetToOverview(): void {
    // Don't stop the currently playing track anymore

    // Clear focused diamond
    this.focusedDiamond = -1;

    // Clear all UI selections
    this.clearUISelections();

    // Set overview camera
    this.setOverviewCamera();
  }

  private clearUISelections(): void {
    // Remove active class from all track names
    document.querySelectorAll('.track-name').forEach(el => el.classList.remove('active'));
  }

  private setOverviewCamera(): void {
    // Camera position zoomed out - higher to compensate for raised diamonds
    const originalPos = new THREE.Vector3(-138.64, 161.27, 41.32); // Raised Y from 52 to 82
    const originalTarget = new THREE.Vector3(45.28, 96.57, -25.90); // Raised Y from 20 to 50

    // Calculate direction from target to camera
    const direction = originalPos.clone().sub(originalTarget).normalize();

    // Move camera further away (each scroll ~= 10-15 units, so 5 scrolls ~= 60 units)
    const overviewPosition = originalTarget.clone().add(direction.multiplyScalar(originalPos.distanceTo(originalTarget)));
    const overviewTarget = originalTarget.clone();

    console.log('Overview Position:', overviewPosition);
    console.log('Overview Target:', overviewTarget);

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

  // @ts-expect-error - Unused but kept for potential future use
  private fadeInScene(): void {
    // Fade in the canvas container and music player simultaneously
    const canvasContainer = document.getElementById('canvas-container');
    const musicPlayer = document.getElementById('music-player');

    console.log('=== fadeInScene called ===');
    console.log('Canvas container found:', !!canvasContainer);
    console.log('Music player found:', !!musicPlayer);

    if (canvasContainer) {
      const computedStyle = window.getComputedStyle(canvasContainer);
      console.log('Canvas container BEFORE - inline opacity:', canvasContainer.style.opacity);
      console.log('Canvas container BEFORE - computed opacity:', computedStyle.opacity);
      console.log('Canvas container BEFORE - transition:', canvasContainer.style.transition);
      canvasContainer.style.opacity = '1';
      console.log('Canvas container AFTER - inline opacity:', canvasContainer.style.opacity);
    } else {
      console.error('Canvas container NOT FOUND!');
    }

    if (musicPlayer) {
      const computedStyle = window.getComputedStyle(musicPlayer);
      console.log('Music player BEFORE - inline opacity:', musicPlayer.style.opacity);
      console.log('Music player BEFORE - computed opacity:', computedStyle.opacity);
      console.log('Music player BEFORE - transition:', musicPlayer.style.transition);
      musicPlayer.style.opacity = '1';
      console.log('Music player AFTER - inline opacity:', musicPlayer.style.opacity);
    } else {
      console.error('Music player NOT FOUND!');
    }
  }

  private setupMusicPlayer(): void {
    // Track name click handlers (camera view only)
    document.querySelectorAll('.track-name').forEach(trackName => {
      trackName.addEventListener('click', (e) => {
        const diamondIndex = parseInt((e.target as HTMLElement).dataset.diamond || '0');

        if (diamondIndex === this.focusedDiamond) {
          // If clicking on already focused track, go back to overview
          this.resetToOverview();
        } else {
          // Otherwise, focus on this diamond
          this.focusOnDiamond(diamondIndex);
          this.setTrackNameHighlight(diamondIndex);
        }
      });
    });

    // Play button click handlers (spinning + audio, no camera)
    document.querySelectorAll('.play-button').forEach(playButton => {
      playButton.addEventListener('click', (e) => {
        const diamondIndex = parseInt((e.target as HTMLElement).dataset.diamond || '0');
        this.toggleTrack(diamondIndex, false);
      });
    });
  }

  private updateTrackNameUI(diamondIndex: number): void {
    // Update track name UI - keep highlight if it's the focused diamond
    const trackName = document.querySelector(`.track-name[data-diamond="${diamondIndex}"]`);
    if (trackName) {
      // Keep active if it's the focused diamond, regardless of playing status
      if (diamondIndex === this.focusedDiamond) {
        trackName.classList.add('active');
      } else if (!this.playingAudios.has(diamondIndex)) {
        trackName.classList.remove('active');
      }
    }
  }

  private setTrackNameHighlight(diamondIndex: number): void {
    // Track which diamond is focused
    this.focusedDiamond = diamondIndex;

    // Remove active from all tracks, then add to the focused one
    document.querySelectorAll('.track-name').forEach(el => {
      const elIndex = parseInt((el as HTMLElement).dataset.diamond || '0');
      if (elIndex === diamondIndex) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }

  private updatePlayButtonUI(diamondIndex: number, isPlaying: boolean): void {
    const playButton = document.querySelector(`.play-button[data-diamond="${diamondIndex}"]`) as HTMLElement;
    if (playButton) {
      playButton.textContent = isPlaying ? '⏸' : '▶';
      if (isPlaying) {
        playButton.classList.add('playing');
      } else {
        playButton.classList.remove('playing');
      }
    }
  }

  private async toggleTrack(diamondIndex: number, focusCamera: boolean = true): Promise<void> {
    const positionalAudio = this.positionalAudios.get(diamondIndex);
    if (!positionalAudio) return;

    // If this track is already playing, pause it
    if (this.playingAudios.has(diamondIndex)) {
      this.stopTrack(diamondIndex);
      return;
    }

    // Resume AudioContext on user interaction (required for mobile browsers)
    if (this.listener.context.state === 'suspended') {
      try {
        await this.listener.context.resume();
        console.log('AudioContext resumed');
      } catch (err) {
        console.error('Failed to resume AudioContext:', err);
      }
    }

    // Start new track
    this.playingAudios.set(diamondIndex, positionalAudio);

    // Start spinning diamond
    this.spinningDiamonds.add(diamondIndex);

    // Focus camera on diamond (optional)
    if (focusCamera) {
      this.focusOnDiamond(diamondIndex);
      this.setTrackNameHighlight(diamondIndex);
    }

    // Play audio using PositionalAudio
    if (positionalAudio.buffer) {
      positionalAudio.play();
    }

    // Update UI (only needed if not focusing camera, since setTrackNameHighlight handles it)
    if (!focusCamera) {
      this.updateTrackNameUI(diamondIndex);
    }
    this.updatePlayButtonUI(diamondIndex, true);
  }

  private stopTrack(diamondIndex: number): void {
    const positionalAudio = this.playingAudios.get(diamondIndex);
    if (positionalAudio) {
      positionalAudio.stop();
      this.playingAudios.delete(diamondIndex);
    }

    // Stop spinning diamond
    this.spinningDiamonds.delete(diamondIndex);

    // Update UI
    this.updateTrackNameUI(diamondIndex);
    this.updatePlayButtonUI(diamondIndex, false);
  }

  private stopAllTracks(): void {
    // Stop all currently playing tracks
    const playingIndices = Array.from(this.playingAudios.keys());
    playingIndices.forEach(index => {
      this.stopTrack(index);
    });
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    if (!this.isLoaded) return; // Don't animate until fully loaded

    if (!this.animationPaused) {
      const time = this.clock.getElapsedTime();

      // Animate floating objects (optimized with early exit)
      const animatedCount = Math.min(this.animatedObjects.length, 50); // Limit animated objects for performance
      for (let i = 0; i < animatedCount; i++) {
        const obj = this.animatedObjects[i];
        if (!obj || !(obj instanceof THREE.Mesh)) continue;

        if (obj.geometry.type === 'BoxGeometry') {
          // Spinning cubes
          obj.rotation.x = time * 0.5 + i;
          obj.rotation.y = time * 0.7 + i;
          obj.position.y += Math.sin(time * 1.5 + i * 2) * 0.01;
        } else if (obj.geometry.type === 'SphereGeometry') {
          // Floating spheres - slow bob
          obj.position.y += Math.sin(time * 0.8 + i * 3) * 0.02;
          obj.rotation.z = time * 0.3 + i;
        } else if (obj.geometry.type === 'ConeGeometry') {
          // Pyramids - rotate and slight movement
          obj.rotation.y = time * 1.2 + i;
          obj.position.x += Math.sin(time * 0.6 + i * 4) * 0.01;
        } else if (obj.geometry.type === 'TorusGeometry') {
          // Rings - complex rotation
          obj.rotation.x = time * 0.4 + i;
          obj.rotation.y = time * 0.6 + i;
          obj.rotation.z = time * 0.2 + i;
        }
      }

      // Animate spinning diamonds with radiance aura effect
      this.diamonds.forEach((diamond, index) => {
        const aura = this.diamondAuras.get(index);

        if (this.spinningDiamonds.has(index)) {
          diamond.rotation.y = -time * 2.0; // Spin clockwise around Y axis

          // Show and animate aura
          if (aura) {
            aura.visible = true;
            aura.rotation.y = time * 0.5;
            aura.rotation.x = time * 0.3;

            // Pulse aura opacity
            const pulseFactor = 0.6 + Math.sin(time * 2) * 0.2;
            (aura.material as THREE.PointsMaterial).opacity = pulseFactor;
          }

          // Brighten white patterns
          const glowAmount = 1.4 + Math.sin(time * 2) * 0.4;
          diamond.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
              if (child.material.color.r > 0.5) {
                const brightColor = new THREE.Color(0xffffff);
                brightColor.multiplyScalar(glowAmount);
                child.material.color.copy(brightColor);
              }
            }
          });
        } else {
          // Hide aura when not playing
          if (aura) {
            aura.visible = false;
          }

          // Reset to normal white
          diamond.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
              if (child.material.color.r > 0.5 || child.material.color.r > 1.0) {
                child.material.color.set(0xffffff);
              }
            }
          });
        }
      });

      // Animate conditional debris (only if track is playing)
      this.spinningDiamonds.forEach(diamondIndex => {
        const debris = this.diamondDebris.get(diamondIndex);
        if (debris) {
          debris.forEach((obj, i) => {
            if (!obj || !(obj instanceof THREE.Mesh)) return;

            if (obj.geometry.type === 'BoxGeometry') {
              // Spinning cubes
              obj.rotation.x = time * 0.5 + i;
              obj.rotation.y = time * 0.7 + i;
              obj.position.y += Math.sin(time * 1.5 + i * 2) * 0.01;
            } else if (obj.geometry.type === 'SphereGeometry') {
              // Floating spheres - slow bob
              obj.position.y += Math.sin(time * 0.8 + i * 3) * 0.02;
              obj.rotation.z = time * 0.3 + i;
            } else if (obj.geometry.type === 'TetrahedronGeometry' || obj.geometry.type === 'ConeGeometry') {
              // Pyramids - rotate and slight movement
              obj.rotation.y = time * 1.2 + i;
              obj.position.x += Math.sin(time * 0.6 + i * 4) * 0.01;
            } else if (obj.geometry.type === 'TorusGeometry') {
              // Rings - complex rotation
              obj.rotation.x = time * 0.4 + i;
              obj.rotation.y = time * 0.6 + i;
              obj.rotation.z = time * 0.2 + i;
            } else if (obj.geometry.type === 'OctahedronGeometry' || obj.geometry.type === 'DodecahedronGeometry' || obj.geometry.type === 'IcosahedronGeometry') {
              // Other polyhedra - rotate
              obj.rotation.x = time * 0.8 + i;
              obj.rotation.y = time * 0.5 + i;
            } else if (obj.geometry.type === 'CylinderGeometry') {
              // Cylinders - rotate and bob
              obj.rotation.z = time * 0.7 + i;
              obj.position.y += Math.sin(time * 1.0 + i * 2) * 0.015;
            }
          });
        }
      });


      // Smooth particle animation (every frame)
      if (this.particles && this.particleVelocities) {
        const positions = this.particles.geometry.attributes.position.array as Float32Array;
        const particleCount = positions.length / 3;

        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;

          // Update positions based on velocities
          positions[i3] += this.particleVelocities[i3];
          positions[i3 + 1] += this.particleVelocities[i3 + 1];
          positions[i3 + 2] += this.particleVelocities[i3 + 2];

          // Reset particles that fall below ground or drift too far
          if (positions[i3 + 1] < -10 ||
              Math.abs(positions[i3]) > 900 ||
              Math.abs(positions[i3 + 2]) > 900) {

            // Reset to top of scene
            positions[i3] = (Math.random() - 0.5) * 1600;
            positions[i3 + 1] = 180 + Math.random() * 20;
            positions[i3 + 2] = (Math.random() - 0.5) * 1600;
          }
        }

        this.particles.geometry.attributes.position.needsUpdate = true;
      }
    }

    this.controls.update();
    this.composer.render();
  };
}

document.addEventListener('DOMContentLoaded', () => {
  new Killer7Scene();
});