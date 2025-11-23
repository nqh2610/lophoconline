/**
 * useConnectionEstablishment - Centralized WebRTC Connection Logic
 *
 * Extracts all connection establishment logic into a reusable hook.
 * Used for: new joins, F5 refreshes, reconnections, ICE restarts.
 *
 * Benefits:
 * - Single source of truth for connection logic
 * - Prevents race conditions with mutex
 * - Consistent behavior across all scenarios
 * - Easy to test and maintain
 */

import { useRef, useCallback } from 'react';
import { addLocalTracksToPC, recreatePeerConnection } from '@/utils/webrtc-helpers';

interface UseConnectionEstablishmentParams {
  webrtc: {
    peerConnection: RTCPeerConnection | null;
    createPeerConnection: () => void;
    close: () => void;
    addTrack: (track: MediaStreamTrack, stream: MediaStream) => void;
    createOffer: () => Promise<RTCSessionDescriptionInit | null>;
    createDataChannel: (label: string, options?: RTCDataChannelInit) => RTCDataChannel | null;
  };
  media: {
    localStream: MediaStream | null;
  };
  remotePeerIdRef: React.MutableRefObject<string | null>;
  onDataChannelsCreated?: (channels: {
    chat: RTCDataChannel | null;
    whiteboard: RTCDataChannel | null;
    control: RTCDataChannel | null;
    file: RTCDataChannel | null;
  }) => void;
}

