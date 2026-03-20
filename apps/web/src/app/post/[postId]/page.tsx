'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@mega/ui';
import type { PostResponse } from '@mega/shared';
import { getPost } from '@/lib/post-api';
import { useAuth } from '@/lib/auth-context';
import { PostCard } from '@/components/post/PostCard';
import { PostSkeleton } from '@/components/post/PostSkeleton';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const postId = params.postId as string;

  const [post, setPost] = useState<PostResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPost = async () => {
    try {
      const data = await getPost(postId);
      setPost(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPost();
  }, [postId]);

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl p-4">
        <PostSkeleton />
      </main>
    );
  }

  if (error || !post) {
    return (
      <main className="mx-auto max-w-2xl p-4">
        <p className="text-center text-muted-foreground">{error || 'Post not found'}</p>
        <div className="mt-4 text-center">
          <Button variant="outline" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-4">
      <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
        Back
      </Button>
      <PostCard
        post={post}
        currentUserId={user?.userId ?? undefined}
        onUpdated={fetchPost}
        onDeleted={() => router.back()}
      />
    </main>
  );
}
