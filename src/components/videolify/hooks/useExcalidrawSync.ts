/**
 * useExcalidrawSync - P2P sync for Excalidraw whiteboard
 * Handles real-time collaboration via RTCDataChannel
 */

import { useRef, useCallback, useEffect, useState } from 'react';

interface SyncMessage {
  type: 'full-sync' | 'incremental-update' | 'request-sync';
  elements?: any[];
  appState?: any;
  timestamp?: number;
}

export function useExcalidrawSync(roomId: string, role: 'tutor' | 'student' = 'student') {
  const channelRef = useRef<RTCDataChannel | null>(null);
  const excalidrawApiRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const queueRef = useRef<string[]>([]);
  const lastUpdateRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const pendingUpdateRef = useRef<{ elements: any[], appState: any } | null>(null);
  const isTeacher = role === 'tutor';

  // Setup Excalidraw API reference
  const setExcalidrawAPI = useCallback((api: any) => {
    excalidrawApiRef.current = api;
    console.log('[ExcalidrawSync] API reference set:', !!api);

    if (api) {
      setIsReady(true);

      // Request full sync from peer when we're ready
      if (channelRef.current?.readyState === 'open') {
        console.log('[ExcalidrawSync] Requesting full sync from peer');
        sendMessage({ type: 'request-sync', timestamp: Date.now() });
      }
    }
  }, []);

  // Send message via data channel
  const sendMessage = useCallback((message: SyncMessage) => {
    const channel = channelRef.current;
    const data = JSON.stringify(message);

    if (!channel || channel.readyState !== 'open') {
      // Queue message if channel not ready (max 50 messages)
      if (queueRef.current.length < 50) {
        queueRef.current.push(data);
        console.log('[ExcalidrawSync] Message queued (channel not ready)');
      }
      return;
    }

    try {
      channel.send(data);
      console.log('[ExcalidrawSync] Message sent:', message.type);
    } catch (e) {
      console.error('[ExcalidrawSync] Send error:', e);
      queueRef.current.push(data);
    }
  }, []);

  // Handle incoming sync message
  const handleMessage = useCallback((message: SyncMessage) => {
    const api = excalidrawApiRef.current;
    if (!api) {
      console.warn('[ExcalidrawSync] API not ready, ignoring message');
      return;
    }

    console.log('[ExcalidrawSync] Message received:', message.type);

    try {
      if (message.type === 'full-sync' && message.elements) {
        // Apply full state from peer
        console.log('[ExcalidrawSync] Applying full sync:', message.elements.length, 'elements');
        console.log('[ExcalidrawSync] Received appState:', message.appState);
        api.updateScene({
          elements: message.elements as any,
          appState: message.appState as any,
        });
      } else if (message.type === 'incremental-update' && message.elements) {
        // Apply incremental update
        console.log('[ExcalidrawSync] Applying incremental update:', message.elements.length, 'elements');
        console.log('[ExcalidrawSync] Received appState with viewport:', {
          zoom: message.appState?.zoom?.value,
          scrollX: message.appState?.scrollX,
          scrollY: message.appState?.scrollY,
        });
        api.updateScene({
          elements: message.elements as any,
          appState: message.appState as any,
        });
      } else if (message.type === 'request-sync') {
        // Peer is requesting full sync - send our current state
        console.log('[ExcalidrawSync] Peer requested sync, sending full state');
        const elements = api.getSceneElements();
        const appState = api.getAppState();

        // ✅ DEBUG: Log full appState to see available properties
        console.log('[ExcalidrawSync] Full appState keys:', Object.keys(appState));
        console.log('[ExcalidrawSync] Viewport data:', {
          zoom: appState.zoom?.value,
          scrollX: appState.scrollX,
          scrollY: appState.scrollY,
        });

        // ✅ Build appState for full sync
        const appStateToSync: any = {
          viewBackgroundColor: appState.viewBackgroundColor,
          currentItemFontFamily: appState.currentItemFontFamily,
          currentItemStrokeColor: appState.currentItemStrokeColor,
          currentItemBackgroundColor: appState.currentItemBackgroundColor,
        };

        // ✅ Only teacher syncs viewport (zoom, pan) to student
        if (isTeacher) {
          // ✅ CRITICAL FIX: Excalidraw's zoom is an object with a 'value' property
          appStateToSync.zoom = { value: appState.zoom?.value || 1 };
          appStateToSync.scrollX = appState.scrollX;
          appStateToSync.scrollY = appState.scrollY;
        }

        sendMessage({
          type: 'full-sync',
          elements,
          appState: appStateToSync,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error('[ExcalidrawSync] Error handling message:', error);
    }
  }, [sendMessage, isTeacher]);

  // Setup RTCDataChannel
  const setupChannel = useCallback((channel: RTCDataChannel) => {
    console.log('[ExcalidrawSync] Setting up data channel, state:', channel.readyState);
    channelRef.current = channel;

    channel.onopen = () => {
      console.log('[ExcalidrawSync] ✅ Data channel OPEN');

      // Drain message queue
      while (queueRef.current.length > 0) {
        const msg = queueRef.current.shift();
        if (msg && channel.readyState === 'open') {
          try {
            channel.send(msg);
            console.log('[ExcalidrawSync] Queued message sent');
          } catch (e) {
            console.error('[ExcalidrawSync] Error sending queued message:', e);
          }
        }
      }

      // Request sync if we have API ready
      if (excalidrawApiRef.current) {
        console.log('[ExcalidrawSync] Requesting full sync from peer');
        sendMessage({ type: 'request-sync', timestamp: Date.now() });
      }
    };

    channel.onclose = () => {
      console.log('[ExcalidrawSync] ⚠️ Data channel CLOSED');
    };

    channel.onerror = (error) => {
      console.error('[ExcalidrawSync] ❌ Data channel ERROR:', error);
    };

    channel.onmessage = (e) => {
      try {
        const message = JSON.parse(e.data) as SyncMessage;
        handleMessage(message);
      } catch (error) {
        console.error('[ExcalidrawSync] Error parsing message:', error);
      }
    };
  }, [handleMessage, sendMessage]);

  // Handle Excalidraw onChange event
  const handleChange = useCallback((elements: any[], appState: any) => {
    // ✨ CRITICAL FIX: Use requestAnimationFrame instead of debounce
    // This ensures smooth drawing by syncing at browser's refresh rate (60/120 FPS)
    // Store the pending update
    pendingUpdateRef.current = { elements, appState };

    // Cancel previous RAF if exists
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    // Schedule update on next animation frame
    rafIdRef.current = requestAnimationFrame(() => {
      const pending = pendingUpdateRef.current;
      if (!pending) return;

      const now = Date.now();

      // Optional: Light throttle to prevent extreme flooding (allow ~60-120 FPS)
      // Skip if less than 8ms (125 FPS cap) - still much smoother than 16ms
      if (now - lastUpdateRef.current < 8) {
        return;
      }

      lastUpdateRef.current = now;

      // ✅ Build appState to sync
      const appStateToSync: any = {
        viewBackgroundColor: pending.appState.viewBackgroundColor,
        currentItemFontFamily: pending.appState.currentItemFontFamily,
        currentItemStrokeColor: pending.appState.currentItemStrokeColor,
        currentItemBackgroundColor: pending.appState.currentItemBackgroundColor,
      };

      // ✅ Only teacher syncs viewport (zoom, pan) to student
      // Student's viewport changes are ignored to prevent conflicts
      if (isTeacher) {
        // ✅ CRITICAL FIX: Excalidraw's zoom is an object with a 'value' property
        appStateToSync.zoom = { value: pending.appState.zoom?.value || 1 };
        appStateToSync.scrollX = pending.appState.scrollX;
        appStateToSync.scrollY = pending.appState.scrollY;
        console.log('[ExcalidrawSync] Teacher syncing viewport:', {
          zoom: appStateToSync.zoom.value,
          scrollX: appStateToSync.scrollX,
          scrollY: appStateToSync.scrollY,
        });
      } else {
        console.log('[ExcalidrawSync] Student - NOT syncing viewport (receiving only)');
      }

      // Send incremental update to peer
      sendMessage({
        type: 'incremental-update',
        elements: pending.elements,
        appState: appStateToSync,
        timestamp: now,
      });

      pendingUpdateRef.current = null;
      rafIdRef.current = null;
    });
  }, [sendMessage, isTeacher]);

  return {
    setupChannel,
    setExcalidrawAPI,
    handleChange,
    isReady,
  };
}
