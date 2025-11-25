import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mysql from 'mysql2/promise';

export interface Module {
  id: number;
  module_type: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  status: number;
  opensearch_index: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ModuleSearchOptions {
  module_id?: number;
  module_ids?: number[];
  module_type?: string;
}

@Injectable()
export class ModuleService {
  private readonly logger = new Logger(ModuleService.name);
  private pool: mysql.Pool;

  constructor(private readonly config: ConfigService) {
    // Initialize MySQL connection pool
    const host = this.config.get<string>('MYSQL_HOST') || 'localhost';
    const port = this.config.get<number>('MYSQL_PORT') || 3306;
    const user = this.config.get<string>('MYSQL_USER') || 'mangwale_user';
    const password = this.config.get<string>('MYSQL_PASSWORD') || 'admin123';
    const database = this.config.get<string>('MYSQL_DATABASE') || 'migrated_db';

    this.pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    this.logger.log(`MySQL pool initialized: ${user}@${host}:${port}/${database}`);
  }

  /**
   * Get all active modules
   */
  async getActiveModules(): Promise<Module[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      'SELECT * FROM modules WHERE status = 1 ORDER BY id ASC'
    );
    return rows as Module[];
  }

  /**
   * Get module by ID
   */
  async getModuleById(id: number): Promise<Module | null> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      'SELECT * FROM modules WHERE id = ? AND status = 1',
      [id]
    );
    return rows.length > 0 ? (rows[0] as Module) : null;
  }

  /**
   * Get multiple modules by IDs
   */
  async getModulesByIds(ids: number[]): Promise<Module[]> {
    if (!ids || ids.length === 0) return [];
    
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      'SELECT * FROM modules WHERE id IN (?) AND status = 1 ORDER BY id ASC',
      [ids]
    );
    return rows as Module[];
  }

  /**
   * Get modules by type (food, ecommerce, etc.)
   */
  async getModulesByType(type: string): Promise<Module[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      'SELECT * FROM modules WHERE module_type = ? AND status = 1 ORDER BY id ASC',
      [type]
    );
    return rows as Module[];
  }

  /**
   * Resolve which modules to search based on options
   * Returns list of modules to search
   */
  async resolveModules(options: ModuleSearchOptions): Promise<Module[]> {
    // Priority: module_id > module_ids > module_type > all active
    
    if (options.module_id) {
      const module = await this.getModuleById(options.module_id);
      return module ? [module] : [];
    }

    if (options.module_ids && options.module_ids.length > 0) {
      return await this.getModulesByIds(options.module_ids);
    }

    if (options.module_type) {
      return await this.getModulesByType(options.module_type);
    }

    // Default: return all active modules
    return await this.getActiveModules();
  }

  /**
   * Get index name for a module
   * Maps module to OpenSearch index alias
   */
  getIndexForModule(module: Module, target: 'items' | 'stores' = 'items'): string {
    // Use opensearch_index from database if available
    if (module.opensearch_index) {
      return target === 'stores' 
        ? `${module.opensearch_index}_stores` 
        : module.opensearch_index;
    }

    // Fallback to module_type mapping
    const typeMap: Record<string, string> = {
      food: target === 'stores' ? 'food_stores' : 'food_items',
      ecommerce: target === 'stores' ? 'ecom_stores' : 'ecom_items',
      grocery: target === 'stores' ? 'ecom_stores' : 'ecom_items', // Grocery uses ecom indices
      parcel: 'parcel_items', // Placeholder - needs index creation
      pharmacy: 'pharmacy_items', // Placeholder - needs index creation
    };

    return typeMap[module.module_type] || 'food_items';
  }

  /**
   * Get all indices to search based on modules
   */
  getIndicesForModules(modules: Module[], target: 'items' | 'stores' = 'items'): string[] {
    const indices = modules.map(m => this.getIndexForModule(m, target));
    // Remove duplicates (e.g., multiple ecommerce modules using same index)
    return [...new Set(indices)];
  }

  /**
   * Validate that a category belongs to a specific module
   */
  async validateCategoryModule(categoryId: number, moduleId: number): Promise<boolean> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      'SELECT id FROM categories WHERE id = ? AND module_id = ?',
      [categoryId, moduleId]
    );
    return rows.length > 0;
  }

  /**
   * Get module ID for a category
   */
  async getModuleIdForCategory(categoryId: number): Promise<number | null> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      'SELECT module_id FROM categories WHERE id = ?',
      [categoryId]
    );
    return rows.length > 0 ? rows[0].module_id : null;
  }

  /**
   * Get category information
   */
  async getCategoryInfo(categoryId: number, moduleId?: number): Promise<any> {
    let query = 'SELECT * FROM categories WHERE id = ?';
    const params: any[] = [categoryId];
    
    if (moduleId) {
      query += ' AND module_id = ?';
      params.push(moduleId);
    }

    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(query, params);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Get all child category IDs recursively (including the parent category itself)
   * This method finds all subcategories (children, grandchildren, etc.) of a given category
   */
  async getCategoryWithChildren(categoryId: number, moduleId?: number): Promise<number[]> {
    const categoryIds = new Set<number>();
    const visited = new Set<number>();
    
    // Helper function to recursively find all children
    const findChildren = async (parentId: number): Promise<void> => {
      if (visited.has(parentId)) return; // Prevent infinite loops
      visited.add(parentId);
      
      let query = 'SELECT id FROM categories WHERE parent_id = ? AND status = 1';
      const params: any[] = [parentId];
      
      if (moduleId) {
        query += ' AND module_id = ?';
        params.push(moduleId);
      }
      
      try {
        const [rows] = await this.pool.query<mysql.RowDataPacket[]>(query, params);
        
        for (const row of rows) {
          const childId = Number(row.id);
          if (!categoryIds.has(childId)) {
            categoryIds.add(childId);
            // Recursively find children of this child
            await findChildren(childId);
          }
        }
      } catch (error: any) {
        this.logger.error(`[getCategoryWithChildren] Error finding children of category ${parentId}: ${error?.message || String(error)}`);
      }
    };
    
    // First, verify the parent category exists
    let parentQuery = 'SELECT id, module_id FROM categories WHERE id = ? AND status = 1';
    const parentParams: any[] = [categoryId];
    
    if (moduleId) {
      parentQuery += ' AND module_id = ?';
      parentParams.push(moduleId);
    }
    
    try {
      const [parentRows] = await this.pool.query<mysql.RowDataPacket[]>(parentQuery, parentParams);
      
      if (parentRows.length === 0) {
        this.logger.warn(`[getCategoryWithChildren] Category ${categoryId} not found or inactive`);
        return [];
      }
      
      // Add the parent category itself
      categoryIds.add(categoryId);
      
      // Find all children recursively
      await findChildren(categoryId);
      
      const result = Array.from(categoryIds);
      this.logger.debug(`[getCategoryWithChildren] Category ${categoryId} has ${result.length - 1} child categories (total: ${result.length} including parent)`);
      
      return result;
    } catch (error: any) {
      this.logger.error(`[getCategoryWithChildren] Error getting category ${categoryId} with children: ${error?.message || String(error)}`);
      // Return just the parent category ID on error
      return [categoryId];
    }
  }

  /**
   * Get store logos by store IDs
   */
  async getStoreLogos(storeIds: string[]): Promise<Map<string, string | null>> {
    if (!storeIds || storeIds.length === 0) return new Map();
    
    // Log connection details for debugging
    const host = this.config.get<string>('MYSQL_HOST') || 'localhost';
    const database = this.config.get<string>('MYSQL_DATABASE') || 'migrated_db';
    const user = this.config.get<string>('MYSQL_USER') || 'mangwale_user';
    this.logger.debug(`[getStoreLogos] Connecting to MySQL: ${user}@${host}/${database} for ${storeIds.length} stores`);
    
    try {
      const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
        'SELECT id, logo FROM stores WHERE id IN (?)',
        [storeIds]
      );
      
      this.logger.debug(`[getStoreLogos] Successfully fetched ${rows.length} store logos from database ${database}`);
      
      const logoMap = new Map<string, string | null>();
      rows.forEach((row: any) => {
        logoMap.set(String(row.id), row.logo || null);
      });
      
      // Set null for stores not found in database
      storeIds.forEach(id => {
        if (!logoMap.has(id)) {
          logoMap.set(id, null);
        }
      });
      
      return logoMap;
    } catch (error: any) {
      this.logger.error(`[getStoreLogos] Failed to fetch store logos from ${user}@${host}/${database}: ${error?.message || String(error)}`);
      // Return map with null values on error
      const logoMap = new Map<string, string | null>();
      storeIds.forEach(id => logoMap.set(id, null));
      return logoMap;
    }
  }

  /**
   * Get store names by store IDs from MySQL
   */
  async getStoreNames(storeIds: string[]): Promise<Map<string, string | null>> {
    if (!storeIds || storeIds.length === 0) return new Map();
    
    const host = this.config.get<string>('MYSQL_HOST') || 'localhost';
    const database = this.config.get<string>('MYSQL_DATABASE') || 'migrated_db';
    const user = this.config.get<string>('MYSQL_USER') || 'mangwale_user';
    this.logger.debug(`[getStoreNames] Connecting to MySQL: ${user}@${host}/${database} for ${storeIds.length} stores`);
    
    try {
      const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
        'SELECT id, name FROM stores WHERE id IN (?)',
        [storeIds]
      );
      
      this.logger.debug(`[getStoreNames] Successfully fetched ${rows.length} store names from database ${database}`);
      
      const nameMap = new Map<string, string | null>();
      rows.forEach((row: any) => {
        nameMap.set(String(row.id), row.name || null);
      });
      
      // Set null for stores not found in database
      storeIds.forEach(id => {
        if (!nameMap.has(id)) {
          nameMap.set(id, null);
        }
      });
      
      return nameMap;
    } catch (error: any) {
      this.logger.error(`[getStoreNames] Failed to fetch store names from ${user}@${host}/${database}: ${error?.message || String(error)}`);
      // Return map with null values on error
      const nameMap = new Map<string, string | null>();
      storeIds.forEach(id => nameMap.set(id, null));
      return nameMap;
    }
  }

  /**
   * Get store addresses and cover_photos by store IDs
   */
  async getStoreAddressesAndCoverPhotos(storeIds: string[]): Promise<Map<string, { address: string | null; cover_photo: string | null }>> {
    if (!storeIds || storeIds.length === 0) return new Map();
    
    // Log connection details for debugging
    const host = this.config.get<string>('MYSQL_HOST') || 'localhost';
    const database = this.config.get<string>('MYSQL_DATABASE') || 'migrated_db';
    const user = this.config.get<string>('MYSQL_USER') || 'mangwale_user';
    this.logger.debug(`[getStoreAddressesAndCoverPhotos] Connecting to MySQL: ${user}@${host}/${database} for ${storeIds.length} stores`);
    
    try {
      const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
        'SELECT id, address, cover_photo FROM stores WHERE id IN (?)',
        [storeIds]
      );
      
      this.logger.debug(`[getStoreAddressesAndCoverPhotos] Successfully fetched ${rows.length} store addresses/cover_photos from database ${database}`);
      
      const dataMap = new Map<string, { address: string | null; cover_photo: string | null }>();
      rows.forEach((row: any) => {
        dataMap.set(String(row.id), {
          address: row.address || null,
          cover_photo: row.cover_photo || null,
        });
      });
      
      // Set null for stores not found in database
      storeIds.forEach(id => {
        if (!dataMap.has(id)) {
          dataMap.set(id, { address: null, cover_photo: null });
        }
      });
      
      return dataMap;
    } catch (error: any) {
      this.logger.error(`[getStoreAddressesAndCoverPhotos] Failed to fetch store addresses/cover_photos from ${user}@${host}/${database}: ${error?.message || String(error)}`);
      // Return map with null values on error
      const dataMap = new Map<string, { address: string | null; cover_photo: string | null }>();
      storeIds.forEach(id => dataMap.set(id, { address: null, cover_photo: null }));
      return dataMap;
    }
  }

  /**
   * Close the connection pool (for graceful shutdown)
   */
  async close(): Promise<void> {
    await this.pool.end();
    this.logger.log('MySQL pool closed');
  }
}
