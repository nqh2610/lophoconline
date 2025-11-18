/**
 * useSignaling - SSE + REST API signaling for WebRTC
 * Optimized for performance and reliability
 */

import { useRef, useCallback, useEffect } from 'react';
import type {
  SignalingJoinResponse,
  SSEPeerJoinedEvent,
  SSEOfferEvent,
  SSEAnswerEvent,
  SSEIceCandidateEvent,
  SSEVbgSettingsEvent,
  SSEPeerLeftEvent,
} from '../types';

interface SignalingCallbacks {
  onPeerJoined?: (event: SSEPeerJoinedEvent) => void;
  onOffer?: (event: SSEOfferEvent) => void;
  onAnswer?: (event: SSEAnswerEvent) => void;
  onIceCandidate?: (event: SSEIceCandidateEvent) => void;
  onVbgSettings?: (event: SSEVbgSettingsEvent) => void;
  onPeerLeft?: (event: SSEPeerLeftEvent) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

interface UseSignalingOptions {
  roomId: string;
  peerId: string;
  accessToken: string;
  userName: string;
  role: 'tutor' | 'student';
  callbacks: SignalingCallbacks;
}

export function useSignaling(options: UseSignalingOptions) {
  const { roomId, peerId, accessToken, userName, role, callbacks } = options;
  const eventSourceRef = useRef<EventSource | null>(null);
  const isConnectedRef = useRef(false);
  const handledPeersRef = useRef<Set<string>>(new Set());
  const connectPromiseRef = useRef<Promise<void> | null>(null); // ✅ Store pending promise

  // ✅ Store callbacks in ref to avoid re-creating connect() on every render
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // Signal to server via REST API
  const signal = useCallback(
    async (action: string, data?: any) => {
      try {
        const response = await fetch('/api/videolify/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            roomId,
            peerId,
            accessToken,
            data,
          }),
        });

        if (!response.ok) {
          throw new Error(`Signaling failed: ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        console.error(`[useSignaling] ${action} failed:`, error);
        throw error;
      }
    },
    [roomId, peerId, accessToken]
  );

  // Connect SSE stream - Returns promise that resolves when connected
  const connect = useCallback((): Promise<void> => {
    // ✅ If already connected, return resolved promise
    if (eventSourceRef.current?.readyState === 1) { // OPEN
      console.log('[useSignaling] Already connected');
      return Promise.resolve();
    }

    // ✅ If connecting, return existing promise
    if (connectPromiseRef.current) {
      console.log('[useSignaling] Already connecting, returning existing promise');
      return connectPromiseRef.current;
    }

    // ✅ Create new connection
    const promise = new Promise<void>((resolve, reject) => {
      const url = `/api/videolify/stream?roomId=${roomId}&peerId=${peerId}&accessToken=${accessToken}`;
      console.log('[useSignaling] 🔌 Creating EventSource:', url);

      // Timeout after 30 seconds (allow time for initial API compilation)
      const timeout = setTimeout(() => {
        console.error('[useSignaling] ❌ SSE connection timeout after 30s');
        console.error('[useSignaling] EventSource state:', eventSourceRef.current?.readyState);
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        connectPromiseRef.current = null; // Clear promise on timeout
        reject(new Error('SSE connection timeout'));
      }, 30000);

      console.log('[useSignaling] 📡 Instantiating new EventSource...');
      const es = new EventSource(url);
      console.log('[useSignaling] EventSource created, readyState:', es.readyState);
      eventSourceRef.current = es;

      // ✅ Use onopen instead of event listener - fires immediately when connection opens
      es.onopen = () => {
        clearTimeout(timeout);
        console.log('[useSignaling] ✅ SSE onopen fired! readyState:', es.readyState);
        isConnectedRef.current = true;
        connectPromiseRef.current = null; // Clear promise
        callbacksRef.current.onConnected?.();
        resolve(); // Resolve promise when connected
      };

      // Also listen for custom 'connected' event from server (backup)
      es.addEventListener('connected', () => {
        console.log('[useSignaling] ✅ Received connected event from server');
      });

      es.addEventListener('peer-joined', (e) => {
        const data = JSON.parse(e.data) as SSEPeerJoinedEvent;

        // Check if already handled to prevent duplicates
        if (handledPeersRef.current.has(data.peerId)) {
          console.log('[useSignaling] ⚠️ Ignoring duplicate peer-joined for:', data.peerId);
          return;
        }

        // Mark as handled
        handledPeersRef.current.add(data.peerId);

        console.log('[useSignaling] Peer joined:', data.peerId);
        callbacksRef.current.onPeerJoined?.(data);
      });

    es.addEventListener('offer', (e) => {
      const data = JSON.parse(e.data) as SSEOfferEvent;
      console.log('[useSignaling] Offer received from:', data.fromPeerId);
      callbacksRef.current.onOffer?.(data);
    });

    es.addEventListener('answer', (e) => {
      const data = JSON.parse(e.data) as SSEAnswerEvent;
      console.log('[useSignaling] Answer received from:', data.fromPeerId);
      callbacksRef.current.onAnswer?.(data);
    });

    es.addEventListener('ice-candidate', (e) => {
      const data = JSON.parse(e.data) as SSEIceCandidateEvent;
      callbacksRef.current.onIceCandidate?.(data);
    });

    es.addEventListener('vbg-settings', (e) => {
      const data = JSON.parse(e.data) as SSEVbgSettingsEvent;
      console.log('[useSignaling] VBG settings from:', data.fromPeerId);
      callbacksRef.current.onVbgSettings?.(data);
    });

    es.addEventListener('peer-left', (e) => {
      const data = JSON.parse(e.data) as SSEPeerLeftEvent;
      console.log('[useSignaling] Peer left:', data.peerId);
      callbacksRef.current.onPeerLeft?.(data);
    });

      es.onerror = (error) => {
        clearTimeout(timeout);
        console.error('[useSignaling] SSE error:', error);
        isConnectedRef.current = false;
        connectPromiseRef.current = null; // Clear promise
        callbacksRef.current.onDisconnected?.();
        // Don't reject here - connection might recover
      };
    });

    connectPromiseRef.current = promise; // ✅ Store promise
    return promise;
  }, [roomId, peerId, accessToken]); // ✅ Removed callbacks from dependencies

  // Disconnect SSE
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      isConnectedRef.current = false;
      handledPeersRef.current.clear(); // Clear handled peers on disconnect
      console.log('[useSignaling] Disconnected');
    }
  }, []);

  // Join room
  const joinRoom = useCallback(async (): Promise<SignalingJoinResponse> => {
    return signal('join', { userName, role });
  }, [signal, userName, role]);

  // Send offer
  const sendOffer = useCallback(
    async (offer: RTCSessionDescriptionInit, toPeerId: string) => {
      return signal('offer', {
        offer,
        toPeerId,
        messageId: `offer-${peerId}-${Date.now()}`,
      });
    },
    [signal, peerId]
  );

  // Send answer
  const sendAnswer = useCallback(
    async (answer: RTCSessionDescriptionInit, toPeerId: string) => {
      return signal('answer', {
        answer,
        toPeerId,
        messageId: `answer-${peerId}-${Date.now()}`,
      });
    },
    [signal, peerId]
  );

  // Send ICE candidate
  const sendIceCandidate = useCallback(
    async (candidate: RTCIceCandidateInit, toPeerId?: string) => {
      return signal('ice', { candidate, toPeerId });
    },
    [signal]
  );

  // Send VBG settings
  const sendVbgSettings = useCallback(
    async (settings: {
      enabled: boolean;
      mode: any;
      blurAmount?: number;
      backgroundImage?: string;
      toPeerId: string;
    }) => {
      return signal('vbg-settings', settings);
    },
    [signal]
  );

  // Leave room
  const leaveRoom = useCallback(async () => {
    await signal('leave');
    disconnect();
  }, [signal, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    joinRoom,
    sendOffer,
    sendAnswer,
    sendIceCandidate,
    sendVbgSettings,
    leaveRoom,
    isConnected: isConnectedRef.current,
  };
}
