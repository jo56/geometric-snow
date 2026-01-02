import { useMemo } from 'react';
import * as THREE from 'three';
import { LIGHT_DIRECTION } from '../utils/Constants';

// Create toon material
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

interface StructureData {
  type: 'box' | 'cylinder' | 'cone' | 'torus' | 'tetrahedron' | 'octahedron';
  args: number[];
  position: [number, number, number];
  rotation: [number, number, number];
  castShadow?: boolean;
  receiveShadow?: boolean;
}

// Generate terrain elements data
function generateTerrainElements(): StructureData[] {
  const structures: StructureData[] = [];

  // Platforms (120)
  for (let i = 0; i < 120; i++) {
    const platformSize = 3 + Math.random() * 6;
    const platformHeight = 0.3 + Math.random() * 1.2;
    structures.push({
      type: 'box',
      args: [platformSize, platformHeight, platformSize],
      position: [
        (Math.random() - 0.5) * 1400,
        platformHeight / 2 + Math.random() * 3,
        (Math.random() - 0.5) * 1400
      ],
      rotation: [0, Math.random() * Math.PI, 0],
      castShadow: true,
      receiveShadow: true
    });
  }

  // Step sequences (60 sequences, 3-7 steps each)
  for (let i = 0; i < 60; i++) {
    const stepCount = 3 + Math.floor(Math.random() * 5);
    const stepWidth = 2 + Math.random() * 3;
    const baseX = (Math.random() - 0.5) * 1200;
    const baseZ = (Math.random() - 0.5) * 1200;

    for (let j = 0; j < stepCount; j++) {
      structures.push({
        type: 'box',
        args: [stepWidth, 0.4, stepWidth * 0.8],
        position: [baseX, 0.2 + j * 0.4, baseZ + j * (stepWidth * 0.6)],
        rotation: [0, 0, 0],
        castShadow: true,
        receiveShadow: true
      });
    }
  }

  // Landmarks (40)
  const landmarkTypes: ('box' | 'cylinder' | 'cone' | 'torus')[] = ['box', 'cylinder', 'cone', 'torus'];
  for (let i = 0; i < 40; i++) {
    const type = landmarkTypes[Math.floor(Math.random() * landmarkTypes.length)];
    let args: number[];

    switch (type) {
      case 'box':
        args = [8, 6, 8];
        break;
      case 'cylinder':
        args = [3, 3, 8, 8];
        break;
      case 'cone':
        args = [4, 10, 6];
        break;
      case 'torus':
        args = [4, 1, 8, 16];
        break;
    }

    structures.push({
      type,
      args,
      position: [
        (Math.random() - 0.5) * 1300,
        3 + Math.random() * 4,
        (Math.random() - 0.5) * 1300
      ],
      rotation: [0, Math.random() * Math.PI, 0],
      castShadow: true,
      receiveShadow: true
    });
  }

  // Vertical stacks (80 piles)
  for (let pile = 0; pile < 80; pile++) {
    const pileSize = 8 + Math.floor(Math.random() * 15);
    const baseSize = 2 + Math.random() * 4;
    const pileX = (Math.random() - 0.5) * 1200;
    const pileZ = (Math.random() - 0.5) * 1200;

    for (let block = 0; block < pileSize; block++) {
      const blockWidth = baseSize + (Math.random() - 0.5) * 3;
      const blockHeight = 0.5 + Math.random() * 2;
      const blockDepth = baseSize + (Math.random() - 0.5) * 3;

      const scatterRadius = Math.random() * 4;
      const scatterAngle = Math.random() * Math.PI * 2;
      const scatterX = Math.cos(scatterAngle) * scatterRadius;
      const scatterZ = Math.sin(scatterAngle) * scatterRadius;

      const distanceFromCenter = Math.sqrt(scatterX * scatterX + scatterZ * scatterZ);
      const pileHeight = Math.max(0, (4 - distanceFromCenter) * 2 + Math.random() * 3);

      structures.push({
        type: 'box',
        args: [blockWidth, blockHeight, blockDepth],
        position: [
          pileX + scatterX,
          pileHeight + blockHeight / 2,
          pileZ + scatterZ
        ],
        rotation: [
          (Math.random() - 0.5) * 0.6,
          Math.random() * Math.PI,
          (Math.random() - 0.5) * 0.4
        ],
        castShadow: true,
        receiveShadow: true
      });
    }
  }

  // Spire towers (25)
  for (let spire = 0; spire < 25; spire++) {
    const spireHeight = 15 + Math.floor(Math.random() * 20);
    const baseSize = 1.5 + Math.random() * 2;
    const spireX = (Math.random() - 0.5) * 1100;
    const spireZ = (Math.random() - 0.5) * 1100;
    let currentHeight = 0;

    for (let block = 0; block < spireHeight; block++) {
      const taper = 1 - (block / spireHeight) * 0.6;
      const blockWidth = baseSize * taper;
      const blockHeight = 0.6 + Math.random() * 0.8;
      const blockDepth = baseSize * taper;

      structures.push({
        type: 'box',
        args: [blockWidth, blockHeight, blockDepth],
        position: [
          spireX + (Math.random() - 0.5) * 0.2,
          currentHeight + blockHeight / 2,
          spireZ + (Math.random() - 0.5) * 0.2
        ],
        rotation: [0, (Math.random() - 0.5) * 0.1, 0],
        castShadow: true,
        receiveShadow: true
      });

      currentHeight += blockHeight;
    }
  }

  // Pyramids (20)
  for (let pyramid = 0; pyramid < 20; pyramid++) {
    const levels = 4 + Math.floor(Math.random() * 6);
    const baseSize = 6 + Math.random() * 4;
    const pyramidX = (Math.random() - 0.5) * 1000;
    const pyramidZ = (Math.random() - 0.5) * 1000;

    for (let level = 0; level < levels; level++) {
      const levelSize = baseSize * (1 - level / levels * 0.7);
      const levelHeight = 1.5 + Math.random() * 1;

      structures.push({
        type: 'box',
        args: [levelSize, levelHeight, levelSize],
        position: [pyramidX, level * levelHeight + levelHeight / 2, pyramidZ],
        rotation: [0, level * 0.2, 0],
        castShadow: true,
        receiveShadow: true
      });
    }
  }

  // Ground panels (60)
  for (let i = 0; i < 60; i++) {
    const structureWidth = 15 + Math.random() * 25;
    const structureDepth = 12 + Math.random() * 20;
    const structureHeight = 2 + Math.random() * 4;

    structures.push({
      type: 'box',
      args: [structureWidth, structureHeight, structureDepth],
      position: [
        (Math.random() - 0.5) * 1300,
        structureHeight / 2,
        (Math.random() - 0.5) * 1300
      ],
      rotation: [
        (Math.random() - 0.5) * 0.6,
        Math.random() * Math.PI,
        (Math.random() - 0.5) * 0.4
      ],
      castShadow: true,
      receiveShadow: true
    });
  }

  // Additional platforms (45)
  for (let i = 0; i < 45; i++) {
    const type = Math.floor(Math.random() * 3);

    if (type === 0) {
      structures.push({
        type: 'box',
        args: [8 + Math.random() * 15, 1.5 + Math.random() * 3, 6 + Math.random() * 12],
        position: [
          (Math.random() - 0.5) * 1300,
          1 + Math.random() * 2,
          (Math.random() - 0.5) * 1300
        ],
        rotation: [
          (Math.random() - 0.5) * 0.5,
          Math.random() * Math.PI,
          (Math.random() - 0.5) * 0.3
        ],
        castShadow: true,
        receiveShadow: true
      });
    } else if (type === 1) {
      structures.push({
        type: 'cylinder',
        args: [6 + Math.random() * 8, 4 + Math.random() * 6, 2 + Math.random() * 4, 8],
        position: [
          (Math.random() - 0.5) * 1300,
          1 + Math.random() * 2,
          (Math.random() - 0.5) * 1300
        ],
        rotation: [
          (Math.random() - 0.5) * 0.5,
          Math.random() * Math.PI,
          (Math.random() - 0.5) * 0.3
        ],
        castShadow: true,
        receiveShadow: true
      });
    } else {
      structures.push({
        type: 'cone',
        args: [8 + Math.random() * 6, 3 + Math.random() * 3, 6],
        position: [
          (Math.random() - 0.5) * 1300,
          1 + Math.random() * 2,
          (Math.random() - 0.5) * 1300
        ],
        rotation: [
          (Math.random() - 0.5) * 0.5,
          Math.random() * Math.PI,
          (Math.random() - 0.5) * 0.3
        ],
        castShadow: true,
        receiveShadow: true
      });
    }
  }

  // Fragments (35)
  for (let i = 0; i < 35; i++) {
    const type = Math.floor(Math.random() * 3);

    if (type === 0) {
      structures.push({
        type: 'box',
        args: [5 + Math.random() * 8, 0.8 + Math.random() * 1.5, 5 + Math.random() * 8],
        position: [
          (Math.random() - 0.5) * 1300,
          0.5 + Math.random() * 1,
          (Math.random() - 0.5) * 1300
        ],
        rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
        castShadow: true,
        receiveShadow: true
      });
    } else if (type === 1) {
      structures.push({
        type: 'tetrahedron',
        args: [4 + Math.random() * 4],
        position: [
          (Math.random() - 0.5) * 1300,
          0.5 + Math.random() * 1,
          (Math.random() - 0.5) * 1300
        ],
        rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
        castShadow: true,
        receiveShadow: true
      });
    } else {
      structures.push({
        type: 'octahedron',
        args: [3 + Math.random() * 3],
        position: [
          (Math.random() - 0.5) * 1300,
          0.5 + Math.random() * 1,
          (Math.random() - 0.5) * 1300
        ],
        rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
        castShadow: true,
        receiveShadow: true
      });
    }
  }

  return structures;
}

