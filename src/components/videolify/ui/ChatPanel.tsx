'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  X, Send, GripVertical, ThumbsUp, HelpCircle,
  CheckCircle, Smile, MoreVertical, MessageSquare
} from 'lucide-react';
import { useState, KeyboardEvent, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ChatMessage as ChatMessageType } from '../types';

export interface ChatMessage extends ChatMessageType {
  // Compatibility aliases for existing code
  text?: string;
  sender?: string;
}

interface ChatPanelProps {
  show: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  userDisplayName: string;
  onReaction?: (messageIndex: number, emoji: string) => void;
  typingUsers?: string[];
  role?: 'teacher' | 'student';
}

export function ChatPanel({
  show,
  onClose,
  messages,
  onSendMessage,
  userDisplayName,
  onReaction,
  typingUsers = [],
  role = 'student',
}: ChatPanelProps) {
  const [chatInput, setChatInput] = useState('');
  const [size, setSize] = useState({ width: 380, height: 500 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Initialize position (right side of screen)
  useEffect(() => {
    if (show && position.x === 0 && position.y === 0) {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      setPosition({
        x: screenWidth - size.width - 32,
        y: Math.max(16, (screenHeight - size.height) / 2 - 50),
      });
    }
  }, [show]);

  if (!show) return null;

  const handleSendMessage = () => {
    if (chatInput.trim()) {
      onSendMessage(chatInput);
      setChatInput('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && chatInput.trim()) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReaction = (messageIndex: number, emoji: string) => {
    if (onReaction) {
      onReaction(messageIndex, emoji);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const getReactionCount = (message: ChatMessage, emoji: string) => {
    const reaction = message.reactions?.find(r => r.emoji === emoji);
    return reaction?.users.length || 0;
  };

  const hasUserReacted = (message: ChatMessage, emoji: string) => {
    const reaction = message.reactions?.find(r => r.emoji === emoji);
    return reaction?.users.includes(userDisplayName) || false;
  };

  // Shorten name intelligently
  const getShortName = (fullName: string) => {
    if (!fullName) return 'User';

    const parts = fullName.trim().split(/\s+/);

    // If single word, return as is (max 12 chars)
    if (parts.length === 1) {
      return parts[0].length > 12 ? parts[0].substring(0, 12) + '...' : parts[0];
    }

    // If 2 words, return last 2 words (Vietnamese: "Văn A", English: "John D")
    if (parts.length === 2) {
      return parts.join(' ');
    }

    // If 3+ words (Vietnamese full name), return last 2 words
    // "Nguyễn Văn A" → "Văn A"
    return parts.slice(-2).join(' ');
  };

  const ChatContent = (
    <Card className="flex flex-col shadow-2xl overflow-hidden" style={{ height: '100%' }}>
      {/* Header - Draggable handle - Fixed height */}
      <div className="chat-header px-4 py-3 border-b font-semibold flex justify-between items-center bg-gradient-to-r from-blue-50 to-white cursor-move select-none flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-gray-800">Chat</span>
          {/* Role badge */}
          <Badge variant={role === 'teacher' ? 'default' : 'secondary'} className="text-sm h-5 px-1.5">
            {role === 'teacher' ? '👨‍🏫' : '👨‍🎓'}
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0 hover:bg-red-100" title="Đóng">
          <X className="w-4 h-4 text-gray-500" />
        </Button>
      </div>

      {/* Messages Area - Flexible height with custom scrollbar */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-3"
        ref={scrollAreaRef}
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#cbd5e1 #f1f5f9'
        }}
      >
        <div className="space-y-1">
          {messages.map((msg, idx) => {
            // Check if previous message is from same sender (for grouping)
            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const sameAsPrev = prevMsg && prevMsg.fromMe === msg.fromMe &&
              (prevMsg.sender || prevMsg.userName) === (msg.sender || msg.userName);
            const showAvatar = !sameAsPrev;
            const fullName = msg.sender || msg.userName || 'User';
            const shortName = getShortName(fullName);

            return (
              <div
                key={idx}
                className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'} ${sameAsPrev ? '' : 'mt-1.5'}`}
              >
                <div className={`flex gap-1.5 max-w-[80%] ${msg.fromMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar - only show for first message in group */}
                  {showAvatar ? (
                    <Avatar className="w-6 h-6 flex-shrink-0 shadow-sm" title={fullName}>
                      <AvatarFallback className="text-[9px] font-semibold bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                        {fullName[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-6" />
                  )}

                  <div className="flex flex-col">
                    {/* Sender name - only for first message in group and not from me */}
                    {showAvatar && !msg.fromMe && (
                      <div className="text-[11px] font-semibold text-gray-700 px-1 mb-1" title={fullName}>
                        {shortName}
                      </div>
                    )}

                    {/* Message bubble */}
                    <div
                      className={`rounded-xl px-2.5 py-1.5 ${
                        msg.fromMe
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-900'
                      }`}
                    >
                      {/* Message text with time inline */}
                      <div className="flex items-end gap-2">
                        <div className="text-[13px] leading-snug break-words flex-1">
                          {msg.text || msg.message}
                        </div>
                        <div className={`text-[9px] flex-shrink-0 opacity-70 ${msg.fromMe ? 'text-blue-50' : 'text-gray-500'}`}>
                          {formatTime(msg.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="flex justify-start">
              <div className="flex gap-2 items-center">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs">
                    {typingUsers[0]?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="bg-gray-200 rounded-lg px-3 py-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area - Fixed height */}
      <div className="px-4 py-3 border-t bg-gray-50 flex-shrink-0">
        <div className="flex gap-2 items-center">
          <Input
            placeholder="Nhập tin nhắn..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyPress}
            className="flex-1 h-10 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!chatInput.trim()}
            size="icon"
            className="h-10 w-10 bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        {/* Hints */}
        <div className="text-[10px] text-gray-500 mt-1.5 flex items-center gap-1">
          <span className="opacity-60">💡</span>
          <span>Enter để gửi tin nhắn</span>
        </div>
      </div>
    </Card>
  );

  return (
    <Draggable
      handle=".chat-header"
      bounds="parent"
      position={position}
      onStop={(e, data) => setPosition({ x: data.x, y: data.y })}
    >
      <div className="absolute z-40" style={{ left: 0, top: 0 }}>
        <ResizableBox
          width={size.width}
          height={size.height}
          minConstraints={[320, 400]}
          maxConstraints={[600, window.innerHeight - 100]}
          onResize={(e, data) => {
            setSize({ width: data.size.width, height: data.size.height });
          }}
          resizeHandles={['sw', 'nw', 'w', 's', 'n']}
          className="react-resizable-custom"
        >
          {ChatContent}
        </ResizableBox>
      </div>
    </Draggable>
  );
}
