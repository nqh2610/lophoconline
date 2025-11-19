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
      // ✅ Request higher resolution like Google Meet for better text clarity
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 2560, max: 3840 },  // Support up to 4K
          height: { ideal: 1440, max: 2160 },
          frameRate: { ideal: 30, max: 60 },  // Smooth scrolling
        },
      });

      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];
      
      // ✅ Add screen track as ADDITIONAL track (don't replace camera)
      const sender = peerConnection.addTrack(screenTrack, screenStream);
      screenSenderRef.current = sender;

      if (sender) {

        // Adaptive encoding - higher quality for text readability
        const settings = screenTrack.getSettings();
        const { width, height } = settings;
        const params = sender.getParameters();

        if (!params.encodings) params.encodings = [{}];

        // Allow higher bitrate for text clarity
        const needsDownscale = (width && width > 2560) || (height && height > 1440);
        if (needsDownscale) {
          const downscaleFactor = Math.max((width || 2560) / 2560, (height || 1440) / 1440);
          params.encodings[0].scaleResolutionDownBy = downscaleFactor;
          params.encodings[0].maxBitrate = 8000000;  // 8 Mbps for high quality
        } else {
          params.encodings[0].scaleResolutionDownBy = 1.0;
          params.encodings[0].maxBitrate = 10000000; // 10 Mbps for crisp text
        }

        await sender.setParameters(params);
        console.log('[useScreenShare] Started with high quality for text clarity');

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
