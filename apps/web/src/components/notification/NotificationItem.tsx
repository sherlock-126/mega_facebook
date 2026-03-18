'use client';

import React from 'react';
import { Avatar } from '@mega/ui';
import { cn } from '@mega/ui';
import type { NotificationResponse } from '@mega/shared';

interface NotificationItemProps {
  notification: NotificationResponse;
  onClick: () => void;
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

function getNotificationText(type: string): string {
  switch (type) {
    case 'NEW_MESSAGE': return 'sent you a message';
    case 'FRIEND_REQUEST': return 'sent you a friend request';
    case 'FRIEND_ACCEPTED': return 'accepted your friend request';
    case 'REACTION': return 'reacted to your post';
    case 'COMMENT': return 'commented on your post';
    case 'COMMENT_REPLY': return 'replied to your comment';
    default: return '';
  }
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors',
        'hover:bg-gray-100',
        !notification.isRead && 'bg-blue-50',
      )}
    >
      <Avatar
        className="h-10 w-10 shrink-0"
        src={notification.actor.avatarUrl}
        alt={notification.actor.displayName || ''}
        fallback={notification.actor.displayName || '?'}
      />

      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-medium">{notification.actor.displayName || 'Someone'}</span>{' '}
          {getNotificationText(notification.type)}
        </p>
        {notification.content && (
          <p className="text-sm text-gray-500 truncate mt-0.5">{notification.content}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">{formatTime(notification.createdAt)}</p>
      </div>

      {!notification.isRead && (
        <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shrink-0 mt-2" />
      )}
    </button>
  );
}
