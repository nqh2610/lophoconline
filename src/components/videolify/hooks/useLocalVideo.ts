/**
 * useLocalVideo - Hook to manage local video element and srcObject
 * 
 * Handles:
 * - Setting srcObject on video element
 * - Tracking video frame availability
 * - PiP visibility state
 */

import { useState, useRef, useCallback, useEffect, RefObject } from 'react';

interface UseLocalVideoOptions {
  /** Initial PiP visibility */
  initialVisible?: boolean;
  /** Initial PiP size */
  initialSize?: 'small' | 'medium' | 'large';
}

interface UseLocalVideoReturn {
  /** Ref to attach to video element */
  videoRef: RefObject<HTMLVideoElement>;
  
  /** Whether video has frames rendering */
  hasFrames: boolean;
  
  /** PiP visibility state */
  isVisible: boolean;
  setVisible: (visible: boolean) => void;
  
  /** PiP size state */
  size: 'small' | 'medium' | 'large';
  toggleSize: () => void;
  
  /** Set srcObject on video element */
  setSrcObject: (stream: MediaStream | null) => void;
  
  /** Get current srcObject */
  getSrcObject: () => MediaStream | null;
}

export function useLocalVideo(options: UseLocalVideoOptions = {}): UseLocalVideoReturn {
  const { initialVisible = true, initialSize = 'medium' } = options;
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasFrames, setHasFrames] = useState(false);
  const [isVisible, setVisible] = useState(initialVisible);
  const [size, setSize] = useState<'small' | 'medium' | 'large'>(initialSize);

  // Monitor video frames
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    let frameCheckInterval: number | null = null;

    const checkVideoFrames = () => {
      if (!videoElement.srcObject) {
        setHasFrames(false);
        return;
      }

      const stream = videoElement.srcObject as MediaStream;
      const videoTracks = stream.getVideoTracks();

      if (videoTracks.length === 0) {
        setHasFrames(false);
        return;
      }

      const videoTrack = videoTracks[0];
      const isLive = videoTrack.readyState === 'live';
      const isEnabled = videoTrack.enabled;
      const hasVideoData = videoElement.videoWidth > 0 && videoElement.videoHeight > 0;

      setHasFrames(isLive && isEnabled && hasVideoData);
    };

    frameCheckInterval = window.setInterval(checkVideoFrames, 500);
    videoElement.addEventListener('loadedmetadata', checkVideoFrames);
    videoElement.addEventListener('playing', checkVideoFrames);
    checkVideoFrames();

    return () => {
      if (frameCheckInterval) clearInterval(frameCheckInterval);
      videoElement.removeEventListener('loadedmetadata', checkVideoFrames);
      videoElement.removeEventListener('playing', checkVideoFrames);
    };
  }, []);

  const setSrcObject = useCallback((stream: MediaStream | null) => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      console.log('[useLocalVideo] srcObject set:', stream ? 'MediaStream' : 'null');
    }
  }, []);

  const getSrcObject = useCallback(() => {
    return videoRef.current?.srcObject as MediaStream | null;
  }, []);

  const toggleSize = useCallback(() => {
    setSize(current => {
      const sizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];
      const currentIndex = sizes.indexOf(current);
      return sizes[(currentIndex + 1) % sizes.length];
    });
  }, []);

  return {
    videoRef,
    hasFrames,
    isVisible,
    setVisible,
    size,
    toggleSize,
    setSrcObject,
    getSrcObject,
  };
}
