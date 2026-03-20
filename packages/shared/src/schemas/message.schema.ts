import { z } from 'zod';

export const MessageResponseSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  senderId: z.string().uuid(),
  sender: z.object({
    displayName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
  }),
  content: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const ConversationParticipantSchema = z.object({
  userId: z.string().uuid(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});

export const ConversationResponseSchema = z.object({
  id: z.string().uuid(),
  participant: ConversationParticipantSchema,
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date(),
});

export const ConversationListItemSchema = z.object({
  id: z.string().uuid(),
  participant: ConversationParticipantSchema,
  lastMessage: z
    .object({
      content: z.string(),
      createdAt: z.coerce.date(),
      senderId: z.string().uuid(),
    })
    .nullable(),
  unreadCount: z.number(),
  updatedAt: z.coerce.date(),
});

export const SendMessageInputSchema = z.object({
  content: z.string().min(1).max(5000),
});

export const CreateConversationInputSchema = z.object({
  participantId: z.string().uuid(),
});

export type MessageResponse = z.infer<typeof MessageResponseSchema>;
export type ConversationParticipant = z.infer<typeof ConversationParticipantSchema>;
export type ConversationResponse = z.infer<typeof ConversationResponseSchema>;
export type ConversationListItem = z.infer<typeof ConversationListItemSchema>;
export type SendMessageInput = z.infer<typeof SendMessageInputSchema>;
export type CreateConversationInput = z.infer<typeof CreateConversationInputSchema>;
