/**
 * useReactions Hook
 * Manages floating heart/like animations with P2P sync
 * Features: Send reactions, display floating animations, sync across peers
 */

import { useState, useCallback } from 'react';

export interface Reaction {
  id: string;
  type: 'heart' | 'like' | 'clap' | 'fire';
  emoji: string;
  fromMe: boolean;
  userName: string;
  timestamp: number;
  x?: number; // Random X position for animation
  y?: number; // Starting Y position
}

export interface UseReactionsResult {
  reactions: Reaction[];
  sendReaction: (type: Reaction['type']) => void;
  addRemoteReaction: (reaction: Omit<Reaction, 'id' | 'timestamp' | 'x' | 'y'>) => void;
  clearReactions: () => void;
}

const REACTION_EMOJIS: Record<Reaction['type'], string> = {
  heart: '❤️',
  like: '👍',
  clap: '👏',
  fire: '🔥',
};

const REACTION_DURATION = 4000; // 4 seconds animation

export function useReactions(userName: string): UseReactionsResult {
  const [reactions, setReactions] = useState<Reaction[]>([]);

  /**
   * Send a reaction (local)
   */
  const sendReaction = useCallback((type: Reaction['type']) => {
    const newReaction: Reaction = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      emoji: REACTION_EMOJIS[type],
      fromMe: true,
      userName,
      timestamp: Date.now(),
      x: Math.random() * 80 + 10, // Random X: 10-90%
      y: 100, // Start from bottom
    };

    console.log('[useReactions] Sending reaction:', type);

    setReactions((prev) => [...prev, newReaction]);

    // Auto-remove after animation completes
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, REACTION_DURATION);
  }, [userName]);

  /**
   * Add remote reaction from peer
   */
  const addRemoteReaction = useCallback((
    reactionData: Omit<Reaction, 'id' | 'timestamp' | 'x' | 'y'>
  ) => {
    const newReaction: Reaction = {
      ...reactionData,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      x: Math.random() * 80 + 10, // Random X: 10-90%
      y: 100, // Start from bottom
    };

    console.log('[useReactions] Received remote reaction:', reactionData.type, 'from:', reactionData.userName);

    setReactions((prev) => [...prev, newReaction]);

    // Auto-remove after animation completes
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, REACTION_DURATION);
  }, []);

  /**
   * Clear all reactions
   */
  const clearReactions = useCallback(() => {
    setReactions([]);
  }, []);

  return {
    reactions,
    sendReaction,
    addRemoteReaction,
    clearReactions,
  };
}
