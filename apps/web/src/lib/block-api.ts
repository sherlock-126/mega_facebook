import { apiClient } from './api-client';
import type {
  ApiResponse,
  PaginatedResponse,
} from '@mega/shared';
import type {
  BlockResponse,
  BlockedUserSummary,
  BlockStatusResponse,
} from '@mega/shared';

export async function blockUser(userId: string) {
  return apiClient<ApiResponse<BlockResponse>>(`/blocks/${userId}`, {
    method: 'POST',
  });
}

export async function unblockUser(userId: string) {
  return apiClient<ApiResponse<{ message: string }>>(`/blocks/${userId}`, {
    method: 'DELETE',
  });
}

export async function listBlockedUsers(page = 1, limit = 20) {
  return apiClient<PaginatedResponse<BlockedUserSummary>>(
    `/blocks?page=${page}&limit=${limit}`,
  );
}

export async function getBlockStatus(userId: string) {
  return apiClient<ApiResponse<BlockStatusResponse>>(
    `/blocks/status/${userId}`,
  );
}
