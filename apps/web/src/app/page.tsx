'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@mega/ui';
import type { PostResponse } from '@mega/shared';
import { useAuth } from '@/lib/auth-context';
import { getFeed } from '@/lib/post-api';
import { CreatePostForm } from '@/components/post/CreatePostForm';
import { PostCard } from '@/components/post/PostCard';
import { PostSkeleton } from '@/components/post/PostSkeleton';

export default function Home() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'recent' | 'top'>('recent');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const loadFeed = useCallback(
    async (reset = false) => {
      if (!isAuthenticated) return;
      setLoading(true);
      try {
        const result = await getFeed(mode, reset ? undefined : cursor ?? undefined);
        if (reset) {
          setPosts(result.data);
        } else {
          setPosts((prev) => [...prev, ...result.data]);
        }
        setCursor(result.meta.nextCursor);
        setHasMore(result.meta.hasMore);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, mode, cursor],
  );

  useEffect(() => {
    if (isAuthenticated) {
      setPosts([]);
      setCursor(null);
      setHasMore(false);
      loadFeed(true);
    }
  }, [isAuthenticated, mode]);

  if (authLoading) {
    return (
      <main className="mx-auto max-w-2xl p-4">
        <PostSkeleton />
        <PostSkeleton />
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <h1 className="text-4xl font-bold">Mega Facebook</h1>
        <p className="text-muted-foreground">Please log in to see your newsfeed.</p>
        <Button onClick={() => (window.location.href = '/login')}>Log In</Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Newsfeed</h1>
        <div className="flex gap-2">
          <Button
            variant={mode === 'recent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('recent')}
          >
            Recent
          </Button>
          <Button
            variant={mode === 'top' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('top')}
          >
            Top
          </Button>
        </div>
      </div>

      <CreatePostForm
        onCreated={() => {
          setPosts([]);
          setCursor(null);
          loadFeed(true);
        }}
      />

      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={user?.userId ?? undefined}
          onUpdated={() => {
            setPosts([]);
            setCursor(null);
            loadFeed(true);
          }}
          onDeleted={() => {
            setPosts([]);
            setCursor(null);
            loadFeed(true);
          }}
        />
      ))}

      {loading && <PostSkeleton />}

      {!loading && posts.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          No posts yet. Create one or add some friends!
        </p>
      )}

      {hasMore && !loading && (
        <div className="text-center py-4">
          <Button variant="outline" onClick={() => loadFeed()}>
            Load More
          </Button>
        </div>
      )}
    </main>
  );
}
