import { z } from 'zod';

export const BlockResponseSchema = z.object({
  id: z.string().uuid(),
  blockerId: z.string().uuid(),
  blockedId: z.string().uuid(),
  createdAt: z.string(),
});

export const BlockedUserSummarySchema = z.object({
  userId: z.string().uuid(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  blockedAt: z.string(),
});

export const BlockStatusResponseSchema = z.object({
  isBlocked: z.boolean(),
  isBlockedBy: z.boolean(),
});

export type BlockResponse = z.infer<typeof BlockResponseSchema>;
export type BlockedUserSummary = z.infer<typeof BlockedUserSummarySchema>;
export type BlockStatusResponse = z.infer<typeof BlockStatusResponseSchema>;
