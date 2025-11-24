/**
 * LocalStorage utilities for prejoin settings
 * Stores camera/mic/VBG preferences before joining video call
 */

export interface PrejoinSettings {
  // Camera & Mic
  isCameraEnabled: boolean;
  isMicEnabled: boolean;

  // Virtual Background
  vbgEnabled: boolean;
  vbgMode: 'none' | 'blur' | 'image';
  vbgBlurAmount: number;
  vbgActivePreset: string | null;
  vbgBackgroundImage: string | null; // URL or blob URL

  // Metadata
  lastUpdated: number;
}

const STORAGE_KEY = 'videolify_prejoin_settings';

// Default settings
const DEFAULT_SETTINGS: PrejoinSettings = {
  isCameraEnabled: true,
  isMicEnabled: true,
  vbgEnabled: false,
  vbgMode: 'none',
  vbgBlurAmount: 10,
  vbgActivePreset: null,
  vbgBackgroundImage: null,
  lastUpdated: Date.now(),
};

/**
 * Save prejoin settings to localStorage
 */
export function savePrejoinSettings(settings: Partial<PrejoinSettings>): void {
  try {
    const currentSettings = loadPrejoinSettings();
    const updatedSettings: PrejoinSettings = {
      ...currentSettings,
      ...settings,
      lastUpdated: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings));
    console.log('💾 [Prejoin] Settings saved:', updatedSettings);
  } catch (error) {
    console.error('❌ [Prejoin] Failed to save settings:', error);
  }
}

/**
 * Load prejoin settings from localStorage
 */
export function loadPrejoinSettings(): PrejoinSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      console.log('📂 [Prejoin] No saved settings, using defaults');
      return DEFAULT_SETTINGS;
    }

    const settings = JSON.parse(stored) as PrejoinSettings;
    console.log('📂 [Prejoin] Settings loaded:', settings);
    return settings;
  } catch (error) {
    console.error('❌ [Prejoin] Failed to load settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Clear prejoin settings
 */
export function clearPrejoinSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑️ [Prejoin] Settings cleared');
  } catch (error) {
    console.error('❌ [Prejoin] Failed to clear settings:', error);
  }
}
