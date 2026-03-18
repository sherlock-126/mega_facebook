'use client';

import { useState } from 'react';
import { Card, CardContent, Avatar, Button, cn } from '@mega/ui';
import type { PostResponse } from '@mega/shared';
import { PostMediaGallery } from './PostMediaGallery';
import { EditPostModal } from './EditPostModal';
import { DeletePostDialog } from './DeletePostDialog';
import { ReactionButton } from '../reaction/ReactionButton';
import { ReactionSummary } from '../reaction/ReactionSummary';
import { ReactionUsersDialog } from '../reaction/ReactionUsersDialog';
import { CommentSection } from '../comment/CommentSection';

interface PostCardProps {
  post: PostResponse;
  currentUserId?: string;
  onUpdated?: () => void;
  onDeleted?: () => void;
}

function timeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function PostCard({ post, currentUserId, onUpdated, onDeleted }: PostCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reactionsDialogOpen, setReactionsDialogOpen] = useState(false);
  const isAuthor = currentUserId === post.authorId;

  return (
    <>
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Avatar
              src={post.author.avatarUrl}
              fallback={post.author.displayName || '?'}
              size="default"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-sm">
                    {post.author.displayName || 'Unknown User'}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {timeAgo(post.createdAt)}
                    {post.isEdited && ' (edited)'}
                  </span>
                  {post.visibility === 'FRIENDS_ONLY' && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      Friends only
                    </span>
                  )}
                </div>
                {isAuthor && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditOpen(true)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteOpen(true)}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>
              {post.content && (
                <p className="mt-2 text-sm whitespace-pre-wrap">{post.content}</p>
              )}
            </div>
          </div>
          {post.media.length > 0 && (
            <PostMediaGallery media={post.media} className="mt-3" />
          )}
          {post.reactionSummary && (
            <div className="mt-3 flex items-center justify-between">
              <ReactionSummary
                totalCount={post.reactionSummary.totalCount}
                topTypes={post.reactionSummary.topTypes}
                onClick={() => setReactionsDialogOpen(true)}
              />
              {(post.commentCount ?? 0) > 0 && (
                <span className="text-xs text-muted-foreground">
                  {post.commentCount} comments
                </span>
              )}
            </div>
          )}
          <div className="mt-2 flex items-center gap-2 border-t pt-2">
            <ReactionButton
              targetType="POST"
              targetId={post.id}
              userReaction={null}
              onReactionChange={() => onUpdated?.()}
            />
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => {}}
            >
              Comment
            </Button>
          </div>
          <CommentSection
            postId={post.id}
            currentUserId={currentUserId}
            commentCount={post.commentCount ?? 0}
            onChanged={() => onUpdated?.()}
          />
        </CardContent>
      </Card>

      <ReactionUsersDialog
        open={reactionsDialogOpen}
        onOpenChange={setReactionsDialogOpen}
        targetType="POST"
        targetId={post.id}
      />

      <EditPostModal
        open={editOpen}
        onOpenChange={setEditOpen}
        post={post}
        onSaved={() => onUpdated?.()}
      />

      <DeletePostDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        postId={post.id}
        onDeleted={() => onDeleted?.()}
      />
    </>
  );
}
