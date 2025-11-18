/**
 * useWebRTC - Core WebRTC connection management
 * Handles peer connection, SDP negotiation, ICE, perfect negotiation
 */

import { useRef, useState, useCallback } from 'react';
import { ICE_SERVERS } from '../types';

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

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log('[useWebRTC] ICE state:', state);
      setIceState(state);

      // Handle disconnection
      if (state === 'disconnected') {
        setTimeout(() => {
          if (pc.iceConnectionState === 'disconnected') {
            console.warn('[useWebRTC] Still disconnected, attempting ICE restart');
            // ICE restart handled by caller
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
      console.log('[useWebRTC] Offer created');
      return offer;
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
        console.log('[useWebRTC] Answer created');
        return answer;
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
    } catch (err) {
      console.error('[useWebRTC] Handle answer failed:', err);
    }
  }, []);

  // Add ICE candidate
  const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    const pc = pcRef.current;
    if (!pc) return;

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
