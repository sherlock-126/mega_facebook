'use client';

import React, { useEffect } from 'react';
import { Button } from '@mega/ui';
import type { Profile, PublicProfile } from '@mega/shared';
import { usePresence } from '../../lib/presence-context';
import { LastSeen } from '../presence/LastSeen';

interface ProfileHeaderProps {
  profile: Profile | PublicProfile;
  isOwnProfile: boolean;
  onEditClick?: () => void;
}

function hasLocation(p: Profile | PublicProfile): p is Profile | PublicProfile {
  return 'location' in p;
}

export function ProfileHeader({ profile, isOwnProfile, onEditClick }: ProfileHeaderProps) {
  const displayName = profile.displayName || 'Unnamed User';
  const bio = ('bio' in profile && profile.bio) || null;
  const location = hasLocation(profile) ? profile.location : null;
  const { presenceMap, trackUsers } = usePresence();
  const userId = 'userId' in profile ? (profile as any).userId : (profile as any).id;
  const presence = userId ? presenceMap.get(userId) : undefined;

  useEffect(() => {
    if (!isOwnProfile && userId) {
      trackUsers([userId]);
    }
  }, [isOwnProfile, userId, trackUsers]);

  return (
    <div className="flex flex-col gap-2 px-4 pb-4 pt-2 sm:flex-row sm:items-end sm:justify-between sm:px-6">
      <div>
        <h1 className="text-2xl font-bold">{displayName}</h1>
        {!isOwnProfile && presence && (
          <LastSeen
            status={presence.status}
            lastSeenAt={presence.lastSeenAt}
            className="mt-0.5"
          />
        )}
        {bio && <p className="mt-1 text-muted-foreground">{bio}</p>}
        {location && (
          <p className="mt-0.5 text-sm text-muted-foreground">
            <span className="mr-1">&#128205;</span>
            {location}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        {isOwnProfile && (
          <Button variant="outline" size="sm" onClick={onEditClick}>
            Edit profile
          </Button>
        )}
      </div>
    </div>
  );
}
