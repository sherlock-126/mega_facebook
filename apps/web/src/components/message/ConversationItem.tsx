'use client';

import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@mega/ui';
import { cn } from '@mega/ui';
import type { ConversationListItem } from '@mega/shared';

interface ConversationItemProps {
  conversation: ConversationListItem;
  isActive: boolean;
  onClick: () => void;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
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

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
        'hover:bg-gray-100',
        isActive && 'bg-blue-50 hover:bg-blue-50',
      )}
    >
      <Avatar className="h-12 w-12 shrink-0">
        {participant.avatarUrl ? (
          <AvatarImage src={participant.avatarUrl} alt={participant.displayName || ''} />
        ) : null}
        <AvatarFallback>{getInitials(participant.displayName)}</AvatarFallback>
      </Avatar>

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
