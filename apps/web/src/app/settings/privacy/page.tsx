'use client';

import { Card, CardContent } from '@mega/ui';
import { BlockedUserList } from '../../../components/blocking/BlockedUserList';

export default function PrivacySettingsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Privacy Settings</h1>

      <Card className="mb-6">
        <CardContent className="py-4">
          <h2 className="mb-4 text-lg font-semibold">Blocked Users</h2>
          <p className="mb-4 text-sm text-gray-500">
            Blocked users cannot see your profile, send you friend requests, or message you.
          </p>
          <BlockedUserList />
        </CardContent>
      </Card>
    </div>
  );
}
