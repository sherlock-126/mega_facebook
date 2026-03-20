'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Skeleton } from '@mega/ui';
import { getMessages, sendMessage, markAsRead } from '../../lib/message-api';
import { useSocket } from '../../lib/socket-context';
import { useAuth } from '../../lib/auth-context';
import { usePresence } from '../../lib/presence-context';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { LastSeen } from '../presence/LastSeen';
import type { MessageResponse, ConversationListItem } from '@mega/shared';

interface ChatWindowProps {
  conversation: ConversationListItem;
}

export function ChatWindow({ conversation }: ChatWindowProps) {
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();
  const { user } = useAuth();
  const { presenceMap, trackUsers } = usePresence();
  const presence = presenceMap.get(conversation.participant.userId);

  useEffect(() => {
    trackUsers([conversation.participant.userId]);
  }, [conversation.participant.userId, trackUsers]);

  const fetchMessages = useCallback(async (cursor?: string) => {
    try {
      const res = await getMessages(conversation.id, cursor);
      if (cursor) {
        setMessages((prev) => [...prev, ...res.data]);
      } else {
        setMessages(res.data);
      }
      setHasMore(res.meta.hasMore);
      setNextCursor(res.meta.nextCursor);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  }, [conversation.id]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    fetchMessages();
    markAsRead(conversation.id).catch(() => {});
  }, [conversation.id, fetchMessages]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data: { message: MessageResponse; conversationId: string }) => {
      if (data.conversationId === conversation.id) {
        setMessages((prev) => [data.message, ...prev]);
        markAsRead(conversation.id).catch(() => {});
        setTypingUser(null);
      }
    };

    const handleTyping = (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === conversation.id && data.userId !== user?.userId) {
        setTypingUser(conversation.participant.displayName);
      }
    };

    const handleStopTyping = (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === conversation.id) {
        setTypingUser(null);
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:typing', handleTyping);
    socket.on('message:stop_typing', handleStopTyping);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:typing', handleTyping);
      socket.off('message:stop_typing', handleStopTyping);
    };
  }, [socket, conversation.id, conversation.participant.displayName, user?.userId]);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, loading]);

  const handleSend = async (content: string) => {
    await sendMessage(conversation.id, content);
  };

  const handleScroll = () => {
    if (!containerRef.current || !hasMore) return;
    const { scrollTop } = containerRef.current;
    if (scrollTop < 100 && nextCursor) {
      fetchMessages(nextCursor);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b p-4">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-12 w-48 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4 flex items-center gap-3">
        <div>
          <h2 className="font-semibold">
            {conversation.participant.displayName || 'Unknown User'}
          </h2>
          {presence && (
            <LastSeen
              status={presence.status}
              lastSeenAt={presence.lastSeenAt}
            />
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 flex flex-col-reverse"
      >
        <div ref={messagesEndRef} />
        {typingUser && <TypingIndicator displayName={typingUser} />}
        {messages.map((msg, index) => {
          const isOwn = msg.senderId === user?.userId;
          const nextMsg = messages[index + 1];
          const showAvatar = !nextMsg || nextMsg.senderId !== msg.senderId;

          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={isOwn}
              showAvatar={showAvatar}
            />
          );
        })}
        {hasMore && (
          <div className="text-center py-2">
            <button
              onClick={() => nextCursor && fetchMessages(nextCursor)}
              className="text-sm text-blue-500 hover:underline"
            >
              Load older messages
            </button>
          </div>
        )}
      </div>

      <MessageInput conversationId={conversation.id} onSend={handleSend} />
    </div>
  );
}
