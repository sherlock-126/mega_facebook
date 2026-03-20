'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@mega/ui';
import { blockUser, unblockUser, getBlockStatus } from '../../lib/block-api';
import type { BlockStatusResponse } from '@mega/shared';

interface BlockButtonProps {
  userId: string;
}

export function BlockButton({ userId }: BlockButtonProps) {
  const [status, setStatus] = useState<BlockStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await getBlockStatus(userId);
      setStatus(res.data);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleBlock = async () => {
    setActionLoading(true);
    try {
      await blockUser(userId);
      await fetchStatus();
    } catch {
      // Error handled silently
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblock = async () => {
    setActionLoading(true);
    try {
      await unblockUser(userId);
      await fetchStatus();
    } catch {
      // Error handled silently
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !status) return null;

  if (status.isBlocked) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleUnblock}
        disabled={actionLoading}
      >
        {actionLoading ? 'Unblocking...' : 'Unblock'}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleBlock}
      disabled={actionLoading}
      className="text-red-600 hover:text-red-700"
    >
      {actionLoading ? 'Blocking...' : 'Block'}
    </Button>
  );
}
