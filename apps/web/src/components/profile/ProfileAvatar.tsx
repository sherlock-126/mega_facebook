'use client';

import { useRef, useState } from 'react';
import { Avatar } from '@mega/ui';
import { apiClient } from '../../lib/api-client';
import { AVATAR_MAX_SIZE, ALLOWED_IMAGE_TYPES } from '../../lib/constants';
import type { ApiResponse } from '@mega/shared';

interface ProfileAvatarProps {
  avatarUrl: string | null;
  displayName: string | null;
  isOwnProfile: boolean;
  onUpdated: () => void;
}

export function ProfileAvatar({ avatarUrl, displayName, isOwnProfile, onUpdated }: ProfileAvatarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async (file: File) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError('Only JPEG, PNG, WebP, and GIF files are allowed');
      return;
    }
    if (file.size > AVATAR_MAX_SIZE) {
      setError('File must be under 5MB');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await apiClient<ApiResponse<{ avatarUrl: string }>>('/profile/me/avatar', {
        method: 'POST',
        body: formData,
      });
      onUpdated();
    } catch {
      setError('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative -mt-16 ml-4 sm:-mt-20 sm:ml-6">
      <div className="relative">
        <Avatar
          src={avatarUrl}
          fallback={displayName || 'User'}
          size="2xl"
          className={`border-4 border-background ${uploading ? 'opacity-50' : ''}`}
        />
        {isOwnProfile && (
          <button
            type="button"
            className="absolute bottom-1 right-1 rounded-full bg-muted p-1.5 text-xs hover:bg-muted/80"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label="Change avatar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(',')}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = '';
          }}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
