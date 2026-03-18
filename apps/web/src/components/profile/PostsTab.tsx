'use client';

import { Card, CardContent } from '@mega/ui';

export function PostsTab() {
  return (
    <Card className="mt-4">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <p className="text-lg font-medium text-muted-foreground">No posts yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Posts will appear here once the feature is available.
        </p>
      </CardContent>
    </Card>
  );
}
