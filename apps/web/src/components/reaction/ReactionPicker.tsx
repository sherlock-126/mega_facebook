'use client';

import type { ReactionType } from '../../lib/reaction-api';

const REACTION_EMOJIS: Record<ReactionType, { emoji: string; label: string }> = {
  LIKE: { emoji: '👍', label: 'Like' },
  LOVE: { emoji: '❤️', label: 'Love' },
  HAHA: { emoji: '😂', label: 'Haha' },
  WOW: { emoji: '😮', label: 'Wow' },
  SAD: { emoji: '😢', label: 'Sad' },
  ANGRY: { emoji: '😡', label: 'Angry' },
};

interface ReactionPickerProps {
  onSelect: (type: ReactionType) => void;
}

export function ReactionPicker({ onSelect }: ReactionPickerProps) {
  return (
    <div className="flex gap-1 rounded-full bg-background border shadow-lg px-2 py-1">
      {(Object.entries(REACTION_EMOJIS) as [ReactionType, { emoji: string; label: string }][]).map(
        ([type, { emoji, label }]) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className="text-xl hover:scale-125 transition-transform p-1 cursor-pointer"
            title={label}
          >
            {emoji}
          </button>
        ),
      )}
    </div>
  );
}

export { REACTION_EMOJIS };
