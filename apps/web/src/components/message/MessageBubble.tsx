'use client';

import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@mega/ui';
import { cn } from '@mega/ui';
import type { MessageResponse } from '@mega/shared';

interface MessageBubbleProps {
  message: MessageResponse;
  isOwn: boolean;
  showAvatar: boolean;
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function MessageBubble({ message, isOwn, showAvatar }: MessageBubbleProps) {
  return (
    <div className={cn('flex items-end gap-2 mb-1', isOwn && 'flex-row-reverse')}>
      {showAvatar && !isOwn ? (
        <Avatar className="h-8 w-8 shrink-0">
          {message.sender.avatarUrl ? (
            <AvatarImage src={message.sender.avatarUrl} alt={message.sender.displayName || ''} />
          ) : null}
          <AvatarFallback className="text-xs">
            {message.sender.displayName?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-8 shrink-0" />
      )}

      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-4 py-2',
          isOwn ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900',
        )}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        <p
          className={cn(
            'text-xs mt-1',
            isOwn ? 'text-blue-100' : 'text-gray-400',
          )}
        >
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
