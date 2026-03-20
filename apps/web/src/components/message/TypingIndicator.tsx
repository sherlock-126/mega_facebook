'use client';

import React from 'react';

interface TypingIndicatorProps {
  displayName: string | null;
}

export function TypingIndicator({ displayName }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-1 text-sm text-gray-500">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>{displayName || 'Someone'} is typing...</span>
    </div>
  );
}
