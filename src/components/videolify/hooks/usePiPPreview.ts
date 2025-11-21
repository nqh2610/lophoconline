/**
 * usePiPPreview - Always-on-top preview window for screen share
 * Uses Document Picture-in-Picture API (Chrome 116+) with fallback
 */

import { useRef, useCallback, useEffect } from 'react';

interface DocumentPictureInPictureAPI {
  requestWindow(options: { width: number; height: number }): Promise<Window>;
  window: Window | null;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPictureAPI;
  }
}

export function usePiPPreview() {
  const pipWindowRef = useRef<Window | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const supportsPiP = typeof window !== 'undefined' && 'documentPictureInPicture' in window;

  // ✅ Create PiP preview window
  const createPiPWindow = useCallback(async (stream: MediaStream) => {
    if (!supportsPiP || !window.documentPictureInPicture) {
      console.log('[usePiPPreview] Document PiP not supported, skipping');
      return;
    }

    try {
      // Close existing window if any
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        pipWindowRef.current.close();
      }

      // Request PiP window (320x180 - compact but still clear)
      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 320,
        height: 180,
      });

      pipWindowRef.current = pipWindow;
      console.log('[usePiPPreview] ✅ PiP window created');

      // Setup canvas in PiP window
      const canvas = pipWindow.document.createElement('canvas');
      canvas.width = 800; // Internal resolution (2x for quality)
      canvas.height = 600;
      canvasRef.current = canvas;

      // Inject styles for clean look
      const style = pipWindow.document.createElement('style');
      style.textContent = `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        canvas {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .label {
          position: absolute;
          top: 8px;
          left: 8px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 12px;
          pointer-events: none;
        }
      `;
      pipWindow.document.head.appendChild(style);

      // Add canvas to body
      pipWindow.document.body.appendChild(canvas);

      // Add label
      const label = pipWindow.document.createElement('div');
      label.className = 'label';
      label.textContent = '📺 Preview của bạn';
      pipWindow.document.body.appendChild(label);

      // Setup hidden video for canvas drawing
      const video = pipWindow.document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true; // ✅ Force autoplay
      video.style.display = 'none';
      pipWindow.document.body.appendChild(video);
      videoRef.current = video;

      // Start canvas rendering loop (requestAnimationFrame for smooth 60fps)
      const ctx = canvas.getContext('2d', {
        alpha: false, // No transparency for better performance
        desynchronized: true // Allow GPU optimization
      });

      if (!ctx) {
        console.error('[usePiPPreview] Failed to get canvas context');
        return;
      }

      let frameCount = 0;
      const renderFrame = () => {
        if (video.readyState >= video.HAVE_CURRENT_DATA) {
          // Draw video frame to canvas
          try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            frameCount++;
            if (frameCount === 1) {
              console.log('[usePiPPreview] ✅ First frame rendered successfully');
            }
          } catch (err) {
            console.error('[usePiPPreview] Error drawing frame:', err);
          }
        } else if (frameCount === 0) {
          // Video not ready yet, fill with dark gray to show it's working
          ctx.fillStyle = '#1a1a1a';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#666';
          ctx.font = '20px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Loading preview...', canvas.width / 2, canvas.height / 2);
        }

        // Continue animation loop
        if (pipWindowRef.current && !pipWindowRef.current.closed) {
          animationFrameRef.current = requestAnimationFrame(renderFrame);
        }
      };

      // Start rendering immediately
      console.log('[usePiPPreview] Starting render loop...');

      // Try to play video
      video.play().then(() => {
        console.log('[usePiPPreview] Video play() succeeded');
        renderFrame();
      }).catch((err) => {
        console.warn('[usePiPPreview] Video play() failed:', err);
        // Start rendering anyway, might work
        renderFrame();
      });

      // Handle window close
      pipWindow.addEventListener('pagehide', () => {
        console.log('[usePiPPreview] PiP window closed by user');
        closePiPWindow();
      });

    } catch (err) {
      console.log('[usePiPPreview] Failed to create PiP window:', err);
      // Silently fail - user might have denied permission or browser doesn't support it
    }
  }, [supportsPiP]);

  // ✅ Close PiP window
  const closePiPWindow = useCallback(() => {
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop video
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }

    // Close window
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close();
      pipWindowRef.current = null;
    }

    canvasRef.current = null;
    console.log('[usePiPPreview] PiP window closed');
  }, []);

  // ✅ Cleanup on unmount
  useEffect(() => {
    return () => {
      closePiPWindow();
    };
  }, [closePiPWindow]);

  return {
    supportsPiP,
    createPiPWindow,
    closePiPWindow,
    isOpen: pipWindowRef.current !== null && !pipWindowRef.current?.closed,
  };
}
