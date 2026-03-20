import { apiClient } from './api-client';
import type { ApiResponse, PresenceResponse } from '@mega/shared';

export async function getPresence(userId: string): Promise<PresenceResponse> {
  const res = await apiClient<ApiResponse<PresenceResponse>>(`/presence/${userId}`);
  return res.data;
}

export async function getBatchPresence(userIds: string[]): Promise<PresenceResponse[]> {
  const res = await apiClient<ApiResponse<PresenceResponse[]>>('/presence/batch', {
    method: 'POST',
    body: JSON.stringify({ userIds }),
  });
  return res.data;
}
