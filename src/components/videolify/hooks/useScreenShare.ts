/**
 * useScreenShare - Screen sharing with adaptive quality
 */

import { useState, useRef, useCallback } from 'react';

export function useScreenShare(
  peerConnection: RTCPeerConnection | null,
  onStopped?: () => void
) {
  const [isSharing, setIsSharing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenSenderRef = useRef<RTCRtpSender | null>(null);
  const qualityMonitorRef = useRef<number | null>(null);

  // ✅ Define stopSharing FIRST to avoid circular dependency
  const stopSharing = useCallback(async () => {
    if (!peerConnection) return;

    if (qualityMonitorRef.current) {
      clearInterval(qualityMonitorRef.current);
      qualityMonitorRef.current = null;
    }

    // ✅ Remove screen share track from PeerConnection
    if (screenSenderRef.current) {
      peerConnection.removeTrack(screenSenderRef.current);
      screenSenderRef.current = null;
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    setIsSharing(false);
    
    // ✅ Notify parent that screen share stopped
    onStopped?.();
    
    console.log('[useScreenShare] Stopped');
  }, [peerConnection, onStopped]);

  const startSharing = useCallback(async () => {
    if (!peerConnection) return;

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 15, max: 30 },
        },
      });

      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];
      
      // ✅ Add screen track as ADDITIONAL track (don't replace camera)
      const sender = peerConnection.addTrack(screenTrack, screenStream);
      screenSenderRef.current = sender;

      if (sender) {

        // Adaptive encoding
        const settings = screenTrack.getSettings();
        const { width, height } = settings;
        const params = sender.getParameters();

        if (!params.encodings) params.encodings = [{}];

        const needsDownscale = (width && width > 1920) || (height && height > 1080);
        if (needsDownscale) {
          const downscaleFactor = Math.max((width || 1920) / 1920, (height || 1080) / 1080);
          params.encodings[0].scaleResolutionDownBy = downscaleFactor;
          params.encodings[0].maxBitrate = 3000000;
        } else {
          params.encodings[0].scaleResolutionDownBy = 1.0;
          params.encodings[0].maxBitrate = 5000000;
        }

        await sender.setParameters(params);
        console.log('[useScreenShare] Started with adaptive quality');

        // Quality monitoring
        qualityMonitorRef.current = window.setInterval(async () => {
          const stats = await peerConnection.getStats();
          stats.forEach((report: any) => {
            if (report.type === 'outbound-rtp' && report.kind === 'video') {
              const packetLoss = report.packetsLost || 0;
              const totalPackets = report.packetsSent || 1;
              const lossRate = (packetLoss / totalPackets) * 100;

              if (lossRate > 5 && params.encodings[0].maxBitrate! > 1000000) {
                params.encodings[0].maxBitrate = params.encodings[0].maxBitrate! * 0.8;
                sender.setParameters(params);
                console.log('[useScreenShare] Reduced bitrate due to packet loss');
              }
            }
          });
        }, 3000);

        screenTrack.onended = () => {
          console.log('[useScreenShare] Track ended by user (browser stop button)');
          stopSharing();
        };

        setIsSharing(true);
      }
    } catch (err) {
      console.error('[useScreenShare] Failed:', err);
    }
  }, [peerConnection, stopSharing]);

  const toggleSharing = useCallback(() => {
    if (isSharing) {
      stopSharing();
    } else {
      startSharing();
    }
  }, [isSharing, startSharing, stopSharing]);

  return {
    isSharing,
    screenStream: screenStreamRef.current,
    startSharing,
    stopSharing,
    toggleSharing,
  };
}
