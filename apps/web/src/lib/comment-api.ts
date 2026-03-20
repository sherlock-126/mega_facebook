import { apiClient } from './api-client';
import type { ApiResponse, PaginatedResponse } from '@mega/shared';
import type { CommentResponse } from '@mega/shared';

export async function createComment(
  postId: string,
  content: string,
  parentId?: string,
): Promise<CommentResponse> {
  const res = await apiClient<ApiResponse<CommentResponse>>('/comments', {
    method: 'POST',
    body: JSON.stringify({ postId, content, parentId }),
  });
  return res.data;
}

export async function getComments(
  postId: string,
  page: number = 1,
  limit: number = 20,
): Promise<PaginatedResponse<CommentResponse>> {
  return apiClient<PaginatedResponse<CommentResponse>>(
    `/comments/post/${postId}?page=${page}&limit=${limit}`,
  );
}

export async function getReplies(
  commentId: string,
  page: number = 1,
  limit: number = 20,
): Promise<PaginatedResponse<CommentResponse>> {
  return apiClient<PaginatedResponse<CommentResponse>>(
    `/comments/${commentId}/replies?page=${page}&limit=${limit}`,
  );
}

export async function updateComment(
  commentId: string,
  content: string,
): Promise<CommentResponse> {
  const res = await apiClient<ApiResponse<CommentResponse>>(`/comments/${commentId}`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  });
  return res.data;
}

export async function deleteComment(commentId: string): Promise<void> {
  await apiClient(`/comments/${commentId}`, { method: 'DELETE' });
}
