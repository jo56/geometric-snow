import * as THREE from 'three';
import { AUDIO_FILES_DESKTOP, AUDIO_FILES_MOBILE } from '../utils/Constants';

export class AudioManager {
  private listener: THREE.AudioListener;
  private positionalAudios: Map<number, THREE.PositionalAudio> = new Map();
  private htmlAudioElements: Map<number, HTMLAudioElement> = new Map();
  private playingAudios: Map<number, THREE.PositionalAudio | HTMLAudioElement> = new Map();
  private isMobile: boolean;

  constructor(camera: THREE.PerspectiveCamera, isMobile: boolean) {
    this.isMobile = isMobile;
    this.listener = new THREE.AudioListener();
    camera.add(this.listener);
  }

  public setupDiamondAudio(diamondIndex: number, diamondMesh: THREE.Mesh): void {
    const audioPath = this.isMobile ? './mobile_audio' : './audio';
    const audioFiles = this.isMobile ? AUDIO_FILES_MOBILE : AUDIO_FILES_DESKTOP;

    if (this.isMobile) {
      const audio = new Audio();
      audio.src = `${audioPath}/${audioFiles[diamondIndex]}`;
      audio.loop = true;
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';

      if (diamondIndex === 3) {
        audio.volume = 1.0;
      } else if (diamondIndex === 4) {
        audio.volume = 0.9375;
      } else {
        audio.volume = 1.0;
      }

      audio.load();
      this.htmlAudioElements.set(diamondIndex, audio);
    } else {
      const positionalAudio = new THREE.PositionalAudio(this.listener);
      positionalAudio.setRefDistance(10);
      positionalAudio.setRolloffFactor(0.5);
      positionalAudio.setMaxDistance(10000);
      positionalAudio.setDistanceModel('exponential');
      positionalAudio.setLoop(true);

      const audioLoader = new THREE.AudioLoader();
      audioLoader.load(
        `${audioPath}/${audioFiles[diamondIndex]}`,
        (buffer) => {
          positionalAudio.setBuffer(buffer);
          if (diamondIndex === 3) {
            positionalAudio.setVolume(1.25 * 1.75);
          } else if (diamondIndex === 4) {
            positionalAudio.setVolume(0.75 * 1.25);
          } else {
            positionalAudio.setVolume(1.25);
          }
        }
      );

      diamondMesh.add(positionalAudio);
      this.positionalAudios.set(diamondIndex, positionalAudio);
    }
  }

  public playTrack(diamondIndex: number): void {
    if (this.isMobile) {
      const audio = this.htmlAudioElements.get(diamondIndex);
      if (audio) {
        audio.play();
        this.playingAudios.set(diamondIndex, audio);
      }
    } else {
      const positionalAudio = this.positionalAudios.get(diamondIndex);
      if (positionalAudio && positionalAudio.buffer) {
        positionalAudio.play();
        this.playingAudios.set(diamondIndex, positionalAudio);
      }
    }
  }

  public stopTrack(diamondIndex: number): void {
    const audio = this.playingAudios.get(diamondIndex);
    if (audio) {
      if (audio instanceof HTMLAudioElement) {
        audio.pause();
        audio.currentTime = 0;
      } else {
        audio.stop();
      }
      this.playingAudios.delete(diamondIndex);
    }
  }

  public toggleTrack(diamondIndex: number): boolean {
    if (this.playingAudios.has(diamondIndex)) {
      this.stopTrack(diamondIndex);
      return false;
    } else {
      this.playTrack(diamondIndex);
      return true;
    }
  }

  public stopAllTracks(): void {
    const playingIndices = Array.from(this.playingAudios.keys());
    playingIndices.forEach(index => {
      this.stopTrack(index);
    });
  }

  public isPlaying(diamondIndex: number): boolean {
    return this.playingAudios.has(diamondIndex);
  }
}
