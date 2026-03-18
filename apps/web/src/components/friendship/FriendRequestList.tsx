'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, Avatar, Button, Skeleton } from '@mega/ui';
import {
  listIncomingRequests,
  acceptFriendRequest,
  rejectFriendRequest,
} from '../../lib/friendship-api';
import type { FriendRequestSummary } from '@mega/shared';

export function FriendRequestList() {
  const [requests, setRequests] = useState<FriendRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await listIncomingRequests(1, 50);
      setRequests(res.data);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAccept = async (id: string) => {
    setActionLoadingId(id);
    try {
      await acceptFriendRequest(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // Error handled silently
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoadingId(id);
    try {
      await rejectFriendRequest(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // Error handled silently
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-3 py-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
        Friend Requests ({requests.length})
      </h3>
      <div className="space-y-2">
        {requests.map((req) => (
          <Card key={req.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <a href={`/profile/${req.requester?.userId}`}>
                  <Avatar
                    src={req.requester?.avatarUrl ?? undefined}
                    fallback={req.requester?.displayName ?? 'U'}
                    size="default"
                  />
                </a>
                <a href={`/profile/${req.requester?.userId}`} className="font-medium hover:underline">
                  {req.requester?.displayName ?? 'Unknown User'}
                </a>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAccept(req.id)}
                  disabled={actionLoadingId === req.id}
                >
                  Accept
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReject(req.id)}
                  disabled={actionLoadingId === req.id}
                >
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
