import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { SHADOW_CONFIG } from '../utils/Constants';

export function SceneLights() {
  const mainLightRef = useRef<THREE.DirectionalLight>(null);

  useEffect(() => {
    if (mainLightRef.current) {
      const light = mainLightRef.current;
      light.shadow.camera.near = SHADOW_CONFIG.cameraNear;
      light.shadow.camera.far = SHADOW_CONFIG.cameraFar;
      light.shadow.camera.left = -SHADOW_CONFIG.cameraSize;
      light.shadow.camera.right = SHADOW_CONFIG.cameraSize;
      light.shadow.camera.top = SHADOW_CONFIG.cameraSize;
      light.shadow.camera.bottom = -SHADOW_CONFIG.cameraSize;
      light.shadow.camera.updateProjectionMatrix();
    }
  }, []);

  return (
    <>
      {/* Black background */}
      <color attach="background" args={[0x000000]} />

      {/* Ambient light - global illumination */}
      <ambientLight intensity={0.8} />

      {/* Fill light */}
      <directionalLight position={[5, 10, 5]} intensity={0.3} />

      {/* Main light with shadows */}
      <directionalLight
        ref={mainLightRef}
        position={[200, 200, 200]}
        intensity={2.0}
        castShadow
        shadow-mapSize-width={SHADOW_CONFIG.mapSize}
        shadow-mapSize-height={SHADOW_CONFIG.mapSize}
      />
    </>
  );
}
