'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
} from '@mega/ui';
import { deletePost } from '@/lib/post-api';

interface DeletePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  onDeleted: () => void;
}

export function DeletePostDialog({ open, onOpenChange, postId, onDeleted }: DeletePostDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deletePost(postId);
      onDeleted();
      onOpenChange(false);
    } catch {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Post</DialogTitle>
        </DialogHeader>
        <p className="mt-4 text-sm text-muted-foreground">
          Are you sure you want to delete this post? This action cannot be undone.
        </p>
        <div className="mt-4 flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
