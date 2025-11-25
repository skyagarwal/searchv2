import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SearchModule } from '../search/search.module';
import { SyncModule } from '../sync/sync.module';
import { AnalyticsService } from './analytics.service';
import { SearchCacheService } from './cache.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SearchModule,
    SyncModule,
  ],
  providers: [AnalyticsService, SearchCacheService],
  exports: [SearchCacheService],
})
export class AppModule {}
