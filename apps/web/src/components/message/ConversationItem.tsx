'use client';

import React, { useEffect } from 'react';
import { Avatar } from '@mega/ui';
import { cn } from '@mega/ui';
import type { ConversationListItem } from '@mega/shared';
import { usePresence } from '../../lib/presence-context';
import { OnlineIndicator } from '../presence/OnlineIndicator';

interface ConversationItemProps {
  conversation: ConversationListItem;
  isActive: boolean;
  onClick: () => void;
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return new Date(date).toLocaleDateString();
}

export function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  const { participant, lastMessage, unreadCount } = conversation;
  const { presenceMap, trackUsers } = usePresence();
  const presence = presenceMap.get(participant.userId);

  useEffect(() => {
    trackUsers([participant.userId]);
  }, [participant.userId, trackUsers]);

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
        'hover:bg-gray-100',
        isActive && 'bg-blue-50 hover:bg-blue-50',
      )}
    >
      <div className="relative shrink-0">
        <Avatar
          className="h-12 w-12"
          src={participant.avatarUrl}
          alt={participant.displayName || ''}
          fallback={participant.displayName || '?'}
        />
        <OnlineIndicator
          isOnline={presence?.status === 'online'}
          size="sm"
          className="absolute bottom-0 right-0"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={cn('font-medium truncate', unreadCount > 0 && 'font-bold')}>
            {participant.displayName || 'Unknown User'}
          </span>
          {lastMessage && (
            <span className="text-xs text-gray-500 shrink-0 ml-2">
              {formatTime(lastMessage.createdAt)}
            </span>
          )}
        </div>
        {lastMessage && (
          <p
            className={cn(
              'text-sm truncate',
              unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500',
            )}
          >
            {lastMessage.content}
          </p>
        )}
      </div>

      {unreadCount > 0 && (
        <span className="bg-blue-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
