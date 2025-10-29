import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { PARTICLE_CONFIG } from '../utils/Constants';

export class PostProcessingManager {
  private composer: EffectComposer;
  private outlinePass: OutlinePass;
  private particles!: THREE.Points;
  private particleVelocities!: Float32Array;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    geometryObjects: THREE.Object3D[]
  ) {
    this.composer = new EffectComposer(renderer);

    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    this.outlinePass = new OutlinePass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      scene,
      camera
    );

    this.outlinePass.edgeStrength = 3.0;
    this.outlinePass.edgeGlow = 0.0;
    this.outlinePass.edgeThickness = 1.0;
    this.outlinePass.pulsePeriod = 0;
    this.outlinePass.visibleEdgeColor.setHex(0x000000);
    this.outlinePass.hiddenEdgeColor.setHex(0x000000);

    this.outlinePass.selectedObjects = geometryObjects;

    this.composer.addPass(this.outlinePass);
  }

  public getComposer(): EffectComposer {
    return this.composer;
  }

  public handleResize(): void {
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  public render(): void {
    this.composer.render();
  }

  public createOptimizedParticleSystem(scene: THREE.Scene): void {
    const particleCount = PARTICLE_CONFIG.count;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      positions[i3] = (Math.random() - 0.5) * 1600;
      positions[i3 + 1] = Math.random() * 200;
      positions[i3 + 2] = (Math.random() - 0.5) * 1600;

      velocities[i3] = (Math.random() - 0.5) * 0.4;
      velocities[i3 + 1] = -0.5 - Math.random() * 1.0;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.4;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: 0x808080,
      size: 2.0,
      transparent: true,
      opacity: 0.6,
      blending: THREE.NormalBlending,
      sizeAttenuation: true,
      vertexColors: false,
      alphaTest: 0.1
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    this.particles = particles;
    this.particleVelocities = velocities;
  }

  public updateParticles(): void {
    if (this.particles && this.particleVelocities) {
      const positions = this.particles.geometry.attributes.position.array as Float32Array;
      const particleCount = positions.length / 3;

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;

        positions[i3] += this.particleVelocities[i3];
        positions[i3 + 1] += this.particleVelocities[i3 + 1];
        positions[i3 + 2] += this.particleVelocities[i3 + 2];

        if (
          positions[i3 + 1] < -10 ||
          Math.abs(positions[i3]) > 900 ||
          Math.abs(positions[i3 + 2]) > 900
        ) {
          positions[i3] = (Math.random() - 0.5) * 1600;
          positions[i3 + 1] = 180 + Math.random() * 20;
          positions[i3 + 2] = (Math.random() - 0.5) * 1600;
        }
      }

      this.particles.geometry.attributes.position.needsUpdate = true;
    }
  }

  public createDiamondAura(): THREE.Points {
    const particleCount = 150;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      const radius = 8 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.5,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    return new THREE.Points(geometry, material);
  }
}
