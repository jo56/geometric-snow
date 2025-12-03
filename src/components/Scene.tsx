import { Suspense, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { SceneLights } from './SceneLights';
import { Terrain, GroundPlane } from './Terrain';
import { Mountains } from './Mountains';
import { TerrainElements, CenterStructures, BackgroundShapes } from './Structures';
import { Stars } from './Stars';
import { ParticleSystem } from './ParticleSystem';
import { FloatingObjects } from './FloatingObjects';
import { Diamonds } from './Diamond';
import { CameraController } from './CameraController';
import { useAudio } from '../hooks/useAudio';
import { useSceneStore } from '../store/sceneStore';

interface SceneProps {
  isMobile: boolean;
  onLoaded?: () => void;
}

// Inner scene content that uses hooks
function SceneContent({ isMobile, onLoaded }: SceneProps) {
  const { gl } = useThree();
  const setIsLoaded = useSceneStore((state) => state.setIsLoaded);

  // Initialize audio system
  useAudio(isMobile);

  // Mark scene as loaded and trigger shadow map update
  useEffect(() => {
    // Force shadow map update once
    gl.shadowMap.needsUpdate = true;

    // Mark as loaded
    setIsLoaded(true);

    if (onLoaded) {
      onLoaded();
    }
  }, [gl, setIsLoaded, onLoaded]);

  return (
    <>
      {/* Lighting */}
      <SceneLights />

      {/* Camera controls */}
      <CameraController />

      {/* Sky elements */}
      <Stars />

      {/* Terrain */}
      <Terrain />
      <GroundPlane />

      {/* Mountains */}
      <Mountains />

      {/* Terrain structures */}
      <TerrainElements />

      {/* Center area */}
      <CenterStructures />

      {/* Background shapes */}
      <BackgroundShapes />

      {/* Floating animated objects */}
      <FloatingObjects />

      {/* Diamonds with audio */}
      <Diamonds isMobile={isMobile} />

      {/* Snow particle system */}
      <ParticleSystem />
    </>
  );
}

export function Scene({ isMobile, onLoaded }: SceneProps) {
  return (
    <Suspense fallback={null}>
      <SceneContent isMobile={isMobile} onLoaded={onLoaded} />
    </Suspense>
  );
}
