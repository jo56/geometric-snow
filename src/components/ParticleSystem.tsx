import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PARTICLE_CONFIG } from '../utils/Constants';

export function ParticleSystem() {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, velocities } = useMemo(() => {
    const count = PARTICLE_CONFIG.count;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      positions[i3] = (Math.random() - 0.5) * 1600;
      positions[i3 + 1] = Math.random() * 200;
      positions[i3 + 2] = (Math.random() - 0.5) * 1600;

      velocities[i3] = (Math.random() - 0.5) * 0.4;
      velocities[i3 + 1] = -0.5 - Math.random() * 1.0;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.4;
    }

    return { positions, velocities };
  }, []);

  useFrame(() => {
    if (!pointsRef.current) return;

    const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const particleCount = posArray.length / 3;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      posArray[i3] += velocities[i3];
      posArray[i3 + 1] += velocities[i3 + 1];
      posArray[i3 + 2] += velocities[i3 + 2];

      // Reset particles that fall below or drift too far
      if (
        posArray[i3 + 1] < -10 ||
        Math.abs(posArray[i3]) > 900 ||
        Math.abs(posArray[i3 + 2]) > 900
      ) {
        posArray[i3] = (Math.random() - 0.5) * 1600;
        posArray[i3 + 1] = 180 + Math.random() * 20;
        posArray[i3 + 2] = (Math.random() - 0.5) * 1600;
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color={0x808080}
        size={2.0}
        transparent={true}
        opacity={0.6}
        blending={THREE.NormalBlending}
        sizeAttenuation={true}
        alphaTest={0.1}
      />
    </points>
  );
}
