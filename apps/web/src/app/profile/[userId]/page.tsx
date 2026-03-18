'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, Skeleton } from '@mega/ui';
import { apiClient } from '../../../lib/api-client';
import type { ApiResponse, PublicProfile } from '@mega/shared';
import { CoverPhoto } from '../../../components/profile/CoverPhoto';
import { ProfileAvatar } from '../../../components/profile/ProfileAvatar';
import { ProfileHeader } from '../../../components/profile/ProfileHeader';
import { ProfileTabs } from '../../../components/profile/ProfileTabs';

export default function PublicProfilePage() {
  const params = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await apiClient<ApiResponse<PublicProfile>>(`/profile/${params.userId}`);
        setProfile(res.data);
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404) {
          setError('User not found');
        } else {
          setError('Something went wrong');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [params.userId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <Skeleton className="h-64 w-full rounded-b-lg" />
        <div className="flex items-end gap-4 px-6 pt-4">
          <Skeleton className="h-32 w-32 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="py-12">
            <p className="text-lg font-medium">{error || 'User not found'}</p>
            <a href="/" className="mt-2 inline-block text-sm text-primary hover:underline">
              Go to home
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl pb-8">
      <CoverPhoto
        coverPhotoUrl={profile.coverPhotoUrl}
        isOwnProfile={false}
        onUpdated={() => {}}
      />
      <ProfileAvatar
        avatarUrl={profile.avatarUrl}
        displayName={profile.displayName}
        isOwnProfile={false}
        onUpdated={() => {}}
      />
      <ProfileHeader profile={profile} isOwnProfile={false} />
      <ProfileTabs profile={profile} isOwnProfile={false} />
    </div>
  );
}
