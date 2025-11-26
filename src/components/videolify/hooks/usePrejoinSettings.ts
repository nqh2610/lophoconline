/**
 * usePrejoinSettings - Hook to manage prejoin settings in video calls
 * 
 * Handles:
 * - Loading settings from localStorage
 * - Applying camera/mic states to MediaStream tracks
 * - Coordinating with useMediaDevices hook
 */

import { useCallback, useRef } from 'react';
import { loadPrejoinSettings, PrejoinSettings } from '@/lib/prejoinSettings';

interface UsePrejoinSettingsReturn {
  /** Load prejoin settings from localStorage */
  loadSettings: () => PrejoinSettings;
  
  /** Apply camera/mic states to a MediaStream */
  applyToStream: (stream: MediaStream, settings?: PrejoinSettings) => void;
  
  /** Get the last loaded settings */
  getSettings: () => PrejoinSettings | null;
  
  /** Check if settings have been applied */
  hasApplied: () => boolean;
  
  /** Mark settings as applied */
  markApplied: () => void;
}

export function usePrejoinSettings(): UsePrejoinSettingsReturn {
  const settingsRef = useRef<PrejoinSettings | null>(null);
  const appliedRef = useRef(false);

  const loadSettings = useCallback((): PrejoinSettings => {
    const settings = loadPrejoinSettings();
    settingsRef.current = settings;
    console.log('[usePrejoinSettings] Loaded:', {
      camera: settings.isCameraEnabled,
      mic: settings.isMicEnabled,
      vbg: settings.vbgEnabled,
      vbgMode: settings.vbgMode,
    });
    return settings;
  }, []);

  const applyToStream = useCallback((stream: MediaStream, settings?: PrejoinSettings) => {
    const s = settings || settingsRef.current;
    if (!s) {
      console.warn('[usePrejoinSettings] No settings to apply');
      return;
    }

    // Apply video track states
    stream.getVideoTracks().forEach(track => {
      track.enabled = s.isCameraEnabled;
      console.log(`[usePrejoinSettings] Video track ${track.id.slice(0, 8)}... enabled: ${track.enabled}`);
    });

    // Apply audio track states
    stream.getAudioTracks().forEach(track => {
      track.enabled = s.isMicEnabled;
      console.log(`[usePrejoinSettings] Audio track ${track.id.slice(0, 8)}... enabled: ${track.enabled}`);
    });

    appliedRef.current = true;
    console.log('[usePrejoinSettings] ✅ Applied to stream');
  }, []);

  const getSettings = useCallback(() => settingsRef.current, []);
  const hasApplied = useCallback(() => appliedRef.current, []);
  const markApplied = useCallback(() => { appliedRef.current = true; }, []);

  return {
    loadSettings,
    applyToStream,
    getSettings,
    hasApplied,
    markApplied,
  };
}
