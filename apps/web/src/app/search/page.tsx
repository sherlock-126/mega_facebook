'use client';

import { useState } from 'react';
import { Card, CardContent, Input, Button, Skeleton, Tabs, TabsList, TabsTrigger, TabsContent } from '@mega/ui';
import { searchAll, searchUsersES, searchPostsES } from '../../lib/search-api';
import { UserSearchResult } from '../../components/search/UserSearchResult';
import { PostSearchResult } from '../../components/search/PostSearchResult';
import type {
  UserSearchResult as UserResult,
  PostSearchResult as PostResult,
} from '@mega/shared';

type TabValue = 'all' | 'people' | 'posts';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // All tab state
  const [allUsers, setAllUsers] = useState<UserResult[]>([]);
  const [allPosts, setAllPosts] = useState<PostResult[]>([]);
  const [allUsersTotal, setAllUsersTotal] = useState(0);
  const [allPostsTotal, setAllPostsTotal] = useState(0);

  // People tab state
  const [users, setUsers] = useState<UserResult[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);

  // Posts tab state
  const [posts, setPosts] = useState<PostResult[]>([]);
  const [postsPage, setPostsPage] = useState(1);
  const [postsTotalPages, setPostsTotalPages] = useState(1);

  const handleSearch = async (tab: TabValue = activeTab, page = 1) => {
    if (query.trim().length < 2) return;
    setLoading(true);
    setSearched(true);

    try {
      if (tab === 'all') {
        const res = await searchAll(query.trim());
        setAllUsers(res.data.users.items);
        setAllPosts(res.data.posts.items);
        setAllUsersTotal(res.data.users.total);
        setAllPostsTotal(res.data.posts.total);
      } else if (tab === 'people') {
        const res = await searchUsersES(query.trim(), page, 20);
        setUsers(res.data);
        setUsersPage(page);
        setUsersTotalPages(res.meta.totalPages);
      } else {
        const res = await searchPostsES(query.trim(), page, 20);
        setPosts(res.data);
        setPostsPage(page);
        setPostsTotalPages(res.meta.totalPages);
      }
    } catch {
      if (tab === 'all') {
        setAllUsers([]);
        setAllPosts([]);
        setAllUsersTotal(0);
        setAllPostsTotal(0);
      } else if (tab === 'people') {
        setUsers([]);
      } else {
        setPosts([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    const tab = value as TabValue;
    setActiveTab(tab);
    if (searched && query.trim().length >= 2) {
      handleSearch(tab);
    }
  };

  const noResults = searched && !loading;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Search</h1>

      <div className="mb-6 flex gap-2">
        <Input
          placeholder="Search people and posts..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={() => handleSearch()} disabled={query.trim().length < 2}>
          Search
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-4 w-full">
          <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
          <TabsTrigger value="people" className="flex-1">People</TabsTrigger>
          <TabsTrigger value="posts" className="flex-1">Posts</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {loading && <SearchSkeleton />}
          {noResults && allUsers.length === 0 && allPosts.length === 0 && <NoResults />}
          {!loading && (allUsers.length > 0 || allPosts.length > 0) && (
            <div className="space-y-6">
              {allUsers.length > 0 && (
                <div>
                  <h2 className="mb-2 text-lg font-semibold">People ({allUsersTotal})</h2>
                  <div className="space-y-2">
                    {allUsers.slice(0, 5).map((u) => (
                      <UserSearchResult key={u.userId} {...u} />
                    ))}
                  </div>
                  {allUsersTotal > 5 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setActiveTab('people');
                        handleSearch('people');
                      }}
                    >
                      View all {allUsersTotal} people
                    </Button>
                  )}
                </div>
              )}
              {allPosts.length > 0 && (
                <div>
                  <h2 className="mb-2 text-lg font-semibold">Posts ({allPostsTotal})</h2>
                  <div className="space-y-2">
                    {allPosts.slice(0, 5).map((p) => (
                      <PostSearchResult key={p.postId} {...p} />
                    ))}
                  </div>
                  {allPostsTotal > 5 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setActiveTab('posts');
                        handleSearch('posts');
                      }}
                    >
                      View all {allPostsTotal} posts
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="people">
          {loading && <SearchSkeleton />}
          {noResults && users.length === 0 && <NoResults />}
          {!loading && users.length > 0 && (
            <>
              <div className="space-y-2">
                {users.map((u) => (
                  <UserSearchResult key={u.userId} {...u} />
                ))}
              </div>
              {usersTotalPages > 1 && (
                <Pagination
                  page={usersPage}
                  totalPages={usersTotalPages}
                  onPageChange={(p) => handleSearch('people', p)}
                />
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="posts">
          {loading && <SearchSkeleton />}
          {noResults && posts.length === 0 && <NoResults />}
          {!loading && posts.length > 0 && (
            <>
              <div className="space-y-2">
                {posts.map((p) => (
                  <PostSearchResult key={p.postId} {...p} />
                ))}
              </div>
              {postsTotalPages > 1 && (
                <Pagination
                  page={postsPage}
                  totalPages={postsTotalPages}
                  onPageChange={(p) => handleSearch('posts', p)}
                />
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SearchSkeleton() {
  return (
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
  );
}

function NoResults() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center py-12">
        <p className="text-lg font-medium text-muted-foreground">No results found</p>
        <p className="mt-1 text-sm text-muted-foreground">Try a different search term.</p>
      </CardContent>
    </Card>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
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
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
      >
        Next
      </Button>
    </div>
  );
}
