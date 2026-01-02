import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { Scene } from './components/Scene';
import { UIManager } from './ui/UIManager';
import { useSceneStore } from './store/sceneStore';
import {
  connectUIToStore,
  setupKeyboardHandlers,
  setupMusicPlayerHandlers,
  initializeUIAfterLoad
} from './bridge/uiBridge';

// Detect mobile device
function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Main application initialization
function init() {
  const isMobile = isMobileDevice();

  // Set mobile state in store
  useSceneStore.getState().setIsMobile(isMobile);

  // Initialize UI Manager (vanilla JS, stays as-is)
  const uiManager = new UIManager(isMobile);

  // Create canvas container
  const appElement = document.getElementById('app');
  if (!appElement) {
    console.error('App element not found');
    return;
  }

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
  appElement.appendChild(canvasContainer);

  // Connect UI to store
  connectUIToStore(uiManager);

  // Setup keyboard handlers
  setupKeyboardHandlers(uiManager);

  // Setup music player click handlers
  setupMusicPlayerHandlers(uiManager, isMobile);

  // Handle scene loaded callback
  const onSceneLoaded = () => {
    initializeUIAfterLoad(uiManager);
  };

  // Create React root and render Canvas
  const root = createRoot(canvasContainer);

  root.render(
    <Canvas
      gl={{
        antialias: false,
        logarithmicDepthBuffer: true,
        powerPreference: 'high-performance',
        stencil: false
      }}
      dpr={Math.min(window.devicePixelRatio, 2)}
      shadows={{
        enabled: true,
        type: THREE.BasicShadowMap
      }}
      camera={{
        fov: 60,
        near: 0.1,
        far: 2000,
        position: [20, 20, 20]
      }}
      onCreated={({ gl }) => {
        // Disable shadow map auto-update for performance
        gl.shadowMap.autoUpdate = false;
        gl.shadowMap.needsUpdate = true;
      }}
    >
      <Scene isMobile={isMobile} onLoaded={onSceneLoaded} />
    </Canvas>
  );
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
