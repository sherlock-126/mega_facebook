'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const avatarVariants = cva(
  'relative inline-flex shrink-0 overflow-hidden rounded-full bg-muted',
  {
    variants: {
      size: {
        sm: 'h-8 w-8 text-xs',
        default: 'h-10 w-10 text-sm',
        lg: 'h-16 w-16 text-lg',
        xl: 'h-24 w-24 text-2xl',
        '2xl': 'h-32 w-32 text-3xl',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  src?: string | null;
  alt?: string;
  fallback?: string;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size, src, alt, fallback, ...props }, ref) => {
    const [imgError, setImgError] = React.useState(false);

    React.useEffect(() => {
      setImgError(false);
    }, [src]);

    const initials = fallback
      ? fallback
          .split(' ')
          .map((w) => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : '?';

    return (
      <div ref={ref} className={cn(avatarVariants({ size, className }))} {...props}>
        {src && !imgError ? (
          <img
            src={src}
            alt={alt || ''}
            className="aspect-square h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary/10 font-medium text-primary">
            {initials}
          </div>
        )}
      </div>
    );
  },
);
Avatar.displayName = 'Avatar';

export { Avatar, avatarVariants };
