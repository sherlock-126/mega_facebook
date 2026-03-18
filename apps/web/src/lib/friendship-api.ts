import { apiClient } from './api-client';
import type {
  ApiResponse,
  PaginatedResponse,
} from '@mega/shared';
import type {
  FriendshipStatusResponse,
  FriendSummary,
  FriendRequestSummary,
  Friendship,
} from '@mega/shared';

export async function sendFriendRequest(userId: string) {
  return apiClient<ApiResponse<Friendship>>(`/friendships/request/${userId}`, {
    method: 'POST',
  });
}

export async function acceptFriendRequest(friendshipId: string) {
  return apiClient<ApiResponse<Friendship>>(`/friendships/${friendshipId}/accept`, {
    method: 'POST',
  });
}

export async function rejectFriendRequest(friendshipId: string) {
  return apiClient<ApiResponse<Friendship>>(`/friendships/${friendshipId}/reject`, {
    method: 'POST',
  });
}

export async function unfriend(userId: string) {
  return apiClient<ApiResponse<{ message: string }>>(`/friendships/${userId}`, {
    method: 'DELETE',
  });
}

export async function listFriends(page = 1, limit = 20) {
  return apiClient<PaginatedResponse<FriendSummary>>(
    `/friendships?page=${page}&limit=${limit}`,
  );
}

export async function listIncomingRequests(page = 1, limit = 20) {
  return apiClient<PaginatedResponse<FriendRequestSummary>>(
    `/friendships/requests/incoming?page=${page}&limit=${limit}`,
  );
}

export async function listOutgoingRequests(page = 1, limit = 20) {
  return apiClient<PaginatedResponse<FriendRequestSummary>>(
    `/friendships/requests/outgoing?page=${page}&limit=${limit}`,
  );
}

export async function getFriendshipStatus(userId: string) {
  return apiClient<ApiResponse<FriendshipStatusResponse>>(
    `/friendships/status/${userId}`,
  );
}

export async function searchUsers(q: string, page = 1, limit = 20) {
  return apiClient<PaginatedResponse<{ userId: string; displayName: string | null; avatarUrl: string | null; location: string | null }>>(
    `/users/search?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`,
  );
}
