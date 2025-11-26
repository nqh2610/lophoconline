/**
 * useMediaDevices - Camera/Mic permission & track management
 * Handles permission denial gracefully with dummy tracks
 */

import { useState, useRef, useCallback } from 'react';

interface UseMediaDevicesOptions {
  initialVideoEnabled?: boolean;
  initialAudioEnabled?: boolean;
}

export function useMediaDevices(options?: UseMediaDevicesOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(options?.initialVideoEnabled ?? true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(options?.initialAudioEnabled ?? true);
  const [hasPermissions, setHasPermissions] = useState<{
    video: boolean;
    audio: boolean;
  }>({ video: false, audio: false });

  const streamRef = useRef<MediaStream | null>(null);
  const usingDummyRef = useRef({ video: false, audio: false });

  // Create silent audio track
  const createDummyAudio = useCallback((): MediaStreamTrack => {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const dst = ctx.createMediaStreamDestination();
    oscillator.connect(dst);
    oscillator.start();
    const track = dst.stream.getAudioTracks()[0];
    track.enabled = false;
    return track;
  }, []);

  // Create blank video track
  const createDummyVideo = useCallback((): MediaStreamTrack => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 640, 480);
    const stream = canvas.captureStream(1);
    const track = stream.getVideoTracks()[0];
    track.enabled = false;
    return track;
  }, []);

  // Request permissions
  const requestPermissions = useCallback(async () => {
    const tracks: MediaStreamTrack[] = [];
    const permissions = { video: false, audio: false };

    // Try video
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
      });
      tracks.push(...videoStream.getVideoTracks());
      permissions.video = true;
      usingDummyRef.current.video = false;
    } catch (e) {
      console.warn('[useMediaDevices] Video denied, using dummy');
      tracks.push(createDummyVideo());
      usingDummyRef.current.video = true;
    }

    // Try audio
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      tracks.push(...audioStream.getAudioTracks());
      permissions.audio = true;
      usingDummyRef.current.audio = false;
    } catch (e) {
      console.warn('[useMediaDevices] Audio denied, using dummy');
      tracks.push(createDummyAudio());
      usingDummyRef.current.audio = true;
    }

    const stream = new MediaStream(tracks);
    streamRef.current = stream;
    setLocalStream(stream);
    setHasPermissions(permissions);
    console.log('[useMediaDevices] Stream ready:', permissions);

    return stream;
  }, [createDummyAudio, createDummyVideo]);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    if (!streamRef.current) return;

    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    // If using dummy, try to get real camera
    if (usingDummyRef.current.video && !videoTrack.enabled) {
      try {
        const realStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
        });
        const realTrack = realStream.getVideoTracks()[0];

        // Replace dummy with real
        streamRef.current.removeTrack(videoTrack);
        streamRef.current.addTrack(realTrack);
        setLocalStream(new MediaStream(streamRef.current.getTracks()));

        usingDummyRef.current.video = false;
        setHasPermissions((p) => ({ ...p, video: true }));
        setIsVideoEnabled(true);
        console.log('[useMediaDevices] Upgraded to real camera');
        return;
      } catch (e) {
        console.warn('[useMediaDevices] Still denied');
        return;
      }
    }

    // Toggle enabled
    videoTrack.enabled = !videoTrack.enabled;
    setIsVideoEnabled(videoTrack.enabled);
    console.log('[useMediaDevices] Video:', videoTrack.enabled);
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(async () => {
    if (!streamRef.current) return;

    const audioTrack = streamRef.current.getAudioTracks()[0];
    if (!audioTrack) return;

    // If using dummy, try to get real mic
    if (usingDummyRef.current.audio && !audioTrack.enabled) {
      try {
        const realStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        const realTrack = realStream.getAudioTracks()[0];

        streamRef.current.removeTrack(audioTrack);
        streamRef.current.addTrack(realTrack);
        setLocalStream(new MediaStream(streamRef.current.getTracks()));

        usingDummyRef.current.audio = false;
        setHasPermissions((p) => ({ ...p, audio: true }));
        setIsAudioEnabled(true);
        console.log('[useMediaDevices] Upgraded to real mic');
        return;
      } catch (e) {
        console.warn('[useMediaDevices] Still denied');
        return;
      }
    }

    audioTrack.enabled = !audioTrack.enabled;
    setIsAudioEnabled(audioTrack.enabled);
    console.log('[useMediaDevices] Audio:', audioTrack.enabled);
  }, []);

  // Stop all tracks
  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLocalStream(null);
  }, []);

  // Apply track states (for prejoin settings)
  const applyTrackStates = useCallback((videoEnabled: boolean, audioEnabled: boolean) => {
    if (!streamRef.current) return;

    streamRef.current.getVideoTracks().forEach(track => {
      track.enabled = videoEnabled;
    });
    streamRef.current.getAudioTracks().forEach(track => {
      track.enabled = audioEnabled;
    });

    setIsVideoEnabled(videoEnabled);
    setIsAudioEnabled(audioEnabled);
    
    console.log('[useMediaDevices] Applied track states:', { video: videoEnabled, audio: audioEnabled });
  }, []);

  return {
    localStream,
    isVideoEnabled,
    isAudioEnabled,
    hasPermissions,
    usingDummy: usingDummyRef.current,
    requestPermissions,
    toggleVideo,
    toggleAudio,
    stopStream,
    applyTrackStates,
  };
}
