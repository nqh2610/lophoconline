/**
 * useDataChannel Hook
 * Reusable hook for creating and managing RTCDataChannel with queue system
 * Handles connection state, message queue, auto-reconnect
 */

import { useRef, useState, useEffect, useCallback } from 'react';

export interface DataChannelOptions {
  label: string;
  options?: RTCDataChannelInit;
  onMessage: (data: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  maxQueueSize?: number;
  isReconnecting?: boolean;
}

export interface DataChannelResult {
  channel: RTCDataChannel | null;
  state: RTCDataChannelState;
  isReady: boolean;
  send: (data: any) => void;
  queueSize: number;
  drainQueue: () => void;
}

export function useDataChannel(
  peerConnection: RTCPeerConnection | null,
  options: DataChannelOptions
): DataChannelResult {
  const {
    label,
    options: channelOptions = { ordered: true },
    onMessage,
    onOpen,
    onClose,
    onError,
    maxQueueSize = 100,
    isReconnecting = false,
  } = options;

  const channelRef = useRef<RTCDataChannel | null>(null);
  const queueRef = useRef<string[]>([]);
  const [state, setState] = useState<RTCDataChannelState>('closed');
  const [isReady, setIsReady] = useState(false);

  // Setup channel event handlers
  const setupChannel = useCallback(
    (channel: RTCDataChannel) => {
      console.log(`📡 [useDataChannel] Setting up ${label} channel`);

      channel.onopen = () => {
        console.log(`✅ [useDataChannel] ${label} channel OPEN`);
        setState('open');
        setIsReady(true);
        onOpen?.();
      };

      channel.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (e) {
          console.error(`❌ [useDataChannel] ${label} - Failed to parse message:`, e);
        }
      };

      channel.onclose = () => {
        console.warn(`⚠️ [useDataChannel] ${label} channel CLOSED`);
        setState('closed');
        setIsReady(false);
        onClose?.();
      };

      channel.onerror = (error) => {
        if (isReconnecting) {
          console.log(`⚠️ [useDataChannel] ${label} error during reconnect (expected)`);
        } else {
          console.warn(`⚠️ [useDataChannel] ${label} error:`, error);
        }
        onError?.(error);
      };

      channelRef.current = channel;
    },
    [label, onMessage, onOpen, onClose, onError, isReconnecting]
  );

  // Create or attach to channel
  useEffect(() => {
    if (!peerConnection) {
      return;
    }

    // Check if channel already exists (created by remote peer)
    const existingChannel = channelRef.current;
    if (existingChannel && existingChannel.readyState !== 'closed') {
      console.log(`🔗 [useDataChannel] Using existing ${label} channel`);
      return;
    }

    // Create new channel if we're the offerer
    // Note: The caller should decide whether to create or wait for ondatachannel
    // This hook just manages the channel once created

    return () => {
      // Cleanup on unmount
      if (channelRef.current) {
        console.log(`🧹 [useDataChannel] Cleaning up ${label} channel`);
        try {
          channelRef.current.close();
        } catch (e) {
          // Channel might already be closed
        }
        channelRef.current = null;
      }
    };
  }, [peerConnection, label]);

  // Send function with queue support
  const send = useCallback(
    (data: any) => {
      const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
      const channel = channelRef.current;

      if (!channel) {
        console.warn(`⚠️ [useDataChannel] ${label} - Channel not created yet, queueing`);
        if (queueRef.current.length < maxQueueSize) {
          queueRef.current.push(dataStr);
        } else {
          console.error(`❌ [useDataChannel] ${label} - Queue full! Dropping message`);
        }
        return;
      }

      if (channel.readyState === 'open') {
        try {
          channel.send(dataStr);
          console.log(`📤 [useDataChannel] ${label} - Message sent, buffered: ${channel.bufferedAmount} bytes`);
        } catch (e) {
          console.error(`❌ [useDataChannel] ${label} - Failed to send:`, e);
          if (queueRef.current.length < maxQueueSize) {
            queueRef.current.push(dataStr);
          }
        }
      } else {
        console.warn(`⚠️ [useDataChannel] ${label} - Channel state "${channel.readyState}", queueing`);
        if (queueRef.current.length < maxQueueSize) {
          queueRef.current.push(dataStr);
          console.log(`📋 [useDataChannel] ${label} - Queue size: ${queueRef.current.length}`);
        } else {
          console.error(`❌ [useDataChannel] ${label} - Queue full!`);
        }
      }
    },
    [label, maxQueueSize]
  );

  // Drain queue when channel opens
  const drainQueue = useCallback(() => {
    const channel = channelRef.current;
    if (!channel || channel.readyState !== 'open') {
      console.warn(`⚠️ [useDataChannel] ${label} - Cannot drain queue, channel not ready`);
      return;
    }

    const queue = queueRef.current;
    if (queue.length === 0) {
      return;
    }

    console.log(`📤 [useDataChannel] ${label} - Draining queue of ${queue.length} messages`);

    queue.forEach((msg, index) => {
      try {
        if (channel.readyState === 'open') {
          channel.send(msg);
          console.log(`✅ [useDataChannel] ${label} - Sent queued message ${index + 1}/${queue.length}`);
        } else {
          console.warn(`⚠️ [useDataChannel] ${label} - Channel closed while draining, re-queueing ${index + 1}`);
          queueRef.current.push(msg);
        }
      } catch (e) {
        console.error(`❌ [useDataChannel] ${label} - Failed to send queued message ${index + 1}:`, e);
        queueRef.current.push(msg);
      }
    });

    // Clear successfully sent messages
    queueRef.current = [];
    console.log(`✅ [useDataChannel] ${label} - Queue drained`);
  }, [label]);

  // Auto-drain queue when channel opens
  useEffect(() => {
    if (isReady && queueRef.current.length > 0) {
      console.log(`🔄 [useDataChannel] ${label} - Channel opened, auto-draining queue`);
      drainQueue();
    }
  }, [isReady, drainQueue, label]);

  return {
    channel: channelRef.current,
    state,
    isReady,
    send,
    queueSize: queueRef.current.length,
    drainQueue,
  };
}

/**
 * Helper function to create DataChannel (for offerer)
 */
export function createDataChannel(
  pc: RTCPeerConnection,
  label: string,
  options: RTCDataChannelInit = { ordered: true }
): RTCDataChannel {
  console.log(`📡 [createDataChannel] Creating ${label} channel`);
  return pc.createDataChannel(label, options);
}

/**
 * Helper function to attach DataChannel event handlers
 * Use this after receiving ondatachannel event or after creating channel
 */
export function attachDataChannelHandlers(
  channel: RTCDataChannel,
  handlers: {
    onMessage: (data: any) => void;
    onOpen?: () => void;
    onClose?: () => void;
    onError?: (error: Event) => void;
  }
) {
  const { onMessage, onOpen, onClose, onError } = handlers;

  channel.onopen = () => {
    console.log(`✅ [DataChannel] ${channel.label} opened`);
    onOpen?.();
  };

  channel.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      console.error(`❌ [DataChannel] ${channel.label} - Parse error:`, e);
    }
  };

  channel.onclose = () => {
    console.warn(`⚠️ [DataChannel] ${channel.label} closed`);
    onClose?.();
  };

  channel.onerror = (error) => {
    console.error(`❌ [DataChannel] ${channel.label} error:`, error);
    onError?.(error);
  };
}
