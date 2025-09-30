import * as THREE from 'three';

export class BinaryMaterialSystem {
  private toonMaterial: THREE.MeshToonMaterial;
  private stepMaterial: THREE.ShaderMaterial;
  private gradientTexture: THREE.DataTexture;

  constructor() {
    this.gradientTexture = this.createBinaryGradientTexture();
    this.toonMaterial = this.createToonMaterial();
    this.stepMaterial = this.createStepMaterial();
  }

  private createBinaryGradientTexture(): THREE.DataTexture {
    const size = 16;
    const data = new Uint8Array(size * 4); // RGBA format

    for (let i = 0; i < size; i++) {
      const value = i < size / 2 ? 0 : 255;
      data[i * 4] = value;     // R
      data[i * 4 + 1] = value; // G
      data[i * 4 + 2] = value; // B
      data[i * 4 + 3] = 255;   // A
    }

    const texture = new THREE.DataTexture(data, size, 1, THREE.RGBAFormat);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    return texture;
  }

  private createToonMaterial(): THREE.MeshToonMaterial {
    return new THREE.MeshToonMaterial({
      color: 0xffffff,
      gradientMap: this.gradientTexture
    });
  }

  private createStepMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        lightDirection: { value: new THREE.Vector3(0.5, 1.0, 0.5).normalize() }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 lightDirection;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;

        void main() {
          vec3 normal = normalize(vNormal);
          float NdotL = max(dot(normal, lightDirection), 0.0);
          float shade = step(0.5, NdotL);
          gl_FragColor = vec4(vec3(shade), 1.0);
        }
      `
    });
  }

  getToonMaterial(): THREE.MeshToonMaterial {
    return this.toonMaterial;
  }

  getStepMaterial(): THREE.ShaderMaterial {
    return this.stepMaterial;
  }

  applyMaterialToMesh(mesh: THREE.Mesh, useToon: boolean = true): void {
    mesh.material = useToon ? this.toonMaterial : this.stepMaterial;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }

  forceWhiteMaterialOnGLTF(gltf: any, useToon: boolean = true): void {
    gltf.scene.traverse((child: any) => {
      if (child.isMesh) {
        this.applyMaterialToMesh(child, useToon);
      }
    });
  }
}