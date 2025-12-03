import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from '../../store/sceneStore';

interface DiamondAuraProps {
  index: number;
}

export function DiamondAura({ index }: DiamondAuraProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const spinningDiamonds = useSceneStore((state) => state.spinningDiamonds);
  const isSpinning = spinningDiamonds.has(index);

  const positions = useMemo(() => {
    const particleCount = 150;
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const radius = 8 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
    }

    return positions;
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;

    const time = clock.getElapsedTime();

    if (isSpinning) {
      pointsRef.current.visible = true;
      pointsRef.current.rotation.y = time * 0.5;
      pointsRef.current.rotation.x = time * 0.3;

      // Pulsing opacity
      const pulseFactor = 0.6 + Math.sin(time * 2) * 0.2;
      (pointsRef.current.material as THREE.PointsMaterial).opacity = pulseFactor;
    } else {
      pointsRef.current.visible = false;
    }
  });

  return (
    <points ref={pointsRef} visible={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color={0xffffff}
        size={1.5}
        transparent={true}
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        sizeAttenuation={true}
      />
    </points>
  );
}
