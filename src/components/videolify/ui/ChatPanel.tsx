'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X } from 'lucide-react';
import { useState, KeyboardEvent } from 'react';

interface ChatMessage {
  text: string;
  fromMe: boolean;
  sender: string;
  timestamp: number;
}

interface ChatPanelProps {
  show: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  userDisplayName: string;
}

export function ChatPanel({
  show,
  onClose,
  messages,
  onSendMessage,
  userDisplayName,
}: ChatPanelProps) {
  const [chatInput, setChatInput] = useState('');

  if (!show) return null;

  const handleSendMessage = () => {
    if (chatInput.trim()) {
      onSendMessage(chatInput);
      setChatInput('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && chatInput.trim()) {
      handleSendMessage();
    }
  };

  return (
    <Card className="absolute right-4 top-4 bottom-24 w-80 flex flex-col">
      <div className="p-4 border-b font-semibold flex justify-between">
        <span>Chat</span>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[70%] rounded-lg px-3 py-2 ${
                  msg.fromMe ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-900'
                }`}
              >
                <div className="text-xs opacity-70 mb-1">{msg.sender}</div>
                <div className="text-sm">{msg.text}</div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="p-4 border-t flex gap-2">
        <Input
          placeholder="Nhập tin nhắn..."
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <Button onClick={handleSendMessage}>Gửi</Button>
      </div>
    </Card>
  );
}
