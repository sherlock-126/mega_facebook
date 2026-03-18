import { z } from 'zod';

export const NotificationTypeEnum = z.enum([
  'NEW_MESSAGE',
  'FRIEND_REQUEST',
  'FRIEND_ACCEPTED',
  'REACTION',
  'COMMENT',
  'COMMENT_REPLY',
]);

export const NotificationResponseSchema = z.object({
  id: z.string().uuid(),
  type: NotificationTypeEnum,
  actorId: z.string().uuid(),
  actor: z.object({
    displayName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
  }),
  targetId: z.string().uuid().nullable(),
  content: z.string(),
  isRead: z.boolean(),
  createdAt: z.coerce.date(),
});

export type NotificationType = z.infer<typeof NotificationTypeEnum>;
export type NotificationResponse = z.infer<typeof NotificationResponseSchema>;
