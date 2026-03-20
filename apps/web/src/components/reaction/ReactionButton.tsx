'use client';

import { useState, useRef } from 'react';
import { Button } from '@mega/ui';
import { ReactionPicker, REACTION_EMOJIS } from './ReactionPicker';
import { toggleReaction } from '../../lib/reaction-api';
import type { ReactionType, ReactionTargetType } from '../../lib/reaction-api';

interface ReactionButtonProps {
  targetType: ReactionTargetType;
  targetId: string;
  userReaction: ReactionType | null;
  onReactionChange?: () => void;
}

export function ReactionButton({
  targetType,
  targetId,
  userReaction,
  onReactionChange,
}: ReactionButtonProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [currentReaction, setCurrentReaction] = useState<ReactionType | null>(userReaction);
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowPicker(true), 500);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowPicker(false), 300);
  };

  const handleSelect = async (type: ReactionType) => {
    if (isLoading) return;
    setIsLoading(true);
    setShowPicker(false);

    const previousReaction = currentReaction;
    // Optimistic update
    setCurrentReaction(type === currentReaction ? null : type);

    try {
      await toggleReaction(targetType, targetId, type);
      onReactionChange?.();
    } catch {
      setCurrentReaction(previousReaction);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClick = () => {
    // Quick toggle: if reacted, remove; if not, default to LIKE
    handleSelect(currentReaction ?? 'LIKE');
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        disabled={isLoading}
        className={currentReaction ? 'text-primary font-semibold' : ''}
      >
        {currentReaction
          ? `${REACTION_EMOJIS[currentReaction].emoji} ${REACTION_EMOJIS[currentReaction].label}`
          : '👍 Like'}
      </Button>
      {showPicker && (
        <div className="absolute bottom-full left-0 mb-1 z-50">
          <ReactionPicker onSelect={handleSelect} />
        </div>
      )}
    </div>
  );
}
