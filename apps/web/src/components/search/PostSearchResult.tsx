'use client';

import { Card, CardContent, Avatar } from '@mega/ui';

interface PostSearchResultProps {
  postId: string;
  authorId: string;
  author: { displayName: string | null; avatarUrl: string | null };
  content: string;
  visibility: string;
  createdAt: string;
  highlight: Record<string, string[]>;
}

export function PostSearchResult({ postId, authorId, author, content, visibility, createdAt, highlight }: PostSearchResultProps) {
  const timeAgo = formatRelativeTime(createdAt);

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="py-3">
        <div className="mb-2 flex items-center gap-2">
          <a href={`/profile/${authorId}`}>
            <Avatar
              src={author.avatarUrl ?? undefined}
              fallback={author.displayName ?? 'U'}
              size="sm"
            />
          </a>
          <div>
            <a href={`/profile/${authorId}`} className="text-sm font-medium hover:underline">
              {author.displayName ?? 'Unknown User'}
            </a>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{timeAgo}</span>
              {visibility === 'FRIENDS_ONLY' && <span>· Friends</span>}
            </div>
          </div>
        </div>
        <div className="text-sm">
          {highlight.content ? (
            <span dangerouslySetInnerHTML={{ __html: highlight.content[0] }} />
          ) : (
            <span>{content.length > 300 ? content.slice(0, 300) + '...' : content}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
