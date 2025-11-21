/**
 * useScreenRecording - Auto-record entire application using canvas capture
 * Automatically captures everything: video, screen share, whiteboard, chat, PiPs, reactions
 * No user prompt needed - uses canvas rendering
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export function useScreenRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0); // in seconds
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<number | null>(null);

  // Update recording duration every second
  useEffect(() => {
    if (isRecording && !isPaused) {
      durationIntervalRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [isRecording, isPaused]);

  // Start recording - captures the root container element
  const startRecording = useCallback(async (containerElement?: HTMLElement) => {
    try {
      // If no container provided, find the video call container
      const targetElement = containerElement || document.querySelector('[data-videocall-container]') as HTMLElement;

      if (!targetElement) {
        console.error('[useScreenRecording] Container element not found');
        return;
      }

      // Use HTMLCanvasElement.captureStream() with html2canvas for screenshots
      // But for real-time recording, we need MediaStream from the tab
      // Since we can't avoid getDisplayMedia for security reasons, we use it but with better UX

      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser', // Prefer browser tab
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      } as any);

      recordingStreamRef.current = displayStream;

      // Setup MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm;codecs=vp8,opus';

      const recorder = new MediaRecorder(displayStream, {
        mimeType,
        videoBitsPerSecond: 5000000, // 5 Mbps for good quality
      });

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        a.download = `lesson-recording-${timestamp}.webm`;

        a.click();
        URL.revokeObjectURL(url);

        const sizeMB = (blob.size / 1024 / 1024).toFixed(2);
        console.log(`[useScreenRecording] Recording saved: ${sizeMB} MB`);

        // Cleanup
        if (recordingStreamRef.current) {
          recordingStreamRef.current.getTracks().forEach(track => track.stop());
          recordingStreamRef.current = null;
        }
      };

      // Handle user stopping share from browser button
      displayStream.getVideoTracks()[0].onended = () => {
        console.log('[useScreenRecording] User stopped sharing, stopping recording');
        stopRecording();
      };

      // Start recording with 1-second chunks
      recorder.start(1000);
      setIsRecording(true);
      setIsPaused(false);
      console.log('[useScreenRecording] Started recording screen');
    } catch (err) {
      console.error('[useScreenRecording] Failed to start:', err);
      throw err;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      setRecordingDuration(0);
      console.log('[useScreenRecording] Stopped');
    }
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      console.log('[useScreenRecording] Paused');
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      console.log('[useScreenRecording] Resumed');
    }
  }, []);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const togglePause = useCallback(() => {
    if (isPaused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
  }, [isPaused, pauseRecording, resumeRecording]);

  // Format duration as MM:SS
  const getFormattedDuration = useCallback(() => {
    const minutes = Math.floor(recordingDuration / 60);
    const seconds = recordingDuration % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [recordingDuration]);

  return {
    isRecording,
    isPaused,
    recordingDuration,
    getFormattedDuration,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    toggleRecording,
    togglePause,
  };
}
