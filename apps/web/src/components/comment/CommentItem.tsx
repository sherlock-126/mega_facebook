'use client';

import { useState } from 'react';
import { Avatar, Button, Textarea } from '@mega/ui';
import type { CommentResponse } from '@mega/shared';
import { updateComment, deleteComment, getReplies, createComment } from '../../lib/comment-api';
import { ReactionButton } from '../reaction/ReactionButton';
import { CommentForm } from './CommentForm';

function timeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

interface CommentItemProps {
  comment: CommentResponse;
  currentUserId?: string;
  postId: string;
  isReply?: boolean;
  onChanged?: () => void;
}

export function CommentItem({
  comment,
  currentUserId,
  postId,
  isReply = false,
  onChanged,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replies, setReplies] = useState<CommentResponse[]>([]);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isAuthor = currentUserId === comment.userId;

  const handleEdit = async () => {
    const trimmed = editContent.trim();
    if (!trimmed || isSaving) return;
    setIsSaving(true);
    try {
      await updateComment(comment.id, trimmed);
      setIsEditing(false);
      onChanged?.();
    } catch {
      // keep editing
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteComment(comment.id);
      onChanged?.();
    } catch {
      // ignore
    }
  };

  const loadReplies = async () => {
    if (isLoadingReplies) return;
    setIsLoadingReplies(true);
    try {
      const res = await getReplies(comment.id);
      setReplies(res.data);
      setShowReplies(true);
    } catch {
      // ignore
    } finally {
      setIsLoadingReplies(false);
    }
  };

  const handleReply = async (content: string) => {
    await createComment(postId, content, comment.id);
    setShowReplyForm(false);
    await loadReplies();
    onChanged?.();
  };

  if (comment.isDeleted) {
    return (
      <div className={`${isReply ? 'ml-10' : ''} py-2`}>
        <p className="text-sm text-muted-foreground italic">[deleted]</p>
      </div>
    );
  }

  return (
    <div className={`${isReply ? 'ml-10' : ''}`}>
      <div className="flex gap-2 py-2">
        <Avatar
          src={comment.author.avatarUrl}
          fallback={comment.author.displayName || '?'}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <div className="bg-muted rounded-lg px-3 py-2">
            <span className="text-xs font-semibold">
              {comment.author.displayName || 'Unknown User'}
            </span>
            {isEditing ? (
              <div className="mt-1">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="text-sm min-h-[40px] resize-none"
                  rows={2}
                  maxLength={2000}
                />
                <div className="flex gap-1 mt-1">
                  <Button size="sm" onClick={handleEdit} disabled={isSaving}>
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setEditContent(comment.content);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>{timeAgo(comment.createdAt)}</span>
            {comment.isEdited && <span>(edited)</span>}
            <ReactionButton
              targetType="COMMENT"
              targetId={comment.id}
              userReaction={null}
              onReactionChange={onChanged}
            />
            {!isReply && (
              <button
                className="hover:underline cursor-pointer"
                onClick={() => setShowReplyForm(!showReplyForm)}
              >
                Reply
              </button>
            )}
            {isAuthor && !isEditing && (
              <>
                <button
                  className="hover:underline cursor-pointer"
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </button>
                <button
                  className="hover:underline cursor-pointer text-destructive"
                  onClick={handleDelete}
                >
                  Delete
                </button>
              </>
            )}
          </div>

          {!isReply && comment.replyCount > 0 && !showReplies && (
            <button
              className="text-xs text-primary hover:underline mt-1 cursor-pointer"
              onClick={loadReplies}
            >
              {isLoadingReplies ? 'Loading...' : `View ${comment.replyCount} replies`}
            </button>
          )}

          {showReplyForm && !isReply && (
            <div className="mt-2">
              <CommentForm
                onSubmit={handleReply}
                placeholder="Write a reply..."
                autoFocus
              />
            </div>
          )}

          {showReplies && replies.length > 0 && (
            <div className="mt-1">
              {replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  postId={postId}
                  isReply
                  onChanged={() => {
                    loadReplies();
                    onChanged?.();
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