// Generate center structures
function generateCenterStructures(): StructureData[] {
  const structures: StructureData[] = [];

  // Central pedestal
  structures.push({
    type: 'cylinder',
    args: [8, 12, 6, 8],
    position: [0, 3, 0],
    rotation: [0, 0, 0],
    castShadow: true,
    receiveShadow: true
  });

  // Support structures (6)
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const radius = 15 + Math.random() * 5;
    const type = Math.floor(Math.random() * 3);

    if (type === 0) {
      structures.push({
        type: 'box',
        args: [3 + Math.random() * 2, 8 + Math.random() * 6, 3 + Math.random() * 2],
        position: [Math.cos(angle) * radius, 5 + Math.random() * 3, Math.sin(angle) * radius],
        rotation: [(Math.random() - 0.5) * 0.3, angle + (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.2],
        castShadow: true,
        receiveShadow: true
      });
    } else if (type === 1) {
      structures.push({
        type: 'cone',
        args: [2 + Math.random() * 1.5, 10 + Math.random() * 5, 6],
        position: [Math.cos(angle) * radius, 5 + Math.random() * 3, Math.sin(angle) * radius],
        rotation: [(Math.random() - 0.5) * 0.3, angle + (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.2],
        castShadow: true,
        receiveShadow: true
      });
    } else {
      structures.push({
        type: 'cylinder',
        args: [1.5, 3, 12 + Math.random() * 4, 8],
        position: [Math.cos(angle) * radius, 5 + Math.random() * 3, Math.sin(angle) * radius],
        rotation: [(Math.random() - 0.5) * 0.3, angle + (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.2],
        castShadow: true,
        receiveShadow: true
      });
    }
  }

  // Ground structures (12)
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const radius = 8 + Math.random() * 12;

    structures.push({
      type: 'box',
      args: [2 + Math.random() * 3, 1 + Math.random() * 2, 6 + Math.random() * 4],
      position: [Math.cos(angle) * radius, 0.5 + Math.random() * 0.5, Math.sin(angle) * radius],
      rotation: [(Math.random() - 0.5) * 0.4, angle + (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.2],
      castShadow: true,
      receiveShadow: true
    });
  }

  // Floating platforms (8)
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
    const radius = 20 + Math.random() * 10;

    structures.push({
      type: 'box',
      args: [4 + Math.random() * 3, 0.3 + Math.random() * 0.4, 4 + Math.random() * 3],
      position: [Math.cos(angle) * radius, 2 + Math.random() * 3, Math.sin(angle) * radius],
      rotation: [(Math.random() - 0.5) * 0.3, Math.random() * Math.PI, (Math.random() - 0.5) * 0.2],
      castShadow: true,
      receiveShadow: true
    });
  }

  // Connecting bridges (4)
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const startRadius = 12;
    const endRadius = 25;
    const midRadius = (startRadius + endRadius) / 2;

    structures.push({
      type: 'box',
      args: [endRadius - startRadius, 0.5, 1.5 + Math.random() * 1],
      position: [Math.cos(angle) * midRadius, 2.5 + Math.random() * 1, Math.sin(angle) * midRadius],
      rotation: [0, angle, 0],
      castShadow: true,
      receiveShadow: true
    });
  }

  return structures;
}

