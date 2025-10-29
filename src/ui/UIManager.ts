export class UIManager {
  private isMobile: boolean;
  private focusedDiamond: number = -1;

  constructor(isMobile: boolean) {
    this.isMobile = isMobile;
  }

  public updateLoadingProgress(_progress: number, _text: string): void {
    // Loading spinner doesn't need progress updates
  }

  public hideLoadingScreen(onComplete: () => void): void {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.style.opacity = '0';
      loadingScreen.style.transition = 'opacity 1.5s ease';
      setTimeout(() => {
        loadingScreen.style.display = 'none';
        onComplete();
        this.showControlsTooltip();
      }, 1500);
    }
  }

  public showControlsTooltip(): void {
    const tooltip = document.getElementById('controls-tooltip');
    if (tooltip) {
      tooltip.classList.add('visible');
      this.setupTooltipClickOutside();
    }
  }

  public hideControlsTooltip(): void {
    const tooltip = document.getElementById('controls-tooltip');
    if (tooltip) {
      tooltip.classList.remove('visible');
    }
  }

  public toggleControlsTooltip(): void {
    const tooltip = document.getElementById('controls-tooltip');
    if (tooltip) {
      if (tooltip.classList.contains('visible')) {
        this.hideControlsTooltip();
      } else {
        this.showControlsTooltip();
      }
    }
  }

  private setupTooltipClickOutside(): void {
    const tooltip = document.getElementById('controls-tooltip');
    if (!tooltip) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (tooltip && !tooltip.contains(e.target as Node) && tooltip.classList.contains('visible')) {
        this.hideControlsTooltip();
        document.removeEventListener('click', handleClickOutside);
      }
    };

    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);
  }

  public setupMusicPlayer(
    onTrackNameClick: (diamondIndex: number) => void,
    onPlayButtonClick: (diamondIndex: number) => void
  ): void {
    const handleTrackNameClick = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      const diamondIndex = parseInt((e.target as HTMLElement).dataset.diamond || '0');
      onTrackNameClick(diamondIndex);
    };

    const handlePlayButtonClick = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      const diamondIndex = parseInt((e.target as HTMLElement).dataset.diamond || '0');
      onPlayButtonClick(diamondIndex);
    };

    document.querySelectorAll('.track-name').forEach(trackName => {
      if (this.isMobile) {
        trackName.addEventListener('touchend', handleTrackNameClick, { passive: false });
      } else {
        trackName.addEventListener('click', handleTrackNameClick);
      }
    });

    document.querySelectorAll('.play-button').forEach(playButton => {
      if (this.isMobile) {
        playButton.addEventListener('touchend', handlePlayButtonClick, { passive: false });
      } else {
        playButton.addEventListener('click', handlePlayButtonClick);
      }
    });
  }

  public updateTrackNameUI(diamondIndex: number, isPlaying: boolean): void {
    const trackName = document.querySelector(`.track-name[data-diamond="${diamondIndex}"]`);
    if (trackName) {
      if (diamondIndex === this.focusedDiamond) {
        trackName.classList.add('active');
      } else if (!isPlaying) {
        trackName.classList.remove('active');
      }
    }
  }

  public setTrackNameHighlight(diamondIndex: number): void {
    this.focusedDiamond = diamondIndex;

    document.querySelectorAll('.track-name').forEach(el => {
      const elIndex = parseInt((el as HTMLElement).dataset.diamond || '0');
      if (elIndex === diamondIndex) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }

  public updatePlayButtonUI(diamondIndex: number, isPlaying: boolean): void {
    const playButton = document.querySelector(`.play-button[data-diamond="${diamondIndex}"]`) as HTMLElement;
    if (playButton) {
      playButton.textContent = isPlaying ? '⏸' : '▶';
      if (isPlaying) {
        playButton.classList.add('playing');
      } else {
        playButton.classList.remove('playing');
      }
    }
  }

  public clearUISelections(): void {
    document.querySelectorAll('.track-name').forEach(el => el.classList.remove('active'));
    this.focusedDiamond = -1;
  }

  public getFocusedDiamond(): number {
    return this.focusedDiamond;
  }

  public setFocusedDiamond(index: number): void {
    this.focusedDiamond = index;
  }

  public fadeInCanvas(): void {
    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) {
      canvasContainer.style.opacity = '1';
    }
  }

  public fadeInMusicPlayer(delay: number = 2000): void {
    setTimeout(() => {
      const musicPlayer = document.getElementById('music-player');
      if (musicPlayer) {
        musicPlayer.style.opacity = '1';
      }
    }, delay);
  }

  public isMusicPlayerClicked(event: MouseEvent): boolean {
    const musicPlayer = document.getElementById('music-player');
    if (musicPlayer) {
      const rect = musicPlayer.getBoundingClientRect();
      return (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      );
    }
    return false;
  }
}
