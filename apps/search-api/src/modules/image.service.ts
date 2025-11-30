import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * ImageService - Constructs full URLs for images stored in S3/MinIO or local storage
 * 
 * This service mirrors the PHP backend's `get_full_url()` helper logic.
 * Images in the database are stored as filenames only (e.g., "2025-01-05-677a14ece41f6.png")
 * and this service constructs the full URL based on storage configuration.
 * 
 * FALLBACK STRATEGY:
 * - Primary: MinIO (fast, local)
 * - Fallback: S3 (always available)
 * - Response includes BOTH URLs so frontend can fallback if MinIO is down
 * 
 * Storage Types:
 * - "s3": AWS S3 storage
 * - "minio": MinIO self-hosted storage (S3-compatible)
 * - "public" or null: Local storage at /storage/app/public/{path}/{filename}
 * 
 * Configuration (via .env):
 * - STORAGE_TYPE=s3|minio|public (default: s3)
 * - S3_URL=https://mangwale.s3.ap-south-1.amazonaws.com
 * - MINIO_URL=http://localhost:9000 (or your MinIO endpoint)
 * - MINIO_BUCKET=mangwale
 */
@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);
  
  // Storage configuration
  private readonly storageType: 's3' | 'minio' | 'public';
  private readonly s3Url: string;
  private readonly minioUrl: string;
  private readonly bucket: string;
  private readonly enableFallback: boolean;
  
  // Path prefixes for different entity types (matching PHP backend)
  private readonly pathPrefixes: Record<string, string>;
  
  // Default placeholder images (optional)
  private readonly placeholders: Record<string, string> = {
    product: '/assets/admin/img/160x160/img2.jpg',
    store: '/assets/admin/img/160x160/img1.jpg',
    category: '/assets/admin/img/100x100/2.jpg',
    default: '/assets/admin/img/160x160/img2.jpg',
  };

  constructor(private readonly config: ConfigService) {
    // Determine storage type (default to s3 for backward compatibility)
    this.storageType = (this.config.get<string>('STORAGE_TYPE') || 's3') as 's3' | 'minio' | 'public';
    
    // S3 configuration (always available as fallback)
    this.s3Url = this.config.get<string>('S3_URL') || 'https://mangwale.s3.ap-south-1.amazonaws.com';
    
    // MinIO configuration (for self-hosted S3-compatible storage)
    this.minioUrl = this.config.get<string>('MINIO_URL') || 'http://localhost:9000';
    
    // Bucket name (same for both S3 and MinIO)
    this.bucket = this.config.get<string>('MINIO_BUCKET') || this.config.get<string>('S3_BUCKET') || 'mangwale';
    
    // Enable fallback URLs (default: true when using MinIO)
    this.enableFallback = this.config.get<string>('IMAGE_FALLBACK_ENABLED') !== 'false';
    
    // Path prefixes matching PHP backend structure
    this.pathPrefixes = {
      product: this.config.get<string>('IMAGE_PATH_PRODUCT') || 'product',
      item: this.config.get<string>('IMAGE_PATH_PRODUCT') || 'product',  // alias
      store: this.config.get<string>('IMAGE_PATH_STORE') || 'store',
      store_logo: this.config.get<string>('IMAGE_PATH_STORE') || 'store',
      store_cover: this.config.get<string>('IMAGE_PATH_STORE_COVER') || 'store/cover',
      cover_photo: this.config.get<string>('IMAGE_PATH_STORE_COVER') || 'store/cover',
      category: this.config.get<string>('IMAGE_PATH_CATEGORY') || 'category',
      delivery_man: this.config.get<string>('IMAGE_PATH_DELIVERY_MAN') || 'delivery-man',
    };
    
    const activeUrl = this.storageType === 'minio' ? this.minioUrl : this.s3Url;
    this.logger.log(`ImageService initialized: storage=${this.storageType}, primary=${activeUrl}, fallback=${this.enableFallback ? this.s3Url : 'disabled'}`);
  }
  
  /**
   * Get the base URL for images based on storage type
   */
  private getBaseUrl(forceS3: boolean = false): string {
    if (forceS3) {
      return this.s3Url;
    }
    
    switch (this.storageType) {
      case 'minio':
        return `${this.minioUrl}/${this.bucket}`;
      case 's3':
        return this.s3Url;
      case 'public':
        return '/storage/app/public';
      default:
        return this.s3Url;
    }
  }

  /**
   * Get full URL for an image
   */
  getFullUrl(
    filename: string | null | undefined, 
    entityType: string = 'product',
    forceS3: boolean = false
  ): string | null {
    if (!filename) {
      return null;
    }
    
    const pathPrefix = this.pathPrefixes[entityType] || this.pathPrefixes['product'];
    const baseUrl = this.getBaseUrl(forceS3);
    
    return `${baseUrl}/${pathPrefix}/${filename}`;
  }

  /**
   * Get S3 fallback URL (always uses S3)
   */
  getS3FallbackUrl(filename: string | null | undefined, entityType: string = 'product'): string | null {
    if (!filename) return null;
    const pathPrefix = this.pathPrefixes[entityType] || this.pathPrefixes['product'];
    return `${this.s3Url}/${pathPrefix}/${filename}`;
  }

  /**
   * Transform an item object to include full image URLs
   * Includes both primary (MinIO) and fallback (S3) URLs
   */
  transformItemImages(item: Record<string, any>): Record<string, any> {
    if (!item) return item;
    
    const transformed = { ...item };
    
    // Main image - primary URL
    if (item.image) {
      transformed.image_full_url = this.getFullUrl(item.image, 'product');
      // Add S3 fallback if using MinIO
      if (this.enableFallback && this.storageType === 'minio') {
        transformed.image_fallback_url = this.getS3FallbackUrl(item.image, 'product');
      }
    }
    
    // Additional images array
    if (item.images && Array.isArray(item.images)) {
      transformed.images_full_url = item.images.map((img: any) => {
        if (typeof img === 'string') {
          return this.getFullUrl(img, 'product');
        } else if (img && typeof img === 'object') {
          return this.getFullUrl(img.img, 'product');
        }
        return null;
      }).filter(Boolean);
    }
    
    return transformed;
  }

  /**
   * Transform a store object to include full image URLs
   * Includes both primary (MinIO) and fallback (S3) URLs
   */
  transformStoreImages(store: Record<string, any>): Record<string, any> {
    if (!store) return store;
    
    const transformed = { ...store };
    
    // Logo
    if (store.logo) {
      transformed.logo_full_url = this.getFullUrl(store.logo, 'store_logo');
      if (this.enableFallback && this.storageType === 'minio') {
        transformed.logo_fallback_url = this.getS3FallbackUrl(store.logo, 'store_logo');
      }
    }
    
    // Cover photo
    if (store.cover_photo) {
      transformed.cover_photo_full_url = this.getFullUrl(store.cover_photo, 'cover_photo');
      if (this.enableFallback && this.storageType === 'minio') {
        transformed.cover_photo_fallback_url = this.getS3FallbackUrl(store.cover_photo, 'cover_photo');
      }
    }
    
    // Sometimes stores also have an image field
    if (store.image) {
      transformed.image_full_url = this.getFullUrl(store.image, 'store');
    }
    
    return transformed;
  }

  /**
   * Transform a category object to include full image URLs
   * Includes both primary (MinIO) and fallback (S3) URLs
   */
  transformCategoryImages(category: Record<string, any>): Record<string, any> {
    if (!category) return category;
    
    const transformed = { ...category };
    
    if (category.image) {
      transformed.image_full_url = this.getFullUrl(category.image, 'category');
      if (this.enableFallback && this.storageType === 'minio') {
        transformed.image_fallback_url = this.getS3FallbackUrl(category.image, 'category');
      }
    }
    
    return transformed;
  }

  /**
   * Transform search results (items) with full image URLs
   */
  transformItemsWithImages(items: Record<string, any>[]): Record<string, any>[] {
    if (!items || !Array.isArray(items)) return items;
    return items.map(item => this.transformItemImages(item));
  }

  /**
   * Transform search results (stores) with full image URLs
   */
  transformStoresWithImages(stores: Record<string, any>[]): Record<string, any>[] {
    if (!stores || !Array.isArray(stores)) return stores;
    return stores.map(store => this.transformStoreImages(store));
  }

  /**
   * Transform search results (categories) with full image URLs
   */
  transformCategoriesWithImages(categories: Record<string, any>[]): Record<string, any>[] {
    if (!categories || !Array.isArray(categories)) return categories;
    return categories.map(category => this.transformCategoryImages(category));
  }
}
