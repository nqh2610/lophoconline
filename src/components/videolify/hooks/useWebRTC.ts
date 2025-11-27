/**
 * useWebRTC - Core WebRTC connection management
 * Handles peer connection, SDP negotiation, ICE, perfect negotiation
 */

import { useRef, useState, useCallback } from 'react';
import { ICE_SERVERS } from '../types/index';

interface UseWebRTCOptions {
  peerId: string;
  onTrack?: (event: RTCTrackEvent) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onIceCandidate?: (candidate: RTCIceCandidateInit) => void;
  onDataChannel?: (channel: RTCDataChannel) => void;
}

export function useWebRTC(options: UseWebRTCOptions) {
  const { peerId, onTrack, onConnectionStateChange, onIceCandidate, onDataChannel } = options;

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [iceState, setIceState] = useState<RTCIceConnectionState>('new');

  // Perfect Negotiation pattern
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  const isPoliteRef = useRef(false);
  
  // ✅ Queue ICE candidates that arrive before remote description is set
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    if (pcRef.current) {
      console.warn('[useWebRTC] PC already exists');
      return pcRef.current;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.ontrack = (event) => {
      console.log('[useWebRTC] Remote track received:', event.track.kind);
      onTrack?.(event);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        onIceCandidate?.(event.candidate.toJSON());
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log('[useWebRTC] Connection state:', state);
      setConnectionState(state);
      onConnectionStateChange?.(state);
    };

    pc.oniceconnectionstatechange = async () => {
      const state = pc.iceConnectionState;
      console.log('[useWebRTC] ICE state:', state);
      setIceState(state);

      // ✅ CRITICAL: Auto ICE restart on failed/disconnected
      if (state === 'disconnected' || state === 'failed') {
        console.warn('[useWebRTC] ICE', state, '- will attempt restart in 2s');
        setTimeout(async () => {
          if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
            console.log('[useWebRTC] 🔄 Auto ICE restart triggered');
            try {
              const offer = await pc.createOffer({ iceRestart: true });
              await pc.setLocalDescription(offer);
              onIceCandidate?.({ type: 'ice-restart', sdp: offer.sdp } as any);
              console.log('[useWebRTC] ICE restart offer sent');
            } catch (err) {
              console.error('[useWebRTC] ICE restart failed:', err);
            }
          }
        }, 2000);
      }
    };

    pc.onnegotiationneeded = async () => {
      console.log('[useWebRTC] 🔄 Negotiation needed - will be handled by initiator');
      // Note: Negotiation is handled manually in VideolifyFull_v2
      // The initiator calls createOffer() explicitly after setup
    };

    pc.ondatachannel = (event) => {
      console.log('[useWebRTC] DataChannel received:', event.channel.label);
      onDataChannel?.(event.channel);
    };

    console.log('[useWebRTC] Peer connection created');
    return pc;
  }, [onTrack, onIceCandidate, onConnectionStateChange, onDataChannel]);

  // Create offer
  const createOffer = useCallback(async (): Promise<RTCSessionDescriptionInit | null> => {
    const pc = pcRef.current;
    if (!pc) return null;

    try {
      makingOfferRef.current = true;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // ✅ CRITICAL: Wait for ICE gathering to complete for better connectivity
      if (pc.iceGatheringState !== 'complete') {
        console.log('[useWebRTC] Waiting for ICE gathering to complete...');
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            console.warn('[useWebRTC] ICE gathering timeout, proceeding anyway');
            resolve();
          }, 3000); // 3s timeout

          const checkState = () => {
            if (pc.iceGatheringState === 'complete') {
              clearTimeout(timeout);
              console.log('[useWebRTC] ICE gathering complete');
              resolve();
            }
          };

          pc.addEventListener('icegatheringstatechange', checkState);
          checkState(); // Check immediately in case already complete
        });
      }

      console.log('[useWebRTC] Offer created with', pc.localDescription?.sdp.match(/a=candidate/g)?.length || 0, 'candidates');
      return pc.localDescription!.toJSON();
    } catch (err) {
      console.error('[useWebRTC] Create offer failed:', err);
      return null;
    } finally {
      makingOfferRef.current = false;
    }
  }, []);

  // Handle offer (Perfect Negotiation)
  const handleOffer = useCallback(
    async (offer: RTCSessionDescriptionInit, remotePeerId: string) => {
      const pc = pcRef.current;
      if (!pc) return null;

      try {
        // Determine politeness
        const isPolite = peerId < remotePeerId;
        isPoliteRef.current = isPolite;

        const offerCollision =
          pc.signalingState !== 'stable' && (makingOfferRef.current || pc.signalingState !== 'have-local-offer');

        ignoreOfferRef.current = !isPolite && offerCollision;

        if (ignoreOfferRef.current) {
          console.log('[useWebRTC] Ignoring offer (impolite)');
          return null;
        }

        // Rollback if needed
        if (offerCollision && isPolite) {
          console.log('[useWebRTC] Collision detected, rolling back');
          await pc.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit);
        }

        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // ✅ CRITICAL: Wait for ICE gathering to complete
        if (pc.iceGatheringState !== 'complete') {
          console.log('[useWebRTC] Waiting for ICE gathering (answer)...');
          await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
              console.warn('[useWebRTC] ICE gathering timeout (answer)');
              resolve();
            }, 3000);

            const checkState = () => {
              if (pc.iceGatheringState === 'complete') {
                clearTimeout(timeout);
                console.log('[useWebRTC] ICE gathering complete (answer)');
                resolve();
              }
            };

            pc.addEventListener('icegatheringstatechange', checkState);
            checkState();
          });
        }

        console.log('[useWebRTC] Answer created with', pc.localDescription?.sdp.match(/a=candidate/g)?.length || 0, 'candidates');
        return pc.localDescription!.toJSON();
      } catch (err) {
        console.error('[useWebRTC] Handle offer failed:', err);
        return null;
      }
    },
    [peerId]
  );

  // Handle answer
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    const pc = pcRef.current;
    if (!pc) return;

    try {
      await pc.setRemoteDescription(answer);
      console.log('[useWebRTC] Answer set');
      
      // ✅ Process any queued ICE candidates now that remote description is set
      if (pendingIceCandidatesRef.current.length > 0) {
        console.log(`[useWebRTC] Processing ${pendingIceCandidatesRef.current.length} queued ICE candidates`);
        for (const candidate of pendingIceCandidatesRef.current) {
          try {
            await pc.addIceCandidate(candidate);
          } catch (err) {
            // Ignore errors for queued candidates
          }
        }
        pendingIceCandidatesRef.current = [];
      }
    } catch (err) {
      console.error('[useWebRTC] Handle answer failed:', err);
    }
  }, []);

  // Add ICE candidate
  const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    const pc = pcRef.current;
    if (!pc) return;

    // ✅ If remote description not set yet, queue the candidate
    if (!pc.remoteDescription) {
      pendingIceCandidatesRef.current.push(candidate);
      return;
    }

    try {
      await pc.addIceCandidate(candidate);
    } catch (err) {
      if (!ignoreOfferRef.current) {
        console.error('[useWebRTC] Add ICE candidate failed:', err);
      }
    }
  }, []);

  // Add track
  const addTrack = useCallback((track: MediaStreamTrack, stream: MediaStream) => {
    const pc = pcRef.current;
    if (!pc) return null;

    // Check if sender already exists for this track
    const existingSender = pc.getSenders().find((s) => s.track === track);
    if (existingSender) {
      console.log('[useWebRTC] Sender already exists for track, skipping addTrack');
      return existingSender;
    }

    try {
      return pc.addTrack(track, stream);
    } catch (error) {
      console.error('[useWebRTC] Error adding track:', error);
      return null;
    }
  }, []);

  // Replace track
  const replaceTrack = useCallback(
    async (oldTrack: MediaStreamTrack, newTrack: MediaStreamTrack | null) => {
      const pc = pcRef.current;
      if (!pc) return;

      const sender = pc.getSenders().find((s) => s.track === oldTrack);
      if (sender) {
        await sender.replaceTrack(newTrack);
        console.log('[useWebRTC] Track replaced:', oldTrack.kind);
      }
    },
    []
  );

  // Create data channel
  const createDataChannel = useCallback(
    (label: string, options?: RTCDataChannelInit): RTCDataChannel | null => {
      const pc = pcRef.current;
      if (!pc) return null;

      return pc.createDataChannel(label, options);
    },
    []
  );

  // ICE restart
  const restartIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;

    try {
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      console.log('[useWebRTC] ICE restart initiated');
      return offer;
    } catch (err) {
      console.error('[useWebRTC] ICE restart failed:', err);
      return null;
    }
  }, []);

  // Close connection
  const close = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
      pendingIceCandidatesRef.current = []; // ✅ Clear pending candidates
      console.log('[useWebRTC] Connection closed');
    }
  }, []);

  return {
    peerConnection: pcRef.current,
    connectionState,
    iceState,
    createPeerConnection,
    createOffer,
    handleOffer,
    handleAnswer,
    addIceCandidate,
    addTrack,
    replaceTrack,
    createDataChannel,
    restartIce,
    close,
  };
}
