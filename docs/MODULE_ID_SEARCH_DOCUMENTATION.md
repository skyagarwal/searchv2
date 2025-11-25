# Module ID Based Search API Documentation

## Overview

New search endpoints that use `module_id`, `store_id`, and `category_id` instead of module types (food, ecom, etc.). These endpoints support:

- **Global Search**: Search across all modules/stores/categories (no filters)
- **Module-wise Search**: Search within a specific module only
- **Store-wise Search**: Search within a specific store only
- **Category-wise Search**: Search within a specific category only

## Base URL

```
http://localhost:3100
```

## Endpoints

### 1. Suggest API

**Endpoint**: `GET /v2/search/suggest`

**Description**: Returns autocomplete suggestions for items, stores, and categories.

**Parameters**:
- `q` (required): Search query (minimum 2 characters)
- `module_id` (optional): Filter by module ID (module-wise search)
- `store_id` (optional): Filter by store ID (store-wise search)
- `category_id` (optional): Filter by category ID (category-wise search)
- `lat` (optional): Latitude for geo sorting
- `lon` (optional): Longitude for geo sorting
- `size` (optional): Max suggestions per type (default: 5, max: 50)

**Response**:
```json
{
  "q": "pizza",
  "items": [
    {
      "id": "123",
      "name": "Pizza Margherita",
      "price": 299,
      "module_id": 4,
      "store_id": 123,
      "category_id": 288
    }
  ],
  "stores": [
    {
      "id": "st1",
      "name": "Pizza House",
      "module_id": 4
    }
  ],
  "categories": [
    {
      "id": "101",
      "name": "Pizzas",
      "module_id": 4
    }
  ]
}
```

**Use Cases**:

1. **Global Search** (all modules/stores/categories):
   ```
   GET /v2/search/suggest?q=pizza
   ```

2. **Module-wise Search** (within module 4 only):
   ```
   GET /v2/search/suggest?q=pizza&module_id=4
   ```

3. **Store-wise Search** (within store 123 only):
   ```
   GET /v2/search/suggest?q=pizza&store_id=123
   ```
   Returns: items and categories from that store

4. **Category-wise Search** (within category 288 only):
   ```
   GET /v2/search/suggest?q=pizza&category_id=288
   ```
   Returns: items and stores that have this category

---

### 2. Items Search API

**Endpoint**: `GET /v2/search/items`

**Description**: Search items with flexible filtering by module_id, store_id, category_id.

**Parameters**:
- `q` (optional): Search query text
- `module_id` (optional): Filter by module ID
- `store_id` (optional): Filter by store ID
- `category_id` (optional): Filter by category ID
- `semantic` (optional): Use semantic/vector search (1=true)
- `veg` (optional): Vegetarian filter ('1'|'veg' = veg only, '0'|'non-veg' = non-veg)
- `price_min` (optional): Minimum price
- `price_max` (optional): Maximum price
- `rating_min` (optional): Minimum rating (0-5)
- `lat` (optional): Latitude for geo-distance
- `lon` (optional): Longitude for geo-distance
- `radius_km` (optional): Radius in kilometers
- `page` (optional): Page number (1-based, default: 1)
- `size` (optional): Results per page (1-100, default: 20)
- `sort` (optional): Sort order: `distance`, `price_asc`, `price_desc`, `rating`, `popularity`

**Response**:
```json
{
  "q": "pizza",
  "filters": {
    "module_id": 4,
    "store_id": 123,
    "category_id": 288
  },
  "items": [
    {
      "id": "123",
      "name": "Veg Pizza",
      "price": 299,
      "veg": 1,
      "module_id": 4,
      "store_id": 123,
      "category_id": 288,
      "store_name": "Pizza House",
      "distance_km": 2.5
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "size": 20,
    "total_pages": 8,
    "has_more": true
  }
}
```

**Use Cases**:

1. **Global Search** (all items):
   ```
   GET /v2/search/items?q=pizza
   ```

2. **Module-wise Search** (module 4 only):
   ```
   GET /v2/search/items?q=pizza&module_id=4
   ```

3. **Store-wise Search** (store 123 only):
   ```
   GET /v2/search/items?q=pizza&store_id=123
   ```

4. **Category-wise Search** (category 288 only):
   ```
   GET /v2/search/items?q=pizza&category_id=288
   ```

5. **Combined Filters**:
   ```
   GET /v2/search/items?q=pizza&module_id=4&store_id=123&category_id=288&veg=1&price_min=100&price_max=500
   ```

