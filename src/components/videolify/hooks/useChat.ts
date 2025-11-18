/**
 * useChat Hook
 * Manages P2P chat via RTCDataChannel
 * Features: Send/receive messages, queue support, latency tracking
 */

import { useState, useRef, useCallback } from 'react';
import type { ChatMessage } from '../types';

export interface UseChatOptions {
  userName: string;
  onChannelReady?: () => void;
}

export interface UseChatResult {
  messages: ChatMessage[];
  sendMessage: (text: string) => void;
  clearMessages: () => void;
  setupChannel: (channel: RTCDataChannel) => void;
  channelState: RTCDataChannelState;
}

export function useChat(options: UseChatOptions): UseChatResult {
  const { userName, onChannelReady } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [channelState, setChannelState] = useState<RTCDataChannelState>('closed');

  const channelRef = useRef<RTCDataChannel | null>(null);
  const outgoingQueueRef = useRef<string[]>([]);

  /**
   * Setup chat channel event handlers
   */
  const setupChannel = useCallback(
    (channel: RTCDataChannel) => {
      console.log('💬 [useChat] Setting up chat channel, state:', channel.readyState);
      setChannelState(channel.readyState);
      channelRef.current = channel;

      // CRITICAL: Set onmessage FIRST before onopen
      // Messages can arrive before onopen fires (answerer side)
      channel.onmessage = (event) => {
        console.log('📥 [useChat] Message received:', typeof event.data);
        try {
          const msg = JSON.parse(event.data) as ChatMessage;
          const latency = Date.now() - msg.timestamp;
          console.log(`📥 [useChat] Latency: ${latency}ms, from: ${msg.userName}`);

          setMessages((prev) => [
            ...prev,
            {
              ...msg,
              fromMe: false,
            },
          ]);
        } catch (e) {
          console.error('❌ [useChat] Failed to parse message:', e);
        }
      };

      channel.onopen = () => {
        console.log('✅ [useChat] Channel OPEN - ready for messaging');
        setChannelState('open');
        onChannelReady?.();

        // Drain queued messages
        if (outgoingQueueRef.current.length > 0) {
          console.log(`📤 [useChat] Draining ${outgoingQueueRef.current.length} queued messages`);

          while (outgoingQueueRef.current.length > 0) {
            const raw = outgoingQueueRef.current.shift();
            if (!raw) break;

            try {
              channel.send(raw);
            } catch (e) {
              console.warn('⚠️ [useChat] Failed to send queued message:', e);
              // Re-queue and break
              outgoingQueueRef.current.unshift(raw);
              break;
            }
          }
        }
      };

      channel.onclose = () => {
        console.warn('⚠️ [useChat] Channel CLOSED');
        setChannelState('closed');
      };

      channel.onerror = (error) => {
        console.error('❌ [useChat] Channel error:', error);
      };
    },
    [userName, onChannelReady]
  );

  /**
   * Send chat message
   */
  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const message: ChatMessage = {
        userName,
        message: trimmed,
        timestamp: Date.now(),
        fromMe: true,
      };

      const channel = channelRef.current;

      // Add to UI immediately
      setMessages((prev) => [...prev, message]);

      // Send or queue
      if (!channel) {
        console.warn('⚠️ [useChat] Channel not created yet - queueing');
        outgoingQueueRef.current.push(JSON.stringify(message));
        return;
      }

      if (channel.readyState === 'open') {
        try {
          const messageStr = JSON.stringify(message);
          channel.send(messageStr);
          console.log('💬 [useChat] Message sent, buffered:', channel.bufferedAmount);
        } catch (e) {
          console.error('❌ [useChat] Failed to send:', e);
          outgoingQueueRef.current.push(JSON.stringify(message));
        }
      } else {
        console.warn(`⚠️ [useChat] Channel state "${channel.readyState}" - queueing`);
        outgoingQueueRef.current.push(JSON.stringify(message));
      }
    },
    [userName]
  );

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    sendMessage,
    clearMessages,
    setupChannel,
    channelState,
  };
}
