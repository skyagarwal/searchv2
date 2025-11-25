# Mangwale Search API Documentation

## Overview
Search API for Food, E-commerce, Rooms, Services, and Movies. Includes items search, stores search, suggestions, analytics, agent, and ASR endpoints.

**Base URL:** `http://localhost:3100`  
**Swagger Docs:** `http://localhost:3100/docs`

---

## Table of Contents
1. [Health & Root](#health--root)
2. [Food Search](#food-search)
3. [E-commerce Search](#e-commerce-search)
4. [Rooms Search](#rooms-search)
5. [Movies Search](#movies-search)
6. [Services Search](#services-search)
7. [Analytics](#analytics)
8. [Natural Language Agent](#natural-language-agent)
9. [ASR (Speech Recognition)](#asr-speech-recognition)

---

## Health & Root

### Root Endpoint
**Endpoint:** `GET /`  
**Description:** Landing endpoint listing commonly used routes for quick navigation

---

### Health Check
**Endpoint:** `GET /health`  
**Description:** Returns service health and OpenSearch cluster status

**Response:**
```json
{
  "ok": true,
  "opensearch": "green"
}
```

---

## Food Search

### 1. Search Food Items
**Endpoint:** `GET /search/food`  
**Description:** Full-text and faceted search over food items with tri-state veg filtering, price/rating, geo radius, and category facets.

**Query Parameters:**
- `q` (optional): Query text. If blank, returns popular items
- `veg` (optional): Tri-state veg filter. `'1'|'true'|'veg'` = vegetarian only, `'0'|'false'|'non-veg'` = non-veg only, omit or `'all'` = both
- `category_id` (optional): Filter by category id
- `price_min` (optional): Minimum price
- `price_max` (optional): Maximum price
- `rating_min` (optional): Minimum average rating (0-5)
- `open_now` (optional): If 1/true, prefer items currently open
- `lat` (optional): Latitude for distance scoring
- `lon` (optional): Longitude for distance scoring
- `radius_km` (optional): If lat/lon present, restrict to items within this km radius
- `page` (optional): Page number (1-based), default: 1
- `size` (optional): Page size (1-100), default: 20
- `rerank` (optional): If 1, apply lightweight heuristic re-ranking

**Example:**
```
GET /search/food?q=pizza&veg=1&lat=19.9975&lon=73.7898&radius_km=5&page=1&size=20
```

---

### 2. Fast Category Search
**Endpoint:** `GET /search/food/category`  
**Description:** Optimized endpoint for category-based browsing with fast loading and scroll pagination. Designed for Flutter app category browsing.

**Query Parameters:**
- `category_id` (required): Category ID to filter items
- `lat` (optional): Latitude for distance calculation
- `lon` (optional): Longitude for distance calculation
- `radius_km` (optional): Radius filter in kilometers
- `page` (optional): Page number (1-based)
- `size` (optional): Items per page (1-50, default 20)
- `sort` (optional): Sort order: `distance`, `price_asc`, `price_desc`, `rating`, `popularity`
- `veg` (optional): Vegetarian filter: 1=veg only, 0=non-veg only
- `price_min` (optional): Minimum price filter
- `price_max` (optional): Maximum price filter

**Example:**
```
GET /search/food/category?category_id=288&lat=19.99176&lon=73.77388&radius_km=20&sort=distance&veg=1
```

---

### 3. Search Food Stores
**Endpoint:** `GET /search/food/stores`  
**Description:** Search and geo-sort food stores; optional delivery_time_max filter parses the leading number from delivery_time.

**Query Parameters:**
- `q` (optional): Query text
- `lat` (optional): Latitude
- `lon` (optional): Longitude
- `radius_km` (optional): Radius in kilometers
- `delivery_time_max` (optional): Keep stores whose delivery_time first number <= this value (minutes)
- `page` (optional): Page number
- `size` (optional): Page size

**Example:**
```
GET /search/food/stores?q=pizza&lat=19.9975&lon=73.7898&radius_km=5&delivery_time_max=30
```

---

### 4. Food Stores by Category (Fast)
**Endpoint:** `GET /search/food/stores/category`  
**Description:** Optimized endpoint for finding stores that serve items from a specific category.

**Query Parameters:**
- `category_id` (required): Category ID to find stores serving items from this category
- `lat` (optional): Latitude for distance calculation
- `lon` (optional): Longitude for distance calculation
- `radius_km` (optional): Radius filter in kilometers
- `page` (optional): Page number (1-based)
- `size` (optional): Stores per page (1-50, default 20)
- `sort` (optional): Sort order: `distance`, `rating`, `popularity`, `delivery_time`
- `veg` (optional): Vegetarian filter: 1=veg only, 0=non-veg only
- `delivery_time_max` (optional): Maximum delivery time in minutes

**Example:**
```
GET /search/food/stores/category?category_id=288&lat=19.99176&lon=73.77388&radius_km=20&sort=distance
```

---

### 5. Suggest Food
**Endpoint:** `GET /search/food/suggest`  
**Description:** Typeahead suggestions across items, stores, and categories. Requires q length >= 2.

**Query Parameters:**
- `q` (required): Query text (minimum 2 characters)
- `size` (optional): Number of suggestions, default: 5
- `lat` (optional): Latitude
- `lon` (optional): Longitude

**Example:**
```
GET /search/food/suggest?q=pi&size=5
```

---

## E-commerce Search

### 1. Search E-commerce Items
**Endpoint:** `GET /search/ecom`  
**Description:** Full-text and faceted search over e-commerce items. Veg filter supported when indexed. Brand and category facets included.

**Query Parameters:**
- `q` (optional): Query text for e-commerce items
- `veg` (optional): Tri-state veg filter (when available in index)
- `brand` (optional): Comma-separated brand list to filter
- `category_id` (optional): Filter by category id
- `price_min` (optional): Minimum price
- `price_max` (optional): Maximum price
- `rating_min` (optional): Minimum rating
- `lat` (optional): Latitude
- `lon` (optional): Longitude
- `radius_km` (optional): Radius in kilometers
- `page` (optional): Page number
- `size` (optional): Page size
- `rerank` (optional): Apply re-ranking

**Example:**
```
GET /search/ecom?q=milk&brand=amul,nestle&category_id=5002&price_min=50&price_max=500
```

---

### 2. E-commerce Category Search (Fast)
**Endpoint:** `GET /search/ecom/category`  
**Description:** Optimized endpoint for e-commerce category browsing.

**Query Parameters:**
- `category_id` (required): Category ID to filter items
- `lat` (optional): Latitude for distance calculation
- `lon` (optional): Longitude for distance calculation
- `radius_km` (optional): Radius filter in kilometers
- `page` (optional): Page number
- `size` (optional): Items per page (1-50, default 20)
- `sort` (optional): Sort order: distance, price_asc, price_desc, rating, popularity
- `veg` (optional): Vegetarian filter: 1=veg only, 0=non-veg only
- `brand` (optional): Comma-separated brand filter
- `price_min` (optional): Minimum price filter
- `price_max` (optional): Maximum price filter

**Example:**
```
GET /search/ecom/category?category_id=5002&lat=19.99176&lon=73.77388&radius_km=20&sort=distance
```

---

### 3. Search E-commerce Stores
**Endpoint:** `GET /search/ecom/stores`  
**Description:** Search and geo-sort e-commerce stores.

**Query Parameters:**
- `q` (optional): Query text
- `lat` (optional): Latitude
- `lon` (optional): Longitude
- `radius_km` (optional): Radius in kilometers
- `page` (optional): Page number
- `size` (optional): Page size

**Example:**
```
GET /search/ecom/stores?q=grocery&lat=19.9975&lon=73.7898&radius_km=10
```

---

### 4. E-commerce Stores by Category (Fast)
**Endpoint:** `GET /search/ecom/stores/category`  
**Description:** Optimized endpoint for finding e-commerce stores that sell items from a specific category.

**Query Parameters:**
- `category_id` (required): Category ID to find stores selling items from this category
- `lat` (optional): Latitude for distance calculation
- `lon` (optional): Longitude for distance calculation
- `radius_km` (optional): Radius filter
- `page` (optional): Page number
- `size` (optional): Stores per page (1-50, default 20)
- `sort` (optional): Sort order: distance, rating, popularity
- `veg` (optional): Vegetarian filter
- `brand` (optional): Comma-separated brand filter

**Example:**
```
GET /search/ecom/stores/category?category_id=5002&lat=19.99176&lon=73.77388
```

---

### 5. Suggest E-commerce
**Endpoint:** `GET /search/ecom/suggest`  
**Description:** Typeahead suggestions for e-commerce.

**Query Parameters:**
- `q` (required): Query text (minimum 2 characters)
- `size` (optional): Number of suggestions

**Example:**
```
GET /search/ecom/suggest?q=mi&size=5
```

---

## Rooms Search

### 1. Search Rooms
**Endpoint:** `GET /search/rooms`  
**Description:** Search rooms/accommodation listings.

**Query Parameters:**
- `q` (optional): Query text
- `lat` (optional): Latitude
- `lon` (optional): Longitude
- `radius_km` (optional): Radius in kilometers
- `page` (optional): Page number
- `size` (optional): Page size

**Example:**
```
GET /search/rooms?q=deluxe&lat=19.9975&lon=73.7898&radius_km=10
```

---

### 2. Search Room Providers
**Endpoint:** `GET /search/rooms/stores`  
**Description:** Search hotel/property providers with geo sorting.

**Query Parameters:**
- `q` (optional): Query text
- `lat` (optional): Latitude
- `lon` (optional): Longitude
- `radius_km` (optional): Radius in kilometers

**Example:**
```
GET /search/rooms/stores?q=hotel&lat=19.9975&lon=73.7898&radius_km=5
```

---

### 3. Suggest Rooms
**Endpoint:** `GET /search/rooms/suggest`  
**Description:** Typeahead suggestions for rooms and providers.

**Query Parameters:**
- `q` (required): Query text (minimum 2 characters)
- `size` (optional): Number of suggestions

**Example:**
```
GET /search/rooms/suggest?q=de&size=5
```

---

## Movies Search

### 1. Search Movies
**Endpoint:** `GET /search/movies`  
**Description:** Search movies catalog by title/genre/cast. Supports genre filter.

**Query Parameters:**
- `q` (optional): Query text
- `genre` (optional): Filter by genre (keyword)
- `page` (optional): Page number
- `size` (optional): Page size

**Example:**
```
GET /search/movies?q=action&genre=Action&page=1&size=20
```

---

### 2. Search Movie Theaters
**Endpoint:** `GET /search/movies/stores`  
**Description:** Search movie theaters/showtimes with geo sort.

**Query Parameters:**
- `q` (optional): Query text
- `lat` (optional): Latitude
- `lon` (optional): Longitude
- `radius_km` (optional): Radius in kilometers

**Example:**
```
GET /search/movies/stores?q=PVR&lat=19.9975&lon=73.7898&radius_km=10
```

---

### 3. Suggest Movies
**Endpoint:** `GET /search/movies/suggest`  
**Description:** Typeahead suggestions for movies (titles/genres/cast).

**Query Parameters:**
- `q` (required): Query text (minimum 2 characters)
- `size` (optional): Number of suggestions

**Example:**
```
GET /search/movies/suggest?q=av&size=5
```

---

## Services Search

### 1. Search Services
**Endpoint:** `GET /search/services`  
**Description:** Search local services. Supports category filter and base_price ranges.

**Query Parameters:**
- `q` (optional): Query text
- `category` (optional): Filter by service category (keyword)
- `price_min` (optional): Minimum base_price
- `price_max` (optional): Maximum base_price
- `rating_min` (optional): Minimum rating
- `lat` (optional): Latitude
- `lon` (optional): Longitude
- `radius_km` (optional): Radius in kilometers
- `page` (optional): Page number
- `size` (optional): Page size

**Example:**
```
GET /search/services?q=spa&category=Beauty&price_min=500&price_max=2000&rating_min=4
```

---

### 2. Search Service Providers
**Endpoint:** `GET /search/services/stores`  
**Description:** Search and geo-sort service providers.

**Query Parameters:**
- `q` (optional): Query text
- `lat` (optional): Latitude
- `lon` (optional): Longitude
- `radius_km` (optional): Radius in kilometers

**Example:**
```
GET /search/services/stores?q=salon&lat=19.9975&lon=73.7898&radius_km=10
```

---

### 3. Suggest Services
**Endpoint:** `GET /search/services/suggest`  
**Description:** Typeahead suggestions for services.

**Query Parameters:**
- `q` (required): Query text (minimum 2 characters)
- `size` (optional): Number of suggestions

**Example:**
```
GET /search/services/suggest?q=sp&size=5
```

---

## Analytics

### Trending Queries
**Endpoint:** `GET /analytics/trending`  
**Description:** Top queries aggregated from analytics.search_events in ClickHouse over the configured window.

**Query Parameters:**
- `window` (optional): Time window in days, e.g., '7d' (default)
- `module` (optional): Module to filter: 'food'|'ecom'|'rooms'|'services'|'movies'
- `time_of_day` (optional): Time of day bucket: 'morning'|'afternoon'|'evening'|'night'

**Example:**
```
GET /analytics/trending?window=7d&module=food&time_of_day=evening
```

**Response:**
```json
{
  "window": "7d",
  "module": "food",
  "time_of_day": "evening",
  "rows": [
    {
      "module": "food",
      "time_of_day": "evening",
      "q": "pizza",
      "count": 120,
      "total_results": 350
    }
  ]
}
```

---

## Natural Language Agent

### Search Agent
**Endpoint:** `GET /search/agent`  
**Description:** Parses free-form text to derive module, target (items/stores), and filters (geo, veg, open_now, rating, price). Applies progressive relaxation if no results.

**Query Parameters:**
- `q` (optional): Free-form query text
- `lat` (optional): Latitude
- `lon` (optional): Longitude
- `radius_km` (optional): Radius in kilometers

**Example:**
```
GET /search/agent?q=veg pizza near me open now under 300&lat=19.9975&lon=73.7898&radius_km=5
```

**Response:**
```json
{
  "plan": {
    "module": "food",
    "target": "items",
    "q": "veg pizza",
    "lat": 19.9975,
    "lon": 73.7898,
    "radius_km": 5,
    "open_now": true,
    "veg": true,
    "price_max": 300
  },
  "result": {
    "meta": {
      "total": 190
    },
    "items": [...]
  }
}
```

---

## ASR (Speech Recognition)

### ASR Transcription
**Endpoint:** `POST /search/asr`  
**Description:** Accepts an audio file (multipart/form-data) and proxies transcription to Admin AI ASR. Returns the text transcript.

**Request:**
- Content-Type: `multipart/form-data`
- Body: Audio file with field name `audio`

**Example (cURL):**
```bash
curl -X POST \
  http://localhost:3100/search/asr \
  -F 'audio=@/path/to/audio.wav'
```

**Response:**
```json
{
  "text": "best pizza nearby"
}
```

**Supported Audio Formats:**
- WAV
- MP3
- M4A
- Other formats supported by Admin AI ASR

---

## Key Features

### 1. Full-Text Search
- Multi-field matching on name, description, and category
- Fuzzy matching for typos
- Phrase matching for exact phrases
- Wildcard matching for partial text

### 2. Geographic Search
- Distance calculation using Haversine formula
- Geo-radius filtering
- Distance-based sorting
- Delivery time recalculation based on distance

### 3. Faceted Search
- Vegetarian/non-vegetarian filters
- Category filters
- Price range filters
- Rating filters
- Brand filters (e-commerce)
- Genre filters (movies)
- Service category filters

### 4. Intelligent Search
- Enhanced search across items, stores, and categories
- Store name enrichment
- Delivery time calculation
- Progressive relaxation for strict queries
- Natural language understanding

### 5. Performance Optimizations
- Fast category-based browsing
- Scroll pagination
- Aggregation queries for facets
- Geo-distance scoring
- Popularity-based ranking

---

## Response Formats

### Items Response
```json
{
  "module": "food",
  "q": "pizza",
  "filters": {
    "veg": "1",
    "lat": "19.9975",
    "lon": "73.7898",
    "radius_km": "5"
  },
  "items": [
    {
      "id": "123",
      "name": "Veg Pizza",
      "price": 299,
      "veg": 1,
      "avg_rating": 4.5,
      "distance_km": 2.3,
      "store_name": "Pizza House",
      "delivery_time": "25-35 min",
      "...": "other fields"
    }
  ],
  "facets": {
    "veg": [
      { "value": 1, "count": 190 },
      { "value": 0, "count": 158 }
    ],
    "category_id": [
      { "value": 101, "label": "Pizzas", "count": 120 }
    ]
  },
  "meta": {
    "total": 350
  }
}
```

### Stores Response
```json
{
  "module": "food",
  "q": "pizza",
  "stores": [
    {
      "id": "st1",
      "name": "Pizza House",
      "delivery_time": "25-35 min",
      "location": {
        "lat": 19.99,
        "lon": 73.78
      },
      "distance_km": 2.3,
      "...": "other fields"
    }
  ],
  "meta": {
    "total": 42
  }
}
```

### Suggestions Response
```json
{
  "module": "food",
  "q": "pi",
  "items": [
    {
      "id": "123",
      "name": "Pizza",
      "distance_km": 2.3,
      "store_name": "Pizza House",
      "delivery_time": "25-35 min"
    }
  ],
  "stores": [
    {
      "id": "st1",
      "name": "Pizza House",
      "distance_km": 2.3,
      "delivery_time": "30-40 min"
    }
  ],
  "categories": [
    {
      "id": "101",
      "name": "Pizzas"
    }
  ]
}
```

---

## Testing in Postman

1. **Import Collection:** Import the `POSTMAN_SEARCH_API_ENDPOINTS.json` file into Postman
2. **Set Variables:** Update the `base_url` variable with your actual server URL
3. **Test Health:** Start with the `/health` endpoint to verify the service is running
4. **Test Search:** Try different search queries with various filters
5. **Test Suggestions:** Use the suggest endpoints for autocomplete functionality
6. **Test Analytics:** Check trending queries for insights
7. **Test Agent:** Try natural language queries
8. **Test ASR:** Upload audio files for transcription

---

## Error Handling

All endpoints return standard HTTP status codes:
- `200`: Success
- `400`: Bad Request (invalid parameters)
- `500`: Internal Server Error

Error response format:
```json
{
  "statusCode": 400,
  "message": "category_id is required",
  "error": "Bad Request"
}
```

---

## Performance Notes

- Maximum page size: 100 (items search), 50 (category search)
- Suggest endpoints require minimum 2 characters
- Geo queries are optimized with distance calculations
- Category-based searches are optimized for fast loading
- Delivery time is recalculated based on actual distance

---

## Integration with Main Backend

The Search API integrates with the main Mangwale backend:
- Receives data from CDC (Change Data Capture) streams
- Indexes items, stores, and categories
- Provides search results to main API
- Tracks analytics for trending queries

---

## Additional Resources

- **Swagger Documentation:** Available at `/docs` when running
- **OpenSearch:** Search engine backend
- **ClickHouse:** Analytics backend for trending queries
- **Admin AI:** NLU and ASR services
