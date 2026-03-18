'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@mega/ui';
import { PostsTab } from './PostsTab';
import { FriendsTab } from './FriendsTab';
import { AboutTab } from './AboutTab';
import type { Profile, PublicProfile } from '@mega/shared';

interface ProfileTabsProps {
  profile: Profile | PublicProfile;
  isOwnProfile: boolean;
  userId?: string;
}

export function ProfileTabs({ profile, isOwnProfile, userId }: ProfileTabsProps) {
  return (
    <div className="border-t px-4 sm:px-6">
      <Tabs defaultValue="posts">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="friends">Friends</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>
        <TabsContent value="posts">
          <PostsTab />
        </TabsContent>
        <TabsContent value="friends">
          <FriendsTab userId={userId} isOwnProfile={isOwnProfile} />
        </TabsContent>
        <TabsContent value="about">
          <AboutTab profile={profile} isOwnProfile={isOwnProfile} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
