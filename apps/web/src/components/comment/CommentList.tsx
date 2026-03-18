'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@mega/ui';
import type { CommentResponse } from '@mega/shared';
import { getComments } from '../../lib/comment-api';
import { CommentItem } from './CommentItem';

interface CommentListProps {
  postId: string;
  currentUserId?: string;
  refreshKey?: number;
  onChanged?: () => void;
}

export function CommentList({ postId, currentUserId, refreshKey, onChanged }: CommentListProps) {
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const loadComments = useCallback(async (pageNum: number) => {
    setIsLoading(true);
    try {
      const res = await getComments(postId, pageNum);
      setComments(res.data);
      setTotalPages(res.meta.totalPages);
      setPage(pageNum);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    loadComments(1);
  }, [loadComments, refreshKey]);

  if (isLoading && comments.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">Loading comments...</p>;
  }

  if (comments.length === 0) {
    return null;
  }

  return (
    <div>
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          currentUserId={currentUserId}
          postId={postId}
          onChanged={() => {
            loadComments(page);
            onChanged?.();
          }}
        />
      ))}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadComments(page - 1)}
            disabled={page <= 1 || isLoading}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground self-center">
            {page} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadComments(page + 1)}
            disabled={page >= totalPages || isLoading}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
