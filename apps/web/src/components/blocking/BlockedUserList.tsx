'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button, Card, CardContent, Skeleton } from '@mega/ui';
import { listBlockedUsers, unblockUser } from '../../lib/block-api';
import type { BlockedUserSummary } from '@mega/shared';

export function BlockedUserList() {
  const [users, setUsers] = useState<BlockedUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const fetchBlocked = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listBlockedUsers(page, 20);
      setUsers(res.data);
      setTotalPages(res.meta.totalPages);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchBlocked();
  }, [fetchBlocked]);

  const handleUnblock = async (userId: string) => {
    setUnblockingId(userId);
    try {
      await unblockUser(userId);
      await fetchBlocked();
    } catch {
      // Error handled silently
    } finally {
      setUnblockingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          You haven&apos;t blocked anyone.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {users.map((user) => (
        <Card key={user.userId}>
          <CardContent className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">{user.displayName || 'Unknown User'}</p>
              <p className="text-sm text-gray-500">
                Blocked {new Date(user.blockedAt).toLocaleDateString()}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleUnblock(user.userId)}
              disabled={unblockingId === user.userId}
            >
              {unblockingId === user.userId ? 'Unblocking...' : 'Unblock'}
            </Button>
          </CardContent>
        </Card>
      ))}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="flex items-center text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
