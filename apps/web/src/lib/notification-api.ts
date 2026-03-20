import { apiClient } from './api-client';
import type { ApiResponse, PaginatedResponse } from '@mega/shared';
import type { NotificationResponse } from '@mega/shared';

export async function listNotifications(
  page: number = 1,
  limit: number = 20,
  filters?: { type?: string; isRead?: string },
): Promise<PaginatedResponse<NotificationResponse>> {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (filters?.type) params.set('type', filters.type);
  if (filters?.isRead !== undefined) params.set('isRead', filters.isRead);
  return apiClient<PaginatedResponse<NotificationResponse>>(
    `/notifications?${params.toString()}`,
  );
}

export async function getUnreadCount(): Promise<number> {
  const res = await apiClient<ApiResponse<{ count: number }>>(
    '/notifications/unread-count',
  );
  return res.data.count;
}

export async function markNotificationAsRead(
  notificationId: string,
): Promise<void> {
  await apiClient(`/notifications/${notificationId}/read`, {
    method: 'PATCH',
  });
}

export async function markAllNotificationsAsRead(): Promise<number> {
  const res = await apiClient<ApiResponse<{ updatedCount: number }>>(
    '/notifications/read-all',
    { method: 'PATCH' },
  );
  return res.data.updatedCount;
}
