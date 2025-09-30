export class UIManager {
  private outlineThicknessSlider!: HTMLInputElement;
  private outlineValueDisplay!: HTMLSpanElement;
  private toonShaderButton!: HTMLButtonElement;
  private stepShaderButton!: HTMLButtonElement;
  private rimLightButton!: HTMLButtonElement;
  private smaaToggleButton!: HTMLButtonElement;

  private onOutlineThicknessChange?: (value: number) => void;
  private onShaderModeChange?: (useToon: boolean) => void;
  private onRimLightToggle?: () => void;
  private onSMAAToggle?: () => void;

  constructor() {
    this.initializeElements();
    this.setupEventListeners();
  }

  private initializeElements(): void {
    this.outlineThicknessSlider = document.getElementById('outlineThickness') as HTMLInputElement;
    this.outlineValueDisplay = document.getElementById('outlineValue') as HTMLSpanElement;
    this.toonShaderButton = document.getElementById('toonShader') as HTMLButtonElement;
    this.stepShaderButton = document.getElementById('stepShader') as HTMLButtonElement;
    this.rimLightButton = document.getElementById('rimLight') as HTMLButtonElement;
    this.smaaToggleButton = document.getElementById('smaaToggle') as HTMLButtonElement;

    if (!this.outlineThicknessSlider || !this.outlineValueDisplay ||
        !this.toonShaderButton || !this.stepShaderButton ||
        !this.rimLightButton || !this.smaaToggleButton) {
      throw new Error('Required UI elements not found');
    }
  }

  private setupEventListeners(): void {
    // Outline thickness slider
    this.outlineThicknessSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.outlineValueDisplay.textContent = value.toFixed(1);
      if (this.onOutlineThicknessChange) {
        this.onOutlineThicknessChange(value);
      }
    });

    // Shader mode buttons
    this.toonShaderButton.addEventListener('click', () => {
      this.setActiveShaderButton(true);
      if (this.onShaderModeChange) {
        this.onShaderModeChange(true);
      }
    });

    this.stepShaderButton.addEventListener('click', () => {
      this.setActiveShaderButton(false);
      if (this.onShaderModeChange) {
        this.onShaderModeChange(false);
      }
    });

    // Rim light toggle
    this.rimLightButton.addEventListener('click', () => {
      if (this.onRimLightToggle) {
        this.onRimLightToggle();
      }
    });

    // SMAA toggle
    this.smaaToggleButton.addEventListener('click', () => {
      if (this.onSMAAToggle) {
        this.onSMAAToggle();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      switch (e.key.toLowerCase()) {
        case '1':
          this.toonShaderButton.click();
          break;
        case '2':
          this.stepShaderButton.click();
          break;
        case 'r':
          this.rimLightButton.click();
          break;
        case 'a':
          this.smaaToggleButton.click();
          break;
      }
    });
  }

  private setActiveShaderButton(useToon: boolean): void {
    if (useToon) {
      this.toonShaderButton.classList.add('active');
      this.stepShaderButton.classList.remove('active');
    } else {
      this.toonShaderButton.classList.remove('active');
      this.stepShaderButton.classList.add('active');
    }
  }

  setRimLightState(enabled: boolean): void {
    if (enabled) {
      this.rimLightButton.classList.add('active');
      this.rimLightButton.textContent = 'Rim Light: ON';
    } else {
      this.rimLightButton.classList.remove('active');
      this.rimLightButton.textContent = 'Rim Light: OFF';
    }
  }

  setSMAAState(enabled: boolean): void {
    if (enabled) {
      this.smaaToggleButton.classList.add('active');
      this.smaaToggleButton.textContent = 'SMAA: ON';
    } else {
      this.smaaToggleButton.classList.remove('active');
      this.smaaToggleButton.textContent = 'SMAA: OFF';
    }
  }

  // Event callback setters
  onOutlineThicknessChanged(callback: (value: number) => void): void {
    this.onOutlineThicknessChange = callback;
  }

  onShaderModeChanged(callback: (useToon: boolean) => void): void {
    this.onShaderModeChange = callback;
  }

  onRimLightToggled(callback: () => void): void {
    this.onRimLightToggle = callback;
  }

  onSMAAToggled(callback: () => void): void {
    this.onSMAAToggle = callback;
  }

  // Helper method to show/hide UI
  toggleVisibility(): void {
    const uiElement = document.getElementById('ui');
    if (uiElement) {
      uiElement.style.display = uiElement.style.display === 'none' ? 'block' : 'none';
    }
  }
}