import { useSceneStore } from '../store/sceneStore';
import { UIManager } from '../ui/UIManager';
import { KEY_TO_DIAMOND_MAP, NUMBER_KEY_TO_DIAMOND_MAP, TIMING_CONFIG } from '../utils/Constants';

/**
 * Connects the vanilla UIManager to the Zustand store
 * This bridges the HTML UI with the React 3D scene
 */
export function connectUIToStore(uiManager: UIManager): () => void {
  let prevFocusedDiamond = -1;
  let prevPlayingTracks = new Set<number>();

  // Subscribe to all state changes
  const unsub = useSceneStore.subscribe((state) => {
    // Check focused diamond changes
    if (state.focusedDiamond !== prevFocusedDiamond) {
      prevFocusedDiamond = state.focusedDiamond;
      if (state.focusedDiamond >= 0) {
        uiManager.setTrackNameHighlight(state.focusedDiamond);
      } else {
        uiManager.clearUISelections();
      }
    }

    // Check playing tracks changes
    const playingChanged = state.playingTracks.size !== prevPlayingTracks.size ||
      [...state.playingTracks].some(t => !prevPlayingTracks.has(t));

    if (playingChanged) {
      prevPlayingTracks = new Set(state.playingTracks);
      for (let i = 0; i < 7; i++) {
        const isPlaying = state.playingTracks.has(i);
        uiManager.updatePlayButtonUI(i, isPlaying);
        uiManager.updateTrackNameUI(i, isPlaying);
      }
    }
  });

  // Return cleanup function
  return unsub;
}

/**
 * Setup keyboard event handlers that dispatch to the store
 */
export function setupKeyboardHandlers(uiManager: UIManager) {
  const handleKeyDown = (e: KeyboardEvent) => {
    const state = useSceneStore.getState();

    if (e.key === 'h' || e.key === 'H') {
      uiManager.toggleControlsTooltip();
    } else if (e.key === 'Escape') {
      const tooltip = document.getElementById('controls-tooltip');
      if (tooltip && tooltip.classList.contains('visible')) {
        uiManager.hideControlsTooltip();
      } else {
        state.setFocusedDiamond(-1);
      }
    } else if (e.key === 'q' || e.key === 'Q') {
      state.stopAllTracks();
    } else if (e.key === 'r' || e.key === 'R') {
      state.setFocusedDiamond(-1);
    } else if (e.key === 'p' || e.key === 'P') {
      const focusedDiamond = state.focusedDiamond;
      if (focusedDiamond >= 0) {
        state.toggleTrack(focusedDiamond);
      }
    } else if (e.key >= '1' && e.key <= '7') {
      const trackIndex = NUMBER_KEY_TO_DIAMOND_MAP[e.key];
      if (trackIndex !== undefined) {
        state.toggleTrack(trackIndex);
      }
    } else if ('zxcvbnm'.includes(e.key.toLowerCase())) {
      const trackIndex = KEY_TO_DIAMOND_MAP[e.key.toLowerCase()];
      if (trackIndex !== undefined) {
        if (trackIndex === state.focusedDiamond) {
          state.setFocusedDiamond(-1);
        } else {
          state.setFocusedDiamond(trackIndex);
        }
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);

  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Setup music player UI click handlers
 */
export function setupMusicPlayerHandlers(uiManager: UIManager, _isMobile: boolean) {
  const handleTrackNameClick = (diamondIndex: number) => {
    const state = useSceneStore.getState();
    if (diamondIndex === state.focusedDiamond) {
      state.setFocusedDiamond(-1);
    } else {
      state.setFocusedDiamond(diamondIndex);
    }
  };

  const handlePlayButtonClick = (diamondIndex: number) => {
    const state = useSceneStore.getState();
    state.toggleTrack(diamondIndex);
  };

  uiManager.setupMusicPlayer(handleTrackNameClick, handlePlayButtonClick);
}

/**
 * Initialize UI after scene is loaded
 */
export function initializeUIAfterLoad(uiManager: UIManager) {
  setTimeout(() => {
    uiManager.fadeInCanvas();
    uiManager.hideLoadingScreen(() => {
      useSceneStore.getState().setIsLoaded(true);
    });
    uiManager.fadeInMusicPlayer(TIMING_CONFIG.menuFadeDelay);
  }, TIMING_CONFIG.canvasFadeDelay);
}
