import { z } from 'zod';

export const FriendshipStatusEnum = z.enum([
  'NONE',
  'PENDING_SENT',
  'PENDING_RECEIVED',
  'FRIENDS',
]);

export const FriendshipSchema = z.object({
  id: z.string().uuid(),
  requesterId: z.string().uuid(),
  addresseeId: z.string().uuid(),
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED']),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const FriendshipStatusResponseSchema = z.object({
  status: FriendshipStatusEnum,
  friendshipId: z.string().uuid().optional(),
});

export const FriendSummarySchema = z.object({
  userId: z.string().uuid(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  friendsSince: z.string(),
});

export const FriendRequestSummarySchema = z.object({
  id: z.string().uuid(),
  requester: z.object({
    userId: z.string().uuid(),
    displayName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
  }).optional(),
  addressee: z.object({
    userId: z.string().uuid(),
    displayName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
  }).optional(),
  createdAt: z.string(),
});

export type FriendshipStatusResponse = z.infer<typeof FriendshipStatusResponseSchema>;
export type FriendSummary = z.infer<typeof FriendSummarySchema>;
export type FriendRequestSummary = z.infer<typeof FriendRequestSummarySchema>;
export type Friendship = z.infer<typeof FriendshipSchema>;
