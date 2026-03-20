'use client';

import { FriendList } from '../friendship/FriendList';
import { FriendRequestList } from '../friendship/FriendRequestList';

interface FriendsTabProps {
  userId?: string;
  isOwnProfile?: boolean;
}

export function FriendsTab({ userId, isOwnProfile }: FriendsTabProps) {
  return (
    <div className="mt-4">
      {isOwnProfile && <FriendRequestList />}
      <FriendList userId={userId} />
    </div>
  );
}
