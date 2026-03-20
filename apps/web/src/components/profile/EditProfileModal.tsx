'use client';

import { useState } from 'react';
import { Button, Input, Textarea, Label, Dialog, DialogContent, DialogHeader, DialogTitle } from '@mega/ui';
import { UpdateProfileSchema, type UpdateProfileInput, type Profile } from '@mega/shared';
import { apiClient } from '../../lib/api-client';
import type { ApiResponse } from '@mega/shared';

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
  onSaved: () => void;
}

export function EditProfileModal({ open, onOpenChange, profile, onSaved }: EditProfileModalProps) {
  const [form, setForm] = useState<UpdateProfileInput>({
    firstName: profile.firstName || undefined,
    lastName: profile.lastName || undefined,
    displayName: profile.displayName || undefined,
    bio: profile.bio || undefined,
    gender: profile.gender || undefined,
    phoneNumber: profile.phoneNumber || undefined,
    location: profile.location || undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');

  const updateField = (key: keyof UpdateProfileInput, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value || undefined }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');

    const result = UpdateProfileSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0]?.toString();
        if (key) fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    try {
      await apiClient<ApiResponse<Profile>>('/profile/me', {
        method: 'PATCH',
        body: JSON.stringify(result.data),
      });
      onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || 'Failed to save';
      setApiError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {apiError && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{apiError}</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={form.firstName || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('firstName', e.target.value)}
              />
              {errors.firstName && <p className="mt-1 text-xs text-destructive">{errors.firstName}</p>}
            </div>
            <div>
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={form.lastName || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('lastName', e.target.value)}
              />
              {errors.lastName && <p className="mt-1 text-xs text-destructive">{errors.lastName}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              value={form.displayName || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('displayName', e.target.value)}
            />
            {errors.displayName && <p className="mt-1 text-xs text-destructive">{errors.displayName}</p>}
          </div>

          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={form.bio || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateField('bio', e.target.value)}
              maxLength={500}
            />
            {errors.bio && <p className="mt-1 text-xs text-destructive">{errors.bio}</p>}
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={form.location || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('location', e.target.value)}
            />
            {errors.location && <p className="mt-1 text-xs text-destructive">{errors.location}</p>}
          </div>

          <div>
            <Label htmlFor="gender">Gender</Label>
            <select
              id="gender"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={form.gender || ''}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateField('gender', e.target.value)}
            >
              <option value="">Prefer not to say</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
              <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
            </select>
            {errors.gender && <p className="mt-1 text-xs text-destructive">{errors.gender}</p>}
          </div>

          <div>
            <Label htmlFor="phoneNumber">Phone number</Label>
            <Input
              id="phoneNumber"
              value={form.phoneNumber || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('phoneNumber', e.target.value)}
              placeholder="+1234567890"
            />
            {errors.phoneNumber && <p className="mt-1 text-xs text-destructive">{errors.phoneNumber}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
