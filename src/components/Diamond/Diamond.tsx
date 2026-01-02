import { useRef, useMemo } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from '../../store/sceneStore';
import { DIAMOND_POSITIONS } from '../../utils/Constants';
import { createHalfDiamondGeometry, DiamondPatterns } from './DiamondGeometry';
import { DiamondAura } from './DiamondAura';
import { DiamondDebris, DiamondStructures } from './DiamondDebris';

interface DiamondProps {
  index: number;
  isMobile: boolean;
}

export function Diamond({ index, isMobile: _isMobile }: DiamondProps) {
  const groupRef = useRef<THREE.Group>(null);
  const patternGroupRef = useRef<THREE.Group>(null);

  const spinningDiamonds = useSceneStore((state) => state.spinningDiamonds);
  const focusedDiamond = useSceneStore((state) => state.focusedDiamond);
  const setFocusedDiamond = useSceneStore((state) => state.setFocusedDiamond);

  const isSpinning = spinningDiamonds.has(index);
  const position = DIAMOND_POSITIONS[index];

  // Create diamond geometry
  const geometry = useMemo(() => createHalfDiamondGeometry(position.size), [position.size]);
  const edgesGeometry = useMemo(() => new THREE.EdgesGeometry(geometry, 1), [geometry]);

  // Handle click on diamond
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();

    if (index === focusedDiamond) {
      // Reset to overview
      setFocusedDiamond(-1);
    } else {
      setFocusedDiamond(index);
    }
  };

  // Animation loop
  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    const time = clock.getElapsedTime();

    if (isSpinning) {
      // Rotate diamond when spinning
      groupRef.current.rotation.y = -time * 2.0;

      // Glow effect on white pattern pieces
      if (patternGroupRef.current) {
        const glowAmount = 1.4 + Math.sin(time * 2) * 0.4;
        patternGroupRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
            if (child.material.color.r >= 0.5) {
              const brightColor = new THREE.Color(0xffffff);
              brightColor.multiplyScalar(glowAmount);
              child.material.color.copy(brightColor);
            }
          }
        });
      }
    } else {
      // Reset colors when not spinning
      if (patternGroupRef.current) {
        patternGroupRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
            if (child.material.color.r >= 0.5 || child.material.color.r > 1.0) {
              child.material.color.set(0xffffff);
            }
          }
        });
      }
    }
  });

  return (
    <>
      {/* Main diamond group */}
      <group
        ref={groupRef}
        position={[position.x, position.height, position.z]}
        onClick={handleClick}
        userData={{ diamondIndex: index }}
      >
        {/* Black diamond mesh */}
        <mesh geometry={geometry} castShadow receiveShadow>
          <meshBasicMaterial color={0x000000} side={THREE.DoubleSide} />
        </mesh>

        {/* Edge lines */}
        <lineSegments geometry={edgesGeometry}>
          <lineBasicMaterial color={0x000000} />
        </lineSegments>

        {/* White pattern group */}
        <group ref={patternGroupRef}>
          <DiamondPatterns size={position.size} />
        </group>

        {/* Aura particles */}
        <DiamondAura index={index} />
      </group>

      {/* Point light for glow */}
      <pointLight
        position={[position.x, position.height, position.z]}
        intensity={isSpinning ? 0.5 : 0}
        distance={index === 3 ? 50 : 40}
      />

      {/* Ground structures around diamond */}
      <DiamondStructures index={index} />

      {/* Orbital debris */}
      <DiamondDebris index={index} />
    </>
  );
}
