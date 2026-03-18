'use client';

import { cn } from '@mega/ui';
import type { PostMedia } from '@mega/shared';

interface PostMediaGalleryProps {
  media: PostMedia[];
  className?: string;
}

export function PostMediaGallery({ media, className }: PostMediaGalleryProps) {
  if (media.length === 0) return null;

  const gridClass =
    media.length === 1
      ? 'grid-cols-1'
      : media.length === 2
        ? 'grid-cols-2'
        : media.length === 3
          ? 'grid-cols-2'
          : 'grid-cols-2';

  return (
    <div className={cn('grid gap-1 overflow-hidden rounded-lg', gridClass, className)}>
      {media.map((item, idx) => (
        <div
          key={item.id}
          className={cn(
            'relative overflow-hidden bg-muted',
            media.length === 3 && idx === 0 && 'row-span-2',
          )}
        >
          <img
            src={item.url}
            alt={`Media ${idx + 1}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}
