'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@mega/ui';
import {
  getFriendshipStatus,
  sendFriendRequest,
  unfriend,
  acceptFriendRequest,
} from '../../lib/friendship-api';
import type { FriendshipStatusResponse } from '@mega/shared';

interface FriendRequestButtonProps {
  userId: string;
}

export function FriendRequestButton({ userId }: FriendRequestButtonProps) {
  const [status, setStatus] = useState<FriendshipStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await getFriendshipStatus(userId);
      setStatus(res.data);
    } catch {
      // Silently fail - button won't show
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSendRequest = async () => {
    setActionLoading(true);
    try {
      await sendFriendRequest(userId);
      await fetchStatus();
    } catch {
      // Error handled silently
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfriend = async () => {
    setActionLoading(true);
    try {
      await unfriend(userId);
      await fetchStatus();
    } catch {
      // Error handled silently
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!status?.friendshipId) return;
    setActionLoading(true);
    try {
      await acceptFriendRequest(status.friendshipId);
      await fetchStatus();
    } catch {
      // Error handled silently
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      await unfriend(userId);
      await fetchStatus();
    } catch {
      // Error handled silently
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !status) return null;

  if (status.status === 'FRIENDS') {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleUnfriend}
        disabled={actionLoading}
      >
        {actionLoading ? 'Removing...' : 'Unfriend'}
      </Button>
    );
  }

  if (status.status === 'PENDING_SENT') {
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={handleCancel}
        disabled={actionLoading}
      >
        {actionLoading ? 'Cancelling...' : 'Cancel Request'}
      </Button>
    );
  }

  if (status.status === 'PENDING_RECEIVED') {
    return (
      <Button
        variant="default"
        size="sm"
        onClick={handleAccept}
        disabled={actionLoading}
      >
        {actionLoading ? 'Accepting...' : 'Accept Request'}
      </Button>
    );
  }

  return (
    <Button
      variant="default"
      size="sm"
      onClick={handleSendRequest}
      disabled={actionLoading}
    >
      {actionLoading ? 'Sending...' : 'Add Friend'}
    </Button>
  );
}
