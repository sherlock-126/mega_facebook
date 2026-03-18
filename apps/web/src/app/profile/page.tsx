'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@mega/ui';
import { useAuth } from '../../lib/auth-context';
import { CoverPhoto } from '../../components/profile/CoverPhoto';
import { ProfileAvatar } from '../../components/profile/ProfileAvatar';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { ProfileTabs } from '../../components/profile/ProfileTabs';
import { EditProfileModal } from '../../components/profile/EditProfileModal';

export default function MyProfilePage() {
  const { isAuthenticated, isLoading, user, refreshProfile } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();

  if (isLoading) {
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

  if (!isAuthenticated || !user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl pb-8">
      <CoverPhoto
        coverPhotoUrl={user.coverPhotoUrl}
        isOwnProfile
        onUpdated={refreshProfile}
      />
      <ProfileAvatar
        avatarUrl={user.avatarUrl}
        displayName={user.displayName}
        isOwnProfile
        onUpdated={refreshProfile}
      />
      <ProfileHeader
        profile={user}
        isOwnProfile
        onEditClick={() => setEditOpen(true)}
      />
      <ProfileTabs profile={user} isOwnProfile userId={user.userId} />
      <EditProfileModal
        open={editOpen}
        onOpenChange={setEditOpen}
        profile={user}
        onSaved={refreshProfile}
      />
    </div>
  );
}