6. **Semantic Search**:
   ```
   GET /v2/search/items?q=spicy%20chicken%20dish&module_id=4&semantic=1
   ```

---

### 3. Stores Search API

**Endpoint**: `GET /v2/search/stores`

**Description**: Search stores with module_id filter.

**Parameters**:
- `q` (optional): Search query text
- `module_id` (optional): Filter by module ID
- `lat` (optional): Latitude for geo-distance
- `lon` (optional): Longitude for geo-distance
- `radius_km` (optional): Radius in kilometers
- `page` (optional): Page number (1-based, default: 1)
- `size` (optional): Results per page (1-100, default: 20)
- `sort` (optional): Sort order: `distance`, `popularity`

**Response**:
```json
{
  "q": "pizza",
  "filters": {
    "module_id": 4
  },
  "stores": [
    {
      "id": "st1",
      "name": "Pizza House",
      "module_id": 4,
      "distance_km": 2.5,
      "delivery_time": "30-40 min",
      "rating": 4.5
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "size": 20,
    "total_pages": 3,
    "has_more": true
  }
}
```

**Use Cases**:

1. **Global Search** (all stores):
   ```
   GET /v2/search/stores?q=pizza
   ```

2. **Module-wise Search** (module 4 only):
   ```
   GET /v2/search/stores?q=pizza&module_id=4
   ```

3. **With Geo Filtering**:
   ```
   GET /v2/search/stores?q=pizza&module_id=4&lat=19.9975&lon=73.7898&radius_km=5&sort=distance
   ```

---

## Search Scenarios

### Scenario 1: Global Search
**Use Case**: User wants to search across all modules, stores, and categories.

**Endpoints**:
- `GET /v2/search/suggest?q=pizza` - All suggestions
- `GET /v2/search/items?q=pizza` - All items
- `GET /v2/search/stores?q=pizza` - All stores

**Behavior**: Searches across all indices (food_items, ecom_items, etc.) without any module/store/category filters.

---

### Scenario 2: Module-wise Search
**Use Case**: User wants to search only within a specific module (e.g., Food module).

**Endpoints**:
- `GET /v2/search/suggest?q=pizza&module_id=4` - Suggestions from module 4
- `GET /v2/search/items?q=pizza&module_id=4` - Items from module 4
- `GET /v2/search/stores?q=pizza&module_id=4` - Stores from module 4

**Behavior**: 
- Filters by `module_id` in OpenSearch query
- Searches across all relevant indices but filters results by module_id
- Returns only items/stores/categories belonging to the specified module

---

### Scenario 3: Store-wise Search
**Use Case**: User is browsing a specific store and wants to search items/categories within that store.

**Endpoints**:
- `GET /v2/search/suggest?q=pizza&store_id=123` - Items and categories from store 123
- `GET /v2/search/items?q=pizza&store_id=123` - Items from store 123

**Behavior**:
- Filters by `store_id` in OpenSearch query
- For suggest: Returns items and categories (stores not relevant)
- For items: Returns only items from the specified store

---

### Scenario 4: Category-wise Search
**Use Case**: User is browsing a specific category and wants to see items/stores in that category.

**Endpoints**:
- `GET /v2/search/suggest?q=pizza&category_id=288` - Items and stores with category 288
- `GET /v2/search/items?q=pizza&category_id=288` - Items in category 288
- `GET /v2/search/stores?q=pizza&category_id=288` - Stores that have items in category 288

**Behavior**:
- Filters by `category_id` in OpenSearch query
- For suggest: Returns items and stores (categories not relevant)
- For items: Returns only items in the specified category
- For stores: Returns stores that have items in the specified category

---

## Technical Implementation

### Index Strategy

The system searches across multiple OpenSearch indices:
- **Item Indices**: `food_items`, `ecom_items`, `rooms_index`, `services_index`, `movies_catalog`
- **Store Indices**: `food_stores`, `ecom_stores`, `rooms_stores`, `services_stores`, `movies_showtimes`
- **Category Indices**: `food_categories`, `ecom_categories`, `rooms_categories`, `services_categories`, `movies_categories`

### Filtering Logic

1. **Module Filter**: Applied as `{ term: { module_id: 4 } }` in OpenSearch query
2. **Store Filter**: Applied as `{ term: { store_id: 123 } }` in OpenSearch query
3. **Category Filter**: Applied as `{ term: { category_id: 288 } }` in OpenSearch query

