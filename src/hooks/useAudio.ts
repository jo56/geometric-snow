import { useEffect, useRef, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { AUDIO_FILES_DESKTOP, AUDIO_FILES_MOBILE, DIAMOND_POSITIONS } from '../utils/Constants';
import { useSceneStore } from '../store/sceneStore';

interface AudioRefs {
  listener: THREE.AudioListener | null;
  positionalAudios: Map<number, THREE.PositionalAudio>;
  htmlAudios: Map<number, HTMLAudioElement>;
}

export function useAudio(isMobile: boolean) {
  const { camera } = useThree();
  const audioRefs = useRef<AudioRefs>({
    listener: null,
    positionalAudios: new Map(),
    htmlAudios: new Map()
  });

  const playingTracks = useSceneStore((state) => state.playingTracks);

  // Initialize audio listener
  useEffect(() => {
    if (!isMobile) {
      const listener = new THREE.AudioListener();
      camera.add(listener);
      audioRefs.current.listener = listener;

      return () => {
        camera.remove(listener);
      };
    }
  }, [camera, isMobile]);

  // Setup audio for each diamond
  useEffect(() => {
    const audioPath = isMobile ? './mobile_audio' : './audio';
    const audioFiles = isMobile ? AUDIO_FILES_MOBILE : AUDIO_FILES_DESKTOP;

    DIAMOND_POSITIONS.forEach((pos, index) => {
      if (isMobile) {
        // HTML Audio for mobile
        const audio = new Audio();
        audio.src = `${audioPath}/${audioFiles[index]}`;
        audio.loop = true;
        audio.preload = 'auto';
        audio.crossOrigin = 'anonymous';

        if (index === 3) {
          audio.volume = 1.0;
        } else if (index === 4) {
          audio.volume = 0.9375;
        } else {
          audio.volume = 1.0;
        }

        audio.load();
        audioRefs.current.htmlAudios.set(index, audio);
      } else if (audioRefs.current.listener) {
        // Positional audio for desktop
        const positionalAudio = new THREE.PositionalAudio(audioRefs.current.listener);
        positionalAudio.setRefDistance(10);
        positionalAudio.setRolloffFactor(0.5);
        positionalAudio.setMaxDistance(10000);
        positionalAudio.setDistanceModel('exponential');
        positionalAudio.setLoop(true);

        const audioLoader = new THREE.AudioLoader();
        audioLoader.load(
          `${audioPath}/${audioFiles[index]}`,
          (buffer) => {
            positionalAudio.setBuffer(buffer);
            if (index === 3) {
              positionalAudio.setVolume(1.25 * 1.75);
            } else if (index === 4) {
              positionalAudio.setVolume(0.75 * 1.25);
            } else {
              positionalAudio.setVolume(1.25);
            }
          },
          undefined,
          (error) => {
            console.error(`Failed to load audio for diamond ${index}:`, error);
          }
        );

        // Position the audio at the diamond location
        positionalAudio.position.set(pos.x, pos.height, pos.z);
        audioRefs.current.positionalAudios.set(index, positionalAudio);
      }
    });

    return () => {
      // Cleanup
      audioRefs.current.positionalAudios.forEach((audio) => {
        if (audio.isPlaying) audio.stop();
      });
      audioRefs.current.htmlAudios.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
    };
  }, [isMobile]);

  // Handle playing tracks changes
  useEffect(() => {
    if (isMobile) {
      audioRefs.current.htmlAudios.forEach((audio, index) => {
        if (playingTracks.has(index)) {
          if (audio.paused) {
            audio.play().catch(console.error);
          }
        } else {
          if (!audio.paused) {
            audio.pause();
            audio.currentTime = 0;
          }
        }
      });
    } else {
      audioRefs.current.positionalAudios.forEach((audio, index) => {
        if (playingTracks.has(index)) {
          if (audio.buffer && !audio.isPlaying) {
            audio.play();
          }
        } else {
          if (audio.isPlaying) {
            audio.stop();
          }
        }
      });
    }
  }, [playingTracks, isMobile]);

  // Get positional audios for attaching to diamond meshes
  const getPositionalAudio = useCallback((index: number) => {
    return audioRefs.current.positionalAudios.get(index);
  }, []);

  return { getPositionalAudio };
}
