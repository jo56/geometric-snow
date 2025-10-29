import * as THREE from 'three';
import { RendererManager } from './core/Renderer';
import { CameraManager } from './core/Camera';
import { SceneManager } from './core/Scene';
import { TerrainGenerator } from './terrain/TerrainGenerator';
import { AudioManager } from './audio/AudioManager';
import { UIManager } from './ui/UIManager';
import { PostProcessingManager } from './effects/PostProcessing';
import { DiamondManager } from './effects/Diamonds';
import { KEY_TO_DIAMOND_MAP, NUMBER_KEY_TO_DIAMOND_MAP } from './utils/Constants';

class GeometricSnowScene {
  private rendererManager: RendererManager;
  private cameraManager: CameraManager;
  private sceneManager: SceneManager;
  private terrainGenerator: TerrainGenerator;
  private audioManager: AudioManager;
  private uiManager: UIManager;
  private postProcessing: PostProcessingManager;
  private diamondManager: DiamondManager;

  private geometryObjects: THREE.Object3D[] = [];
  private animatedObjects: THREE.Object3D[] = [];
  private clock = new THREE.Clock();
  private isLoaded = false;
  private isMobile: boolean;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  constructor() {
    this.isMobile = this.isMobileDevice();
    this.rendererManager = new RendererManager();
    this.sceneManager = new SceneManager();
    this.cameraManager = new CameraManager(this.rendererManager.getRenderer());
    this.audioManager = new AudioManager(this.cameraManager.getCamera(), this.isMobile);
    this.uiManager = new UIManager(this.isMobile);

    this.terrainGenerator = new TerrainGenerator(
      this.sceneManager.getScene(),
      this.geometryObjects
    );

    this.postProcessing = new PostProcessingManager(
      this.rendererManager.getRenderer(),
      this.sceneManager.getScene(),
      this.cameraManager.getCamera(),
      this.geometryObjects
    );

    this.diamondManager = new DiamondManager(
      this.sceneManager.getScene(),
      this.geometryObjects,
      this.animatedObjects
    );

    this.initWithLoading();
  }

  private isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  private async initWithLoading(): Promise<void> {
    this.uiManager.updateLoadingProgress(10, 'Initializing renderer...');
    this.init();

    this.uiManager.updateLoadingProgress(30, 'Creating scene geometry...');
    await this.createSceneAsync();

    this.uiManager.updateLoadingProgress(70, 'Setting up post-processing...');

    this.uiManager.updateLoadingProgress(90, 'Finalizing...');
    this.animate();

    this.uiManager.updateLoadingProgress(100, 'Complete!');

    this.cameraManager.resetToOverview();

    setTimeout(() => {
      this.uiManager.fadeInCanvas();
      this.uiManager.hideLoadingScreen(() => {
        this.isLoaded = true;
      });
      this.uiManager.fadeInMusicPlayer(2000);
    }, 500);
  }

  private init(): void {
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
      this.rendererManager.appendToDOM(canvasContainer);
      appElement.appendChild(canvasContainer);
    }

    window.addEventListener('resize', () => this.handleResize());
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('click', (e) => this.onMouseClick(e));
    window.addEventListener('mouseup', () => {
      // Camera position logging (commented out for production)
    });

