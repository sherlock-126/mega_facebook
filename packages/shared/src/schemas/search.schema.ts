import { z } from 'zod';

export const SearchTypeEnum = z.enum(['all', 'users', 'posts']);
export type SearchType = z.infer<typeof SearchTypeEnum>;

export const SearchQuerySchema = z.object({
  q: z.string().min(2),
  type: SearchTypeEnum.optional().default('all'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export const UserSearchResultSchema = z.object({
  userId: z.string(),
  displayName: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  location: z.string().nullable(),
  bio: z.string().nullable(),
  highlight: z.record(z.array(z.string())),
});
export type UserSearchResult = z.infer<typeof UserSearchResultSchema>;

export const PostSearchResultSchema = z.object({
  postId: z.string(),
  authorId: z.string(),
  author: z.object({
    displayName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
  }),
  content: z.string(),
  visibility: z.string(),
  createdAt: z.string(),
  highlight: z.record(z.array(z.string())),
});
export type PostSearchResult = z.infer<typeof PostSearchResultSchema>;

export const SearchAllResponseSchema = z.object({
  users: z.object({
    items: z.array(UserSearchResultSchema),
    total: z.number(),
  }),
  posts: z.object({
    items: z.array(PostSearchResultSchema),
    total: z.number(),
  }),
});
export type SearchAllResponse = z.infer<typeof SearchAllResponseSchema>;
