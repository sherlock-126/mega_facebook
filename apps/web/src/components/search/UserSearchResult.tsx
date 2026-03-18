'use client';

import { Card, CardContent, Avatar } from '@mega/ui';

interface UserSearchResultProps {
  userId: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  location: string | null;
  bio: string | null;
  highlight: Record<string, string[]>;
}

export function UserSearchResult({ userId, displayName, firstName, lastName, avatarUrl, location, bio, highlight }: UserSearchResultProps) {
  const nameDisplay = displayName || [firstName, lastName].filter(Boolean).join(' ') || 'Unknown User';

  return (
    <a href={`/profile/${userId}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="flex items-center gap-3 py-3">
          <Avatar
            src={avatarUrl ?? undefined}
            fallback={nameDisplay}
            size="default"
          />
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              {highlight.displayName ? (
                <span dangerouslySetInnerHTML={{ __html: highlight.displayName[0] }} />
              ) : (
                nameDisplay
              )}
            </p>
            {location && (
              <p className="text-sm text-muted-foreground">
                {highlight.location ? (
                  <span dangerouslySetInnerHTML={{ __html: highlight.location[0] }} />
                ) : (
                  location
                )}
              </p>
            )}
            {bio && (
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {highlight.bio ? (
                  <span dangerouslySetInnerHTML={{ __html: highlight.bio[0] }} />
                ) : (
                  bio
                )}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </a>
  );
}
