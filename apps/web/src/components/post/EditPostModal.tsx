'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Textarea,
} from '@mega/ui';
import { updatePost } from '@/lib/post-api';
import type { PostResponse } from '@mega/shared';

interface EditPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: PostResponse;
  onSaved: () => void;
}

export function EditPostModal({ open, onOpenChange, post, onSaved }: EditPostModalProps) {
  const [content, setContent] = useState(post.content);
  const [visibility, setVisibility] = useState(post.visibility);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      await updatePost(post.id, { content, visibility });
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            maxLength={5000}
          />
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'FRIENDS_ONLY')}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="PUBLIC">Public</option>
            <option value="FRIENDS_ONLY">Friends Only</option>
          </select>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
