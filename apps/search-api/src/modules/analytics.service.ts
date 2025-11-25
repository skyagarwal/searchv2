import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@opensearch-project/opensearch';

@Injectable()
export class AnalyticsService {
  private readonly chUrl: string;
  private readonly logger = new Logger(AnalyticsService.name);
  private opensearchClient: Client | null = null;

  constructor(private readonly config: ConfigService) {
    this.chUrl = this.config.get<string>('CLICKHOUSE_URL') || 'http://localhost:8123';
    
    // Initialize OpenSearch client for log indexing
    try {
      const node = this.config.get<string>('OPENSEARCH_HOST') || 'http://localhost:9200';
      const username = this.config.get<string>('OPENSEARCH_USERNAME');
      const password = this.config.get<string>('OPENSEARCH_PASSWORD');
      
      this.opensearchClient = new Client({
        node,
        auth: username && password ? { username, password } : undefined,
        ssl: { rejectUnauthorized: false },
      } as any);
      
      this.logger.log('✅ OpenSearch analytics client initialized');
    } catch (error: any) {
      this.logger.warn(`Failed to initialize OpenSearch client: ${error?.message || String(error)}`);
    }
  }

  async logSearch(evt: {
    module: string;
    q: string;
    lat?: number;
    lon?: number;
    size?: number;
    page?: number;
    filters?: any;
    total?: number;
    section?: 'items' | 'stores';
    user_id?: string;
  }) {
    const timestamp = new Date().toISOString();
    
    // Log to ClickHouse (existing)
    try {
      const body = `INSERT INTO analytics.search_events (module, q, lat, lon, size, page, filters, total, section, user_id) FORMAT JSONEachRow\n` +
        JSON.stringify({
          module: evt.module,
          q: evt.q || '',
          lat: Number(evt.lat || 0),
          lon: Number(evt.lon || 0),
          size: Number(evt.size || 0),
          page: Number(evt.page || 1),
          filters: JSON.stringify(evt.filters || {}),
          total: Number(evt.total || 0),
          section: evt.section || 'items',
          user_id: evt.user_id || '',
        });
      await fetch(`${this.chUrl}/?query=`, { method: 'POST', body, headers: { 'Content-Type': 'text/plain' } });
    } catch (error: any) {
      this.logger.debug(`ClickHouse log failed: ${error?.message || String(error)}`);
    }

    // Also log to OpenSearch for Dashboards visualization
    if (this.opensearchClient) {
      try {
        // Create index name with date pattern for time-based indices
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '.');
        const indexName = `search-logs-${dateStr}`;
        
        const logDoc = {
          '@timestamp': timestamp,
          timestamp: timestamp,
          module: evt.module,
          query: evt.q || '',
          lat: evt.lat || null,
          lon: evt.lon || null,
          size: evt.size || 20,
          page: evt.page || 1,
          filters: evt.filters || {},
          total_results: evt.total || 0,
          section: evt.section || 'items',
          user_id: evt.user_id || null,
          // Additional fields for better visualization
          has_results: (evt.total || 0) > 0,
          has_geo: !!(evt.lat && evt.lon),
          query_length: (evt.q || '').length,
        };

        await this.opensearchClient.index({
          index: indexName,
          body: logDoc,
        });
      } catch (error: any) {
        // Silent fail - don't block search requests
        this.logger.debug(`OpenSearch log failed: ${error?.message || String(error)}`);
      }
    }
  }
}
