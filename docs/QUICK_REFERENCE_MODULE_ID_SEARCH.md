# Quick Reference: Module ID Based Search

## 🚀 Quick Start

### Base URL
```
http://localhost:3100
```

## 📍 Endpoints

### 1. Suggest API
```
GET /v2/search/suggest?q={query}&module_id={id}&store_id={id}&category_id={id}
```

### 2. Items API
```
GET /v2/search/items?q={query}&module_id={id}&store_id={id}&category_id={id}
```

### 3. Stores API
```
GET /v2/search/stores?q={query}&module_id={id}
```

## 🎯 Use Cases

### Global Search (All Modules/Stores/Categories)
```bash
# Suggest
curl "http://localhost:3100/v2/search/suggest?q=pizza"

# Items
curl "http://localhost:3100/v2/search/items?q=pizza"

# Stores
curl "http://localhost:3100/v2/search/stores?q=pizza"
```

### Module-wise Search (Module 4 = Food)
```bash
# Suggest
curl "http://localhost:3100/v2/search/suggest?q=pizza&module_id=4"

# Items
curl "http://localhost:3100/v2/search/items?q=pizza&module_id=4"

# Stores
curl "http://localhost:3100/v2/search/stores?q=pizza&module_id=4"
```

### Store-wise Search (Store 123)
```bash
# Suggest (returns items + categories)
curl "http://localhost:3100/v2/search/suggest?q=pizza&store_id=123"

# Items
curl "http://localhost:3100/v2/search/items?q=pizza&store_id=123"
```

### Category-wise Search (Category 288)
```bash
# Suggest (returns items + stores)
curl "http://localhost:3100/v2/search/suggest?q=pizza&category_id=288"

# Items
curl "http://localhost:3100/v2/search/items?q=pizza&category_id=288"

# Stores (stores that have items in this category)
curl "http://localhost:3100/v2/search/stores?q=pizza&category_id=288"
```

## 🔧 Common Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `q` | string | Search query | `q=pizza` |
| `module_id` | number | Filter by module | `module_id=4` |
| `store_id` | number | Filter by store | `store_id=123` |
| `category_id` | number | Filter by category | `category_id=288` |
| `semantic` | 1/0 | Use semantic search | `semantic=1` |
| `veg` | 1/0/veg | Vegetarian filter | `veg=1` |
| `price_min` | number | Min price | `price_min=100` |
| `price_max` | number | Max price | `price_max=500` |
| `rating_min` | number | Min rating | `rating_min=4` |
| `lat` | number | Latitude | `lat=19.9975` |
| `lon` | number | Longitude | `lon=73.7898` |
| `radius_km` | number | Radius in km | `radius_km=5` |
| `page` | number | Page number | `page=1` |
| `size` | number | Results per page | `size=20` |
| `sort` | string | Sort order | `sort=distance` |

## 📊 Response Examples

### Suggest Response
```json
{
  "q": "pizza",
  "items": [
    { "id": "123", "name": "Pizza", "price": 299, "module_id": 4 }
  ],
  "stores": [
    { "id": "st1", "name": "Pizza House", "module_id": 4 }
  ],
  "categories": [
    { "id": "101", "name": "Pizzas", "module_id": 4 }
  ]
}
```

### Items Response
```json
{
  "q": "pizza",
  "filters": { "module_id": 4 },
  "items": [
    {
      "id": "123",
      "name": "Veg Pizza",
      "price": 299,
      "module_id": 4,
      "store_id": 123,
      "store_name": "Pizza House"
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "size": 20,
    "total_pages": 8
  }
}
```

### Stores Response
```json
{
  "q": "pizza",
  "filters": { "module_id": 4 },
  "stores": [
    {
      "id": "st1",
      "name": "Pizza House",
      "module_id": 4,
      "distance_km": 2.5
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "size": 20
  }
}
```

## 🧪 Test Commands

```bash
# Run all tests
./test-module-id-search.sh

# Or use Node.js version
node test-module-id-search.js
```

## 📚 Full Documentation

See `MODULE_ID_SEARCH_DOCUMENTATION.md` for complete documentation.

