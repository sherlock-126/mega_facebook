'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@mega/ui';
import type { Profile, PublicProfile } from '@mega/shared';

interface AboutTabProps {
  profile: Profile | PublicProfile;
  isOwnProfile: boolean;
}

function FieldRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
      <span className="w-32 shrink-0 text-sm font-medium text-muted-foreground">{label}</span>
      {value ? (
        <span className="text-sm">{value}</span>
      ) : (
        <span className="text-sm italic text-muted-foreground">Not set</span>
      )}
    </div>
  );
}

function isFullProfile(p: Profile | PublicProfile): p is Profile {
  return 'email' in p;
}

export function AboutTab({ profile, isOwnProfile }: AboutTabProps) {
  const full = isFullProfile(profile) ? profile : null;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">About</CardTitle>
      </CardHeader>
      <CardContent className="divide-y">
        <FieldRow label="Display name" value={profile.displayName} />
        <FieldRow label="Bio" value={profile.bio} />
        <FieldRow label="Location" value={profile.location} />
        {full && (
          <>
            {isOwnProfile && <FieldRow label="Email" value={full.email} />}
            <FieldRow label="First name" value={full.firstName} />
            <FieldRow label="Last name" value={full.lastName} />
            <FieldRow label="Gender" value={full.gender} />
            <FieldRow label="Date of birth" value={full.dateOfBirth} />
            {isOwnProfile && <FieldRow label="Phone" value={full.phoneNumber} />}
          </>
        )}
        <FieldRow
          label="Joined"
          value={
            ('createdAt' in profile && profile.createdAt)
              ? new Date(profile.createdAt).toLocaleDateString()
              : null
          }
        />
      </CardContent>
    </Card>
  );
}
