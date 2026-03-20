'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Avatar } from '@mega/ui';
import { getReactionUsers } from '../../lib/reaction-api';
import { REACTION_EMOJIS } from './ReactionPicker';
import type { ReactionTargetType, ReactionUser } from '../../lib/reaction-api';

interface ReactionUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReactionTargetType;
  targetId: string;
}

export function ReactionUsersDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
}: ReactionUsersDialogProps) {
  const [users, setUsers] = useState<ReactionUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    getReactionUsers(targetType, targetId)
      .then((res) => setUsers(res.data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [open, targetType, targetId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reactions</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4">Loading...</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No reactions yet</p>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {users.map((user) => (
              <div key={user.userId} className="flex items-center gap-3">
                <Avatar
                  src={user.avatarUrl}
                  fallback={user.displayName || '?'}
                  size="default"
                />
                <span className="text-sm font-medium flex-1">
                  {user.displayName || 'Unknown User'}
                </span>
                <span className="text-lg">
                  {REACTION_EMOJIS[user.type]?.emoji}
                </span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
