'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  X, Send, GripVertical, ThumbsUp, HelpCircle,
  CheckCircle, Smile, MoreVertical
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

export interface ChatMessage {
  text: string;
  fromMe: boolean;
  sender: string;
  timestamp: number;
  reactions?: { emoji: string; users: string[] }[];
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
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
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

  const ChatContent = (
    <Card className="flex flex-col shadow-2xl overflow-hidden h-full">
      {/* Header - Draggable handle */}
      <div className="chat-header p-3 border-b font-semibold flex justify-between items-center bg-white cursor-move select-none">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-gray-400" />
          <span className="text-sm">💬 Chat</span>

          {/* Role badge */}
          <Badge variant={role === 'teacher' ? 'default' : 'secondary'} className="text-xs">
            {role === 'teacher' ? '👨‍🏫' : '👨‍🎓'}
          </Badge>
        </div>

        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={onClose} title="Đóng">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-3">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'} group`}
            >
              <div className="flex gap-2 max-w-[85%]">
                {/* Avatar for received messages */}
                {!msg.fromMe && (
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="text-xs">
                      {msg.sender.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div className="flex flex-col gap-1">
                  {/* Message bubble */}
                  <div
                    className={`rounded-lg px-3 py-2 ${
                      msg.fromMe
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-900'
                    }`}
                  >
                    {/* Sender name + time */}
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <div className="text-xs font-medium opacity-80">
                        {msg.sender}
                      </div>
                      <div className="text-xs opacity-70 whitespace-nowrap">
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>

                    {/* Message text */}
                    <div className="text-sm break-words">{msg.text}</div>
                  </div>

                  {/* Reactions bar */}
                  <div className="flex gap-1 items-center ml-1">
                    {/* Existing reactions */}
                    {['👍', '❓', '✅'].map((emoji) => {
                      const count = getReactionCount(msg, emoji);
                      const hasReacted = hasUserReacted(msg, emoji);

                      if (count === 0 && !msg.fromMe) {
                        return (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(idx, emoji)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs hover:scale-110 transform duration-100 px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200"
                            title={`Phản ứng ${emoji}`}
                          >
                            {emoji}
                          </button>
                        );
                      }

                      if (count > 0) {
                        return (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(idx, emoji)}
                            className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-1 transition-all ${
                              hasReacted
                                ? 'bg-blue-100 border border-blue-500'
                                : 'bg-gray-100 hover:bg-gray-200'
                            }`}
                          >
                            <span>{emoji}</span>
                            <span className="text-[10px] font-medium">{count}</span>
                          </button>
                        );
                      }

                      return null;
                    })}

                    {/* Show quick reaction buttons on hover for received messages */}
                    {!msg.fromMe &&
                      getReactionCount(msg, '👍') === 0 &&
                      getReactionCount(msg, '❓') === 0 &&
                      getReactionCount(msg, '✅') === 0 && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <button
                            onClick={() => handleReaction(idx, '👍')}
                            className="text-xs hover:scale-110 transform duration-100 px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200"
                            title="Thích"
                          >
                            👍
                          </button>
                          <button
                            onClick={() => handleReaction(idx, '❓')}
                            className="text-xs hover:scale-110 transform duration-100 px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200"
                            title="Thắc mắc"
                          >
                            ❓
                          </button>
                          <button
                            onClick={() => handleReaction(idx, '✅')}
                            className="text-xs hover:scale-110 transform duration-100 px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200"
                            title="Hiểu rồi"
                          >
                            ✅
                          </button>
                        </div>
                      )
                    }
                  </div>
                </div>

                {/* Avatar for sent messages */}
                {msg.fromMe && (
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="text-xs bg-blue-600 text-white">
                      {msg.sender.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="flex justify-start">
              <div className="flex gap-2 items-center">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs">
                    {typingUsers[0].charAt(0).toUpperCase()}
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
      </ScrollArea>

      {/* Input Area */}
      <div className="p-3 border-t bg-white">
        <div className="flex gap-2">
          <Input
            placeholder="Nhập tin nhắn..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyPress}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!chatInput.trim()}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Hints */}
        <div className="text-xs text-muted-foreground mt-2">
          Enter để gửi
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
