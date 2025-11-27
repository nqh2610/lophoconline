/**
 * useVirtualBackground - Virtual background processing with MediaPipe
 * Optimized: Async recursion, dual-processor design
 */

import { useState, useRef, useCallback } from 'react';
import { VirtualBackgroundProcessor, type BackgroundMode } from '@/lib/virtualBackground';

export function useVirtualBackground() {
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<BackgroundMode>('none');
  const [loading, setLoading] = useState(false);
  const [blurAmount, setBlurAmount] = useState(10);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  const localProcessorRef = useRef<VirtualBackgroundProcessor | null>(null);
  const remoteProcessorRef = useRef<VirtualBackgroundProcessor | null>(null);
  const originalStreamRef = useRef<MediaStream | null>(null);
  const remoteOriginalStreamRef = useRef<MediaStream | null>(null);
  const remoteProcessedStreamRef = useRef<MediaStream | null>(null);
  const remoteApplyingRef = useRef<boolean>(false);

  const enableVirtualBackground = useCallback(
    async (
      stream: MediaStream,
      videoElement: HTMLVideoElement,
      newMode: BackgroundMode,
      options?: { blurAmount?: number; backgroundImage?: HTMLImageElement }
    ) => {
      setLoading(true);

      try {
        if (!localProcessorRef.current) {
          localProcessorRef.current = new VirtualBackgroundProcessor();
          await localProcessorRef.current.initialize();
        }

        if (!originalStreamRef.current) {
          originalStreamRef.current = stream;
        }

        if (enabled) {
          localProcessorRef.current.stopProcessing();
        }

        const processedStream = await localProcessorRef.current.startProcessing(originalStreamRef.current, {
          mode: newMode,
          blurAmount: options?.blurAmount || blurAmount,
          backgroundImage: options?.backgroundImage,
          modelSelection: 1,
          smoothing: 0.7,
        });

        videoElement.srcObject = processedStream;
        setMode(newMode);
        setEnabled(true);

        if (options?.blurAmount) setBlurAmount(options.blurAmount);
        if (options?.backgroundImage) {
          setBackgroundImage(options.backgroundImage.src);
        }

        // Save to localStorage
        localStorage.setItem('vbg-enabled', 'true');
        localStorage.setItem('vbg-last-mode', newMode);
        if (options?.blurAmount) localStorage.setItem('vbg-blur-amount', String(options.blurAmount));
        if (options?.backgroundImage) localStorage.setItem('vbg-background-image', options.backgroundImage.src);
      } catch (err) {
        console.error('[useVirtualBackground] Enable failed:', err);
      } finally {
        setLoading(false);
      }
    },
    [enabled, blurAmount]
  );

  const disableVirtualBackground = useCallback((videoElement: HTMLVideoElement) => {
    if (localProcessorRef.current) {
      localProcessorRef.current.stopProcessing();
      localProcessorRef.current = null;
    }

    if (originalStreamRef.current) {
      videoElement.srcObject = originalStreamRef.current;
    }

    setEnabled(false);
    setMode('none');
    localStorage.setItem('vbg-enabled', 'false');
  }, []);

  const applyRemoteVirtualBackground = useCallback(
    async (
      remoteStream: MediaStream,
      remoteVideoElement: HTMLVideoElement,
      settings: { mode: BackgroundMode; blurAmount?: number; backgroundImage?: string }
    ) => {
      try {
        // Prevent concurrent applies - but log and allow retry after a short delay
        if (remoteApplyingRef.current) {
          console.log('[useVirtualBackground] applyRemoteVirtualBackground: concurrent call, will retry');
          // Don't block forever - allow this call to proceed after a short delay
          await new Promise(resolve => setTimeout(resolve, 100));
          if (remoteApplyingRef.current) {
            console.log('[useVirtualBackground] applyRemoteVirtualBackground: still busy, ignoring');
            return;
          }
        }
        remoteApplyingRef.current = true;

        // If original stream not set, store it
        if (!remoteOriginalStreamRef.current) {
          remoteOriginalStreamRef.current = remoteStream;
        }

        // If processor exists and it's already processing the same stream,
        // update settings instead of restarting to avoid flicker/race.
        if (remoteProcessorRef.current && remoteOriginalStreamRef.current === remoteStream) {
          if (settings.mode === 'none') {
            remoteProcessorRef.current.stopProcessing();
            remoteProcessedStreamRef.current = null;
            remoteVideoElement.srcObject = remoteOriginalStreamRef.current;
            remoteApplyingRef.current = false;
            return;
          }

          // If image mode and backgroundImage provided, preload image then update settings
          let bgImage: HTMLImageElement | undefined;
          if (settings.mode === 'image' && settings.backgroundImage) {
            bgImage = new Image();
            bgImage.crossOrigin = 'anonymous';
            try {
              await new Promise<void>((resolve, reject) => {
                bgImage!.onload = () => resolve();
                bgImage!.onerror = () => reject(new Error('Image load failed'));
                bgImage!.src = settings.backgroundImage!;
              });
            } catch (imgErr) {
              console.warn('[useVirtualBackground] Background image failed to load, falling back to blur:', imgErr);
              // Fallback to blur mode if image fails
              settings = { ...settings, mode: 'blur' };
              bgImage = undefined;
            }
          }

          // Update settings in-place (no restart)
          remoteProcessorRef.current.updateSettings({
            mode: settings.mode,
            blurAmount: settings.blurAmount || 10,
            backgroundImage: bgImage,
            modelSelection: 1,
            smoothing: 0.7,
          } as any);

          // Ensure remote video is showing processed stream
          if (remoteProcessedStreamRef.current) {
            remoteVideoElement.srcObject = remoteProcessedStreamRef.current;
          } else {
            // If no processed stream yet, show original
            console.warn('[useVirtualBackground] No processed stream available, showing original');
            remoteVideoElement.srcObject = remoteOriginalStreamRef.current;
          }

          remoteApplyingRef.current = false;
          return;
        }

        // If processor exists but stream changed, stop it first
        if (remoteProcessorRef.current && remoteOriginalStreamRef.current !== remoteStream) {
          try {
            remoteProcessorRef.current.stopProcessing();
          } catch (err) {
            console.warn('[useVirtualBackground] stopProcessing failed during stream change:', err);
          }
          remoteProcessedStreamRef.current = null;
          remoteProcessorRef.current = null;
        }

        // Create processor if missing
        if (!remoteProcessorRef.current) {
          remoteProcessorRef.current = new VirtualBackgroundProcessor();
          await remoteProcessorRef.current.initialize();
        }

        if (settings.mode === 'none') {
          // nothing to do, just show original
          remoteVideoElement.srcObject = remoteOriginalStreamRef.current;
          remoteApplyingRef.current = false;
          return;
        }

        // Preload image if needed
        let bgImage: HTMLImageElement | undefined;
        if (settings.mode === 'image' && settings.backgroundImage) {
          bgImage = new Image();
          bgImage.crossOrigin = 'anonymous';
          try {
            await new Promise<void>((resolve, reject) => {
              bgImage!.onload = () => resolve();
              bgImage!.onerror = () => reject(new Error('Image load failed'));
              bgImage!.src = settings.backgroundImage!;
            });
          } catch (imgErr) {
            console.warn('[useVirtualBackground] Background image failed to load, falling back to blur:', imgErr);
            // Fallback to blur mode if image fails
            settings = { ...settings, mode: 'blur' };
            bgImage = undefined;
          }
        }

        const processedStream = await remoteProcessorRef.current.startProcessing(remoteOriginalStreamRef.current, {
          mode: settings.mode,
          blurAmount: settings.blurAmount || 10,
          backgroundImage: bgImage,
          modelSelection: 1,
          smoothing: 0.7,
        });

        remoteProcessedStreamRef.current = processedStream;
        remoteVideoElement.srcObject = processedStream;
        remoteApplyingRef.current = false;
      } catch (err) {
        console.error('[useVirtualBackground] Remote apply failed:', err);
        // ✅ CRITICAL: Restore original stream on error to prevent blank video
        if (remoteOriginalStreamRef.current && remoteVideoElement) {
          console.log('[useVirtualBackground] Restoring original stream after error');
          remoteVideoElement.srcObject = remoteOriginalStreamRef.current;
        }
        remoteApplyingRef.current = false;
      }
    },
    []
  );

  const updateBlurAmount = useCallback(
    async (newBlurAmount: number, videoElement: HTMLVideoElement) => {
      if (!enabled || mode !== 'blur' || !localProcessorRef.current || !originalStreamRef.current) return;

      setBlurAmount(newBlurAmount);
      localProcessorRef.current.stopProcessing();

      const processedStream = await localProcessorRef.current.startProcessing(originalStreamRef.current, {
        mode: 'blur',
        blurAmount: newBlurAmount,
        modelSelection: 1,
        smoothing: 0.7,
      });

      videoElement.srcObject = processedStream;
      localStorage.setItem('vbg-blur-amount', String(newBlurAmount));
    },
    [enabled, mode]
  );

  const destroy = useCallback(() => {
    localProcessorRef.current?.destroy();
    remoteProcessorRef.current?.destroy();
    localProcessorRef.current = null;
    remoteProcessorRef.current = null;
  }, []);

  return {
    enabled,
    mode,
    loading,
    blurAmount,
    backgroundImage,
    enableVirtualBackground,
    disableVirtualBackground,
    applyRemoteVirtualBackground,
    updateBlurAmount,
    destroy,
  };
}
