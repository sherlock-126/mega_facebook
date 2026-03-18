import { apiClient } from './api-client';
import type { ApiResponse, PaginatedResponse } from '@mega/shared';

export type ReactionType = 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY';
export type ReactionTargetType = 'POST' | 'COMMENT';

export interface ReactionSummary {
  totalCount: number;
  byType: Record<string, number>;
  topTypes: string[];
  userReaction: { type: ReactionType } | null;
}

export interface ReactionUser {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  type: ReactionType;
}

export async function toggleReaction(
  targetType: ReactionTargetType,
  targetId: string,
  type: ReactionType,
) {
  const res = await apiClient<ApiResponse<any>>('/reactions', {
    method: 'POST',
    body: JSON.stringify({ targetType, targetId, type }),
  });
  return res.data;
}

export async function removeReaction(
  targetType: ReactionTargetType,
  targetId: string,
) {
  await apiClient(`/reactions/${targetType}/${targetId}`, { method: 'DELETE' });
}

export async function getReactionSummary(
  targetType: ReactionTargetType,
  targetId: string,
): Promise<ReactionSummary> {
  const res = await apiClient<ApiResponse<ReactionSummary>>(
    `/reactions/${targetType}/${targetId}`,
  );
  return res.data;
}

export async function getReactionUsers(
  targetType: ReactionTargetType,
  targetId: string,
  type?: ReactionType,
  page: number = 1,
  limit: number = 20,
): Promise<PaginatedResponse<ReactionUser>> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (type) params.set('type', type);
  return apiClient<PaginatedResponse<ReactionUser>>(
    `/reactions/${targetType}/${targetId}/users?${params.toString()}`,
  );
}
