import { useRef, useEffect, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useSceneStore } from '../store/sceneStore';
import { CAMERA_CONFIG, OVERVIEW_CAMERA_POSITION, DIAMOND_POSITIONS } from '../utils/Constants';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';

interface CameraAnimation {
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  startTarget: THREE.Vector3;
  endTarget: THREE.Vector3;
  startTime: number;
  duration: number;
}

export function CameraController() {
  const controlsRef = useRef<OrbitControlsType>(null);
  const { camera } = useThree();
  const animationRef = useRef<CameraAnimation | null>(null);

  const focusedDiamond = useSceneStore((state) => state.focusedDiamond);
  const cameraTarget = useSceneStore((state) => state.cameraTarget);

  // Camera animation to position
  const animateToPosition = useCallback((
    position: THREE.Vector3,
    target: THREE.Vector3,
    duration: number = 2000
  ) => {
    if (!controlsRef.current) return;

    animationRef.current = {
      startPos: camera.position.clone(),
      endPos: position.clone(),
      startTarget: controlsRef.current.target.clone(),
      endTarget: target.clone(),
      startTime: Date.now(),
      duration
    };
  }, [camera]);

  // Reset to overview position
  const resetToOverview = useCallback(() => {
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

    animateToPosition(overviewPosition, overviewTarget, 2000);
  }, [animateToPosition]);

  // Focus on diamond position
  const focusOnDiamond = useCallback((diamondIndex: number) => {
    if (diamondIndex < 0 || diamondIndex >= DIAMOND_POSITIONS.length) return;

    const pos = DIAMOND_POSITIONS[diamondIndex];
    const position = new THREE.Vector3(pos.x, pos.height, pos.z);

    const offset = 15;
    const height = 8;
    const angleOffset = diamondIndex * (Math.PI / 3);

    const cameraPosition = new THREE.Vector3(
      position.x + Math.cos(angleOffset) * offset,
      position.y + height,
      position.z + Math.sin(angleOffset) * offset
    );

    animateToPosition(cameraPosition, position, 2000);
  }, [animateToPosition]);

  // Handle focused diamond changes
  useEffect(() => {
    if (focusedDiamond >= 0) {
      focusOnDiamond(focusedDiamond);
    } else if (focusedDiamond === -1) {
      // Only reset if we had a previous focus
      resetToOverview();
    }
  }, [focusedDiamond, focusOnDiamond, resetToOverview]);

  // Handle camera target from store (for external control)
  useEffect(() => {
    if (cameraTarget) {
      animateToPosition(cameraTarget.position, cameraTarget.target, 2000);
    }
  }, [cameraTarget, animateToPosition]);

  // Animation frame update
  useFrame(() => {
    if (animationRef.current && controlsRef.current) {
      const { startPos, endPos, startTarget, endTarget, startTime, duration } = animationRef.current;
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease-out

      camera.position.lerpVectors(startPos, endPos, easeProgress);
      controlsRef.current.target.lerpVectors(startTarget, endTarget, easeProgress);

      if (progress >= 1) {
        animationRef.current = null;
      }
    }
  });

  // Initial setup - set camera to overview position
  useEffect(() => {
    if (controlsRef.current) {
      // Set initial target
      controlsRef.current.target.set(0, 10, 0);

      // Animate to overview after a short delay
      setTimeout(() => {
        resetToOverview();
      }, 100);
    }
  }, [resetToOverview]);

  return (
    <OrbitControls
      ref={controlsRef}
      target={[0, 10, 0]}
      enableDamping
      dampingFactor={CAMERA_CONFIG.dampingFactor}
      minDistance={CAMERA_CONFIG.minDistance}
      maxDistance={CAMERA_CONFIG.maxDistance}
      minPolarAngle={0}
      maxPolarAngle={Math.PI}
    />
  );
}
