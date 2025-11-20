/**
 * useChat Hook
 * Manages P2P chat via RTCDataChannel
 * Features: Send/receive messages, reactions, typing indicator, latency tracking
 */

import { useState, useRef, useCallback } from 'react';
import type { ChatMessage } from '../types';

export interface UseChatOptions {
  userName: string;
  onChannelReady?: () => void;
  onNewMessage?: (message: ChatMessage) => void;
}

export interface UseChatResult {
  messages: ChatMessage[];
  sendMessage: (text: string) => void;
  clearMessages: () => void;
  setupChannel: (channel: RTCDataChannel) => void;
  channelState: RTCDataChannelState;
  addReaction: (messageIndex: number, emoji: string) => void;
  sendTyping: () => void;
  typingUsers: string[];
}

interface ChatP2PMessage {
  type: 'message' | 'reaction' | 'typing';
  userName?: string;
  message?: string;
  timestamp?: number;
  fromMe?: boolean;
  messageIndex?: number;
  emoji?: string;
  reactions?: { emoji: string; users: string[] }[];
}

export function useChat(options: UseChatOptions): UseChatResult {
  const { userName, onChannelReady, onNewMessage } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [channelState, setChannelState] = useState<RTCDataChannelState>('closed');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const channelRef = useRef<RTCDataChannel | null>(null);
  const outgoingQueueRef = useRef<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
          const data = JSON.parse(event.data) as ChatP2PMessage;

          if (data.type === 'message') {
            const latency = Date.now() - (data.timestamp || 0);
            console.log(`📥 [useChat] Latency: ${latency}ms, from: ${data.userName}`);

            const newMessage: ChatMessage = {
              userName: data.userName || 'Unknown',
              message: data.message || '',
              timestamp: data.timestamp || Date.now(),
              fromMe: false,
              reactions: data.reactions || [],
            };

            setMessages((prev) => [...prev, newMessage]);

            // Call callback for notification
            if (onNewMessage) {
              onNewMessage(newMessage);
            }
          } else if (data.type === 'reaction') {
            // Handle reaction from peer
            if (typeof data.messageIndex === 'number' && data.emoji && data.userName) {
              setMessages((prev) => {
                const updated = [...prev];
                const msg = updated[data.messageIndex];
                if (msg) {
                  if (!msg.reactions) {
                    msg.reactions = [];
                  }

                  const reaction = msg.reactions.find(r => r.emoji === data.emoji);
                  if (reaction) {
                    // Toggle reaction
                    if (reaction.users.includes(data.userName!)) {
                      reaction.users = reaction.users.filter(u => u !== data.userName);
                      if (reaction.users.length === 0) {
                        msg.reactions = msg.reactions.filter(r => r.emoji !== data.emoji);
                      }
                    } else {
                      reaction.users.push(data.userName!);
                    }
                  } else {
                    msg.reactions.push({ emoji: data.emoji, users: [data.userName!] });
                  }
                }
                return updated;
              });
            }
          } else if (data.type === 'typing' && data.userName) {
            // Handle typing indicator
            setTypingUsers((prev) => {
              if (!prev.includes(data.userName!)) {
                return [...prev, data.userName!];
              }
              return prev;
            });

            // Clear typing after 3 seconds
            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
            }
            typingTimeoutRef.current = setTimeout(() => {
              setTypingUsers((prev) => prev.filter(u => u !== data.userName));
            }, 3000);
          }
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
    [userName, onChannelReady, onNewMessage]
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
        reactions: [],
      };

      const p2pMessage: ChatP2PMessage = {
        type: 'message',
        userName,
        message: trimmed,
        timestamp: message.timestamp,
        reactions: [],
      };

      const channel = channelRef.current;

      // Add to UI immediately
      setMessages((prev) => [...prev, message]);

      // Send or queue
      if (!channel) {
        console.warn('⚠️ [useChat] Channel not created yet - queueing');
        outgoingQueueRef.current.push(JSON.stringify(p2pMessage));
        return;
      }

      if (channel.readyState === 'open') {
        try {
          const messageStr = JSON.stringify(p2pMessage);
          channel.send(messageStr);
          console.log('💬 [useChat] Message sent, buffered:', channel.bufferedAmount);
        } catch (e) {
          console.error('❌ [useChat] Failed to send:', e);
          outgoingQueueRef.current.push(JSON.stringify(p2pMessage));
        }
      } else {
        console.warn(`⚠️ [useChat] Channel state "${channel.readyState}" - queueing`);
        outgoingQueueRef.current.push(JSON.stringify(p2pMessage));
      }
    },
    [userName]
  );

  /**
   * Add reaction to message
   */
  const addReaction = useCallback(
    (messageIndex: number, emoji: string) => {
      // Update local state
      setMessages((prev) => {
        const updated = [...prev];
        const msg = updated[messageIndex];
        if (msg) {
          if (!msg.reactions) {
            msg.reactions = [];
          }

          const reaction = msg.reactions.find(r => r.emoji === emoji);
          if (reaction) {
            // Toggle reaction
            if (reaction.users.includes(userName)) {
              reaction.users = reaction.users.filter(u => u !== userName);
              if (reaction.users.length === 0) {
                msg.reactions = msg.reactions.filter(r => r.emoji !== emoji);
              }
            } else {
              reaction.users.push(userName);
            }
          } else {
            msg.reactions.push({ emoji, users: [userName] });
          }
        }
        return updated;
      });

      // Send to peer
      const p2pMessage: ChatP2PMessage = {
        type: 'reaction',
        messageIndex,
        emoji,
        userName,
      };

      const channel = channelRef.current;
      if (channel && channel.readyState === 'open') {
        try {
          channel.send(JSON.stringify(p2pMessage));
          console.log('👍 [useChat] Reaction sent:', emoji);
        } catch (e) {
          console.error('❌ [useChat] Failed to send reaction:', e);
        }
      }
    },
    [userName]
  );

  /**
   * Send typing indicator
   */
  const sendTyping = useCallback(() => {
    const channel = channelRef.current;
    if (channel && channel.readyState === 'open') {
      const p2pMessage: ChatP2PMessage = {
        type: 'typing',
        userName,
      };

      try {
        channel.send(JSON.stringify(p2pMessage));
        console.log('⌨️ [useChat] Typing indicator sent');
      } catch (e) {
        console.error('❌ [useChat] Failed to send typing:', e);
      }
    }
  }, [userName]);

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
    addReaction,
    sendTyping,
    typingUsers,
  };
}
