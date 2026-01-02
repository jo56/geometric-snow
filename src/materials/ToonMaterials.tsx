import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import { LIGHT_DIRECTION } from '../utils/Constants';

// Binary Toon Material - used for terrain and structures (black/white)
const BinaryToonMaterial = shaderMaterial(
  {
    lightDirection: new THREE.Vector3(LIGHT_DIRECTION.x, LIGHT_DIRECTION.y, LIGHT_DIRECTION.z).normalize()
  },
  // Vertex shader
  `
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader
  `
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
);

// Mountain Material - used for mountains (gray tones)
const MountainMaterial = shaderMaterial(
  {
    lightDirection: new THREE.Vector3(LIGHT_DIRECTION.x, LIGHT_DIRECTION.y, LIGHT_DIRECTION.z).normalize()
  },
  // Vertex shader
  `
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader
  `
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
  `
);

// Ground Plane Material - used for white ground plane
const GroundPlaneMaterial = shaderMaterial(
  {
    lightDirection: new THREE.Vector3(5, 10, 5).normalize()
  },
  // Vertex shader
  `
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader
  `
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
);

// Extend Three.js with our custom materials
extend({ BinaryToonMaterial, MountainMaterial, GroundPlaneMaterial });

// TypeScript declarations for JSX
declare module '@react-three/fiber' {
  interface ThreeElements {
    binaryToonMaterial: object;
    mountainMaterial: object;
    groundPlaneMaterial: object;
  }
}

export { BinaryToonMaterial, MountainMaterial, GroundPlaneMaterial };
