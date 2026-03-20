import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { ES_CLIENT, ES_INDEX } from './elasticsearch.constants';

@Injectable()
export class ElasticsearchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ElasticsearchService.name);

  constructor(@Inject(ES_CLIENT) private readonly client: Client) {}

  async onModuleInit() {
    try {
      await this.ensureIndex(ES_INDEX.USERS, this.getUsersMapping());
      await this.ensureIndex(ES_INDEX.POSTS, this.getPostsMapping());
      this.logger.log('Elasticsearch indices initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize ES indices: ${(error as Error).message}`,
      );
    }
  }

  async onModuleDestroy() {
    await this.client.close();
  }

  async index(indexName: string, id: string, body: Record<string, unknown>) {
    return this.client.index({ index: indexName, id, body, refresh: 'wait_for' });
  }

  async delete(indexName: string, id: string) {
    try {
      return await this.client.delete({ index: indexName, id, refresh: 'wait_for' });
    } catch (error: any) {
      if (error?.meta?.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async search(indexName: string, body: Record<string, unknown>) {
    return this.client.search({ index: indexName, body });
  }

  async bulk(operations: any[]) {
    return this.client.bulk({ operations, refresh: 'wait_for' });
  }

  async isHealthy(): Promise<boolean> {
    try {
      const health = await this.client.cluster.health();
      return health.status !== 'red';
    } catch {
      return false;
    }
  }

  async deleteIndex(indexName: string) {
    const exists = await this.client.indices.exists({ index: indexName });
    if (exists) {
      await this.client.indices.delete({ index: indexName });
    }
  }

  private async ensureIndex(
    indexName: string,
    mapping: Record<string, unknown>,
  ) {
    const exists = await this.client.indices.exists({ index: indexName });
    if (!exists) {
      await this.client.indices.create({
        index: indexName,
        body: mapping,
      });
      this.logger.log(`Created index: ${indexName}`);
    }
  }

  private getUsersMapping() {
    return {
      settings: {
        analysis: {
          analyzer: {
            name_analyzer: {
              type: 'custom',
              tokenizer: 'standard',
              filter: ['lowercase', 'asciifolding', 'name_ngram'],
            },
            name_search_analyzer: {
              type: 'custom',
              tokenizer: 'standard',
              filter: ['lowercase', 'asciifolding'],
            },
          },
          filter: {
            name_ngram: {
              type: 'edge_ngram',
              min_gram: 2,
              max_gram: 20,
            },
          },
        },
      },
      mappings: {
        properties: {
          userId: { type: 'keyword' },
          firstName: {
            type: 'text',
            analyzer: 'name_analyzer',
            search_analyzer: 'name_search_analyzer',
          },
          lastName: {
            type: 'text',
            analyzer: 'name_analyzer',
            search_analyzer: 'name_search_analyzer',
          },
          displayName: {
            type: 'text',
            analyzer: 'name_analyzer',
            search_analyzer: 'name_search_analyzer',
            fields: { keyword: { type: 'keyword' } },
          },
          bio: { type: 'text', analyzer: 'standard' },
          location: {
            type: 'text',
            analyzer: 'standard',
            fields: { keyword: { type: 'keyword' } },
          },
          avatarKey: { type: 'keyword', index: false },
          status: { type: 'keyword' },
          createdAt: { type: 'date' },
        },
      },
    };
  }

  private getPostsMapping() {
    return {
      settings: {
        analysis: {
          analyzer: {
            content_analyzer: {
              type: 'custom',
              tokenizer: 'standard',
              filter: ['lowercase', 'asciifolding'],
            },
          },
        },
      },
      mappings: {
        properties: {
          postId: { type: 'keyword' },
          authorId: { type: 'keyword' },
          authorName: { type: 'text', analyzer: 'standard' },
          authorAvatar: { type: 'keyword', index: false },
          content: { type: 'text', analyzer: 'content_analyzer' },
          visibility: { type: 'keyword' },
          createdAt: { type: 'date' },
          updatedAt: { type: 'date' },
        },
      },
    };
  }
}