    this.uiManager.setupMusicPlayer(
      (diamondIndex) => this.handleTrackNameClick(diamondIndex),
      (diamondIndex) => this.handlePlayButtonClick(diamondIndex)
    );
  }

  private handleResize(): void {
    this.cameraManager.handleResize();
    this.rendererManager.handleResize();
    this.postProcessing.handleResize();
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'h' || e.key === 'H') {
      this.uiManager.toggleControlsTooltip();
    } else if (e.key === 'Escape') {
      const tooltip = document.getElementById('controls-tooltip');
      if (tooltip && tooltip.classList.contains('visible')) {
        this.uiManager.hideControlsTooltip();
      } else {
        this.resetToOverview();
      }
    } else if (e.key === 'q' || e.key === 'Q') {
      this.audioManager.stopAllTracks();
      this.updateAllUIAfterStopAll();
    } else if (e.key === 'r' || e.key === 'R') {
      this.resetToOverview();
    } else if (e.key === 'p' || e.key === 'P') {
      const activeTrack = document.querySelector('.track-name.active');
      if (activeTrack) {
        const trackIndex = parseInt((activeTrack as HTMLElement).dataset.diamond || '0');
        this.toggleTrack(trackIndex);
      }
    } else if (e.key >= '1' && e.key <= '7') {
      const trackIndex = NUMBER_KEY_TO_DIAMOND_MAP[e.key];
      if (trackIndex !== undefined) {
        this.toggleTrack(trackIndex, false);
      }
    } else if ('zxcvbnm'.includes(e.key.toLowerCase())) {
      const trackIndex = KEY_TO_DIAMOND_MAP[e.key.toLowerCase()];
      if (trackIndex !== undefined) {
        if (trackIndex === this.uiManager.getFocusedDiamond()) {
          this.resetToOverview();
        } else {
          this.focusOnDiamond(trackIndex);
          this.uiManager.setTrackNameHighlight(trackIndex);
        }
      }
    } else if (e.key === 'e' || e.key === 'E') {
      this.cameraManager.moveCamera('up');
    } else if (e.key === 'a' || e.key === 'A') {
      this.cameraManager.moveCamera('left');
    } else if (e.key === 'f' || e.key === 'F') {
      this.cameraManager.moveCamera('down');
    } else if (e.key === 'd' || e.key === 'D') {
      this.cameraManager.moveCamera('right');
    } else if (e.key === 'w' || e.key === 'W') {
      this.cameraManager.moveCamera('forward');
    } else if (e.key === 's' || e.key === 'S') {
      this.cameraManager.moveCamera('backward');
    }
  }

  private async createSceneAsync(): Promise<void> {
    const material = this.terrainGenerator.createBinaryToonMaterial();
    const debrisMaterial = this.terrainGenerator.createBinaryToonMaterial();

    await this.yieldToMain();
    this.terrainGenerator.createStars();

    await this.yieldToMain();
    this.terrainGenerator.createTerrain(material);

    await this.yieldToMain();
    this.terrainGenerator.createTerrainElements(material);

    await this.yieldToMain();
    for (let i = 0; i < 3; i++) {
      const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
      cube.position.set(-3 + i * 3, 0.5, 2);
      cube.castShadow = true;
      cube.receiveShadow = true;
      this.sceneManager.add(cube);
      this.geometryObjects.push(cube);
    }

    for (let i = 0; i < 2; i++) {
      const column = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3, 8), material);
      column.position.set(-4 + i * 8, 1.5, -2);
      column.castShadow = true;
      column.receiveShadow = true;
      this.sceneManager.add(column);
      this.geometryObjects.push(column);
    }

    await this.yieldToMain();
    this.terrainGenerator.createWhiteGroundPlane(material);

    await this.yieldToMain();
    this.terrainGenerator.createBackground();

    await this.yieldToMain();
    this.terrainGenerator.createFloatingObjects(this.animatedObjects, debrisMaterial);

    await this.yieldToMain();
    this.terrainGenerator.createCenterStructures(material, debrisMaterial);

    await this.yieldToMain();
    this.diamondManager.createAllDiamonds(material, debrisMaterial, () =>
      this.postProcessing.createDiamondAura()
    );

    this.diamondManager.getDiamonds().forEach((diamond, index) => {
      this.audioManager.setupDiamondAudio(index, diamond);
    });

    await this.yieldToMain();
    this.postProcessing.createOptimizedParticleSystem(this.sceneManager.getScene());
  }

  private yieldToMain(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }

  private handleTrackNameClick(diamondIndex: number): void {
    if (diamondIndex === this.uiManager.getFocusedDiamond()) {
      this.resetToOverview();
    } else {
      this.focusOnDiamond(diamondIndex);
      this.uiManager.setTrackNameHighlight(diamondIndex);
    }
  }

  private handlePlayButtonClick(diamondIndex: number): void {
    this.toggleTrack(diamondIndex, false);
  }

  private onMouseClick(event: MouseEvent): void {
    if (this.uiManager.isMusicPlayerClicked(event)) {
      return;
    }

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.cameraManager.getCamera());

    const intersects = this.raycaster.intersectObjects(this.diamondManager.getDiamonds(), true);

    if (intersects.length > 0) {
      let diamondIndex = -1;

      for (const intersect of intersects) {
        let obj = intersect.object;
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
        if (diamondIndex === this.uiManager.getFocusedDiamond()) {
          this.resetToOverview();
        } else {
          this.focusOnDiamond(diamondIndex);
          this.uiManager.setTrackNameHighlight(diamondIndex);
        }
      }
    }
  }

  private focusOnDiamond(diamondIndex: number): void {
    if (diamondIndex < 0 || diamondIndex >= this.diamondManager.getDiamonds().length) return;

    const diamond = this.diamondManager.getDiamonds()[diamondIndex];
    const diamondPos = diamond.position;

    this.cameraManager.focusOnPosition(diamondPos, diamondIndex);
    console.log(`Focusing on diamond ${diamondIndex}`);
  }

  private resetToOverview(): void {
    this.uiManager.setFocusedDiamond(-1);
    this.uiManager.clearUISelections();
    this.cameraManager.resetToOverview();
    console.log('Overview camera activated');
  }

  private toggleTrack(diamondIndex: number, focusCamera: boolean = true): void {
    if (this.audioManager.isPlaying(diamondIndex)) {
      this.audioManager.stopTrack(diamondIndex);
      this.diamondManager.stopSpinning(diamondIndex);
      this.uiManager.updateTrackNameUI(diamondIndex, false);
      this.uiManager.updatePlayButtonUI(diamondIndex, false);
      return;
    }

    this.diamondManager.startSpinning(diamondIndex);

    if (focusCamera) {
      this.focusOnDiamond(diamondIndex);
      this.uiManager.setTrackNameHighlight(diamondIndex);
    }

    this.audioManager.playTrack(diamondIndex);

    if (!focusCamera) {
      this.uiManager.updateTrackNameUI(diamondIndex, true);
    }
    this.uiManager.updatePlayButtonUI(diamondIndex, true);
  }

  private updateAllUIAfterStopAll(): void {
    this.diamondManager.getDiamonds().forEach((_, index) => {
      this.diamondManager.stopSpinning(index);
      this.uiManager.updateTrackNameUI(index, false);
      this.uiManager.updatePlayButtonUI(index, false);
    });
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    if (!this.isLoaded) return;

    const time = this.clock.getElapsedTime();

    const animatedCount = Math.min(this.animatedObjects.length, 50);
    for (let i = 0; i < animatedCount; i++) {
      const obj = this.animatedObjects[i];
      if (!obj || !(obj instanceof THREE.Mesh)) continue;

      if (obj.geometry.type === 'BoxGeometry') {
        obj.rotation.x = time * 0.5 + i;
        obj.rotation.y = time * 0.7 + i;
        obj.position.y += Math.sin(time * 1.5 + i * 2) * 0.01;
      } else if (obj.geometry.type === 'SphereGeometry') {
        obj.position.y += Math.sin(time * 0.8 + i * 3) * 0.02;
        obj.rotation.z = time * 0.3 + i;
      } else if (obj.geometry.type === 'ConeGeometry') {
        obj.rotation.y = time * 1.2 + i;
        obj.position.x += Math.sin(time * 0.6 + i * 4) * 0.01;
      } else if (obj.geometry.type === 'TorusGeometry') {
        obj.rotation.x = time * 0.4 + i;
        obj.rotation.y = time * 0.6 + i;
        obj.rotation.z = time * 0.2 + i;
      }
    }

    this.diamondManager.animateDiamonds(time);
    this.diamondManager.animateDebris(time);
    this.postProcessing.updateParticles();

    this.cameraManager.update();
    this.postProcessing.render();
  };
}

document.addEventListener('DOMContentLoaded', () => {
  new GeometricSnowScene();
});
