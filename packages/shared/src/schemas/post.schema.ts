import { z } from 'zod';

export const PostVisibilityEnum = z.enum(['PUBLIC', 'FRIENDS_ONLY']);

export const CreatePostSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  visibility: PostVisibilityEnum.optional().default('PUBLIC'),
});

export const UpdatePostSchema = z.object({
  content: z.string().max(5000).optional(),
  visibility: PostVisibilityEnum.optional(),
});

export const PostMediaSchema = z.object({
  id: z.string().uuid(),
  url: z.string(),
  mimeType: z.string(),
  position: z.number(),
});

export const PostAuthorSchema = z.object({
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});

export const ReactionSummarySchema = z.object({
  totalCount: z.number(),
  byType: z.record(z.string(), z.number()),
  topTypes: z.array(z.string()),
});

export const PostResponseSchema = z.object({
  id: z.string().uuid(),
  authorId: z.string().uuid(),
  author: PostAuthorSchema,
  content: z.string(),
  visibility: PostVisibilityEnum,
  media: z.array(PostMediaSchema),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  isEdited: z.boolean(),
  reactionSummary: ReactionSummarySchema.optional(),
  commentCount: z.number().optional(),
});

export const FeedQuerySchema = z.object({
  mode: z.enum(['recent', 'top']).optional().default('recent'),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(50).optional().default(20),
});

export type PostVisibility = z.infer<typeof PostVisibilityEnum>;
export type CreatePostInput = z.infer<typeof CreatePostSchema>;
export type UpdatePostInput = z.infer<typeof UpdatePostSchema>;
export type PostMedia = z.infer<typeof PostMediaSchema>;
export type PostAuthor = z.infer<typeof PostAuthorSchema>;
export type PostResponse = z.infer<typeof PostResponseSchema>;
export type FeedQuery = z.infer<typeof FeedQuerySchema>;
