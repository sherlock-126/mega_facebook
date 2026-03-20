'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button, Textarea } from '@mega/ui';
import { useSocket } from '../../lib/socket-context';

interface MessageInputProps {
  conversationId: string;
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
}

export function MessageInput({ conversationId, onSend, disabled }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const { socket } = useSocket();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTyping = useCallback(() => {
    if (!socket) return;
    socket.emit('message:typing', { conversationId });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('message:stop_typing', { conversationId });
    }, 2000);
  }, [socket, conversationId]);

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      await onSend(trimmed);
      setContent('');
      if (socket) {
        socket.emit('message:stop_typing', { conversationId });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t p-4 flex gap-2 items-end">
      <Textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          handleTyping();
        }}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        className="resize-none min-h-[40px] max-h-[120px]"
        rows={1}
        disabled={disabled || sending}
      />
      <Button
        onClick={handleSend}
        disabled={!content.trim() || disabled || sending}
        className="shrink-0"
      >
        Send
      </Button>
    </div>
  );
}
