import { z } from 'zod';
import { PostAuthorSchema } from './post.schema';

export const CreateCommentSchema = z.object({
  postId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  content: z.string().min(1).max(2000),
});

export const UpdateCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

export const CommentResponseSchema = z.object({
  id: z.string().uuid(),
  postId: z.string().uuid(),
  userId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  content: z.string(),
  author: PostAuthorSchema,
  replyCount: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  isEdited: z.boolean(),
  isDeleted: z.boolean(),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type UpdateCommentInput = z.infer<typeof UpdateCommentSchema>;
export type CommentResponse = z.infer<typeof CommentResponseSchema>;
