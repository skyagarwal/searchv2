import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * Service for generating embeddings using the embedding service
 */
@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly embeddingUrl: string;

  constructor(private configService: ConfigService) {
    this.embeddingUrl = this.configService.get<string>('EMBEDDING_API_URL') || 'http://localhost:3101';
    this.logger.log(`Embedding service URL: ${this.embeddingUrl}`);
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      const response = await axios.post(
        `${this.embeddingUrl}/embed`,
        { texts: [text] },
        { timeout: 5000 }
      );

      if (response.data && response.data.embeddings && response.data.embeddings.length > 0) {
        return response.data.embeddings[0];
      }

      this.logger.warn('No embeddings returned from service');
      return null;
    } catch (error: any) {
      this.logger.error(`Failed to generate embedding: ${error?.message || String(error)}`);
      return null;
    }
  }

  /**
   * Generate embeddings for multiple texts
   */
  async generateEmbeddings(texts: string[]): Promise<number[][] | null> {
    try {
      const response = await axios.post(
        `${this.embeddingUrl}/embed`,
        { texts },
        { timeout: 10000 }
      );

      if (response.data && response.data.embeddings) {
        return response.data.embeddings;
      }

      this.logger.warn('No embeddings returned from service');
      return null;
    } catch (error: any) {
      this.logger.error(`Failed to generate embeddings: ${error?.message || String(error)}`);
      return null;
    }
  }

  /**
   * Check if embedding service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.embeddingUrl}/health`, { timeout: 2000 });
      return response.status === 200;
    } catch (error: any) {
      this.logger.warn('Embedding service not available');
      return false;
    }
  }
}