// Generate background shapes
function generateBackground(): StructureData[] {
  const structures: StructureData[] = [];

  // Random shapes around center (15)
  for (let i = 0; i < 15; i++) {
    const type = Math.floor(Math.random() * 4);
    const angle = Math.random() * Math.PI * 2;
    const distance = 70 + Math.random() * 30;

    let args: number[];
    let shapeType: 'box' | 'cylinder' | 'cone';

    switch (type) {
      case 0:
        shapeType = 'box';
        args = [3, 3, 3];
        break;
      case 1:
        shapeType = 'cylinder';
        args = [1.5, 1.5, 3, 8];
        break;
      case 2:
        shapeType = 'cone';
        args = [1.5, 3, 6];
        break;
      default:
        shapeType = 'cylinder';
        args = [1, 1, 4, 8];
        break;
    }

    structures.push({
      type: shapeType,
      args,
      position: [Math.cos(angle) * distance, -2 + Math.random() * 8, Math.sin(angle) * distance],
      rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
      castShadow: true,
      receiveShadow: false
    });
  }

  // Pillars around center (6)
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const distance = 90;

    structures.push({
      type: 'box',
      args: [2, 12, 2],
      position: [Math.cos(angle) * distance, 6, Math.sin(angle) * distance],
      rotation: [0, 0, 0],
      castShadow: true,
      receiveShadow: false
    });
  }

  // Extra cubes and columns from main.ts
  for (let i = 0; i < 3; i++) {
    structures.push({
      type: 'box',
      args: [1, 1, 1],
      position: [-3 + i * 3, 0.5, 2],
      rotation: [0, 0, 0],
      castShadow: true,
      receiveShadow: true
    });
  }

  for (let i = 0; i < 2; i++) {
    structures.push({
      type: 'cylinder',
      args: [0.3, 0.3, 3, 8],
      position: [-4 + i * 8, 1.5, -2],
      rotation: [0, 0, 0],
      castShadow: true,
      receiveShadow: true
    });
  }

  return structures;
}

