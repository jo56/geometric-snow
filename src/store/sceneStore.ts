import { create } from 'zustand';
import * as THREE from 'three';

interface CameraTarget {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

interface SceneState {
  // Scene state
  isLoaded: boolean;
  isMobile: boolean;

  // Diamond/track state
  focusedDiamond: number;
  spinningDiamonds: Set<number>;
  playingTracks: Set<number>;

  // Camera state
  cameraTarget: CameraTarget | null;

  // Actions
  setIsLoaded: (loaded: boolean) => void;
  setIsMobile: (mobile: boolean) => void;
  setFocusedDiamond: (index: number) => void;
  startSpinning: (index: number) => void;
  stopSpinning: (index: number) => void;
  playTrack: (index: number) => void;
  stopTrack: (index: number) => void;
  stopAllTracks: () => void;
  toggleTrack: (index: number) => boolean;
  setCameraTarget: (position: THREE.Vector3, target: THREE.Vector3) => void;
  clearCameraTarget: () => void;
  resetCamera: () => void;
}

export const useSceneStore = create<SceneState>((set, get) => ({
  // Initial state
  isLoaded: false,
  isMobile: false,
  focusedDiamond: -1,
  spinningDiamonds: new Set<number>(),
  playingTracks: new Set<number>(),
  cameraTarget: null,

  // Actions
  setIsLoaded: (loaded) => set({ isLoaded: loaded }),

  setIsMobile: (mobile) => set({ isMobile: mobile }),

  setFocusedDiamond: (index) => set({ focusedDiamond: index }),

  startSpinning: (index) => set((state) => {
    const newSet = new Set(state.spinningDiamonds);
    newSet.add(index);
    return { spinningDiamonds: newSet };
  }),

  stopSpinning: (index) => set((state) => {
    const newSet = new Set(state.spinningDiamonds);
    newSet.delete(index);
    return { spinningDiamonds: newSet };
  }),

  playTrack: (index) => set((state) => {
    const newSet = new Set(state.playingTracks);
    newSet.add(index);
    return { playingTracks: newSet };
  }),

  stopTrack: (index) => set((state) => {
    const newSet = new Set(state.playingTracks);
    newSet.delete(index);
    return { playingTracks: newSet };
  }),

  stopAllTracks: () => set({
    playingTracks: new Set<number>(),
    spinningDiamonds: new Set<number>()
  }),

  toggleTrack: (index) => {
    const state = get();
    if (state.playingTracks.has(index)) {
      state.stopTrack(index);
      state.stopSpinning(index);
      return false;
    } else {
      state.playTrack(index);
      state.startSpinning(index);
      return true;
    }
  },

  setCameraTarget: (position, target) => set({
    cameraTarget: { position: position.clone(), target: target.clone() }
  }),

  clearCameraTarget: () => set({ cameraTarget: null }),

  resetCamera: () => set({
    focusedDiamond: -1,
    cameraTarget: null
  })
}));
