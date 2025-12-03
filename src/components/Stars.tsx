import { useMemo } from 'react';
import { PARTICLE_CONFIG } from '../utils/Constants';

export function Stars() {
  const positions = useMemo(() => {
    const starCount = PARTICLE_CONFIG.starCount;
    const starPositions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const radius = 1200 + Math.random() * 400;
      const theta = Math.random() * Math.PI * 2;

      if (i < starCount * 0.65) {
        const y = 200 + Math.random() * 300;
        const horizontalRadius = Math.sqrt(radius * radius - y * y);
        starPositions[i3] = horizontalRadius * Math.cos(theta);
        starPositions[i3 + 1] = y;
        starPositions[i3 + 2] = horizontalRadius * Math.sin(theta);
      } else {
        const phi = Math.random() * Math.PI * 0.5;
        starPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        starPositions[i3 + 1] = radius * Math.cos(phi);
        starPositions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      }
    }

    return starPositions;
  }, []);

  return (
    <points renderOrder={-1}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color={0xffffff}
        size={4.0}
        sizeAttenuation={false}
        transparent={false}
        depthTest={true}
        depthWrite={false}
      />
    </points>
  );
}
