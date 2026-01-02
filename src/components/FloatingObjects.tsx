import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LIGHT_DIRECTION } from '../utils/Constants';

// Create toon material for floating objects
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

interface FloatingObjectData {
  type: 'box' | 'sphere' | 'cone' | 'tetrahedron' | 'octahedron' | 'torus';
  args: number[];
  initialPosition: [number, number, number];
  initialRotation: [number, number, number];
}

// Generate floating objects data
function generateFloatingObjects(): FloatingObjectData[] {
  const objects: FloatingObjectData[] = [];
  const baseHeight = 135;

  // Cubes (8)
  const cubeCount = 8;
  const cubeRadius = 25;
  for (let i = 0; i < cubeCount; i++) {
    const angle = (i / cubeCount) * Math.PI * 2;
    objects.push({
      type: 'box',
      args: [1.2, 1.2, 1.2],
      initialPosition: [
        Math.cos(angle) * cubeRadius,
        baseHeight + Math.sin(i * 0.5) * 6,
        Math.sin(angle) * cubeRadius
      ],
      initialRotation: [0, 0, 0]
    });
  }

  // Spheres (6)
  const sphereCount = 6;
  const sphereRadius = 18;
  for (let i = 0; i < sphereCount; i++) {
    const angle = (i / sphereCount) * Math.PI * 2;
    objects.push({
      type: 'sphere',
      args: [0.8, 8, 6],
      initialPosition: [
        Math.cos(angle) * sphereRadius,
        baseHeight + 3 + Math.cos(i * 0.8) * 4,
        Math.sin(angle) * sphereRadius
      ],
      initialRotation: [0, 0, 0]
    });
  }

  // Cones/pyramids (5)
  const pyramidCount = 5;
  const pyramidRadius = 12;
  for (let i = 0; i < pyramidCount; i++) {
    const angle = (i / pyramidCount) * Math.PI * 2;
    objects.push({
      type: 'cone',
      args: [0.9, 1.8, 4],
      initialPosition: [
        Math.cos(angle) * pyramidRadius,
        baseHeight + 8 + Math.sin(i * 1.2) * 3,
        Math.sin(angle) * pyramidRadius
      ],
      initialRotation: [0, 0, 0]
    });
  }

  // Various debris (15)
  for (let i = 0; i < 15; i++) {
    const typeIndex = Math.floor(Math.random() * 4);
    const types: ('box' | 'tetrahedron' | 'cone' | 'octahedron')[] = ['box', 'tetrahedron', 'cone', 'octahedron'];
    const type = types[typeIndex];

    let args: number[];
    switch (type) {
      case 'box':
        args = [0.5 + Math.random() * 0.8, 0.5 + Math.random() * 0.8, 0.5 + Math.random() * 0.8];
        break;
      case 'tetrahedron':
        args = [0.6 + Math.random() * 0.4];
        break;
      case 'cone':
        args = [0.4 + Math.random() * 0.3, 0.8 + Math.random() * 0.6, 5];
        break;
      case 'octahedron':
        args = [0.4 + Math.random() * 0.3];
        break;
    }

    const angle = Math.random() * Math.PI * 2;
    const radius = 6 + Math.random() * 20;
    const height = baseHeight + 15 + (Math.random() - 0.5) * 15;

    objects.push({
      type,
      args,
      initialPosition: [
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      ],
      initialRotation: [
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      ]
    });
  }

  return objects;
}

function AnimatedObject({
  data,
  index,
  material
}: {
  data: FloatingObjectData;
  index: number;
  material: THREE.ShaderMaterial;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;

    const time = clock.getElapsedTime();
    const obj = meshRef.current;

    // Apply type-specific animations
    switch (data.type) {
      case 'box':
        obj.rotation.x = time * 0.5 + index;
        obj.rotation.y = time * 0.7 + index;
        obj.position.y = data.initialPosition[1] + Math.sin(time * 1.5 + index * 2) * 0.5;
        break;
      case 'sphere':
        obj.position.y = data.initialPosition[1] + Math.sin(time * 0.8 + index * 3) * 1;
        obj.rotation.z = time * 0.3 + index;
        break;
      case 'cone':
        obj.rotation.y = time * 1.2 + index;
        obj.position.x = data.initialPosition[0] + Math.sin(time * 0.6 + index * 4) * 0.5;
        break;
      case 'torus':
        obj.rotation.x = time * 0.4 + index;
        obj.rotation.y = time * 0.6 + index;
        obj.rotation.z = time * 0.2 + index;
        break;
      case 'tetrahedron':
      case 'octahedron':
        obj.rotation.x = time * 0.8 + index;
        obj.rotation.y = time * 0.5 + index;
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

export function FloatingObjects() {
  const material = useMemo(() => createToonMaterial(), []);
  const objectsData = useMemo(() => generateFloatingObjects(), []);

  return (
    <group>
      {objectsData.slice(0, 50).map((data, index) => (
        <AnimatedObject
          key={`floating-${index}`}
          data={data}
          index={index}
          material={material}
        />
      ))}
    </group>
  );
}
