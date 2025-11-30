import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { ModuleService } from './module.service';
import { AnalyticsService } from '../modules/analytics.service';
import { EmbeddingService } from '../modules/embedding.service';
import { SearchCacheService } from '../modules/cache.service';
import { ZoneService } from '../modules/zone.service';
import { ImageService } from '../modules/image.service';

@Module({
  controllers: [SearchController],
  providers: [SearchService, ModuleService, AnalyticsService, EmbeddingService, SearchCacheService, ZoneService, ImageService],
  exports: [ImageService],
})
export class SearchModule {}