### Search Flow

```
User Request
    ↓
Parse Parameters (module_id, store_id, category_id)
    ↓
Build OpenSearch Query with Filters
    ↓
Search Across All Relevant Indices (parallel)
    ↓
Combine Results from All Indices
    ↓
Sort & Paginate
    ↓
Enrich with Store Names, Distances
    ↓
Return Response
```

### Performance Optimizations

1. **Parallel Index Searches**: All indices searched in parallel using `Promise.all()`
2. **Deduplication**: Results deduplicated by name to avoid duplicates
3. **Efficient Filtering**: Filters applied at OpenSearch level (not post-processing)
4. **Geo Distance Calculation**: Calculated in OpenSearch script_fields for performance

---

## Example Requests

### Example 1: Global Search for "pizza"
```bash
curl "http://localhost:3100/v2/search/items?q=pizza"
```

### Example 2: Module 4 (Food) Search
```bash
curl "http://localhost:3100/v2/search/items?q=pizza&module_id=4&veg=1&price_min=100&price_max=500"
```

### Example 3: Store 123 Search
```bash
curl "http://localhost:3100/v2/search/items?q=pizza&store_id=123&sort=price_asc"
```

### Example 4: Category 288 Search with Geo
```bash
curl "http://localhost:3100/v2/search/items?q=pizza&category_id=288&lat=19.9975&lon=73.7898&radius_km=5&sort=distance"
```

### Example 5: Semantic Search
```bash
curl "http://localhost:3100/v2/search/items?q=healthy%20breakfast&module_id=4&semantic=1&veg=1"
```

### Example 6: Suggest with All Filters
```bash
curl "http://localhost:3100/v2/search/suggest?q=pizza&module_id=4&store_id=123&category_id=288&lat=19.9975&lon=73.7898"
```

---

## Testing

Run the comprehensive test suite:

```bash
./test-module-id-search.sh
```

This will test 40+ scenarios covering:
- Global search
- Module-wise search
- Store-wise search
- Category-wise search
- Combined filters
- Sorting options
- Pagination
- Semantic search
- Geo filtering

---

## Migration from Old Endpoints

### Old Endpoint → New Endpoint

| Old | New |
|-----|-----|
| `GET /search/food?q=pizza` | `GET /v2/search/items?q=pizza&module_id=4` |
| `GET /search/ecom?q=milk` | `GET /v2/search/items?q=milk&module_id=5` |
| `GET /search/food/suggest?q=pi` | `GET /v2/search/suggest?q=pi&module_id=4` |
| `GET /search/food/stores?q=pizza` | `GET /v2/search/stores?q=pizza&module_id=4` |

### Benefits of New Endpoints

1. **Flexible Filtering**: Can combine module_id, store_id, category_id
2. **Global Search**: Easy to search across all modules
3. **Store/Category Scoped**: Can search within specific stores/categories
4. **Consistent API**: Same structure for all search types
5. **Future-proof**: Easy to add new modules without code changes

---

## Database Schema Reference

### Items Table
- `id`: Item ID
- `module_id`: Module ID (links to modules table)
- `store_id`: Store ID (links to stores table)
- `category_id`: Category ID (links to categories table)
- `name`, `description`, `price`, `veg`, etc.

### Stores Table
- `id`: Store ID
- `module_id`: Module ID (links to modules table)
- `name`, `latitude`, `longitude`, etc.

### Categories Table
- `id`: Category ID
- `module_id`: Module ID (links to modules table)
- `name`, `slug`, etc.

### Modules Table
- `id`: Module ID
- `module_name`: Module name (e.g., "Food", "Shop")
- `module_type`: Module type (e.g., "food", "ecommerce")
- `status`: Active status (1 = active)

---

## Notes

1. **Category IDs are module-scoped**: Category ID 288 in module 4 is different from category ID 288 in module 5. Always provide `module_id` when using `category_id`.

2. **Store IDs are global**: Store IDs are unique across all modules.

3. **Module IDs**: Common module IDs:
   - 4: Food
   - 5: Shop/Ecommerce
   - 13: Pet Care
   - (Check `modules` table for all active modules)

4. **Performance**: Searches across multiple indices in parallel for optimal performance.

5. **Semantic Search**: Use `semantic=1` parameter for AI-powered vector similarity search.

---

**Version**: 2.0.0  
**Last Updated**: 2025-01-11

