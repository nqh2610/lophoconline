/**
 * useVideoCallInit - Hook to manage video call initialization
 * 
 * Handles:
 * - StrictMode double-mount detection
 * - Initialization state tracking
 * - Cleanup coordination
 */

import { useRef, useCallback, useEffect } from 'react';

interface InitializationState {
  /** Timestamp of first initialization */
  timestamp: number | null;
  /** Whether initialization has completed */
  completed: boolean;
  /** Mount count for StrictMode detection */
  mountCount: number;
}

interface UseVideoCallInitOptions {
  /** Room key for identification */
  roomKey: string;
  /** Called when initialization should proceed */
  onInit: () => Promise<void>;
  /** Called on cleanup (real unmount only) */
  onCleanup?: () => void;
  /** Time window to detect StrictMode remount (ms) */
  strictModeWindow?: number;
}

interface UseVideoCallInitReturn {
  /** Whether initialization is in progress */
  isInitializing: boolean;
  /** Whether initialization has completed */
  isInitialized: boolean;
  /** Mark initialization as complete */
  markComplete: () => void;
  /** Check if this is a StrictMode remount */
  isStrictModeRemount: () => boolean;
}

export function useVideoCallInit(options: UseVideoCallInitOptions): UseVideoCallInitReturn {
  const { roomKey, onInit, onCleanup, strictModeWindow = 100 } = options;
  
  const stateRef = useRef<InitializationState>({
    timestamp: null,
    completed: false,
    mountCount: 0,
  });
  
  const initPromiseRef = useRef<Promise<void> | null>(null);

  const isStrictModeRemount = useCallback(() => {
    const state = stateRef.current;
    if (!state.timestamp) return false;
    
    const timeSinceInit = Date.now() - state.timestamp;
    return timeSinceInit < strictModeWindow && !state.completed;
  }, [strictModeWindow]);

  const markComplete = useCallback(() => {
    stateRef.current.completed = true;
    console.log('[useVideoCallInit] ✅ Initialization completed');
  }, []);

  // Handle mount/unmount
  useEffect(() => {
    const state = stateRef.current;
    state.mountCount++;
    
    console.log(`[useVideoCallInit] Mount #${state.mountCount} - roomKey: ${roomKey}`);

    // Check if we should skip (StrictMode remount after completion)
    if (state.completed && isStrictModeRemount()) {
      console.log('[useVideoCallInit] ⚠️ Skipping StrictMode remount (already completed)');
      return;
    }

    // Check if initialization is already in progress
    if (state.timestamp && !state.completed) {
      const timeSince = Date.now() - state.timestamp;
      console.log(`[useVideoCallInit] ⚠️ Init in progress (started ${timeSince}ms ago)`);
      return;
    }

    // Start initialization
    state.timestamp = Date.now();
    console.log('[useVideoCallInit] 🚀 Starting initialization...');
    
    initPromiseRef.current = onInit()
      .then(() => {
        console.log('[useVideoCallInit] ✅ onInit completed');
      })
      .catch(err => {
        console.error('[useVideoCallInit] ❌ onInit failed:', err);
      });

    // Cleanup handler
    return () => {
      console.log('[useVideoCallInit] Cleanup triggered');
      
      // Only run real cleanup if not StrictMode
      if (state.completed && onCleanup) {
        const timeSinceComplete = Date.now() - (state.timestamp || 0);
        if (timeSinceComplete > strictModeWindow) {
          console.log('[useVideoCallInit] Running real cleanup');
          onCleanup();
        } else {
          console.log('[useVideoCallInit] ⚠️ Skipping StrictMode cleanup');
        }
      }
    };
  }, [roomKey, onInit, onCleanup, isStrictModeRemount, strictModeWindow]);

  return {
    isInitializing: stateRef.current.timestamp !== null && !stateRef.current.completed,
    isInitialized: stateRef.current.completed,
    markComplete,
    isStrictModeRemount,
  };
}
