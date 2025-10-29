import * as THREE from 'three';
import { DIAMOND_POSITIONS } from '../utils/Constants';

export class DiamondManager {
  private scene: THREE.Scene;
  private diamonds: THREE.Mesh[] = [];
  private diamondLights: Map<number, THREE.PointLight> = new Map();
  private diamondAuras: Map<number, THREE.Points> = new Map();
  private diamondDebris: Map<number, THREE.Object3D[]> = new Map();
  private spinningDiamonds = new Set<number>();
  private geometryObjects: THREE.Object3D[];
  private animatedObjects: THREE.Object3D[];

  constructor(
    scene: THREE.Scene,
    geometryObjects: THREE.Object3D[],
    animatedObjects: THREE.Object3D[]
  ) {
    this.scene = scene;
    this.geometryObjects = geometryObjects;
    this.animatedObjects = animatedObjects;
  }

  public createAllDiamonds(
    material: THREE.ShaderMaterial,
    debrisMaterial: THREE.ShaderMaterial,
    createAuraFn: () => THREE.Points
  ): void {
    DIAMOND_POSITIONS.forEach((pos, index) => {
      const diamond = this.createHalfDiamond(pos.size);
      diamond.position.set(pos.x, pos.height, pos.z);
      diamond.castShadow = true;
      diamond.receiveShadow = true;
      diamond.userData = { diamondIndex: index };
      this.scene.add(diamond);
      this.geometryObjects.push(diamond);
      this.animatedObjects.push(diamond);
      this.diamonds.push(diamond);

      const lightDistance = index === 3 ? 50 : 40;
      const light = new THREE.PointLight(0xffffff, 0, lightDistance);
      light.position.set(pos.x, pos.height, pos.z);
      this.scene.add(light);
      this.diamondLights.set(index, light);

      const aura = createAuraFn();
      aura.position.set(pos.x, pos.height, pos.z);
      aura.visible = false;
      this.scene.add(aura);
      this.diamondAuras.set(index, aura);

      const debrisArray: THREE.Object3D[] = [];
      const debrisCount = 8 + Math.floor(Math.random() * 7);

      for (let i = 0; i < debrisCount; i++) {
        const debrisTypes = [
          new THREE.BoxGeometry(0.3 + Math.random() * 0.6, 0.3 + Math.random() * 0.6, 0.3 + Math.random() * 0.6),
          new THREE.TetrahedronGeometry(0.4 + Math.random() * 0.3),
          new THREE.ConeGeometry(0.3 + Math.random() * 0.2, 0.6 + Math.random() * 0.4, 5),
          new THREE.OctahedronGeometry(0.3 + Math.random() * 0.2),
          new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.2),
          new THREE.IcosahedronGeometry(0.3 + Math.random() * 0.2)
        ];

        const geometry = debrisTypes[Math.floor(Math.random() * debrisTypes.length)];
        const debris = new THREE.Mesh(geometry, debrisMaterial);

        const angle = Math.random() * Math.PI * 2;
        const radius = 4 + Math.random() * 12;
        const height = pos.height + (Math.random() - 0.5) * 8;

        debris.position.set(
          pos.x + Math.cos(angle) * radius,
          height,
          pos.z + Math.sin(angle) * radius
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
        debrisArray.push(debris);
      }

      const orbitalCount = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < orbitalCount; i++) {
        const orbitalTypes = [
          new THREE.SphereGeometry(0.6 + Math.random() * 0.4, 8, 6),
          new THREE.CylinderGeometry(0.3, 0.3, 1.2 + Math.random() * 0.8, 6),
          new THREE.TorusGeometry(0.8, 0.2, 6, 12)
        ];

        const geometry = orbitalTypes[Math.floor(Math.random() * orbitalTypes.length)];
        const orbital = new THREE.Mesh(geometry, debrisMaterial);

        const angle = (i / orbitalCount) * Math.PI * 2 + Math.random() * 0.5;
        const radius = 8 + Math.random() * 8;
        const height = pos.height + (Math.random() - 0.5) * 6;

        orbital.position.set(
          pos.x + Math.cos(angle) * radius,
          height,
          pos.z + Math.sin(angle) * radius
        );

        orbital.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );

        orbital.castShadow = true;
        orbital.receiveShadow = true;
        this.scene.add(orbital);
        this.geometryObjects.push(orbital);
        debrisArray.push(orbital);
      }

      this.diamondDebris.set(index + 1, debrisArray);
    });

    DIAMOND_POSITIONS.forEach((pos, index) => {
      this.createDiamondStructures(material, debrisMaterial, pos, index);
    });
  }

  private createHalfDiamond(size: number): THREE.Mesh {
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

    const blackMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, blackMaterial);

    const edges = new THREE.EdgesGeometry(geometry, 1);
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
    mesh.add(edgeLines);

    const patternGroup = new THREE.Group();
    const whiteMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide
    });

    const beltThickness = size * 0.08;

    const upperBeltY = -size * 0.25;
    const upperBeltRadius = size * 0.625;
    const upperBeltGeometry = new THREE.TorusGeometry(upperBeltRadius, beltThickness, 16, 64);
    const upperBelt = new THREE.Mesh(upperBeltGeometry, whiteMaterial);
    upperBelt.rotation.x = Math.PI / 2;
    upperBelt.position.y = upperBeltY;
    patternGroup.add(upperBelt);

    const lowerBeltY = -size * 0.6;
    const lowerBeltRadius = size * 0.28;
    const lowerBeltGeometry = new THREE.TorusGeometry(lowerBeltRadius, beltThickness, 16, 64);
    const lowerBelt = new THREE.Mesh(lowerBeltGeometry, whiteMaterial);
    lowerBelt.rotation.x = Math.PI / 2;
    lowerBelt.position.y = lowerBeltY;
    patternGroup.add(lowerBelt);

    const topY = 0.01;
    const centerRingRadius = size * 0.5;
    const numSegments = 8;
    const arcLength = (Math.PI * 2) / numSegments;
    const gapRatio = 0.3;

    for (let i = 0; i < numSegments; i++) {
      const startAngle = i * arcLength;
      const endAngle = startAngle + arcLength * (1 - gapRatio);

      const segmentGeometry = new THREE.TorusGeometry(
        centerRingRadius,
        beltThickness,
        16,
        16,
        endAngle - startAngle
      );
      const segment = new THREE.Mesh(segmentGeometry, whiteMaterial);
      segment.rotation.x = Math.PI / 2;
      segment.rotation.z = startAngle;
      segment.position.y = topY;
      patternGroup.add(segment);
    }

    const edgeRingRadius = size * 0.9;
    const edgeRingWidth = beltThickness * 1.5;
    const edgeRingGeometry = new THREE.RingGeometry(
      edgeRingRadius - edgeRingWidth / 2,
      edgeRingRadius + edgeRingWidth / 2,
      32
    );
    const edgeRing = new THREE.Mesh(edgeRingGeometry, whiteMaterial);
    edgeRing.rotation.x = -Math.PI / 2;
    edgeRing.position.y = topY;
    patternGroup.add(edgeRing);

    mesh.add(patternGroup);

    return mesh;
  }

  private createDiamondStructures(
    material: THREE.ShaderMaterial,
    debrisMaterial: THREE.ShaderMaterial,
    position: { x: number; z: number; height: number },
    _diamondIndex: number
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

  public getDiamonds(): THREE.Mesh[] {
    return this.diamonds;
  }

  public startSpinning(diamondIndex: number): void {
    this.spinningDiamonds.add(diamondIndex);
  }

  public stopSpinning(diamondIndex: number): void {
    this.spinningDiamonds.delete(diamondIndex);
  }

  public animateDiamonds(time: number): void {
    this.diamonds.forEach((diamond, index) => {
      const aura = this.diamondAuras.get(index);

      if (this.spinningDiamonds.has(index)) {
        diamond.rotation.y = -time * 2.0;

        if (aura) {
          aura.visible = true;
          aura.rotation.y = time * 0.5;
          aura.rotation.x = time * 0.3;

          const pulseFactor = 0.6 + Math.sin(time * 2) * 0.2;
          (aura.material as THREE.PointsMaterial).opacity = pulseFactor;
        }

        const glowAmount = 1.4 + Math.sin(time * 2) * 0.4;
        diamond.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
            if (child.material.color.r > 0.5) {
              const brightColor = new THREE.Color(0xffffff);
              brightColor.multiplyScalar(glowAmount);
              child.material.color.copy(brightColor);
            }
          }
        });
      } else {
        if (aura) {
          aura.visible = false;
        }

        diamond.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
            if (child.material.color.r > 0.5 || child.material.color.r > 1.0) {
              child.material.color.set(0xffffff);
            }
          }
        });
      }
    });
  }

  public animateDebris(time: number): void {
    this.spinningDiamonds.forEach((diamondIndex) => {
      const debris = this.diamondDebris.get(diamondIndex);
      if (debris) {
        debris.forEach((obj, i) => {
          if (!obj || !(obj instanceof THREE.Mesh)) return;

          if (obj.geometry.type === 'BoxGeometry') {
            obj.rotation.x = time * 0.5 + i;
            obj.rotation.y = time * 0.7 + i;
            obj.position.y += Math.sin(time * 1.5 + i * 2) * 0.01;
          } else if (obj.geometry.type === 'SphereGeometry') {
            obj.position.y += Math.sin(time * 0.8 + i * 3) * 0.02;
            obj.rotation.z = time * 0.3 + i;
          } else if (obj.geometry.type === 'TetrahedronGeometry' || obj.geometry.type === 'ConeGeometry') {
            obj.rotation.y = time * 1.2 + i;
            obj.position.x += Math.sin(time * 0.6 + i * 4) * 0.01;
          } else if (obj.geometry.type === 'TorusGeometry') {
            obj.rotation.x = time * 0.4 + i;
            obj.rotation.y = time * 0.6 + i;
            obj.rotation.z = time * 0.2 + i;
          } else if (
            obj.geometry.type === 'OctahedronGeometry' ||
            obj.geometry.type === 'DodecahedronGeometry' ||
            obj.geometry.type === 'IcosahedronGeometry'
          ) {
            obj.rotation.x = time * 0.8 + i;
            obj.rotation.y = time * 0.5 + i;
          } else if (obj.geometry.type === 'CylinderGeometry') {
            obj.rotation.z = time * 0.7 + i;
            obj.position.y += Math.sin(time * 1.0 + i * 2) * 0.015;
          }
        });
      }
    });
  }
}
