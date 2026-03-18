import { apiClient } from './api-client';
import type { ApiResponse, PaginatedResponse } from '@mega/shared';
import type { PostResponse } from '@mega/shared';

export async function createPost(formData: FormData): Promise<PostResponse> {
  const res = await apiClient<ApiResponse<PostResponse>>('/posts', {
    method: 'POST',
    body: formData,
  });
  return res.data;
}

export async function getPost(postId: string): Promise<PostResponse> {
  const res = await apiClient<ApiResponse<PostResponse>>(`/posts/${postId}`);
  return res.data;
}

export async function getUserPosts(
  userId: string,
  page: number = 1,
  limit: number = 20,
): Promise<PaginatedResponse<PostResponse>> {
  return apiClient<PaginatedResponse<PostResponse>>(
    `/posts/user/${userId}?page=${page}&limit=${limit}`,
  );
}

export async function updatePost(
  postId: string,
  data: { content?: string; visibility?: string },
): Promise<PostResponse> {
  const res = await apiClient<ApiResponse<PostResponse>>(`/posts/${postId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function deletePost(postId: string): Promise<void> {
  await apiClient(`/posts/${postId}`, { method: 'DELETE' });
}

export interface FeedResponse {
  success: boolean;
  data: PostResponse[];
  meta: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}

export async function getFeed(
  mode: 'recent' | 'top' = 'recent',
  cursor?: string,
  limit: number = 20,
): Promise<FeedResponse> {
  const params = new URLSearchParams({ mode, limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  return apiClient<FeedResponse>(`/feed?${params.toString()}`);
}
