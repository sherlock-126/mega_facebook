'use client';

import { useRef, useState } from 'react';
import { Skeleton } from '@mega/ui';
import { apiClient } from '../../lib/api-client';
import { COVER_MAX_SIZE, ALLOWED_IMAGE_TYPES } from '../../lib/constants';
import type { ApiResponse } from '@mega/shared';

interface CoverPhotoProps {
  coverPhotoUrl: string | null;
  isOwnProfile: boolean;
  onUpdated: () => void;
}

export function CoverPhoto({ coverPhotoUrl, isOwnProfile, onUpdated }: CoverPhotoProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async (file: File) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError('Only JPEG, PNG, WebP, and GIF files are allowed');
      return;
    }
    if (file.size > COVER_MAX_SIZE) {
      setError('File must be under 10MB');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await apiClient<ApiResponse<{ coverPhotoUrl: string }>>('/profile/me/cover', {
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
    <div className="relative h-48 w-full overflow-hidden rounded-b-lg bg-muted sm:h-64 md:h-80">
      {coverPhotoUrl ? (
        <img src={coverPhotoUrl} alt="Cover" className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full bg-gradient-to-r from-primary/20 to-primary/5" />
      )}
      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <Skeleton className="h-8 w-32 bg-white/20" />
        </div>
      )}
      {isOwnProfile && (
        <>
          <button
            type="button"
            className="absolute bottom-3 right-3 rounded-md bg-black/50 px-3 py-1.5 text-sm font-medium text-white hover:bg-black/70"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            Edit cover photo
          </button>
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
        </>
      )}
      {error && (
        <p className="absolute bottom-12 right-3 rounded bg-destructive px-2 py-1 text-xs text-destructive-foreground">
          {error}
        </p>
      )}
    </div>
  );
}
