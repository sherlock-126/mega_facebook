'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@mega/ui';
import type { PostResponse } from '@mega/shared';
import { getUserPosts } from '@/lib/post-api';
import { useAuth } from '@/lib/auth-context';
import { PostCard } from '../post/PostCard';
import { CreatePostForm } from '../post/CreatePostForm';
import { PostSkeleton } from '../post/PostSkeleton';

interface PostsTabProps {
  userId?: string;
  isOwnProfile?: boolean;
}

export function PostsTab({ userId, isOwnProfile }: PostsTabProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPosts = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const result = await getUserPosts(userId, page, 20);
      setPosts(result.data);
      setTotalPages(result.meta.totalPages);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [userId, page]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  if (loading) {
    return (
      <div className="mt-4">
        <PostSkeleton />
        <PostSkeleton />
      </div>
    );
  }

  return (
    <div className="mt-4">
      {isOwnProfile && <CreatePostForm onCreated={fetchPosts} />}

      {posts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium text-muted-foreground">No posts yet</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user?.userId ?? undefined}
              onUpdated={fetchPosts}
              onDeleted={fetchPosts}
            />
          ))}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 py-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
