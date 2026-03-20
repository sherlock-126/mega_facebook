'use client';

import React from 'react';
import { cn } from '@mega/ui';

interface OnlineIndicatorProps {
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-2.5 w-2.5',
  md: 'h-3 w-3',
  lg: 'h-3.5 w-3.5',
};

export function OnlineIndicator({ isOnline, size = 'md', className }: OnlineIndicatorProps) {
  if (!isOnline) return null;

  return (
    <span
      className={cn(
        'block rounded-full bg-green-500 ring-2 ring-white',
        sizeClasses[size],
        className,
      )}
      aria-label="Online"
    />
  );
}
