'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Skeleton } from '@mega/ui';
import { listConversations } from '../../lib/message-api';
import { useSocket } from '../../lib/socket-context';
import { ConversationItem } from './ConversationItem';
import type { ConversationListItem } from '@mega/shared';

interface ConversationListProps {
  activeConversationId?: string;
  onSelectConversation: (conversation: ConversationListItem) => void;
}

export function ConversationList({ activeConversationId, onSelectConversation }: ConversationListProps) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  const fetchConversations = useCallback(async () => {
    try {
      const res = await listConversations();
      setConversations(res.data);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data: { message: any; conversationId: string }) => {
      setConversations((prev) => {
        const updated = prev.map((conv) => {
          if (conv.id === data.conversationId) {
            return {
              ...conv,
              lastMessage: {
                content: data.message.content,
                createdAt: data.message.createdAt,
                senderId: data.message.senderId,
              },
              unreadCount:
                data.conversationId === activeConversationId
                  ? conv.unreadCount
                  : conv.unreadCount + 1,
              updatedAt: new Date(),
            };
          }
          return conv;
        });
        return updated.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
      });
    };

    socket.on('message:new', handleNewMessage);
    return () => {
      socket.off('message:new', handleNewMessage);
    };
  }, [socket, activeConversationId]);

  if (loading) {
    return (
      <div className="space-y-2 p-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm p-4">
        No conversations yet
      </div>
    );
  }

  return (
    <div className="overflow-y-auto p-2 space-y-1">
      {conversations.map((conv) => (
        <ConversationItem
          key={conv.id}
          conversation={conv}
          isActive={conv.id === activeConversationId}
          onClick={() => onSelectConversation(conv)}
        />
      ))}
    </div>
  );
}
