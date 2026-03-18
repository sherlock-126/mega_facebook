'use client';

import { Card, CardContent } from '@mega/ui';

export function FriendsTab() {
  return (
    <Card className="mt-4">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <p className="text-lg font-medium text-muted-foreground">No friends yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Friends will appear here once the feature is available.
        </p>
      </CardContent>
    </Card>
  );
}
