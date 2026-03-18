'use client';

import { REACTION_EMOJIS } from './ReactionPicker';

interface ReactionSummaryProps {
  totalCount: number;
  topTypes: string[];
  onClick?: () => void;
}

export function ReactionSummary({ totalCount, topTypes, onClick }: ReactionSummaryProps) {
  if (totalCount === 0) return null;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:underline cursor-pointer"
    >
      <span className="flex -space-x-1">
        {topTypes.map((type) => (
          <span key={type} className="text-sm">
            {REACTION_EMOJIS[type as keyof typeof REACTION_EMOJIS]?.emoji}
          </span>
        ))}
      </span>
      <span>{totalCount}</span>
    </button>
  );
}
