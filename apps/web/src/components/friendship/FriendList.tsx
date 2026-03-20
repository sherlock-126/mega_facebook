'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, Avatar, Button, Skeleton } from '@mega/ui';
import { listFriends } from '../../lib/friendship-api';
import type { FriendSummary } from '@mega/shared';

interface FriendListProps {
  userId?: string;
}

export function FriendList({ userId: _userId }: FriendListProps) {
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function fetchFriends() {
      setLoading(true);
      try {
        const res = await listFriends(page, 20);
        setFriends(res.data);
        setTotalPages(res.meta.totalPages);
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchFriends();
  }, [page]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex flex-col items-center py-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <Skeleton className="mt-2 h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <Card className="mt-4">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-lg font-medium text-muted-foreground">No friends yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Search for people to connect with.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {friends.map((friend) => (
          <a key={friend.userId} href={`/profile/${friend.userId}`}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex flex-col items-center py-4">
                <Avatar
                  src={friend.avatarUrl ?? undefined}
                  fallback={friend.displayName ?? 'U'}
                  size="lg"
                />
                <p className="mt-2 text-sm font-medium text-center truncate w-full px-2">
                  {friend.displayName ?? 'Unknown User'}
                </p>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
