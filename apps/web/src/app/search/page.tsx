'use client';

import { useState } from 'react';
import { Card, CardContent, Avatar, Input, Button, Skeleton } from '@mega/ui';
import { searchUsers } from '../../lib/friendship-api';

interface SearchResult {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  location: string | null;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const handleSearch = async (searchPage = 1) => {
    if (query.trim().length < 2) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await searchUsers(query.trim(), searchPage, 20);
      setResults(res.data);
      setTotalPages(res.meta.totalPages);
      setPage(searchPage);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Find People</h1>

      <div className="mb-6 flex gap-2">
        <Input
          placeholder="Search by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={() => handleSearch()} disabled={query.trim().length < 2}>
          Search
        </Button>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-3 py-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <p className="text-lg font-medium text-muted-foreground">No users found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different search term.</p>
          </CardContent>
        </Card>
      )}

      {!loading && results.length > 0 && (
        <>
          <div className="space-y-2">
            {results.map((user) => (
              <a key={user.userId} href={`/profile/${user.userId}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-3 py-3">
                    <Avatar
                      src={user.avatarUrl ?? undefined}
                      fallback={user.displayName ?? 'U'}
                      size="default"
                    />
                    <div>
                      <p className="font-medium">{user.displayName ?? 'Unknown User'}</p>
                      {user.location && (
                        <p className="text-sm text-muted-foreground">{user.location}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSearch(page - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSearch(page + 1)}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
