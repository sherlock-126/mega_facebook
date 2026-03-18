'use client';

import { useState } from 'react';
import { createComment } from '../../lib/comment-api';
import { CommentForm } from './CommentForm';
import { CommentList } from './CommentList';

interface CommentSectionProps {
  postId: string;
  currentUserId?: string;
  commentCount?: number;
  onChanged?: () => void;
}

export function CommentSection({
  postId,
  currentUserId,
  commentCount = 0,
  onChanged,
}: CommentSectionProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [showComments, setShowComments] = useState(false);

  const handleSubmit = async (content: string) => {
    await createComment(postId, content);
    setRefreshKey((k) => k + 1);
    setShowComments(true);
    onChanged?.();
  };

  return (
    <div className="mt-2 border-t pt-2">
      {commentCount > 0 && !showComments && (
        <button
          className="text-xs text-muted-foreground hover:underline mb-2 cursor-pointer"
          onClick={() => setShowComments(true)}
        >
          View {commentCount} comments
        </button>
      )}

      {showComments && (
        <CommentList
          postId={postId}
          currentUserId={currentUserId}
          refreshKey={refreshKey}
          onChanged={() => {
            setRefreshKey((k) => k + 1);
            onChanged?.();
          }}
        />
      )}

      {currentUserId && (
        <div className="mt-2">
          <CommentForm onSubmit={handleSubmit} />
        </div>
      )}
    </div>
  );
}
