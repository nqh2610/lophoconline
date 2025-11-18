/**
 * useRecording - Client-side MediaRecorder
 */

import { useState, useRef, useCallback } from 'react';

export function useRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback((stream: MediaStream) => {
    if (!stream) return;

    try {
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus',
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
        a.download = `videolify-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        console.log('[useRecording] Saved:', (blob.size / 1024 / 1024).toFixed(2), 'MB');
      };

      recorder.start();
      setIsRecording(true);
      console.log('[useRecording] Started');
    } catch (err) {
      console.error('[useRecording] Start failed:', err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log('[useRecording] Stopped');
    }
  }, []);

  const toggleRecording = useCallback(
    (stream: MediaStream) => {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording(stream);
      }
    },
    [isRecording, startRecording, stopRecording]
  );

  return {
    isRecording,
    startRecording,
    stopRecording,
    toggleRecording,
  };
}
