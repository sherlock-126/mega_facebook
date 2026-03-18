import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';
import { ES_INDEX } from '../elasticsearch/elasticsearch.constants';

export interface UserIndexData {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  bio: string | null;
  location: string | null;
  avatarKey: string | null;
  status: string;
  createdAt: Date;
}

export interface PostIndexData {
  postId: string;
  authorId: string;
  authorName: string | null;
  authorAvatar: string | null;
  content: string;
  visibility: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class SearchIndexerService {
  private readonly logger = new Logger(SearchIndexerService.name);

  constructor(private readonly esService: ElasticsearchService) {}

  async indexUser(data: UserIndexData): Promise<void> {
    try {
      if (data.status === 'SUSPENDED') {
        await this.removeUser(data.userId);
        return;
      }

      await this.esService.index(ES_INDEX.USERS, data.userId, {
        userId: data.userId,
        firstName: data.firstName,
        lastName: data.lastName,
        displayName: data.displayName,
        bio: data.bio,
        location: data.location,
        avatarKey: data.avatarKey,
        status: data.status,
        createdAt: data.createdAt,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to index user ${data.userId}: ${(error as Error).message}`,
      );
    }
  }

  async removeUser(userId: string): Promise<void> {
    try {
      await this.esService.delete(ES_INDEX.USERS, userId);
    } catch (error) {
      this.logger.warn(
        `Failed to remove user ${userId} from index: ${(error as Error).message}`,
      );
    }
  }

  async indexPost(data: PostIndexData): Promise<void> {
    try {
      await this.esService.index(ES_INDEX.POSTS, data.postId, {
        postId: data.postId,
        authorId: data.authorId,
        authorName: data.authorName,
        authorAvatar: data.authorAvatar,
        content: data.content,
        visibility: data.visibility,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to index post ${data.postId}: ${(error as Error).message}`,
      );
    }
  }

  async removePost(postId: string): Promise<void> {
    try {
      await this.esService.delete(ES_INDEX.POSTS, postId);
    } catch (error) {
      this.logger.warn(
        `Failed to remove post ${postId} from index: ${(error as Error).message}`,
      );
    }
  }

  async bulkIndexUsers(users: UserIndexData[]): Promise<number> {
    if (users.length === 0) return 0;

    try {
      const operations = users.flatMap((user) => [
        { index: { _index: ES_INDEX.USERS, _id: user.userId } },
        {
          userId: user.userId,
          firstName: user.firstName,
          lastName: user.lastName,
          displayName: user.displayName,
          bio: user.bio,
          location: user.location,
          avatarKey: user.avatarKey,
          status: user.status,
          createdAt: user.createdAt,
        },
      ]);

      await this.esService.bulk(operations);
      return users.length;
    } catch (error) {
      this.logger.warn(
        `Failed to bulk index users: ${(error as Error).message}`,
      );
      return 0;
    }
  }

  async bulkIndexPosts(posts: PostIndexData[]): Promise<number> {
    if (posts.length === 0) return 0;

    try {
      const operations = posts.flatMap((post) => [
        { index: { _index: ES_INDEX.POSTS, _id: post.postId } },
        {
          postId: post.postId,
          authorId: post.authorId,
          authorName: post.authorName,
          authorAvatar: post.authorAvatar,
          content: post.content,
          visibility: post.visibility,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
        },
      ]);

      await this.esService.bulk(operations);
      return posts.length;
    } catch (error) {
      this.logger.warn(
        `Failed to bulk index posts: ${(error as Error).message}`,
      );
      return 0;
    }
  }
}
