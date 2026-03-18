import { z } from 'zod';

export const ReactionTypeEnum = z.enum(['LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY']);
export const ReactionTargetTypeEnum = z.enum(['POST', 'COMMENT']);

export const CreateReactionSchema = z.object({
  targetType: ReactionTargetTypeEnum,
  targetId: z.string().uuid(),
  type: ReactionTypeEnum,
});

export const ReactionResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  targetType: ReactionTargetTypeEnum,
  targetId: z.string().uuid(),
  type: ReactionTypeEnum,
  createdAt: z.coerce.date(),
});

export const ReactionSummaryResponseSchema = z.object({
  totalCount: z.number(),
  byType: z.record(z.string(), z.number()),
  topTypes: z.array(ReactionTypeEnum),
  userReaction: z.object({ type: ReactionTypeEnum }).nullable(),
});

export const ReactionUserSchema = z.object({
  userId: z.string().uuid(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  type: ReactionTypeEnum,
});

export type ReactionType = z.infer<typeof ReactionTypeEnum>;
export type ReactionTargetType = z.infer<typeof ReactionTargetTypeEnum>;
export type CreateReactionInput = z.infer<typeof CreateReactionSchema>;
export type ReactionResponse = z.infer<typeof ReactionResponseSchema>;
export type ReactionSummaryResponse = z.infer<typeof ReactionSummaryResponseSchema>;
export type ReactionUser = z.infer<typeof ReactionUserSchema>;
