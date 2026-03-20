import { z } from 'zod';

export const GenderEnum = z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']);

export const UpdateProfileSchema = z.object({
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  displayName: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: GenderEnum.optional(),
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/).optional(),
  location: z.string().max(100).optional(),
});

export const ProfileSchema = z.object({
  id: z.string().uuid().nullable(),
  userId: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  displayName: z.string().nullable(),
  bio: z.string().nullable(),
  dateOfBirth: z.string().nullable(),
  gender: GenderEnum.nullable(),
  phoneNumber: z.string().nullable(),
  location: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  coverPhotoUrl: z.string().nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const PublicProfileSchema = z.object({
  displayName: z.string().nullable(),
  bio: z.string().nullable(),
  location: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  coverPhotoUrl: z.string().nullable(),
  createdAt: z.string(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type PublicProfile = z.infer<typeof PublicProfileSchema>;
