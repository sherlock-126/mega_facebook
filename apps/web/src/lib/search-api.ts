import { apiClient } from './api-client';
import type {
  ApiResponse,
  PaginatedResponse,
  UserSearchResult,
  PostSearchResult,
  SearchAllResponse,
} from '@mega/shared';

export async function searchAll(q: string, page = 1, limit = 20) {
  return apiClient<ApiResponse<SearchAllResponse> & { meta: { page: number; limit: number; query: string } }>(
    `/search?q=${encodeURIComponent(q)}&type=all&page=${page}&limit=${limit}`,
  );
}

export async function searchUsersES(q: string, page = 1, limit = 20) {
  return apiClient<PaginatedResponse<UserSearchResult>>(
    `/search?q=${encodeURIComponent(q)}&type=users&page=${page}&limit=${limit}`,
  );
}

export async function searchPostsES(q: string, page = 1, limit = 20) {
  return apiClient<PaginatedResponse<PostSearchResult>>(
    `/search?q=${encodeURIComponent(q)}&type=posts&page=${page}&limit=${limit}`,
  );
}