export function useConnectionEstablishment({
  webrtc,
  media,
  remotePeerIdRef,
  onDataChannelsCreated,
}: UseConnectionEstablishmentParams) {
  // ✅ CRITICAL: Mutex to prevent concurrent connection attempts
  const establishingRef = useRef(false);
  const lastConnectionTimeRef = useRef(0);

  /**
   * Establishes connection with a peer
   *
   * @param peerId - Remote peer ID
   * @param shouldInitiate - Whether this peer should create offer
   * @param context - Context for logging (e.g., 'peer-joined', 'reconnection')
   * @returns Offer if shouldInitiate=true, null otherwise
   */
  const establishConnection = useCallback(
    async (
      peerId: string,
      shouldInitiate: boolean,
      context: string = 'unknown'
    ): Promise<RTCSessionDescriptionInit | null> => {
      // Wait for local media to be ready (small grace period) to avoid offers without tracks
      const waitForLocalStream = async (timeoutMs = 3000) => {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
          if (media.localStream && media.localStream.getTracks().length > 0) return true;
          await new Promise((res) => setTimeout(res, 100));
        }
        return false;
      };

      // Ensure local media readiness before continuing (best-effort)
      try {
        await waitForLocalStream(2000);
      } catch (e) {
        // ignore - best effort only
      }
      const now = Date.now();

      // ✅ CRITICAL: Prevent rapid reconnections (< 500ms apart)
      if (now - lastConnectionTimeRef.current < 500) {
        console.warn('[useConnectionEstablishment] ⚠️ Ignoring rapid connection attempt:', context);
        console.warn('[useConnectionEstablishment]    Time since last:', now - lastConnectionTimeRef.current, 'ms');
        return null;
      }

      // ✅ CRITICAL: Prevent concurrent connection attempts
      if (establishingRef.current) {
        console.warn('[useConnectionEstablishment] ⚠️ Connection already in progress, waiting...');
        // Wait for current connection to finish
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (establishingRef.current) {
          console.error('[useConnectionEstablishment] ❌ Connection still in progress after 1s - aborting');
          return null;
        }
      }

      console.log('[useConnectionEstablishment] 🔌 Starting connection establishment');
      console.log('[useConnectionEstablishment]    Context:', context);
      console.log('[useConnectionEstablishment]    Peer ID:', peerId);
      console.log('[useConnectionEstablishment]    Should initiate:', shouldInitiate);
      console.log('[useConnectionEstablishment]    Time:', new Date().toISOString());

      establishingRef.current = true;
      lastConnectionTimeRef.current = now;

      try {
        // Update remote peer reference
        remotePeerIdRef.current = peerId;

        // Step 1: Recreate PeerConnection (always close old one first)
        console.log('[useConnectionEstablishment] Step 1: Recreating PeerConnection');

        // Close old PC if exists
        if (webrtc.peerConnection) {
          console.log('[useConnectionEstablishment] ⚠️ PeerConnection exists - closing old one');
          webrtc.close();
        }

        // Create new PC and capture the return value
        console.log('[useConnectionEstablishment] 🔌 Creating new PeerConnection');
        const pc = webrtc.createPeerConnection();

        // Step 2: Add local tracks if available
        console.log('[useConnectionEstablishment] Step 2: Adding local tracks');
        const tracksAdded = addLocalTracksToPC(
          pc,
          media.localStream,
          'useConnectionEstablishment'
        );

        if (tracksAdded === 0) {
          console.log('[useConnectionEstablishment] ⚠️ No tracks added - connecting without media');
        } else {
          console.log('[useConnectionEstablishment] ✅ Added', tracksAdded, 'tracks to PC');
        }

        // Step 3: If initiator, create data channels and offer
        if (shouldInitiate) {
          console.log('[useConnectionEstablishment] Step 3: Creating data channels (initiator)');

          const chatCh = webrtc.createDataChannel('chat', { ordered: true });
          const whiteboardCh = webrtc.createDataChannel('whiteboard', { ordered: true });
          const controlCh = webrtc.createDataChannel('control', { ordered: true });
          const fileCh = webrtc.createDataChannel('file', { ordered: false });

          console.log('[useConnectionEstablishment]    Chat channel:', chatCh ? 'created' : 'failed');
          console.log('[useConnectionEstablishment]    Whiteboard channel:', whiteboardCh ? 'created' : 'failed');
          console.log('[useConnectionEstablishment]    Control channel:', controlCh ? 'created' : 'failed');
          console.log('[useConnectionEstablishment]    File channel:', fileCh ? 'created' : 'failed');

          // Notify parent to setup channel handlers
          onDataChannelsCreated?.({
            chat: chatCh,
            whiteboard: whiteboardCh,
            control: controlCh,
            file: fileCh,
          });

          console.log('[useConnectionEstablishment] Step 4: Creating offer');

          // Retry offer creation a few times if it fails (sometimes PC not fully ready)
          let offer: RTCSessionDescriptionInit | null = null;
          for (let attempt = 0; attempt < 3 && !offer; attempt++) {
            try {
              offer = await webrtc.createOffer();
            } catch (err) {
              console.warn('[useConnectionEstablishment] createOffer attempt', attempt + 1, 'failed:', err);
              offer = null;
            }

            if (!offer) {
              const backoff = 150 * Math.pow(2, attempt);
              await new Promise((res) => setTimeout(res, backoff));
            }
          }

          if (offer) {
            console.log('[useConnectionEstablishment] ✅ Offer created successfully');
            console.log('[useConnectionEstablishment]    Offer type:', offer.type);
            console.log('[useConnectionEstablishment]    SDP length:', offer.sdp?.length || 0);
            return offer;
          } else {
            console.error('[useConnectionEstablishment] ❌ Failed to create offer after retries');
            return null;
          }
        } else {
          console.log('[useConnectionEstablishment] Step 3: Not initiator - waiting for offer');
          return null;
        }
      } catch (error) {
        console.error('[useConnectionEstablishment] ❌ Error during connection establishment:', error);
        return null;
      } finally {
        establishingRef.current = false;
        console.log('[useConnectionEstablishment] ✅ Connection establishment completed');
        console.log('[useConnectionEstablishment]    Time:', new Date().toISOString());
      }
    },
    [webrtc, media, remotePeerIdRef, onDataChannelsCreated]
  );

  /**
   * Ensures PC exists for answering offers
   * Used when receiving offer but PC doesn't exist yet
   */
  const ensurePeerConnection = useCallback(
    (peerId: string, context: string = 'ensure-pc'): void => {
      console.log('[useConnectionEstablishment] 🔍 Ensuring PeerConnection exists');
      console.log('[useConnectionEstablishment]    Context:', context);
      console.log('[useConnectionEstablishment]    Peer ID:', peerId);

      remotePeerIdRef.current = peerId;

      if (!webrtc.peerConnection) {
        console.log('[useConnectionEstablishment] ⚠️ PC does not exist - creating now');
        const pc = webrtc.createPeerConnection();

        // Add tracks if available (use the returned PC, not webrtc.peerConnection)
        const tracksAdded = addLocalTracksToPC(
          pc,
          media.localStream,
          `useConnectionEstablishment [${context}]`
        );

        console.log('[useConnectionEstablishment] ✅ PC created,', tracksAdded, 'tracks added');
      } else {
        console.log('[useConnectionEstablishment] ✅ PC already exists - reusing');
      }
    },
    [webrtc, media, remotePeerIdRef]
  );

  return {
    establishConnection,
    ensurePeerConnection,
    isEstablishing: () => establishingRef.current,
  };
}
