import { Controller, Get, Post, Query, UploadedFile, UseInterceptors, BadRequestException, HttpCode, Param } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SearchService } from './search.service';
import { ConfigService } from '@nestjs/config';
import { ApiConsumes, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

@Controller()
@ApiTags('Search API')
export class SearchController {
  constructor(private readonly searchService: SearchService, private readonly config: ConfigService) {}

  @Get('/')
  @ApiOperation({ summary: 'Root', description: 'Landing endpoint listing commonly used routes for quick navigation.' })
  @ApiResponse({ status: 200, description: 'OK', schema: { example: { message: 'Search API', endpoints: { health: '/health', foodSearch: '/search/food?q=kofta' } } } })
  root() {
    return {
      message: 'Search API',
      version: '2.0.0',
      endpoints: {
        health: '/health',
        // Legacy endpoints (module type based)
        foodSearch: '/search/food?q=kofta',
        foodStores: '/search/food/stores?lat=19.9975&lon=73.7898&radius_km=5',
        foodSuggest: '/search/food/suggest?q=ko',
        ecomSearch: '/search/ecom?q=milk',
        ecomStores: '/search/ecom/stores?lat=19.9975&lon=73.7898&radius_km=5',
        ecomSuggest: '/search/ecom/suggest?q=mi',
        // New endpoints (module ID based) - RECOMMENDED
        suggest: '/v2/search/suggest?q=pizza&module_id=4',
        items: '/v2/search/items?q=pizza&module_id=4',
        stores: '/v2/search/stores?q=pizza&module_id=4',
        // Other endpoints
        unifiedSearch: '/search?q=pizza&module_ids=4,5',
        trending: '/analytics/trending?window=7d',
        apiDocs: '/api-docs'
      },
      note: 'Use /v2/search/* endpoints for module_id based search (recommended)'
    };
  }

  @Get('/health')
  @ApiTags('Health')
  @ApiOperation({ summary: 'Health check', description: 'Returns service health and OpenSearch cluster status.' })
  @ApiResponse({ status: 200, description: 'Service is healthy', schema: { example: { ok: true, opensearch: 'green' } } })
  async health() {
    const h = await this.searchService.health();
    return { ok: true, opensearch: h.status };
  }

  @Get('/search')
  @ApiTags('Unified Search')
  @ApiOperation({ 
    summary: 'Unified Module-Aware Search', 
    description: 'Search across single module, multiple modules, module types, or all modules. Supports all filters: veg, category, price, rating, geo-distance, semantic search.' 
  })
  @ApiQuery({ name: 'q', required: false, description: 'Search query text', example: 'pizza' })
  @ApiQuery({ name: 'module_id', required: false, description: 'Single module ID to search', example: 4 })
  @ApiQuery({ name: 'module_ids', required: false, description: 'Comma-separated module IDs (e.g., 4,5,13)', example: '4,5' })
  @ApiQuery({ name: 'module_type', required: false, description: 'Module type: food, ecommerce, grocery, parcel, pharmacy', example: 'food' })
  @ApiQuery({ name: 'semantic', required: false, description: 'Use semantic/vector search (1=enabled)', example: '1' })
  @ApiQuery({ name: 'veg', required: false, description: "Veg filter: '1'|'veg' = vegetarian, '0'|'non-veg' = non-veg", example: '1' })
  @ApiQuery({ name: 'category_id', required: false, description: 'Category ID (requires module_id since categories are module-scoped)', example: 288 })
  @ApiQuery({ name: 'price_min', required: false, description: 'Minimum price', example: 100 })
  @ApiQuery({ name: 'price_max', required: false, description: 'Maximum price', example: 500 })
  @ApiQuery({ name: 'rating_min', required: false, description: 'Minimum rating (0-5)', example: 4 })
  @ApiQuery({ name: 'store_id', required: false, description: 'Filter items to a specific store (for in-store browsing/search)', example: 123 })
  @ApiQuery({ name: 'store_ids', required: false, description: 'Filter items to multiple stores (comma-separated, for multi-store comparison)', example: '123,456,789' })
  @ApiQuery({ name: 'lat', required: false, description: 'Latitude for geo-distance', example: 19.9975 })
  @ApiQuery({ name: 'lon', required: false, description: 'Longitude for geo-distance', example: 73.7898 })
  @ApiQuery({ name: 'radius_km', required: false, description: 'Radius in kilometers (requires lat/lon)', example: 5 })
  @ApiQuery({ name: 'zone_id', required: false, description: 'Zone ID for zone-based filtering', example: 4 })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'size', required: false, description: 'Results per page (1-100)', example: 20 })
  @ApiQuery({ name: 'sort', required: false, description: 'Sort: distance, price_asc, price_desc, rating, popularity', example: 'distance' })
  @ApiResponse({ 
    status: 200, 
    description: 'Module-aware search results with items grouped by module',
    schema: {
      example: {
        q: 'pizza',
        filters: { module_ids: [4, 5], veg: '1', lat: 19.9975, lon: 73.7898 },
        modules: [
          { id: 4, name: 'Food', type: 'food', items_count: 45 },
          { id: 5, name: 'Shop', type: 'ecommerce', items_count: 12 }
        ],
        items: [
          { id: '123', name: 'Veg Pizza', module_id: 4, module_name: 'Food', price: 299 },
          { id: '456', name: 'Frozen Pizza', module_id: 5, module_name: 'Shop', price: 350 }
        ],
        meta: { total: 57, page: 1, size: 20 }
      }
    }
  })
  async unifiedSearch(@Query('q') q = '', @Query() filters: Record<string, string>) {
    return this.searchService.unifiedSearch(q, filters);
  }

  @Get('/search/recommendations/:itemId')
  @ApiTags('Recommendations')
  @ApiOperation({ 
    summary: 'Frequently Bought Together Recommendations', 
    description: 'Get items frequently bought together with the specified item. Based on co-occurrence analysis from order history. Optionally filter to same store only.' 
  })
  @ApiQuery({ name: 'module_id', required: true, description: 'Module ID of the item', example: 4 })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of recommendations (1-10)', example: 5 })
  @ApiQuery({ name: 'store_id', required: false, description: 'Filter recommendations to items from this store only', example: 123 })
  @ApiResponse({ 
    status: 200, 
    description: 'Frequently bought together recommendations',
    schema: {
      example: {
        item_id: '7801',
        item_name: 'Chapati',
        module_id: 4,
        store_id: 123,
        recommendations: [
          { item_id: 7803, item_name: 'Bajari Bhakari', times_together: 10, image: 'https://...', price: 50, store_id: 123 },
          { item_id: 7809, item_name: 'Puran Poli', times_together: 7, image: 'https://...', price: 80, store_id: 123 }
        ],
        meta: { total_recommendations: 2, based_on_orders: 17, store_filtered: true }
      }
    }
  })
  async getRecommendations(
    @Param('itemId') itemId: string,
    @Query('module_id') moduleId: string,
    @Query('limit') limit = '5',
    @Query('store_id') storeId?: string,
  ) {
    return this.searchService.getFrequentlyBoughtTogether(itemId, Number(moduleId), Number(limit), storeId);
  }

  @Get('/search/food')
  @ApiTags('Items')
  @ApiOperation({ summary: 'Search Food Items', description: 'Full-text and faceted search over food items with tri-state veg filtering, price/rating, geo radius, and category facets. Supports semantic search with semantic=1.' })
  @ApiQuery({ name: 'q', required: false, description: 'Query text. Multi-field match on name and description. If blank, returns popular items.' , example: 'pizza' })
  @ApiQuery({ name: 'semantic', required: false, description: 'Use semantic/vector search (1=enabled). Requires embeddings.', example: '1' })
  @ApiQuery({ name: 'veg', required: false, description: "Tri-state veg filter. '1'|'true'|'veg' = vegetarian only, '0'|'false'|'non-veg' = non-veg only, omit or 'all' = both.", example: '1' })
  @ApiQuery({ name: 'category_id', required: false, description: 'Filter by category id (numeric or string id).', example: 101 })
  @ApiQuery({ name: 'price_min', required: false, description: 'Minimum price.', example: 100 })
  @ApiQuery({ name: 'price_max', required: false, description: 'Maximum price.', example: 300 })
  @ApiQuery({ name: 'rating_min', required: false, description: 'Minimum average rating (0-5).', example: 4 })
  @ApiQuery({ name: 'open_now', required: false, description: 'If 1/true, prefer items currently open based on available_time_* fields.', example: '1' })
  @ApiQuery({ name: 'lat', required: false, description: 'Latitude used for distance scoring and optional radius filter.', example: 19.9975 })
  @ApiQuery({ name: 'lon', required: false, description: 'Longitude used for distance scoring and optional radius filter.', example: 73.7898 })
  @ApiQuery({ name: 'radius_km', required: false, description: 'If lat/lon present, restrict to items within this km radius; otherwise ignored.', example: 5 })
  @ApiQuery({ name: 'store_id', required: false, description: 'Filter items to a specific store (for in-store browsing/search).', example: 123 })
  @ApiQuery({ name: 'store_ids', required: false, description: 'Filter items to multiple stores (comma-separated, for multi-store comparison).', example: '123,456,789' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based).', example: 1 })
  @ApiQuery({ name: 'size', required: false, description: 'Page size (1-100).', example: 20 })
  @ApiQuery({ name: 'rerank', required: false, description: 'If 1, apply lightweight heuristic re-ranking.', example: '1' })
  @ApiResponse({ status: 200, description: 'Search results with items, facets, and metadata.', schema: { example: { module: 'food', q: 'pizza', filters: { veg: '1' }, items: [{ id: '123', name: 'Veg Pizza', price: 299, veg: 1, avg_rating: 4.5 }], facets: { veg: [{ value: 1, count: 190 }, { value: 0, count: 158 }], category_id: [{ value: 101, label: 'Pizzas', count: 120 }] }, meta: { total: 350 } } } })
  async searchFood(@Query('q') q = '', @Query() filters: Record<string, string>) {
    // Check if semantic search is requested
    const useSemantic = filters?.semantic === '1' || filters?.semantic === 'true';
    if (useSemantic && q && q.trim()) {
      return this.searchService.semanticSearch('food', q, filters);
    }
    return this.searchService.search('food', q, filters);
  }

  @Get('/search/food/category')
  @ApiTags('Items')
  @ApiOperation({ summary: 'Fast Category Search', description: 'Optimized endpoint for category-based browsing with fast loading and scroll pagination. Designed for Flutter app category browsing.' })
  @ApiQuery({ name: 'category_id', required: true, description: 'Category ID to filter items.', example: 288 })
  @ApiQuery({ name: 'lat', required: false, description: 'Latitude for distance calculation and sorting.', example: 19.99176 })
  @ApiQuery({ name: 'lon', required: false, description: 'Longitude for distance calculation and sorting.', example: 73.77388 })
  @ApiQuery({ name: 'radius_km', required: false, description: 'Radius filter in kilometers.', example: 20 })
  @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination (1-based).', example: 1 })
  @ApiQuery({ name: 'size', required: false, description: 'Items per page (1-50, default 20).', example: 20 })
  @ApiQuery({ name: 'sort', required: false, description: 'Sort order: distance, price_asc, price_desc, rating, popularity', example: 'distance' })
  @ApiQuery({ name: 'veg', required: false, description: 'Vegetarian filter: 1=veg only, 0=non-veg only', example: '1' })
  @ApiQuery({ name: 'price_min', required: false, description: 'Minimum price filter.', example: 100 })
  @ApiQuery({ name: 'price_max', required: false, description: 'Maximum price filter.', example: 500 })
  @ApiResponse({ status: 200, description: 'Fast category search results optimized for mobile browsing.' })
  async searchFoodCategory(@Query() filters: Record<string, string>) {
    return this.searchService.searchCategory('food', filters);
  }

  @Get('/search/ecom')
  @ApiTags('Items')
  @ApiOperation({ summary: 'Search E-commerce Items', description: 'Full-text and faceted search over e-commerce items. Veg filter supported when indexed. Brand and category facets included. Supports semantic search with semantic=1.' })
  @ApiQuery({ name: 'q', required: false, description: 'Query text for e-commerce items.', example: 'milk' })
  @ApiQuery({ name: 'semantic', required: false, description: 'Use semantic/vector search (1=enabled). Requires embeddings.', example: '1' })
  @ApiQuery({ name: 'veg', required: false, description: "Tri-state veg filter (when available in index).", example: '0' })
  @ApiQuery({ name: 'brand', required: false, description: 'Comma-separated brand list to filter (terms on brand.keyword).', example: 'amul,nestle' })
  @ApiQuery({ name: 'category_id', required: false, description: 'Filter by category id.', example: 5002 })
  @ApiQuery({ name: 'price_min', required: false, example: 50 })
  @ApiQuery({ name: 'price_max', required: false, example: 500 })
  @ApiQuery({ name: 'rating_min', required: false, example: 3 })
  @ApiQuery({ name: 'store_id', required: false, description: 'Filter items to a specific store (for in-store browsing/search).', example: 123 })
  @ApiQuery({ name: 'store_ids', required: false, description: 'Filter items to multiple stores (comma-separated, for multi-store comparison).', example: '123,456,789' })
  @ApiQuery({ name: 'lat', required: false, example: 19.9975 })
  @ApiQuery({ name: 'lon', required: false, example: 73.7898 })
  @ApiQuery({ name: 'radius_km', required: false, example: 10 })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'size', required: false, example: 20 })
  @ApiQuery({ name: 'rerank', required: false, example: '1' })
  @ApiResponse({ status: 200, description: 'Search results with items, brand and category facets, and metadata.' })
  async searchEcom(@Query('q') q = '', @Query() filters: Record<string, string>) {
    // Check if semantic search is requested
    const useSemantic = filters?.semantic === '1' || filters?.semantic === 'true';
    if (useSemantic && q && q.trim()) {
      return this.searchService.semanticSearch('ecom', q, filters);
    }
    return this.searchService.search('ecom', q, filters);
  }

  @Get('/search/ecom/category')
  @ApiTags('Items')
  @ApiOperation({ summary: 'Fast E-commerce Category Search', description: 'Optimized endpoint for e-commerce category browsing with fast loading and scroll pagination.' })
  @ApiQuery({ name: 'category_id', required: true, description: 'Category ID to filter items.', example: 5002 })
  @ApiQuery({ name: 'lat', required: false, description: 'Latitude for distance calculation and sorting.', example: 19.99176 })
  @ApiQuery({ name: 'lon', required: false, description: 'Longitude for distance calculation and sorting.', example: 73.77388 })
  @ApiQuery({ name: 'radius_km', required: false, description: 'Radius filter in kilometers.', example: 20 })
  @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination (1-based).', example: 1 })
  @ApiQuery({ name: 'size', required: false, description: 'Items per page (1-50, default 20).', example: 20 })
  @ApiQuery({ name: 'sort', required: false, description: 'Sort order: distance, price_asc, price_desc, rating, popularity', example: 'distance' })
  @ApiQuery({ name: 'veg', required: false, description: 'Vegetarian filter: 1=veg only, 0=non-veg only', example: '1' })
  @ApiQuery({ name: 'brand', required: false, description: 'Comma-separated brand filter', example: 'amul,nestle' })
  @ApiQuery({ name: 'price_min', required: false, description: 'Minimum price filter.', example: 50 })
  @ApiQuery({ name: 'price_max', required: false, description: 'Maximum price filter.', example: 500 })
  @ApiResponse({ status: 200, description: 'Fast e-commerce category search results optimized for mobile browsing.' })
  async searchEcomCategory(@Query() filters: Record<string, string>) {
    return this.searchService.searchCategory('ecom', filters);
  }

  @Get('/search/food/stores')
  @ApiTags('Stores')
  @ApiOperation({ summary: 'Search Food Stores', description: 'Search and geo-sort food stores; optional delivery_time_max filter parses the leading number from delivery_time (e.g., "30-40 min").' })
  @ApiQuery({ name: 'q', required: false, example: 'pizza' })
  @ApiQuery({ name: 'lat', required: false, example: 19.9975 })
  @ApiQuery({ name: 'lon', required: false, example: 73.7898 })
  @ApiQuery({ name: 'radius_km', required: false, example: 5 })
  @ApiQuery({ name: 'delivery_time_max', required: false, description: 'Keep stores whose delivery_time first number <= this value (minutes).', example: 30 })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'size', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Stores results sorted by distance (if geo provided) or popularity.', schema: { example: { module: 'food', stores: [{ id: 'st1', name: 'Pizza House', delivery_time: '25-35 min', location: { lat: 19.99, lon: 73.78 } }], meta: { total: 42 } } } })
  async searchFoodStores(@Query('q') q = '', @Query() filters: Record<string, string>) {
    return this.searchService.searchStores('food', q, filters);
  }

  @Get('/search/food/stores/category')
  @ApiTags('Stores')
  @ApiOperation({ summary: 'Fast Food Stores by Category', description: 'Optimized endpoint for finding stores that serve items from a specific category. Perfect for category-based store browsing.' })
  @ApiQuery({ name: 'category_id', required: true, description: 'Category ID to find stores serving items from this category.', example: 288 })
  @ApiQuery({ name: 'lat', required: false, description: 'Latitude for distance calculation and sorting.', example: 19.99176 })
  @ApiQuery({ name: 'lon', required: false, description: 'Longitude for distance calculation and sorting.', example: 73.77388 })
  @ApiQuery({ name: 'radius_km', required: false, description: 'Radius filter in kilometers.', example: 20 })
  @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination (1-based).', example: 1 })
  @ApiQuery({ name: 'size', required: false, description: 'Stores per page (1-50, default 20).', example: 20 })
  @ApiQuery({ name: 'sort', required: false, description: 'Sort order: distance, rating, popularity, delivery_time', example: 'distance' })
  @ApiQuery({ name: 'veg', required: false, description: 'Vegetarian filter: 1=veg only, 0=non-veg only', example: '1' })
  @ApiQuery({ name: 'delivery_time_max', required: false, description: 'Maximum delivery time in minutes.', example: 30 })
  @ApiResponse({ status: 200, description: 'Fast category-based store search results optimized for mobile browsing.' })
  async searchFoodStoresCategory(@Query() filters: Record<string, string>) {
    return this.searchService.searchStoresCategory('food', filters);
  }

  @Get('/search/food/suggest')
  @ApiTags('Suggest')
  @ApiOperation({ summary: 'Suggest Food', description: 'Typeahead suggestions across items, stores, and categories. Requires q length >= 2.' })
  @ApiQuery({ name: 'q', required: true, example: 'pi' })
  @ApiQuery({ name: 'size', required: false, example: 5 })
  @ApiQuery({ name: 'lat', required: false, example: 19.9975 })
  @ApiQuery({ name: 'lon', required: false, example: 73.7898 })
  @ApiResponse({ status: 200, description: 'Items, stores, and category suggestions.', schema: { example: { module: 'food', q: 'pi', items: [{ id: '123', name: 'Pizza' }], stores: [{ id: 'st1', name: 'Pizza House' }], categories: [{ id: '101', name: 'Pizzas' }] } } })
  async suggestFood(@Query('q') q = '', @Query() filters: Record<string, string>) {
    return this.searchService.suggest('food', q, filters);
  }

  @Get('/search/ecom/stores')
  @ApiTags('Stores')
  @ApiOperation({ summary: 'Search E-commerce Stores', description: 'Search and geo-sort e-commerce stores.' })
  @ApiQuery({ name: 'q', required: false, example: 'grocery' })
  @ApiQuery({ name: 'lat', required: false, example: 19.9975 })
  @ApiQuery({ name: 'lon', required: false, example: 73.7898 })
  @ApiQuery({ name: 'radius_km', required: false, example: 10 })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'size', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Stores results.' })
  async searchEcomStores(@Query('q') q = '', @Query() filters: Record<string, string>) {
    return this.searchService.searchStores('ecom', q, filters);
  }

  @Get('/search/ecom/stores/category')
  @ApiTags('Stores')
  @ApiOperation({ summary: 'Fast E-commerce Stores by Category', description: 'Optimized endpoint for finding e-commerce stores that sell items from a specific category.' })
  @ApiQuery({ name: 'category_id', required: true, description: 'Category ID to find stores selling items from this category.', example: 5002 })
  @ApiQuery({ name: 'lat', required: false, description: 'Latitude for distance calculation and sorting.', example: 19.99176 })
  @ApiQuery({ name: 'lon', required: false, description: 'Longitude for distance calculation and sorting.', example: 73.77388 })
  @ApiQuery({ name: 'radius_km', required: false, description: 'Radius filter in kilometers.', example: 20 })
  @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination (1-based).', example: 1 })
  @ApiQuery({ name: 'size', required: false, description: 'Stores per page (1-50, default 20).', example: 20 })
  @ApiQuery({ name: 'sort', required: false, description: 'Sort order: distance, rating, popularity', example: 'distance' })
  @ApiQuery({ name: 'veg', required: false, description: 'Vegetarian filter: 1=veg only, 0=non-veg only', example: '1' })
  @ApiQuery({ name: 'brand', required: false, description: 'Comma-separated brand filter', example: 'amul,nestle' })
  @ApiResponse({ status: 200, description: 'Fast e-commerce category-based store search results.' })
  async searchEcomStoresCategory(@Query() filters: Record<string, string>) {
    return this.searchService.searchStoresCategory('ecom', filters);
  }

  @Get('/search/ecom/suggest')
  @ApiTags('Suggest')
  @ApiOperation({ summary: 'Suggest E-commerce', description: 'Typeahead suggestions for e-commerce.' })
  @ApiQuery({ name: 'q', required: true, example: 'mi' })
  @ApiQuery({ name: 'size', required: false, example: 5 })
  @ApiResponse({ status: 200, description: 'Suggestions across items, stores, and categories.' })
  async suggestEcom(@Query('q') q = '', @Query() filters: Record<string, string>) {
    return this.searchService.suggest('ecom', q, filters);
  }

  @Get('/search/rooms')
  @ApiTags('Items')
  @ApiOperation({ summary: 'Search Rooms', description: 'Search rooms/accommodation listings.' })
  @ApiQuery({ name: 'q', required: false, example: 'deluxe' })
  @ApiQuery({ name: 'lat', required: false, example: 19.9975 })
  @ApiQuery({ name: 'lon', required: false, example: 73.7898 })
  @ApiQuery({ name: 'radius_km', required: false, example: 10 })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'size', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Room items results.' })
  async searchRooms(@Query('q') q = '', @Query() filters: Record<string, string>) {
    return this.searchService.search('rooms', q, filters);
  }

  @Get('/search/rooms/stores')
  @ApiTags('Stores')
  @ApiOperation({ summary: 'Search Room Providers', description: 'Search hotel/property providers with geo sorting if coordinates supplied.' })
  @ApiQuery({ name: 'q', required: false, example: 'hotel' })
  @ApiQuery({ name: 'lat', required: false, example: 19.9975 })
  @ApiQuery({ name: 'lon', required: false, example: 73.7898 })
  @ApiQuery({ name: 'radius_km', required: false, example: 5 })
  @ApiResponse({ status: 200, description: 'Stores results.' })
  async searchRoomsStores(@Query('q') q = '', @Query() filters: Record<string, string>) {
    return this.searchService.searchStores('rooms', q, filters);
  }

  @Get('/search/rooms/suggest')
  @ApiTags('Suggest')
  @ApiOperation({ summary: 'Suggest Rooms', description: 'Typeahead suggestions for rooms and providers.' })
  @ApiQuery({ name: 'q', required: true, example: 'de' })
  @ApiQuery({ name: 'size', required: false, example: 5 })
  @ApiResponse({ status: 200, description: 'Suggestions response.' })
  async suggestRooms(@Query('q') q = '', @Query() filters: Record<string, string>) {
    return this.searchService.suggest('rooms', q, filters);
  }

  @Get('/search/movies')
  @ApiTags('Items')
  @ApiOperation({ summary: 'Search Movies', description: 'Search movies catalog by title/genre/cast. Supports genre filter.' })
  @ApiQuery({ name: 'q', required: false, example: 'action' })
  @ApiQuery({ name: 'genre', required: false, description: 'Filter by genre (keyword).', example: 'Action' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'size', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Movie items results with genre facets.' })
  async searchMovies(@Query('q') q = '', @Query() filters: Record<string, string>) {
    return this.searchService.search('movies', q, filters);
  }

  @Get('/search/movies/stores')
  @ApiTags('Stores')
  @ApiOperation({ summary: 'Search Movie Showtimes', description: 'Search movie theaters/showtimes (stores index for movies). Geo sort if lat/lon provided.' })
  @ApiQuery({ name: 'q', required: false, example: 'PVR' })
  @ApiQuery({ name: 'lat', required: false, example: 19.9975 })
  @ApiQuery({ name: 'lon', required: false, example: 73.7898 })
  @ApiQuery({ name: 'radius_km', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'Movies stores results.' })
  async searchMoviesStores(@Query('q') q = '', @Query() filters: Record<string, string>) {
    return this.searchService.searchStores('movies', q, filters);
  }

  @Get('/search/movies/suggest')
  @ApiTags('Suggest')
  @ApiOperation({ summary: 'Suggest Movies', description: 'Typeahead suggestions for movies (titles/genres/cast).' })
  @ApiQuery({ name: 'q', required: true, example: 'av' })
  @ApiQuery({ name: 'size', required: false, example: 5 })
  @ApiResponse({ status: 200, description: 'Suggestions response.' })
  async suggestMovies(@Query('q') q = '', @Query() filters: Record<string, string>) {
    return this.searchService.suggest('movies', q, filters);
  }

  @Get('/search/services')
  @ApiTags('Items')
  @ApiOperation({ summary: 'Search Services', description: 'Search local services. Supports category filter on category.keyword and base_price ranges.' })
  @ApiQuery({ name: 'q', required: false, example: 'spa' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by service category (keyword).', example: 'Beauty' })
  @ApiQuery({ name: 'price_min', required: false, description: 'Minimum base_price.', example: 500 })
  @ApiQuery({ name: 'price_max', required: false, description: 'Maximum base_price.', example: 2000 })
  @ApiQuery({ name: 'rating_min', required: false, example: 4 })
  @ApiQuery({ name: 'lat', required: false, example: 19.9975 })
  @ApiQuery({ name: 'lon', required: false, example: 73.7898 })
  @ApiQuery({ name: 'radius_km', required: false, example: 10 })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'size', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Service items results with category and price facets.' })
  async searchServices(@Query('q') q = '', @Query() filters: Record<string, string>) {
    return this.searchService.search('services', q, filters);
  }

  @Get('/search/services/stores')
  @ApiTags('Stores')
  @ApiOperation({ summary: 'Search Service Providers', description: 'Search and geo-sort service providers.' })
  @ApiQuery({ name: 'q', required: false, example: 'salon' })
  @ApiQuery({ name: 'lat', required: false, example: 19.9975 })
  @ApiQuery({ name: 'lon', required: false, example: 73.7898 })
  @ApiQuery({ name: 'radius_km', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'Stores results.' })
  async searchServicesStores(@Query('q') q = '', @Query() filters: Record<string, string>) {
    return this.searchService.searchStores('services', q, filters);
  }

  @Get('/search/services/suggest')
  @ApiTags('Suggest')
  @ApiOperation({ summary: 'Suggest Services', description: 'Typeahead suggestions for services.' })
  @ApiQuery({ name: 'q', required: true, example: 'sp' })
  @ApiQuery({ name: 'size', required: false, example: 5 })
  @ApiResponse({ status: 200, description: 'Suggestions response.' })
  async suggestServices(@Query('q') q = '', @Query() filters: Record<string, string>) {
    return this.searchService.suggest('services', q, filters);
  }

  @Get('/analytics/trending')
  @ApiTags('Analytics')
  @ApiOperation({ summary: 'Trending queries', description: 'Top queries aggregated from analytics.search_events in ClickHouse over the configured window.' })
  @ApiQuery({ name: 'window', required: false, description: "Time window in days, e.g., '7d' (default).", example: '7d' })
  @ApiQuery({ name: 'module', required: false, description: "Module to filter: 'food'|'ecom'|'rooms'|'services'|'movies'", example: 'food' })
  @ApiQuery({ name: 'time_of_day', required: false, description: "Time of day bucket: 'morning'|'afternoon'|'evening'|'night'", example: 'evening' })
  @ApiResponse({ status: 200, description: 'Trending rows grouped by module, time_of_day, and q.', schema: { example: { window: '7d', module: 'all', time_of_day: 'all', rows: [{ module: 'food', time_of_day: 'evening', q: 'pizza', count: 120, total_results: 350 }] } } })
  async trending(@Query('window') window = '7d', @Query('module') module?: string, @Query('time_of_day') tod?: string) {
    const chUrl = this.config.get<string>('CLICKHOUSE_URL') || 'http://localhost:8123';
    
    // Parse URL to extract credentials
    const parsedUrl = new URL(chUrl);
    let username = parsedUrl.username;
    let password = parsedUrl.password;
    
    // Fallback to env vars if not in URL
    if (!username) username = this.config.get<string>('CLICKHOUSE_USER') || '';
    if (!password) password = this.config.get<string>('CLICKHOUSE_PASSWORD') || '';

    parsedUrl.username = '';
    parsedUrl.password = '';
    const cleanUrl = parsedUrl.toString();
    
    const days = /^\d+d$/.test(window) ? Number(window.replace('d','')) : 7;
    const where = [
      `day >= today() - ${days}`,
      module ? `module = '${module}'` : undefined,
      tod ? `time_of_day = '${tod}'` : undefined,
    ].filter(Boolean).join(' AND ');
    const sql = `SELECT module, time_of_day, q, count() AS n, sum(total) AS total_results\n` +
      `FROM analytics.search_events WHERE ${where} AND length(q) > 0\n` +
      `GROUP BY module, time_of_day, q\n` +
      `ORDER BY n DESC\n` +
      `LIMIT 50`;
    
    // Use Basic Auth header instead of URL credentials
    const headers: Record<string, string> = {};
    if (username && password) {
      headers['Authorization'] = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
    }
    
    const resp = await fetch(`${cleanUrl}?query=${encodeURIComponent(sql)}`, { method: 'GET', headers });
    const text = await resp.text();
    // naive TSV/CSV parse if needed; ClickHouse default returns tab-separated
  const lines = text.trim().split(/\n+/).filter(Boolean);
  const rows = lines.map((l: string) => {
      const parts = l.split(/\t/);
      return { module: parts[0], time_of_day: parts[1], q: parts[2], count: Number(parts[3]), total_results: Number(parts[4]) };
    });
    return { window, module: module || 'all', time_of_day: tod || 'all', rows };
  }

  @Get('/search/agent')
  @ApiTags('Agent')
  @ApiOperation({ summary: 'Natural-language search agent', description: 'Parses free-form text to derive module, target (items/stores), and filters (geo, veg, open_now, rating, price, store). Supports store name parsing (e.g., "go to ganesh sweets and order paneer"). Applies progressive relaxation if no results.' })
  @ApiQuery({ name: 'q', required: false, description: 'Free-form query text. Supports store context like "go to [store name] and order [item]"', example: 'go to ganesh sweet mart and order paneer' })
  @ApiQuery({ name: 'lat', required: false, example: 19.9975 })
  @ApiQuery({ name: 'lon', required: false, example: 73.7898 })
  @ApiQuery({ name: 'radius_km', required: false, example: 5 })
  @ApiResponse({ status: 200, description: 'Agent plan and result payload. Plan includes parsed store_name and store_id if found.', schema: { example: { plan: { module: 'food', target: 'items', q: 'paneer', store_name: 'ganesh sweet mart', store_id: '13', store_name_found: 'Ganesh Sweet Mart', lat: 19.99, lon: 73.78, radius_km: 5 }, result: { meta: { total: 2 }, items: [{ name: 'Malai Paneer', store_name: 'Ganesh Sweet Mart' }] } } } })
  async agent(@Query('q') q = '', @Query() all: Record<string, string>) {
    return this.searchService.searchAgent(q, all);
  }

  @Get('/search/semantic/food')
  @ApiTags('Semantic Search')
  @ApiOperation({ summary: 'Semantic Food Search', description: 'Vector-based semantic search for food items using native KNN with HNSW. Finds similar items based on meaning, not just keywords.' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query (will be vectorized)', example: 'spicy chicken dish' })
  @ApiQuery({ name: 'veg', required: false, description: 'Filter: 1=veg, 0=non-veg', example: '1' })
  @ApiQuery({ name: 'category_id', required: false, example: 101 })
  @ApiQuery({ name: 'price_min', required: false, example: 50 })
  @ApiQuery({ name: 'price_max', required: false, example: 500 })
  @ApiQuery({ name: 'store_id', required: false, description: 'Filter to specific store', example: 123 })
  @ApiQuery({ name: 'store_ids', required: false, description: 'Filter to multiple stores (comma-separated)', example: '123,456' })
  @ApiQuery({ name: 'lat', required: false, example: 19.9975 })
  @ApiQuery({ name: 'lon', required: false, example: 73.7898 })
  @ApiQuery({ name: 'radius_km', required: false, example: 10 })
  @ApiQuery({ name: 'size', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Semantic search results ranked by vector similarity' })
  async semanticSearchFood(@Query('q') q = '', @Query() filters: Record<string, string>) {
    return this.searchService.semanticSearch('food', q, filters);
  }

  @Get('/search/semantic/ecom')
  @ApiTags('Semantic Search')
  @ApiOperation({ summary: 'Semantic E-commerce Search', description: 'Vector-based semantic search for e-commerce items using native KNN with HNSW. Finds similar products based on meaning.' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query (will be vectorized)', example: 'baby care products' })
  @ApiQuery({ name: 'category_id', required: false, example: 5002 })
  @ApiQuery({ name: 'brand', required: false, example: 'amul,nestle' })
  @ApiQuery({ name: 'price_min', required: false, example: 50 })
  @ApiQuery({ name: 'price_max', required: false, example: 500 })
  @ApiQuery({ name: 'store_id', required: false, description: 'Filter to specific store', example: 123 })
  @ApiQuery({ name: 'store_ids', required: false, description: 'Filter to multiple stores (comma-separated)', example: '123,456' })
  @ApiQuery({ name: 'lat', required: false, example: 19.9975 })
  @ApiQuery({ name: 'lon', required: false, example: 73.7898 })
  @ApiQuery({ name: 'radius_km', required: false, example: 10 })
  @ApiQuery({ name: 'size', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Semantic search results ranked by vector similarity' })
  async semanticSearchEcom(@Query('q') q = '', @Query() filters: Record<string, string>) {
    return this.searchService.semanticSearch('ecom', q, filters);
  }

  @Post('/search/asr')
  @UseInterceptors(FileInterceptor('audio'))
  @ApiTags('ASR')
  @ApiOperation({ summary: 'ASR proxy', description: 'Accepts an audio file (multipart/form-data) and proxies transcription to Admin AI ASR. Returns the text transcript.' })
  @ApiConsumes('multipart/form-data')
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Transcribed text.', schema: { example: { text: 'best pizza nearby' } } })
  async asr(@UploadedFile() file?: any) {
    if (!file || !file.buffer || !file.mimetype) {
      throw new BadRequestException('audio file is required (multipart/form-data, field name: audio)');
    }
    const text = await this.searchService.asrTranscribe(file.buffer, file.mimetype);
    // Always 200 with a JSON body, even if upstream failed (text = '')
    return { text };
  }

  // ============================================
  // NEW: Module ID Based Search Endpoints
  // ============================================

  @Get('/v2/search/suggest')
  @ApiTags('Module ID Search')
  @ApiOperation({ 
    summary: 'Suggest API (Module ID Based)', 
    description: 'Returns items, stores, and categories. Supports global search (no filters), module-wise (module_id), store-wise (store_id), and category-wise (category_id) search.' 
  })
  @ApiQuery({ name: 'q', required: true, description: 'Search query (min 2 chars)', example: 'pizza' })
  @ApiQuery({ name: 'module_id', required: false, description: 'Filter by module ID (module-wise search)', example: 4 })
  @ApiQuery({ name: 'store_id', required: false, description: 'Filter by store ID (store-wise search)', example: 123 })
  @ApiQuery({ name: 'category_id', required: false, description: 'Filter by category ID (category-wise search)', example: 288 })
  @ApiQuery({ name: 'lat', required: false, description: 'Latitude for geo sorting', example: 19.9975 })
  @ApiQuery({ name: 'lon', required: false, description: 'Longitude for geo sorting', example: 73.7898 })
  @ApiQuery({ name: 'size', required: false, description: 'Max suggestions per type (default 5, max 50)', example: 5 })
  @ApiResponse({ 
    status: 200, 
    description: 'Suggestions for items, stores, and categories',
    schema: {
      example: {
        q: 'pizza',
        items: [{ id: '123', name: 'Pizza Margherita', price: 299, module_id: 4 }],
        stores: [{ id: 'st1', name: 'Pizza House', module_id: 4 }],
        categories: [{ id: '101', name: 'Pizzas', module_id: 4 }]
      }
    }
  })
  async suggestByModule(
    @Query('q') q: string,
    @Query('module_id') moduleId?: string,
    @Query('store_id') storeId?: string,
    @Query('category_id') categoryId?: string,
    @Query('lat') lat?: string,
    @Query('lon') lon?: string,
    @Query('size') size?: string,
  ) {
    // Validation: category_id requires module_id (categories are module-scoped)
    if (categoryId && !moduleId) {
      throw new BadRequestException(
        'category_id requires module_id parameter (categories are module-scoped, not globally unique)'
      );
    }

    const filters: any = {};
    if (moduleId) filters.module_id = Number(moduleId);
    if (storeId) filters.store_id = Number(storeId);
    if (categoryId) filters.category_id = Number(categoryId);
    if (lat) filters.lat = Number(lat);
    if (lon) filters.lon = Number(lon);
    if (size) filters.size = Number(size);

    return this.searchService.suggestByModule(q, filters);
  }

  @Get('/v2/search/items')
  @ApiTags('Module ID Search')
  @ApiOperation({ 
    summary: 'Items Search (Module ID Based)', 
    description: 'Search items with module_id/store_id/category_id filters. Supports global, module-wise, store-wise, and category-wise search. Supports semantic search with semantic=1.' 
  })
  @ApiQuery({ name: 'q', required: false, description: 'Search query text', example: 'pizza' })
  @ApiQuery({ name: 'module_id', required: false, description: 'Filter by module ID (module-wise search)', example: 4 })
  @ApiQuery({ name: 'store_id', required: false, description: 'Filter by store ID (store-wise search)', example: 123 })
  @ApiQuery({ name: 'category_id', required: false, description: 'Filter by category ID (category-wise search)', example: 288 })
  @ApiQuery({ name: 'semantic', required: false, description: 'Use semantic/vector search (1=enabled)', example: '1' })
  @ApiQuery({ name: 'veg', required: false, description: "Veg filter: '1'|'veg' = vegetarian, '0'|'non-veg' = non-veg", example: '1' })
  @ApiQuery({ name: 'price_min', required: false, description: 'Minimum price', example: 100 })
  @ApiQuery({ name: 'price_max', required: false, description: 'Maximum price', example: 500 })
  @ApiQuery({ name: 'rating_min', required: false, description: 'Minimum rating (0-5)', example: 4 })
  @ApiQuery({ name: 'lat', required: false, description: 'Latitude for geo-distance', example: 19.9975 })
  @ApiQuery({ name: 'lon', required: false, description: 'Longitude for geo-distance', example: 73.7898 })
  @ApiQuery({ name: 'radius_km', required: false, description: 'Radius in kilometers', example: 5 })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'size', required: false, description: 'Results per page (1-100)', example: 20 })
  @ApiQuery({ name: 'sort', required: false, description: 'Sort: distance, price_asc, price_desc, rating, popularity', example: 'distance' })
  @ApiResponse({ 
    status: 200, 
    description: 'Search results with items',
    schema: {
      example: {
        q: 'pizza',
        filters: { module_id: 4 },
        items: [{ id: '123', name: 'Veg Pizza', module_id: 4, price: 299 }],
        meta: { total: 150, page: 1, size: 20 }
      }
    }
  })
  async searchItemsByModule(
    @Query('q') q: string = '',
    @Query('module_id') moduleId?: string,
    @Query('store_id') storeId?: string,
    @Query('category_id') categoryId?: string,
    @Query('semantic') semantic?: string,
    @Query('veg') veg?: string,
    @Query('price_min') priceMin?: string,
    @Query('price_max') priceMax?: string,
    @Query('rating_min') ratingMin?: string,
    @Query('lat') lat?: string,
    @Query('lon') lon?: string,
    @Query('radius_km') radiusKm?: string,
    @Query('page') page?: string,
    @Query('size') size?: string,
    @Query('sort') sort?: string,
  ) {
    // Validation: category_id requires module_id (categories are module-scoped)
    if (categoryId && !moduleId) {
      throw new BadRequestException(
        'category_id requires module_id parameter (categories are module-scoped, not globally unique)'
      );
    }

    const filters: any = {};
    if (moduleId) filters.module_id = Number(moduleId);
    if (storeId) filters.store_id = Number(storeId);
    if (categoryId) filters.category_id = Number(categoryId);
    if (semantic) filters.semantic = semantic === '1' || semantic === 'true';
    if (veg) filters.veg = veg;
    if (priceMin) filters.price_min = Number(priceMin);
    if (priceMax) filters.price_max = Number(priceMax);
    if (ratingMin) filters.rating_min = Number(ratingMin);
    if (lat) filters.lat = Number(lat);
    if (lon) filters.lon = Number(lon);
    if (radiusKm) filters.radius_km = Number(radiusKm);
    if (page) filters.page = Number(page);
    if (size) filters.size = Number(size);
    if (sort) filters.sort = sort;

    return this.searchService.searchItemsByModule(q, filters);
  }

  @Get('/v2/search/stores')
  @ApiTags('Module ID Search')
  @ApiOperation({ 
    summary: 'Stores Search (Module ID Based)', 
    description: 'Search stores with module_id and category_id filters. Supports global search (no filters), module-wise search (with module_id), and category-wise search (with module_id + category_id). Returns stores that serve items in the specified category.' 
  })
  @ApiQuery({ name: 'q', required: false, description: 'Search query text', example: 'pizza' })
  @ApiQuery({ name: 'module_id', required: false, description: 'Filter by module ID (module-wise search)', example: 4 })
  @ApiQuery({ name: 'category_id', required: false, description: 'Filter by category ID (returns stores that serve items in this category). Requires module_id.', example: 288 })
  @ApiQuery({ name: 'lat', required: false, description: 'Latitude for geo-distance', example: 19.9975 })
  @ApiQuery({ name: 'lon', required: false, description: 'Longitude for geo-distance', example: 73.7898 })
  @ApiQuery({ name: 'radius_km', required: false, description: 'Radius in kilometers', example: 5 })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'size', required: false, description: 'Results per page (1-100)', example: 20 })
  @ApiQuery({ name: 'sort', required: false, description: 'Sort: distance, popularity', example: 'distance' })
  @ApiResponse({ 
    status: 200, 
    description: 'Search results with stores',
    schema: {
      example: {
        q: 'pizza',
        filters: { module_id: 4, category_id: 288 },
        stores: [{ id: 'st1', name: 'Pizza House', module_id: 4, distance_km: 2.5 }],
        meta: { total: 42, page: 1, size: 20 }
      }
    }
  })
  async searchStoresByModule(
    @Query('q') q: string = '',
    @Query('module_id') moduleId?: string,
    @Query('category_id') categoryId?: string,
    @Query('lat') lat?: string,
    @Query('lon') lon?: string,
    @Query('radius_km') radiusKm?: string,
    @Query('page') page?: string,
    @Query('size') size?: string,
    @Query('sort') sort?: string,
  ) {
    // Validation: category_id requires module_id (categories are module-scoped)
    if (categoryId && !moduleId) {
      throw new BadRequestException(
        'category_id requires module_id parameter (categories are module-scoped, not globally unique)'
      );
    }

    const filters: any = {};
    if (moduleId) filters.module_id = Number(moduleId);
    if (categoryId) filters.category_id = Number(categoryId);
    if (lat) filters.lat = Number(lat);
    if (lon) filters.lon = Number(lon);
    if (radiusKm) filters.radius_km = Number(radiusKm);
    if (page) filters.page = Number(page);
    if (size) filters.size = Number(size);
    if (sort) filters.sort = sort;

    return this.searchService.searchStoresByModule(q, filters);
  }
}
