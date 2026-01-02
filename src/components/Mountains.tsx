import { useMemo } from 'react';
import * as THREE from 'three';
import { TERRAIN_CONFIG, LIGHT_DIRECTION } from '../utils/Constants';

// Create mountain material with gray tones
function createMountainMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      lightDirection: { value: new THREE.Vector3(LIGHT_DIRECTION.x, LIGHT_DIRECTION.y, LIGHT_DIRECTION.z).normalize() }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 lightDirection;
      varying vec3 vNormal;
      varying vec3 vPosition;

      void main() {
        vec3 normal = normalize(vNormal);
        float NdotL = max(dot(normal, lightDirection), 0.0);
        float shade = step(0.5, NdotL);
        vec3 color = mix(vec3(0.4), vec3(0.9), shade);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    depthWrite: true,
    depthTest: true
  });
}

interface MountainData {
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  rotation: [number, number, number];
}

// Create complex mountain geometry with variations
function createComplexMountainGeometry(totalHeight: number, baseRadius: number): THREE.BufferGeometry {
  const mountainType = Math.random();
  let geometry: THREE.BufferGeometry;

  if (mountainType < 0.4) {
    geometry = new THREE.ConeGeometry(baseRadius, totalHeight, 12, 1);

    const positions = geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      if (y > -totalHeight / 2 + 0.1) {
        const noise = (Math.random() - 0.5) * 0.3;
        const heightFactor = (y + totalHeight / 2) / totalHeight;

        positions[i] = x * (1 + noise * heightFactor);
        positions[i + 2] = z * (1 + noise * heightFactor);

        const verticalNoise = (Math.random() - 0.5) * totalHeight * 0.1 * heightFactor;
        positions[i + 1] = Math.max(y + verticalNoise, -totalHeight / 2);
      }
    }
    geometry.computeVertexNormals();

  } else if (mountainType < 0.7) {
    geometry = new THREE.CylinderGeometry(
      baseRadius * (0.2 + Math.random() * 0.3),
      baseRadius,
      totalHeight,
      12,
      3
    );

    const positions = geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      if (y > -totalHeight / 2 + 0.1) {
        const heightFactor = (y + totalHeight / 2) / totalHeight;
        const radialNoise = 1 + (Math.random() - 0.5) * 0.4 * heightFactor;

        positions[i] = x * radialNoise;
        positions[i + 2] = z * radialNoise;
      }
    }
    geometry.computeVertexNormals();

  } else {
    geometry = new THREE.OctahedronGeometry(baseRadius * 0.8, 1);
    geometry.scale(1, totalHeight / (baseRadius * 1.6), 1);

    const positions = geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      const deformX = (Math.random() - 0.5) * 0.3;
      const deformZ = (Math.random() - 0.5) * 0.3;

      positions[i] = x * (1 + deformX);
      positions[i + 2] = z * (1 + deformZ);
      positions[i + 1] = Math.max(y, -totalHeight / 2);
    }
    geometry.computeVertexNormals();
  }

  return geometry;
}

export function Mountains() {
  const material = useMemo(() => createMountainMaterial(), []);

  // Generate all mountain data at once
  const mountainsData = useMemo(() => {
    const mountains: MountainData[] = [];

    // Inner ring mountains
    const innerCount = TERRAIN_CONFIG.innerMountainCount;
    const innerRadius = TERRAIN_CONFIG.innerMountainRadius;

    for (let i = 0; i < innerCount; i++) {
      const angle = (i / innerCount) * Math.PI * 2;
      const radius = innerRadius + (Math.random() - 0.5) * 60;
      const mountainHeight = 180 + Math.random() * 120;
      const groundOffset = mountainHeight / 2;

      mountains.push({
        geometry: createComplexMountainGeometry(mountainHeight, 50 + Math.random() * 60),
        position: [
          Math.cos(angle) * radius,
          groundOffset,
          Math.sin(angle) * radius
        ],
        rotation: [0, Math.random() * Math.PI, 0]
      });
    }

    // Middle ring mountains
    const middleCount = TERRAIN_CONFIG.middleMountainCount;
    const middleRadius = TERRAIN_CONFIG.middleMountainRadius;

    for (let i = 0; i < middleCount; i++) {
      const angle = (i / middleCount) * Math.PI * 2;
      const radius = middleRadius + (Math.random() - 0.5) * 80;
      const mountainHeight = 220 + Math.random() * 150;
      const groundOffset = mountainHeight / 2;

      mountains.push({
        geometry: createComplexMountainGeometry(mountainHeight, 70 + Math.random() * 80),
        position: [
          Math.cos(angle) * radius,
          groundOffset,
          Math.sin(angle) * radius
        ],
        rotation: [0, Math.random() * Math.PI, 0]
      });
    }

    // Outer ring mountains (simple cones)
    const outerCount = TERRAIN_CONFIG.outerMountainCount;
    const outerRadius = TERRAIN_CONFIG.outerMountainRadius;

    for (let i = 0; i < outerCount; i++) {
      const angle = (i / outerCount) * Math.PI * 2;
      const radius = outerRadius + (Math.random() - 0.5) * 100;
      const mountainHeight = 280 + Math.random() * 200;

      mountains.push({
        geometry: new THREE.ConeGeometry(90 + Math.random() * 100, mountainHeight, 6),
        position: [
          Math.cos(angle) * radius,
          mountainHeight / 2,
          Math.sin(angle) * radius
        ],
        rotation: [0, Math.random() * Math.PI, 0]
      });
    }

    // Gap filler mountains
    const gapFillers = TERRAIN_CONFIG.gapFillerCount;
    for (let i = 0; i < gapFillers; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 550 + Math.random() * 200;
      const mountainHeight = 150 + Math.random() * 180;

      mountains.push({
        geometry: new THREE.ConeGeometry(40 + Math.random() * 70, mountainHeight, 6),
        position: [
          Math.cos(angle) * radius,
          mountainHeight / 2,
          Math.sin(angle) * radius
        ],
        rotation: [0, Math.random() * Math.PI, 0]
      });
    }

    return mountains;
  }, []);

  return (
    <group>
      {mountainsData.map((mountain, index) => (
        <mesh
          key={`mountain-${index}`}
          geometry={mountain.geometry}
          material={material}
          position={mountain.position}
          rotation={mountain.rotation}
          castShadow={false}
          receiveShadow={false}
        />
      ))}
    </group>
  );
}
