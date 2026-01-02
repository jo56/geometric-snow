import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { TERRAIN_CONFIG, LIGHT_DIRECTION } from '../utils/Constants';

// Create terrain geometry with procedural displacement
function createTerrainGeometry(): THREE.PlaneGeometry {
  const terrainSize = TERRAIN_CONFIG.size;
  const segments = TERRAIN_CONFIG.segments;
  const geometry = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);

  const positions = geometry.attributes.position.array as Float32Array;
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const z = positions[i + 2];
    const distanceFromCenter = Math.sqrt(x * x + z * z);

    const valleyDepth = Math.min(distanceFromCenter / 500, 1);
    const valleyHeight = valleyDepth * valleyDepth * 15;

    let height = valleyHeight;

    height += Math.sin(x * 0.012) * Math.cos(z * 0.012) * 8;
    height += Math.sin(x * 0.008) * Math.sin(z * 0.009) * 12;
    height += Math.cos(x * 0.006) * Math.cos(z * 0.007) * 6;

    height += Math.sin(x * 0.025) * Math.cos(z * 0.028) * 4;
    height += Math.cos(x * 0.02) * Math.sin(z * 0.022) * 5;
    height += Math.sin(x * 0.035) * Math.sin(z * 0.03) * 3;

    height += Math.sin(x * 0.08) * Math.cos(z * 0.07) * 2;
    height += Math.cos(x * 0.12) * Math.sin(z * 0.11) * 1.5;
    height += (Math.random() - 0.5) * 2;

    if (distanceFromCenter < 200) {
      height += Math.sin(x * 0.04) * Math.cos(z * 0.04) * 6;
      height += Math.sin(x * 0.06) * Math.sin(z * 0.055) * 4;
    } else if (distanceFromCenter < 400) {
      height += Math.sin(x * 0.015) * Math.cos(z * 0.018) * 12;
      height += Math.cos(x * 0.025) * Math.sin(z * 0.02) * 10;
    } else if (distanceFromCenter < 600) {
      const transitionEffect = (distanceFromCenter - 400) / 200;
      height += Math.sin(x * 0.008) * Math.cos(z * 0.008) * 18 * transitionEffect;
      height += Math.sin(x * 0.005) * Math.sin(z * 0.006) * 25 * transitionEffect;
    } else {
      const foothillEffect = Math.min((distanceFromCenter - 600) / 150, 1);
      height += Math.sin(x * 0.003) * Math.cos(z * 0.003) * 30 * foothillEffect;
      height += Math.sin(x * 0.002) * Math.sin(z * 0.0025) * 40 * foothillEffect;
    }

    positions[i + 1] = height;
  }

  geometry.computeVertexNormals();
  return geometry;
}

// Shader material for terrain
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

export function Terrain() {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => createTerrainGeometry(), []);
  const material = useMemo(() => createToonMaterial(), []);

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.receiveShadow = true;
    }
  }, []);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    />
  );
}

// White ground plane below the terrain
export function GroundPlane() {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        lightDirection: { value: new THREE.Vector3(5, 10, 5).normalize() }
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
          vec3 color = mix(vec3(0.5), vec3(0.92), shade);
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });
  }, []);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -1, 0]}
      material={material}
      receiveShadow
    >
      <planeGeometry args={[3000, 3000]} />
    </mesh>
  );
}
