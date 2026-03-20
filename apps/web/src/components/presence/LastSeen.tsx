'use client';

import React from 'react';
import { cn } from '@mega/ui';

interface LastSeenProps {
  status: 'online' | 'offline' | 'unknown';
  lastSeenAt: string | null;
  className?: string;
}

function formatLastSeen(lastSeenAt: string): string {
  const now = new Date();
  const date = new Date(lastSeenAt);
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Active just now';
  if (minutes < 60) return `Active ${minutes}m ago`;
  if (hours < 24) return `Active ${hours}h ago`;
  if (days < 7) return `Active ${days}d ago`;
  return `Active on ${date.toLocaleDateString()}`;
}

export function LastSeen({ status, lastSeenAt, className }: LastSeenProps) {
  if (status === 'online') {
    return (
      <span className={cn('text-xs text-green-600', className)}>
        Online
      </span>
    );
  }

  if (status === 'offline' && lastSeenAt) {
    return (
      <span className={cn('text-xs text-gray-500', className)}>
        {formatLastSeen(lastSeenAt)}
      </span>
    );
  }

  return null;
}
