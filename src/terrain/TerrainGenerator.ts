import * as THREE from 'three';
import { TERRAIN_CONFIG, LIGHT_DIRECTION, PARTICLE_CONFIG } from '../utils/Constants';

export class TerrainGenerator {
  private scene: THREE.Scene;
  private geometryObjects: THREE.Object3D[] = [];

  constructor(scene: THREE.Scene, geometryObjects: THREE.Object3D[]) {
    this.scene = scene;
    this.geometryObjects = geometryObjects;
  }

  public createBinaryToonMaterial(): THREE.ShaderMaterial {
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

  public createMountainMaterial(): THREE.ShaderMaterial {
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

  public createTerrain(material: THREE.ShaderMaterial): void {
    const terrainSize = TERRAIN_CONFIG.size;
    const segments = TERRAIN_CONFIG.segments;
    const terrainGeometry = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);

    const positions = terrainGeometry.attributes.position.array as Float32Array;
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
    terrainGeometry.computeVertexNormals();

    const terrain = new THREE.Mesh(terrainGeometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    this.scene.add(terrain);
    this.geometryObjects.push(terrain);

    this.createHorizonMountains(material);
  }

  private createComplexMountain(material: THREE.Material, totalHeight: number, baseRadius: number): THREE.Mesh {
    const mountainType = Math.random();
    let mountainGeometry;

    if (mountainType < 0.4) {
      mountainGeometry = new THREE.ConeGeometry(baseRadius, totalHeight, 12, 1);

      const positions = mountainGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];

        if (y > -totalHeight/2 + 0.1) {
          const noise = (Math.random() - 0.5) * 0.3;
          const heightFactor = (y + totalHeight/2) / totalHeight;

          positions[i] = x * (1 + noise * heightFactor);
          positions[i + 2] = z * (1 + noise * heightFactor);

          const verticalNoise = (Math.random() - 0.5) * totalHeight * 0.1 * heightFactor;
          positions[i + 1] = Math.max(y + verticalNoise, -totalHeight/2);
        }
      }
      mountainGeometry.computeVertexNormals();

    } else if (mountainType < 0.7) {
      mountainGeometry = new THREE.CylinderGeometry(
        baseRadius * (0.2 + Math.random() * 0.3),
        baseRadius,
        totalHeight,
        12,
        3
      );

      const positions = mountainGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];

        if (y > -totalHeight/2 + 0.1) {
          const heightFactor = (y + totalHeight/2) / totalHeight;
          const radialNoise = 1 + (Math.random() - 0.5) * 0.4 * heightFactor;

          positions[i] = x * radialNoise;
          positions[i + 2] = z * radialNoise;
        }
      }
      mountainGeometry.computeVertexNormals();

    } else {
      mountainGeometry = new THREE.OctahedronGeometry(baseRadius * 0.8, 1);
      mountainGeometry.scale(1, totalHeight / (baseRadius * 1.6), 1);

      const positions = mountainGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];

        const deformX = (Math.random() - 0.5) * 0.3;
        const deformZ = (Math.random() - 0.5) * 0.3;

        positions[i] = x * (1 + deformX);
        positions[i + 2] = z * (1 + deformZ);
        positions[i + 1] = Math.max(y, -totalHeight/2);
      }
      mountainGeometry.computeVertexNormals();
    }

    return new THREE.Mesh(mountainGeometry, material);
  }

  private createHorizonMountains(_material: THREE.ShaderMaterial): void {
    const mountainMaterial = this.createMountainMaterial();

    const innerCount = TERRAIN_CONFIG.innerMountainCount;
    const innerRadius = TERRAIN_CONFIG.innerMountainRadius;

    for (let i = 0; i < innerCount; i++) {
      const angle = (i / innerCount) * Math.PI * 2;
      const radius = innerRadius + (Math.random() - 0.5) * 60;
      const mountainHeight = 180 + Math.random() * 120;
      const mountain = this.createComplexMountain(mountainMaterial, mountainHeight, 50 + Math.random() * 60);
      const groundOffset = mountainHeight / 2;

      mountain.position.set(
        Math.cos(angle) * radius,
        groundOffset,
        Math.sin(angle) * radius
      );

      mountain.rotation.x = 0;
      mountain.rotation.y = Math.random() * Math.PI;
      mountain.rotation.z = 0;
      mountain.scale.set(1, 1, 1);
      mountain.castShadow = false;
      mountain.receiveShadow = false;
      this.scene.add(mountain);
      this.geometryObjects.push(mountain);
    }

    const middleCount = TERRAIN_CONFIG.middleMountainCount;
    const middleRadius = TERRAIN_CONFIG.middleMountainRadius;

    for (let i = 0; i < middleCount; i++) {
      const angle = (i / middleCount) * Math.PI * 2;
      const radius = middleRadius + (Math.random() - 0.5) * 80;
      const mountainHeight = 220 + Math.random() * 150;
      const mountain = this.createComplexMountain(mountainMaterial, mountainHeight, 70 + Math.random() * 80);
      const groundOffset = mountainHeight / 2;

      mountain.position.set(
        Math.cos(angle) * radius,
        groundOffset,
        Math.sin(angle) * radius
      );

      mountain.rotation.x = 0;
      mountain.rotation.y = Math.random() * Math.PI;
      mountain.rotation.z = 0;
      mountain.scale.set(1, 1, 1);
      mountain.castShadow = false;
      mountain.receiveShadow = false;
      this.scene.add(mountain);
      this.geometryObjects.push(mountain);
    }

    const outerCount = TERRAIN_CONFIG.outerMountainCount;
    const outerRadius = TERRAIN_CONFIG.outerMountainRadius;

    for (let i = 0; i < outerCount; i++) {
      const angle = (i / outerCount) * Math.PI * 2;
      const radius = outerRadius + (Math.random() - 0.5) * 100;
      const mountainHeight = 280 + Math.random() * 200;
      const mountain = new THREE.Mesh(
        new THREE.ConeGeometry(
          90 + Math.random() * 100,
          mountainHeight,
          6
        ),
        mountainMaterial
      );

      mountain.position.set(
        Math.cos(angle) * radius,
        mountainHeight / 2,
        Math.sin(angle) * radius
      );

      mountain.rotation.y = Math.random() * Math.PI;
      mountain.castShadow = false;
      mountain.receiveShadow = false;
      this.scene.add(mountain);
      this.geometryObjects.push(mountain);
    }

    const gapFillers = TERRAIN_CONFIG.gapFillerCount;
    for (let i = 0; i < gapFillers; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 550 + Math.random() * 200;
      const mountainHeight = 150 + Math.random() * 180;
      const mountain = new THREE.Mesh(
        new THREE.ConeGeometry(
          40 + Math.random() * 70,
          mountainHeight,
          6
        ),
        mountainMaterial
      );

      mountain.position.set(
        Math.cos(angle) * radius,
        mountainHeight / 2,
        Math.sin(angle) * radius
      );

      mountain.rotation.y = Math.random() * Math.PI;
      mountain.castShadow = false;
      mountain.receiveShadow = false;
      this.scene.add(mountain);
      this.geometryObjects.push(mountain);
    }
  }

  public createTerrainElements(material: THREE.ShaderMaterial): void {
    for (let i = 0; i < 120; i++) {
      const platformSize = 3 + Math.random() * 6;
      const platformHeight = 0.3 + Math.random() * 1.2;
      const platform = new THREE.Mesh(
        new THREE.BoxGeometry(platformSize, platformHeight, platformSize),
        material
      );

      platform.position.set(
        (Math.random() - 0.5) * 1400,
        platformHeight / 2 + Math.random() * 3,
        (Math.random() - 0.5) * 1400
      );
      platform.rotation.y = Math.random() * Math.PI;
      platform.castShadow = true;
      platform.receiveShadow = true;
      this.scene.add(platform);
      this.geometryObjects.push(platform);
    }

    for (let i = 0; i < 60; i++) {
      const stepCount = 3 + Math.floor(Math.random() * 5);
      const stepWidth = 2 + Math.random() * 3;

      for (let j = 0; j < stepCount; j++) {
        const step = new THREE.Mesh(
          new THREE.BoxGeometry(stepWidth, 0.4, stepWidth * 0.8),
          material
        );

        const baseX = (Math.random() - 0.5) * 1200;
        const baseZ = (Math.random() - 0.5) * 1200;

        step.position.set(
          baseX,
          0.2 + j * 0.4,
          baseZ + j * (stepWidth * 0.6)
        );
        step.castShadow = true;
        step.receiveShadow = true;
        this.scene.add(step);
        this.geometryObjects.push(step);
      }
    }

    for (let i = 0; i < 40; i++) {
      const landmarkTypes = [
        new THREE.BoxGeometry(8, 6, 8),
        new THREE.CylinderGeometry(3, 3, 8, 8),
        new THREE.ConeGeometry(4, 10, 6),
        new THREE.TorusGeometry(4, 1, 8, 16)
      ];

      const geometry = landmarkTypes[Math.floor(Math.random() * landmarkTypes.length)];
      const landmark = new THREE.Mesh(geometry, material);

      landmark.position.set(
        (Math.random() - 0.5) * 1300,
        3 + Math.random() * 4,
        (Math.random() - 0.5) * 1300
      );

      landmark.rotation.y = Math.random() * Math.PI;
      landmark.castShadow = true;
      landmark.receiveShadow = true;
      this.scene.add(landmark);
      this.geometryObjects.push(landmark);
    }

    this.createVerticalStacks(material);
    this.createGroundPanels(material);
  }

  private createVerticalStacks(material: THREE.ShaderMaterial): void {
    for (let pile = 0; pile < 80; pile++) {
      const pileSize = 8 + Math.floor(Math.random() * 15);
      const baseSize = 2 + Math.random() * 4;

      const pileX = (Math.random() - 0.5) * 1200;
      const pileZ = (Math.random() - 0.5) * 1200;

      for (let block = 0; block < pileSize; block++) {
        const blockWidth = baseSize + (Math.random() - 0.5) * 3;
        const blockHeight = 0.5 + Math.random() * 2;
        const blockDepth = baseSize + (Math.random() - 0.5) * 3;

        const pileBlock = new THREE.Mesh(
          new THREE.BoxGeometry(blockWidth, blockHeight, blockDepth),
          material
        );

        const scatterRadius = Math.random() * 4;
        const scatterAngle = Math.random() * Math.PI * 2;
        const scatterX = Math.cos(scatterAngle) * scatterRadius;
        const scatterZ = Math.sin(scatterAngle) * scatterRadius;

        const distanceFromCenter = Math.sqrt(scatterX * scatterX + scatterZ * scatterZ);
        const pileHeight = Math.max(0, (4 - distanceFromCenter) * 2 + Math.random() * 3);

        pileBlock.position.set(
          pileX + scatterX,
          pileHeight + blockHeight / 2,
          pileZ + scatterZ
        );

        pileBlock.rotation.x = (Math.random() - 0.5) * 0.6;
        pileBlock.rotation.y = Math.random() * Math.PI;
        pileBlock.rotation.z = (Math.random() - 0.5) * 0.4;

        pileBlock.castShadow = true;
        pileBlock.receiveShadow = true;
        this.scene.add(pileBlock);
        this.geometryObjects.push(pileBlock);
      }
    }

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

        const spireBlock = new THREE.Mesh(
          new THREE.BoxGeometry(blockWidth, blockHeight, blockDepth),
          material
        );

        spireBlock.position.set(
          spireX + (Math.random() - 0.5) * 0.2,
          currentHeight + blockHeight / 2,
          spireZ + (Math.random() - 0.5) * 0.2
        );

        spireBlock.rotation.y = (Math.random() - 0.5) * 0.1;

        spireBlock.castShadow = true;
        spireBlock.receiveShadow = true;
        this.scene.add(spireBlock);
        this.geometryObjects.push(spireBlock);

        currentHeight += blockHeight;
      }
    }

    for (let pyramid = 0; pyramid < 20; pyramid++) {
      const levels = 4 + Math.floor(Math.random() * 6);
      const baseSize = 6 + Math.random() * 4;

      const pyramidX = (Math.random() - 0.5) * 1000;
      const pyramidZ = (Math.random() - 0.5) * 1000;

      for (let level = 0; level < levels; level++) {
        const levelSize = baseSize * (1 - level / levels * 0.7);
        const levelHeight = 1.5 + Math.random() * 1;

        const pyramidLevel = new THREE.Mesh(
          new THREE.BoxGeometry(levelSize, levelHeight, levelSize),
          material
        );

        pyramidLevel.position.set(
          pyramidX,
          level * levelHeight + levelHeight / 2,
          pyramidZ
        );

        pyramidLevel.rotation.y = level * 0.2;

        pyramidLevel.castShadow = true;
        pyramidLevel.receiveShadow = true;
        this.scene.add(pyramidLevel);
        this.geometryObjects.push(pyramidLevel);
      }
    }
  }

  private createGroundPanels(material: THREE.ShaderMaterial): void {
    for (let i = 0; i < 60; i++) {
      const structureWidth = 15 + Math.random() * 25;
      const structureDepth = 12 + Math.random() * 20;
      const structureHeight = 2 + Math.random() * 4;

      const structure = new THREE.Mesh(
        new THREE.BoxGeometry(structureWidth, structureHeight, structureDepth),
        material
      );

      structure.position.set(
        (Math.random() - 0.5) * 1300,
        structureHeight / 2,
        (Math.random() - 0.5) * 1300
      );

      structure.rotation.set(
        (Math.random() - 0.5) * 0.6,
        Math.random() * Math.PI,
        (Math.random() - 0.5) * 0.4
      );

      structure.castShadow = true;
      structure.receiveShadow = true;
      this.scene.add(structure);
      this.geometryObjects.push(structure);
    }

    for (let i = 0; i < 45; i++) {
      const platformTypes = [
        new THREE.BoxGeometry(
          8 + Math.random() * 15,
          1.5 + Math.random() * 3,
          6 + Math.random() * 12
        ),
        new THREE.CylinderGeometry(
          6 + Math.random() * 8,
          4 + Math.random() * 6,
          2 + Math.random() * 4,
          8
        ),
        new THREE.ConeGeometry(
          8 + Math.random() * 6,
          3 + Math.random() * 3,
          6
        )
      ];

      const geometry = platformTypes[Math.floor(Math.random() * platformTypes.length)];
      const platform = new THREE.Mesh(geometry, material);

      platform.position.set(
        (Math.random() - 0.5) * 1300,
        1 + Math.random() * 2,
        (Math.random() - 0.5) * 1300
      );

      platform.rotation.set(
        (Math.random() - 0.5) * 0.5,
        Math.random() * Math.PI,
        (Math.random() - 0.5) * 0.3
      );

      platform.castShadow = true;
      platform.receiveShadow = true;
      this.scene.add(platform);
      this.geometryObjects.push(platform);
    }

    for (let i = 0; i < 35; i++) {
      const fragmentTypes = [
        new THREE.BoxGeometry(5 + Math.random() * 8, 0.8 + Math.random() * 1.5, 5 + Math.random() * 8),
        new THREE.TetrahedronGeometry(4 + Math.random() * 4),
        new THREE.OctahedronGeometry(3 + Math.random() * 3)
      ];

      const geometry = fragmentTypes[Math.floor(Math.random() * fragmentTypes.length)];
      const fragment = new THREE.Mesh(geometry, material);

      fragment.position.set(
        (Math.random() - 0.5) * 1300,
        0.5 + Math.random() * 1,
        (Math.random() - 0.5) * 1300
      );

      fragment.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      fragment.castShadow = true;
      fragment.receiveShadow = true;
      this.scene.add(fragment);
      this.geometryObjects.push(fragment);
    }
  }

  public createWhiteGroundPlane(_material: THREE.ShaderMaterial): void {
    const groundMaterial = new THREE.ShaderMaterial({
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

    const groundGeometry = new THREE.PlaneGeometry(3000, 3000);
    const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.position.y = -1;
    groundPlane.receiveShadow = true;
    this.scene.add(groundPlane);
  }

  public createStars(): void {
    const starCount = PARTICLE_CONFIG.starCount;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const radius = 1200 + Math.random() * 400;
      const theta = Math.random() * Math.PI * 2;

      let y;
      if (i < starCount * 0.65) {
        y = 200 + Math.random() * 300;
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

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 4.0,
      sizeAttenuation: false,
      transparent: false,
      depthTest: true,
      depthWrite: false
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    stars.renderOrder = -1;
    this.scene.add(stars);
  }

  public createBackground(): void {
    const material = this.createBinaryToonMaterial();

    for (let i = 0; i < 15; i++) {
      const shapes = [
        new THREE.BoxGeometry(3, 3, 3),
        new THREE.SphereGeometry(1.5, 8, 6),
        new THREE.ConeGeometry(1.5, 3, 6),
        new THREE.CylinderGeometry(1, 1, 4, 8)
      ];

      const geometry = shapes[Math.floor(Math.random() * shapes.length)];
      const shape = new THREE.Mesh(geometry, material);

      const angle = Math.random() * Math.PI * 2;
      const distance = 70 + Math.random() * 30;

      shape.position.set(
        Math.cos(angle) * distance,
        -2 + Math.random() * 8,
        Math.sin(angle) * distance
      );

      shape.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      shape.castShadow = true;
      this.scene.add(shape);
      this.geometryObjects.push(shape);
    }

    for (let i = 0; i < 6; i++) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(2, 12, 2), material);
      const angle = (i / 6) * Math.PI * 2;
      const distance = 90;

      pillar.position.set(
        Math.cos(angle) * distance,
        6,
        Math.sin(angle) * distance
      );

      pillar.castShadow = true;
      this.scene.add(pillar);
      this.geometryObjects.push(pillar);
    }
  }

  public createFloatingObjects(
    animatedObjects: THREE.Object3D[],
    debrisMaterial: THREE.ShaderMaterial
  ): void {
    const baseHeight = 135;

    const cubeCount = 8;
    const cubeRadius = 25;
    for (let i = 0; i < cubeCount; i++) {
      const angle = (i / cubeCount) * Math.PI * 2;
      const cube = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), debrisMaterial);
      cube.position.set(
        Math.cos(angle) * cubeRadius,
        baseHeight + Math.sin(i * 0.5) * 6,
        Math.sin(angle) * cubeRadius
      );
      cube.castShadow = true;
      cube.receiveShadow = true;
      this.scene.add(cube);
      this.geometryObjects.push(cube);
      animatedObjects.push(cube);
    }

    const sphereCount = 6;
    const sphereRadius = 18;
    for (let i = 0; i < sphereCount; i++) {
      const angle = (i / sphereCount) * Math.PI * 2;
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 6), debrisMaterial);
      sphere.position.set(
        Math.cos(angle) * sphereRadius,
        baseHeight + 3 + Math.cos(i * 0.8) * 4,
        Math.sin(angle) * sphereRadius
      );
      sphere.castShadow = true;
      sphere.receiveShadow = true;
      this.scene.add(sphere);
      this.geometryObjects.push(sphere);
      animatedObjects.push(sphere);
    }

    const pyramidCount = 5;
    const pyramidRadius = 12;
    for (let i = 0; i < pyramidCount; i++) {
      const angle = (i / pyramidCount) * Math.PI * 2;
      const pyramid = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.8, 4), debrisMaterial);
      pyramid.position.set(
        Math.cos(angle) * pyramidRadius,
        baseHeight + 8 + Math.sin(i * 1.2) * 3,
        Math.sin(angle) * pyramidRadius
      );
      pyramid.castShadow = true;
      pyramid.receiveShadow = true;
      this.scene.add(pyramid);
      this.geometryObjects.push(pyramid);
      animatedObjects.push(pyramid);
    }

    for (let i = 0; i < 15; i++) {
      const debrisTypes = [
        new THREE.BoxGeometry(0.5 + Math.random() * 0.8, 0.5 + Math.random() * 0.8, 0.5 + Math.random() * 0.8),
        new THREE.TetrahedronGeometry(0.6 + Math.random() * 0.4),
        new THREE.ConeGeometry(0.4 + Math.random() * 0.3, 0.8 + Math.random() * 0.6, 5),
        new THREE.OctahedronGeometry(0.4 + Math.random() * 0.3)
      ];

      const geometry = debrisTypes[Math.floor(Math.random() * debrisTypes.length)];
      const debris = new THREE.Mesh(geometry, debrisMaterial);

      const angle = Math.random() * Math.PI * 2;
      const radius = 6 + Math.random() * 20;
      const height = baseHeight + 15 + (Math.random() - 0.5) * 15;

      debris.position.set(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );

      debris.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      debris.castShadow = true;
      debris.receiveShadow = true;
      this.scene.add(debris);
      this.geometryObjects.push(debris);
      animatedObjects.push(debris);
    }
  }

  public createCenterStructures(material: THREE.ShaderMaterial, debrisMaterial: THREE.ShaderMaterial): void {
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(8, 12, 6, 8),
      material
    );
    pedestal.position.set(0, 3, 0);
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;
    this.scene.add(pedestal);
    this.geometryObjects.push(pedestal);

    const supportCount = 6;
    for (let i = 0; i < supportCount; i++) {
      const angle = (i / supportCount) * Math.PI * 2;
      const radius = 15 + Math.random() * 5;

      const supportTypes = [
        new THREE.BoxGeometry(3 + Math.random() * 2, 8 + Math.random() * 6, 3 + Math.random() * 2),
        new THREE.ConeGeometry(2 + Math.random() * 1.5, 10 + Math.random() * 5, 6),
        new THREE.CylinderGeometry(1.5, 3, 12 + Math.random() * 4, 8)
      ];

      const geometry = supportTypes[Math.floor(Math.random() * supportTypes.length)];
      const support = new THREE.Mesh(geometry, material);

      support.position.set(
        Math.cos(angle) * radius,
        5 + Math.random() * 3,
        Math.sin(angle) * radius
      );

      support.rotation.set(
        (Math.random() - 0.5) * 0.3,
        angle + (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.2
      );

      support.castShadow = true;
      support.receiveShadow = true;
      this.scene.add(support);
      this.geometryObjects.push(support);
    }

    const groundStructureCount = 12;
    for (let i = 0; i < groundStructureCount; i++) {
      const angle = (i / groundStructureCount) * Math.PI * 2;
      const radius = 8 + Math.random() * 12;

      const structure = new THREE.Mesh(
        new THREE.BoxGeometry(
          2 + Math.random() * 3,
          1 + Math.random() * 2,
          6 + Math.random() * 4
        ),
        material
      );

      structure.position.set(
        Math.cos(angle) * radius,
        0.5 + Math.random() * 0.5,
        Math.sin(angle) * radius
      );

      structure.rotation.set(
        (Math.random() - 0.5) * 0.4,
        angle + (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.2
      );

      structure.castShadow = true;
      structure.receiveShadow = true;
      this.scene.add(structure);
      this.geometryObjects.push(structure);
    }

    const platformCount = 8;
    for (let i = 0; i < platformCount; i++) {
      const angle = (i / platformCount) * Math.PI * 2 + Math.random() * 0.5;
      const radius = 20 + Math.random() * 10;

      const platform = new THREE.Mesh(
        new THREE.BoxGeometry(
          4 + Math.random() * 3,
          0.3 + Math.random() * 0.4,
          4 + Math.random() * 3
        ),
        debrisMaterial
      );

      platform.position.set(
        Math.cos(angle) * radius,
        2 + Math.random() * 3,
        Math.sin(angle) * radius
      );

      platform.rotation.set(
        (Math.random() - 0.5) * 0.3,
        Math.random() * Math.PI,
        (Math.random() - 0.5) * 0.2
      );

      platform.castShadow = true;
      platform.receiveShadow = true;
      this.scene.add(platform);
      this.geometryObjects.push(platform);
    }

    const bridgeCount = 4;
    for (let i = 0; i < bridgeCount; i++) {
      const angle = (i / bridgeCount) * Math.PI * 2;
      const startRadius = 12;
      const endRadius = 25;

      const bridge = new THREE.Mesh(
        new THREE.BoxGeometry(
          endRadius - startRadius,
          0.5,
          1.5 + Math.random() * 1
        ),
        material
      );

      const midRadius = (startRadius + endRadius) / 2;
      bridge.position.set(
        Math.cos(angle) * midRadius,
        2.5 + Math.random() * 1,
        Math.sin(angle) * midRadius
      );

      bridge.rotation.y = angle;

      bridge.castShadow = true;
      bridge.receiveShadow = true;
      this.scene.add(bridge);
      this.geometryObjects.push(bridge);
    }
  }

  public createDebrisPile(
    material: THREE.ShaderMaterial,
    debrisMaterial: THREE.ShaderMaterial,
    position: { x: number, z: number, height: number }
  ): void {
    const pileSize = 8 + Math.floor(Math.random() * 10);
    const baseSize = 3 + Math.random() * 2;

    for (let block = 0; block < pileSize; block++) {
      const blockWidth = baseSize + (Math.random() - 0.5) * 2;
      const blockHeight = 1 + Math.random() * 3;
      const blockDepth = baseSize + (Math.random() - 0.5) * 2;

      const pileBlock = new THREE.Mesh(
        new THREE.BoxGeometry(blockWidth, blockHeight, blockDepth),
        Math.random() > 0.6 ? debrisMaterial : material
      );

      const scatterRadius = Math.random() * 6;
      const scatterAngle = Math.random() * Math.PI * 2;
      const scatterX = Math.cos(scatterAngle) * scatterRadius;
      const scatterZ = Math.sin(scatterAngle) * scatterRadius;

      const distanceFromCenter = Math.sqrt(scatterX * scatterX + scatterZ * scatterZ);
      const pileHeight = Math.max(0, (6 - distanceFromCenter) * 1.5 + Math.random() * 2);

      pileBlock.position.set(
        position.x + scatterX,
        pileHeight + blockHeight / 2,
        position.z + scatterZ
      );

      pileBlock.rotation.x = (Math.random() - 0.5) * 0.4;
      pileBlock.rotation.y = Math.random() * Math.PI;
      pileBlock.rotation.z = (Math.random() - 0.5) * 0.3;

      pileBlock.castShadow = true;
      pileBlock.receiveShadow = true;
      this.scene.add(pileBlock);
      this.geometryObjects.push(pileBlock);
    }

    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 + Math.random() * 0.5;
      const radius = 8 + Math.random() * 4;

      const platform = new THREE.Mesh(
        new THREE.BoxGeometry(
          4 + Math.random() * 3,
          0.5 + Math.random() * 0.8,
          3 + Math.random() * 2
        ),
        material
      );

      platform.position.set(
        position.x + Math.cos(angle) * radius,
        0.3 + Math.random() * 0.5,
        position.z + Math.sin(angle) * radius
      );

      platform.rotation.set(
        (Math.random() - 0.5) * 0.3,
        Math.random() * Math.PI,
        (Math.random() - 0.5) * 0.2
      );

      platform.castShadow = true;
      platform.receiveShadow = true;
      this.scene.add(platform);
      this.geometryObjects.push(platform);
    }
  }
}
