import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { ES_CLIENT } from './elasticsearch.constants';
import { ElasticsearchService } from './elasticsearch.service';

@Global()
@Module({
  providers: [
    {
      provide: ES_CLIENT,
      useFactory: (configService: ConfigService) => {
        const node = configService.get<string>(
          'ELASTICSEARCH_URL',
          'http://localhost:9200',
        );
        return new Client({ node });
      },
      inject: [ConfigService],
    },
    ElasticsearchService,
  ],
  exports: [ElasticsearchService, ES_CLIENT],
})
export class ElasticsearchModule {}
