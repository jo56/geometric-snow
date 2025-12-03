import { useMemo } from 'react';
import * as THREE from 'three';

// Create the half-diamond buffer geometry
export function createHalfDiamondGeometry(size: number): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();

  const vertices = new Float32Array([
    0, -size, 0,
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
    0, 2, 1, 0, 3, 2, 0, 4, 3, 0, 5, 4,
    0, 6, 5, 0, 7, 6, 0, 8, 7, 0, 1, 8,
    1, 2, 3, 1, 3, 4, 1, 4, 5, 1, 5, 6,
    1, 6, 7, 1, 7, 8
  ];

  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

// Diamond patterns (white torus belts and rings)
export function DiamondPatterns({ size }: { size: number }) {
  const beltThickness = size * 0.08;

  // Upper belt
  const upperBeltY = -size * 0.25;
  const upperBeltRadius = size * 0.625;

  // Lower belt
  const lowerBeltY = -size * 0.6;
  const lowerBeltRadius = size * 0.28;

  // Top ring segments
  const topY = 0.01;
  const centerRingRadius = size * 0.5;
  const numSegments = 8;
  const arcLength = (Math.PI * 2) / numSegments;
  const gapRatio = 0.3;

  // Edge ring
  const edgeRingRadius = size * 0.9;
  const edgeRingWidth = beltThickness * 1.5;

  const segmentGeometries = useMemo(() => {
    const geometries: THREE.TorusGeometry[] = [];
    for (let i = 0; i < numSegments; i++) {
      const segmentGeometry = new THREE.TorusGeometry(
        centerRingRadius,
        beltThickness,
        16,
        16,
        arcLength * (1 - gapRatio)
      );
      geometries.push(segmentGeometry);
    }
    return geometries;
  }, [centerRingRadius, beltThickness, arcLength, gapRatio, numSegments]);

  return (
    <group>
      {/* Upper belt */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, upperBeltY, 0]}>
        <torusGeometry args={[upperBeltRadius, beltThickness, 16, 64]} />
        <meshBasicMaterial color={0xffffff} side={THREE.DoubleSide} />
      </mesh>

      {/* Lower belt */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, lowerBeltY, 0]}>
        <torusGeometry args={[lowerBeltRadius, beltThickness, 16, 64]} />
        <meshBasicMaterial color={0xffffff} side={THREE.DoubleSide} />
      </mesh>

      {/* Segmented center ring */}
      {segmentGeometries.map((geometry, i) => {
        const startAngle = i * arcLength;
        return (
          <mesh
            key={`segment-${i}`}
            geometry={geometry}
            rotation={[Math.PI / 2, 0, startAngle]}
            position={[0, topY, 0]}
          >
            <meshBasicMaterial color={0xffffff} side={THREE.DoubleSide} />
          </mesh>
        );
      })}

      {/* Edge ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, topY, 0]}>
        <ringGeometry args={[edgeRingRadius - edgeRingWidth / 2, edgeRingRadius + edgeRingWidth / 2, 32]} />
        <meshBasicMaterial color={0xffffff} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
