import { apiClient } from './api-client';
import type { ApiResponse, PaginatedResponse } from '@mega/shared';
import type {
  ConversationResponse,
  ConversationListItem,
  MessageResponse,
} from '@mega/shared';

export async function createConversation(
  participantId: string,
): Promise<ConversationResponse> {
  const res = await apiClient<ApiResponse<ConversationResponse>>('/conversations', {
    method: 'POST',
    body: JSON.stringify({ participantId }),
  });
  return res.data;
}

export async function listConversations(
  page: number = 1,
  limit: number = 20,
): Promise<PaginatedResponse<ConversationListItem>> {
  return apiClient<PaginatedResponse<ConversationListItem>>(
    `/conversations?page=${page}&limit=${limit}`,
  );
}

interface MessageListResponse {
  success: boolean;
  data: MessageResponse[];
  meta: {
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export async function getMessages(
  conversationId: string,
  cursor?: string,
  limit: number = 50,
): Promise<MessageListResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  return apiClient<MessageListResponse>(
    `/conversations/${conversationId}/messages?${params.toString()}`,
  );
}

export async function sendMessage(
  conversationId: string,
  content: string,
): Promise<MessageResponse> {
  const res = await apiClient<ApiResponse<MessageResponse>>(
    `/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({ content }),
    },
  );
  return res.data;
}

export async function markAsRead(
  conversationId: string,
): Promise<{ readAt: string }> {
  const res = await apiClient<ApiResponse<{ readAt: string }>>(
    `/conversations/${conversationId}/read`,
    { method: 'PATCH' },
  );
  return res.data;
}
