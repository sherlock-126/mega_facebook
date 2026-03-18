import { Injectable, HttpException, Logger } from '@nestjs/common';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';
import { FriendshipService } from '../friendship/friendship.service';
import { BlockService } from '../block/block.service';
import { ES_INDEX } from '../elasticsearch/elasticsearch.constants';
import { SearchType } from './dto/search-query.dto';

export interface UserSearchResult {
  userId: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  location: string | null;
  bio: string | null;
  highlight: Record<string, string[]>;
}

export interface PostSearchResult {
  postId: string;
  authorId: string;
  author: { displayName: string | null; avatarUrl: string | null };
  content: string;
  visibility: string;
  createdAt: string;
  highlight: Record<string, string[]>;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly esService: ElasticsearchService,
    private readonly friendshipService: FriendshipService,
    private readonly blockService: BlockService,
  ) {}

  async search(
    userId: string,
    query: string,
    type: SearchType = SearchType.ALL,
    page: number = 1,
    limit: number = 20,
  ) {
    try {
      if (type === SearchType.ALL) {
        return await this.searchAll(userId, query, page, limit);
      }
      if (type === SearchType.USERS) {
        return await this.searchUsers(userId, query, page, limit);
      }
      return await this.searchPosts(userId, query, page, limit);
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Search failed: ${error.message}`);
      throw new HttpException('Search temporarily unavailable', 503);
    }
  }

  private async searchAll(
    userId: string,
    query: string,
    page: number,
    limit: number,
  ) {
    const [usersResult, postsResult] = await Promise.all([
      this.searchUsersInternal(userId, query, 1, limit),
      this.searchPostsInternal(userId, query, 1, limit),
    ]);

    return {
      data: {
        users: { items: usersResult.items, total: usersResult.total },
        posts: { items: postsResult.items, total: postsResult.total },
      },
      meta: { page, limit, query },
    };
  }

  private async searchUsers(
    userId: string,
    query: string,
    page: number,
    limit: number,
  ) {
    const result = await this.searchUsersInternal(userId, query, page, limit);
    return {
      data: result.items,
      meta: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  private async searchPosts(
    userId: string,
    query: string,
    page: number,
    limit: number,
  ) {
    const result = await this.searchPostsInternal(userId, query, page, limit);
    return {
      data: result.items,
      meta: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  private async searchUsersInternal(
    userId: string,
    query: string,
    page: number,
    limit: number,
  ): Promise<{ items: UserSearchResult[]; total: number }> {
    const blockedIds = await this.blockService.getBlockedUserIds(userId);

    const mustNot: any[] = [{ term: { status: 'SUSPENDED' } }];
    if (blockedIds.length > 0) {
      mustNot.push({ terms: { userId: blockedIds } });
    }

    const response = await this.esService.search(ES_INDEX.USERS, {
      from: (page - 1) * limit,
      size: limit,
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query,
                fields: [
                  'displayName^3',
                  'firstName^2',
                  'lastName^2',
                  'bio',
                  'location',
                ],
                type: 'best_fields',
                fuzziness: 'AUTO',
              },
            },
          ],
          must_not: mustNot,
        },
      },
      highlight: {
        fields: {
          displayName: {},
          firstName: {},
          lastName: {},
          bio: {},
          location: {},
        },
      },
    });

    const hits = (response as any).hits;
    const total =
      typeof hits.total === 'number' ? hits.total : hits.total.value;

    const items: UserSearchResult[] = hits.hits.map((hit: any) => ({
      userId: hit._source.userId,
      displayName: hit._source.displayName,
      firstName: hit._source.firstName,
      lastName: hit._source.lastName,
      avatarUrl: null,
      location: hit._source.location,
      bio: hit._source.bio,
      highlight: hit.highlight || {},
    }));

    return { items, total };
  }

  private async searchPostsInternal(
    userId: string,
    query: string,
    page: number,
    limit: number,
  ): Promise<{ items: PostSearchResult[]; total: number }> {
    const [friendIds, blockedIds] = await Promise.all([
      this.friendshipService.getFriendIds(userId),
      this.blockService.getBlockedUserIds(userId),
    ]);

    const mustNot: any[] = [];
    if (blockedIds.length > 0) {
      mustNot.push({ terms: { authorId: blockedIds } });
    }

    // Visibility filter: PUBLIC posts OR own posts OR FRIENDS_ONLY from friends
    const visibleAuthors = [userId, ...friendIds];
    const visibilityFilter = {
      bool: {
        should: [
          { term: { visibility: 'PUBLIC' } },
          { term: { authorId: userId } },
          {
            bool: {
              must: [
                { term: { visibility: 'FRIENDS_ONLY' } },
                { terms: { authorId: visibleAuthors } },
              ],
            },
          },
        ],
        minimum_should_match: 1,
      },
    };

    const response = await this.esService.search(ES_INDEX.POSTS, {
      from: (page - 1) * limit,
      size: limit,
      query: {
        bool: {
          must: [
            {
              match: {
                content: {
                  query,
                  fuzziness: 'AUTO',
                },
              },
            },
            visibilityFilter,
          ],
          must_not: mustNot,
        },
      },
      highlight: {
        fields: {
          content: {},
        },
      },
      sort: [{ _score: 'desc' }, { createdAt: 'desc' }],
    });

    const hits = (response as any).hits;
    const total =
      typeof hits.total === 'number' ? hits.total : hits.total.value;

    const items: PostSearchResult[] = hits.hits.map((hit: any) => ({
      postId: hit._source.postId,
      authorId: hit._source.authorId,
      author: {
        displayName: hit._source.authorName,
        avatarUrl: null,
      },
      content: hit._source.content,
      visibility: hit._source.visibility,
      createdAt: hit._source.createdAt,
      highlight: hit.highlight || {},
    }));

    return { items, total };
  }
}
