import { z } from 'zod';

export const PresenceStatusEnum = z.enum(['online', 'offline', 'unknown']);
export type PresenceStatus = z.infer<typeof PresenceStatusEnum>;

export const PresenceResponseSchema = z.object({
  userId: z.string().uuid(),
  status: PresenceStatusEnum,
  lastSeenAt: z.string().nullable(),
});
export type PresenceResponse = z.infer<typeof PresenceResponseSchema>;

export const BatchPresenceQuerySchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(100),
});
export type BatchPresenceQuery = z.infer<typeof BatchPresenceQuerySchema>;

export const PresenceUpdateEventSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(['online', 'offline']),
  lastSeenAt: z.string().nullable(),
});
export type PresenceUpdateEvent = z.infer<typeof PresenceUpdateEventSchema>;

export const PresenceSubscribeSchema = z.object({
  userId: z.string().uuid(),
});
export type PresenceSubscribeInput = z.infer<typeof PresenceSubscribeSchema>;