// Render geometry based on type
function StructureMesh({ data, material }: { data: StructureData; material: THREE.ShaderMaterial }) {
  const GeometryComponent = useMemo(() => {
    switch (data.type) {
      case 'box':
        return <boxGeometry args={data.args as [number, number, number]} />;
      case 'cylinder':
        return <cylinderGeometry args={data.args as [number, number, number, number]} />;
      case 'cone':
        return <coneGeometry args={data.args as [number, number, number]} />;
      case 'torus':
        return <torusGeometry args={data.args as [number, number, number, number]} />;
      case 'tetrahedron':
        return <tetrahedronGeometry args={data.args as [number]} />;
      case 'octahedron':
        return <octahedronGeometry args={data.args as [number]} />;
      default:
        return <boxGeometry args={[1, 1, 1]} />;
    }
  }, [data.type, data.args]);

  return (
    <mesh
      position={data.position}
      rotation={data.rotation}
      material={material}
      castShadow={data.castShadow}
      receiveShadow={data.receiveShadow}
    >
      {GeometryComponent}
    </mesh>
  );
}

export function TerrainElements() {
  const material = useMemo(() => createToonMaterial(), []);
  const structures = useMemo(() => generateTerrainElements(), []);

  return (
    <group>
      {structures.map((data, index) => (
        <StructureMesh key={`terrain-${index}`} data={data} material={material} />
      ))}
    </group>
  );
}

export function CenterStructures() {
  const material = useMemo(() => createToonMaterial(), []);
  const structures = useMemo(() => generateCenterStructures(), []);

  return (
    <group>
      {structures.map((data, index) => (
        <StructureMesh key={`center-${index}`} data={data} material={material} />
      ))}
    </group>
  );
}

export function BackgroundShapes() {
  const material = useMemo(() => createToonMaterial(), []);
  const structures = useMemo(() => generateBackground(), []);

  return (
    <group>
      {structures.map((data, index) => (
        <StructureMesh key={`bg-${index}`} data={data} material={material} />
      ))}
    </group>
  );
}
