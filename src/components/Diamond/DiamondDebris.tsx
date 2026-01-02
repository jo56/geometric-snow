import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from '../../store/sceneStore';
import { LIGHT_DIRECTION, DIAMOND_POSITIONS } from '../../utils/Constants';

interface DiamondDebrisProps {
  index: number;
}

interface DebrisData {
  type: 'box' | 'tetrahedron' | 'cone' | 'octahedron' | 'dodecahedron' | 'icosahedron' | 'sphere' | 'cylinder' | 'torus';
  args: number[];
  initialPosition: [number, number, number];
  initialRotation: [number, number, number];
}

// Create toon material for debris
function createToonMaterial(): THREE.ShaderMaterial {
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
        vec3 color = mix(vec3(0.0), vec3(1.0), shade);
        gl_FragColor = vec4(color, 1.0);
      }
    `
  });
}

function generateDebrisData(position: { x: number; z: number; height: number }): DebrisData[] {
  const debris: DebrisData[] = [];
  const debrisCount = 8 + Math.floor(Math.random() * 7);

  // Small debris pieces
  for (let i = 0; i < debrisCount; i++) {
    const types: ('box' | 'tetrahedron' | 'cone' | 'octahedron' | 'dodecahedron' | 'icosahedron')[] =
      ['box', 'tetrahedron', 'cone', 'octahedron', 'dodecahedron', 'icosahedron'];
    const type = types[Math.floor(Math.random() * types.length)];

    let args: number[];
    switch (type) {
      case 'box':
        args = [0.3 + Math.random() * 0.6, 0.3 + Math.random() * 0.6, 0.3 + Math.random() * 0.6];
        break;
      case 'tetrahedron':
        args = [0.4 + Math.random() * 0.3];
        break;
      case 'cone':
        args = [0.3 + Math.random() * 0.2, 0.6 + Math.random() * 0.4, 5];
        break;
      case 'octahedron':
        args = [0.3 + Math.random() * 0.2];
        break;
      case 'dodecahedron':
        args = [0.3 + Math.random() * 0.2];
        break;
      case 'icosahedron':
        args = [0.3 + Math.random() * 0.2];
        break;
    }

    const angle = Math.random() * Math.PI * 2;
    const radius = 4 + Math.random() * 12;
    const height = position.height + (Math.random() - 0.5) * 8;

    debris.push({
      type,
      args,
      initialPosition: [
        position.x + Math.cos(angle) * radius,
        height,
        position.z + Math.sin(angle) * radius
      ],
      initialRotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI]
    });
  }

  // Orbital objects (3-6)
  const orbitalCount = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < orbitalCount; i++) {
    const types: ('sphere' | 'cylinder' | 'torus')[] = ['sphere', 'cylinder', 'torus'];
    const type = types[Math.floor(Math.random() * types.length)];

    let args: number[];
    switch (type) {
      case 'sphere':
        args = [0.6 + Math.random() * 0.4, 8, 6];
        break;
      case 'cylinder':
        args = [0.3, 0.3, 1.2 + Math.random() * 0.8, 6];
        break;
      case 'torus':
        args = [0.8, 0.2, 6, 12];
        break;
    }

    const angle = (i / orbitalCount) * Math.PI * 2 + Math.random() * 0.5;
    const radius = 8 + Math.random() * 8;
    const height = position.height + (Math.random() - 0.5) * 6;

    debris.push({
      type,
      args,
      initialPosition: [
        position.x + Math.cos(angle) * radius,
        height,
        position.z + Math.sin(angle) * radius
      ],
      initialRotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI]
    });
  }

  return debris;
}

function AnimatedDebris({
  data,
  index,
  material,
  isSpinning
}: {
  data: DebrisData;
  index: number;
  material: THREE.ShaderMaterial;
  isSpinning: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current || !isSpinning) return;

    const time = clock.getElapsedTime();
    const obj = meshRef.current;

    // Type-specific animations (matching original Diamonds.ts animateDebris)
    switch (data.type) {
      case 'box':
        obj.rotation.x = time * 0.5 + index;
        obj.rotation.y = time * 0.7 + index;
        obj.position.y = data.initialPosition[1] + Math.sin(time * 1.5 + index * 2) * 0.3;
        break;
      case 'sphere':
        obj.position.y = data.initialPosition[1] + Math.sin(time * 0.8 + index * 3) * 0.6;
        obj.rotation.z = time * 0.3 + index;
        break;
      case 'tetrahedron':
      case 'cone':
        obj.rotation.y = time * 1.2 + index;
        obj.position.x = data.initialPosition[0] + Math.sin(time * 0.6 + index * 4) * 0.3;
        break;
      case 'torus':
        obj.rotation.x = time * 0.4 + index;
        obj.rotation.y = time * 0.6 + index;
        obj.rotation.z = time * 0.2 + index;
        break;
      case 'octahedron':
      case 'dodecahedron':
      case 'icosahedron':
        obj.rotation.x = time * 0.8 + index;
        obj.rotation.y = time * 0.5 + index;
        break;
      case 'cylinder':
        obj.rotation.z = time * 0.7 + index;
        obj.position.y = data.initialPosition[1] + Math.sin(time * 1.0 + index * 2) * 0.45;
        break;
    }
  });

  const GeometryComponent = useMemo(() => {
    switch (data.type) {
      case 'box':
        return <boxGeometry args={data.args as [number, number, number]} />;
      case 'sphere':
        return <sphereGeometry args={data.args as [number, number, number]} />;
      case 'cone':
        return <coneGeometry args={data.args as [number, number, number]} />;
      case 'tetrahedron':
        return <tetrahedronGeometry args={data.args as [number]} />;
      case 'octahedron':
        return <octahedronGeometry args={data.args as [number]} />;
      case 'dodecahedron':
        return <dodecahedronGeometry args={data.args as [number]} />;
      case 'icosahedron':
        return <icosahedronGeometry args={data.args as [number]} />;
      case 'cylinder':
        return <cylinderGeometry args={data.args as [number, number, number, number]} />;
      case 'torus':
        return <torusGeometry args={data.args as [number, number, number, number]} />;
      default:
        return <boxGeometry args={[1, 1, 1]} />;
    }
  }, [data.type, data.args]);

  return (
    <mesh
      ref={meshRef}
      position={data.initialPosition}
      rotation={data.initialRotation}
      material={material}
      castShadow
      receiveShadow
    >
      {GeometryComponent}
    </mesh>
  );
}

export function DiamondDebris({ index }: DiamondDebrisProps) {
  const material = useMemo(() => createToonMaterial(), []);
  const position = DIAMOND_POSITIONS[index];
  const debrisData = useMemo(() => generateDebrisData(position), [position]);
  const spinningDiamonds = useSceneStore((state) => state.spinningDiamonds);
  const isSpinning = spinningDiamonds.has(index);

  return (
    <group>
      {debrisData.map((data, i) => (
        <AnimatedDebris
          key={`debris-${index}-${i}`}
          data={data}
          index={i}
          material={material}
          isSpinning={isSpinning}
        />
      ))}
    </group>
  );
}

// Ground structures around each diamond
export function DiamondStructures({ index }: { index: number }) {
  const material = useMemo(() => createToonMaterial(), []);
  const position = DIAMOND_POSITIONS[index];

  const structures = useMemo(() => {
    const structs: { position: [number, number, number]; rotation: [number, number, number]; args: [number, number, number] }[] = [];
    const pileSize = 8 + Math.floor(Math.random() * 10);
    const baseSize = 3 + Math.random() * 2;

    // Pile blocks
    for (let block = 0; block < pileSize; block++) {
      const blockWidth = baseSize + (Math.random() - 0.5) * 2;
      const blockHeight = 1 + Math.random() * 3;
      const blockDepth = baseSize + (Math.random() - 0.5) * 2;

      const scatterRadius = Math.random() * 6;
      const scatterAngle = Math.random() * Math.PI * 2;
      const scatterX = Math.cos(scatterAngle) * scatterRadius;
      const scatterZ = Math.sin(scatterAngle) * scatterRadius;

      const distanceFromCenter = Math.sqrt(scatterX * scatterX + scatterZ * scatterZ);
      const pileHeight = Math.max(0, (6 - distanceFromCenter) * 1.5 + Math.random() * 2);

      structs.push({
        position: [
          position.x + scatterX,
          pileHeight + blockHeight / 2,
          position.z + scatterZ
        ],
        rotation: [
          (Math.random() - 0.5) * 0.4,
          Math.random() * Math.PI,
          (Math.random() - 0.5) * 0.3
        ],
        args: [blockWidth, blockHeight, blockDepth]
      });
    }

    // Platform extensions
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 + Math.random() * 0.5;
      const radius = 8 + Math.random() * 4;

      structs.push({
        position: [
          position.x + Math.cos(angle) * radius,
          0.3 + Math.random() * 0.5,
          position.z + Math.sin(angle) * radius
        ],
        rotation: [
          (Math.random() - 0.5) * 0.3,
          Math.random() * Math.PI,
          (Math.random() - 0.5) * 0.2
        ],
        args: [4 + Math.random() * 3, 0.5 + Math.random() * 0.8, 3 + Math.random() * 2]
      });
    }

    return structs;
  }, [position]);

  return (
    <group>
      {structures.map((struct, i) => (
        <mesh
          key={`struct-${index}-${i}`}
          position={struct.position}
          rotation={struct.rotation}
          material={material}
          castShadow
          receiveShadow
        >
          <boxGeometry args={struct.args} />
        </mesh>
      ))}
    </group>
  );
}
