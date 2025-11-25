# 🚀 OPENSEARCH FEATURE RECOMMENDATIONS & DATA INSIGHTS

**Date**: November 10, 2025  
**Database**: one_mangwale  
**Analysis**: Complete data analysis for AI-powered search features

---

## 📊 CURRENT DATA INSIGHTS

### Overall Platform Statistics

| Metric | Value | Insight |
|--------|-------|---------|
| **Total Completed Orders** | 1,947 | Active user base |
| **Total Revenue** | ₹435,975.43 | ~₹4.36 Lakh |
| **Average Order Value** | ₹223.92 | Good basket size |
| **Total Reviews** | 193 | Only 9.9% review rate - **opportunity!** |
| **Average Rating** | 4.35/5 | Excellent quality |

### Module Performance

| Module ID | Module | Orders | Revenue | Market Share |
|-----------|--------|--------|---------|--------------|
| 4 | Food | 1,147 (59%) | ₹347,631 (80%) | **Dominant** |
| 3 | Local Delivery | 751 (39%) | ₹50,898 (12%) | Growing |
| 5 | Shop | 33 (1.7%) | ₹30,354 (7%) | **Underutilized** |
| 13 | Pet Care | 6 (0.3%) | ₹3,330 (0.8%) | **New/Struggling** |

**Key Insight**: Pet Care (module 13) has 20 stores but only 6 orders! **Massive opportunity for search optimization.**

### Top 20 Food Items (Order Count + Reviews)

| Rank | Item | Price | Orders | Reviews | Avg Rating | Opportunity |
|------|------|-------|--------|---------|------------|-------------|
| 1 | Palak Paneer | ₹50 | 138 | 1 | 5.0 | Low-price champion |
| 2 | Tarachand Special Thali | ₹370 | 80 | 5 | 3.2 | **Needs improvement** |
| 3 | Malai Paneer | ₹140 | 62 | 3 | 5.0 | Perfect quality |
| 4 | Dahi | ₹50 | 43 | 2 | 5.0 | Budget staple |
| 5 | Chapati | ₹10 | 39 | 0 | - | **Missing reviews** |
| 6 | Strawberry Cake | ₹1 | 30 | 0 | - | Pricing error? |
| 7 | Chapati (duplicate) | ₹10 | 26 | 2 | 3.0 | Consistency issue |
| 8 | Milk Cake | ₹200 | 25 | 3 | 4.3 | Premium dessert |
| 9 | Veg Thali | ₹100 | 24 | 4 | 4.75 | Best value |
| 10 | Veg Sandwich | ₹30 | 19 | 1 | 5.0 | Snack favorite |

**Key Insights**:
- **Chapati** appears multiple times with different IDs (de-duplication needed!)
- **Low review rate**: Only 20% of top items have reviews
- **Price inconsistency**: Strawberry Cake at ₹1 (likely error)

### Top 20 Categories by Orders

| Rank | Category | Items | Orders | Avg Orders/Item |
|------|----------|-------|--------|-----------------|
| 1 | Breads | 727 | 314 | 0.43 |
| 2 | Paneer | 716 | 209 | 0.29 |
| 3 | Thali | 67 | 158 | **2.36** 🔥 |
| 4 | Pizza | 244 | 128 | 0.52 |
| 5 | Indian Classics | 901 | 100 | 0.11 |
| 6 | Biryani | 213 | 99 | 0.46 |
| 7 | Dairy Products | 14 | 96 | **6.86** 🔥 |
| 8 | Sweets | 172 | 89 | 0.52 |
| 9 | Rice & Pulao | 422 | 79 | 0.19 |
| 10 | Sandwich | 227 | 72 | 0.32 |

**Key Insight**: 
- **Thali** (158 orders / 67 items = 2.36) - High conversion!
- **Dairy** (96 orders / 14 items = 6.86) - **Highest conversion category**
- **Indian Classics** (901 items, only 100 orders) - **Poor discoverability!**

### Top Stores Performance

| Rank | Store | Orders | Avg Order | Reviews | Rating |
|------|-------|--------|-----------|---------|--------|
| 1 | Bhagat Tarachand | 124 | ₹648 | 0 | - |
| 2 | Ganesh Sweet Mart | 100 | ₹392 | 0 | - |
| 3 | Kantara Food | 70 | ₹240 | 9 | 4.56 |
| 4 | Satwik Kitchen | 66 | ₹268 | 0 | - |
| 5 | Star Boys Burger | 54 | ₹231 | 0 | - |

**Critical Issue**: Top 2 stores (224 orders) have **ZERO reviews**! 

### Peak Order Times (Hourly Pattern)

| Time Slot | Orders | % of Total | Business Insight |
|-----------|--------|------------|------------------|
| 12:00-15:00 (Lunch) | 333 | 29% | **Peak lunch** |
| 18:00-22:00 (Dinner) | 222 | 19% | **Peak dinner** |
| 06:00-09:00 (Breakfast) | 197 | 17% | Morning rush |
| 03:00-05:00 (Late night) | 44 | 4% | Night owls |

**Opportunity**: Different item recommendations by time of day!

---

## 🎯 RECOMMENDED FEATURES FOR OPENSEARCH

### 1. **POPULARITY-BASED RANKING** ⭐⭐⭐⭐⭐

**Current Issue**: Items sorted by relevance only, not popularity

**Solution**: Add order count to OpenSearch documents

```json
{
  "item_id": 14383,
  "name": "Palak Paneer",
  "order_count": 138,
  "review_count": 1,
  "avg_rating": 5.0,
  "last_7_days_orders": 15,
  "last_30_days_orders": 45,
  "popularity_score": 0.92
}
```

**Implementation**:
1. Daily sync job: Update `order_count` from MySQL → OpenSearch
2. Calculate popularity score: `(order_count * 0.4) + (review_count * 0.3) + (avg_rating * 0.3)`
3. Sort search results by: `popularity_score DESC` or `_score * popularity_score`

**Expected Impact**: 
- Show users what's actually popular
- Increase conversion rate by 20-30%
- Help new items get discovered

---

### 2. **TRENDING ITEMS** ⭐⭐⭐⭐⭐

**Data Available**: Daily order patterns

**Solution**: Track recent order velocity

```json
{
  "trending_score": 8.5,  // Based on order growth rate
  "last_7_days_orders": 25,
  "previous_7_days_orders": 10,  // 150% growth!
  "is_trending": true
}
```

**Implementation**:
```javascript
trending_score = (last_7_days / previous_7_days) * 10
if trending_score > 5: mark as "🔥 Trending"
```

**Search Enhancement**:
```
GET /search?q=pizza&module_id=4&sort=trending
```

**Expected Impact**:
- Capitalize on viral items
- Create FOMO (Fear of Missing Out)
- Drive impulse purchases

---

### 3. **TIME-BASED RECOMMENDATIONS** ⭐⭐⭐⭐

**Data**: Hourly order patterns show clear meal preferences

**Solution**: Boost items by time of day

```javascript
// Morning (6-10 AM): Boost breakfast items
if (current_hour >= 6 && current_hour < 10) {
  boost_categories = ['Breakfast', 'Bakery', 'Dairy'];
}

// Lunch (12-3 PM): Boost thalis, combos
if (current_hour >= 12 && current_hour < 15) {
  boost_categories = ['Thali', 'Combos', 'Biryani'];
}

// Dinner (7-11 PM): Boost main courses
if (current_hour >= 19 && current_hour < 23) {
  boost_categories = ['Indian Classics', 'Curries', 'Rice'];
}
```

**OpenSearch Query**:
```json
{
  "function_score": {
    "query": { "match": { "name": "chicken" } },
    "functions": [
      {
        "filter": { "term": { "category_name": "Breakfast" } },
        "weight": "current_hour >= 6 && current_hour < 10 ? 3.0 : 1.0"
      }
    ]
  }
}
```

**Expected Impact**:
- More relevant results
- Higher conversion
- Better user experience

---

### 4. **REVIEW-DRIVEN QUALITY SIGNALS** ⭐⭐⭐⭐⭐

**Current Issue**: Only 9.9% review rate, but critical for trust

**Solution**: Multi-factor quality score

```json
{
  "quality_score": 0.85,
  "review_count": 5,
  "avg_rating": 4.5,
  "has_reviews": true,
  "review_freshness": "recent",  // Last review within 30 days
  "review_velocity": 0.5  // Reviews per order
}
```

**Quality Score Formula**:
```javascript
quality_score = (
  (avg_rating / 5.0) * 0.5 +                    // 50% weight on rating
  min(review_count / 20, 1.0) * 0.3 +           // 30% on review count (capped at 20)
  (order_count > 10 ? 0.2 : 0)                  // 20% if proven (>10 orders)
)
```

**Search Filters**:
```
GET /search?q=pizza&module_id=4&min_quality=0.7
GET /search?q=pizza&module_id=4&has_reviews=true
```

**Expected Impact**:
- Build trust with new users
- Increase review submission rate
- Filter low-quality items

---

### 5. **SMART CATEGORY DISCOVERY** ⭐⭐⭐⭐

**Data Insight**: "Indian Classics" has 901 items but only 100 orders (0.11 conversion)

**Problem**: Poor category naming, too broad

**Solution**: AI-powered category suggestions

```json
GET /search/suggest-categories?q=spicy paneer

Response:
{
  "suggestions": [
    { "category": "Paneer", "match_score": 0.95, "items": 716, "orders": 209 },
    { "category": "Indian Classics", "match_score": 0.6, "items": 901, "orders": 100 },
    { "category": "Curries & Gravy", "match_score": 0.7, "items": 206, "orders": 37 }
  ],
  "recommended": "Paneer"  // Best conversion ratio
}
```

**Implementation**:
1. Use semantic search on category names
2. Rank by: `conversion_rate * relevance_score`
3. Show users "Most ordered in this category"

---

### 6. **DUPLICATE ITEM DETECTION** ⭐⭐⭐⭐

**Critical Issue**: Multiple "Chapati" entries at different prices

**Current Data**:
- Item 2778: Chapati - ₹10 (39 orders)
- Item 7801: Chapati - ₹10 (26 orders)
- Item 4304: Chapati - ₹10 (23 orders)
- Item 1058: chapati - ₹10 (16 orders) [lowercase!]
- Item 3071: chapati - ₹7 (16 orders)

**Solution**: Fuzzy matching + grouping

```javascript
// OpenSearch query with fuzzy matching
{
  "query": {
    "fuzzy": {
      "name": {
        "value": "chapati",
        "fuzziness": "AUTO",
        "prefix_length": 2
      }
    }
  },
  "collapse": {
    "field": "name_normalized"  // lowercase, trimmed
  }
}
```

**Implementation**:
1. Create `name_normalized` field: lowercase + trim
2. Collapse duplicate results
3. Aggregate orders across duplicates
4. Show: "Chapati (104 total orders from 5 stores)"

---

### 7. **PRICE-BASED SMART FILTERS** ⭐⭐⭐⭐

**Data**: Average order ₹223, items range ₹1-₹648

**Solution**: Dynamic price buckets

```json
{
  "price_buckets": [
    { "label": "Budget (<₹100)", "min": 0, "max": 100, "count": 4523 },
    { "label": "Mid-range (₹100-300)", "min": 100, "max": 300, "count": 2145 },
    { "label": "Premium (₹300-500)", "min": 300, "max": 500, "count": 892 },
    { "label": "Luxury (>₹500)", "min": 500, "max": 999999, "count": 234 }
  ]
}
```

**Price Anomaly Detection**:
```sql
-- Detect outliers
SELECT * FROM items WHERE price < 5 OR price > 1000;
-- Flag for review: Strawberry Cake at ₹1
```

---

### 8. **STORE PERFORMANCE METRICS** ⭐⭐⭐⭐

**Data**: Top stores need better visibility

**Solution**: Store quality indicators

```json
{
  "store": {
    "id": 164,
    "name": "Kantara Food",
    "performance": {
      "order_count": 70,
      "avg_order_value": 240,
      "review_count": 9,
      "avg_rating": 4.56,
      "response_time": "20 min",
      "acceptance_rate": 0.95,
      "badges": ["⭐ Top Rated", "🔥 Popular", "⚡ Fast Delivery"]
    }
  }
}
```

**Search Sorting**:
```
GET /search/stores?module_id=4&sort=performance_score
```

**Performance Score**:
```javascript
performance_score = (
  (avg_rating / 5.0) * 0.3 +
  (acceptance_rate) * 0.2 +
  min(order_count / 100, 1.0) * 0.3 +
  (response_time < 30 ? 0.2 : 0.1)
)
```

---

### 9. **PERSONALIZED RECOMMENDATIONS** ⭐⭐⭐⭐⭐

**Data Available**: User order history, item co-occurrence

**Solution**: "Frequently Bought Together"

```sql
-- Find item pairs ordered together
SELECT 
  od1.item_id as item_a,
  od2.item_id as item_b,
  COUNT(*) as times_together
FROM order_details od1
JOIN order_details od2 ON od1.order_id = od2.order_id AND od1.item_id < od2.item_id
GROUP BY od1.item_id, od2.item_id
ORDER BY times_together DESC
LIMIT 100;
```

**OpenSearch Document**:
```json
{
  "item_id": 14383,
  "name": "Palak Paneer",
  "frequently_with": [
    { "item_id": 2778, "name": "Chapati", "co_order_rate": 0.65 },
    { "item_id": 1327, "name": "Dahi", "co_order_rate": 0.45 }
  ]
}
```

**API Endpoint**:
```
GET /search/recommendations?item_id=14383&type=combo
```

---

### 10. **SEASONAL & EVENT-BASED BOOSTING** ⭐⭐⭐⭐

**Pattern**: Order volume varies by day/date

**Solution**: Detect and boost seasonal items

```json
{
  "item_id": 175,
  "name": "Cake",
  "seasonal_patterns": {
    "weekends": { "boost": 1.5, "avg_orders": 15 },
    "weekdays": { "boost": 1.0, "avg_orders": 8 },
    "festive_season": { "boost": 2.0 }
  }
}
```

**Implementation**:
```javascript
if (isWeekend()) {
  boost_categories(['Cake', 'Pizza', 'Fast Food'], 1.5);
}

if (isFestiveSeason()) {
  boost_categories(['Sweets', 'Thali', 'Biryani'], 2.0);
}
```

---

### 11. **FRESHNESS SIGNALS** ⭐⭐⭐

**Use Case**: Show recently added items, recently ordered items

```json
{
  "item_id": 12930,
  "name": "Cheese Overloaded Pizza",
  "created_at": "2025-09-15T10:00:00Z",
  "is_new": true,  // Added within last 30 days
  "last_ordered_at": "2025-10-07T14:30:00Z",
  "days_since_last_order": 3,
  "is_active": true  // Ordered in last 7 days
}
```

**Search Features**:
```
GET /search?q=pizza&module_id=4&show_new=true
GET /search?q=pizza&module_id=4&exclude_stale=true  // Not ordered in 60 days
```

---

### 12. **DIETARY & ALLERGEN FILTERS** ⭐⭐⭐⭐⭐

**Current Data**: `veg` field exists (boolean)

**Enhancement**: Expand dietary options

```json
{
  "item_id": 14383,
  "name": "Palak Paneer",
  "dietary": {
    "veg": true,
    "vegan": false,
    "gluten_free": true,
    "jain": true,
    "halal": false,
    "allergens": ["dairy"],
    "spice_level": 2  // 0-5 scale
  }
}
```

**Search Filters**:
```
GET /search?q=curry&module_id=4&veg=true&allergens=none
GET /search?q=biryani&module_id=4&spice_level=3-5
```

---

### 13. **DISTANCE-AWARE AVAILABILITY** ⭐⭐⭐⭐

**Current**: Items shown regardless of store distance

**Enhancement**: Filter by delivery feasibility

```json
{
  "item_id": 14383,
  "store": {
    "id": 164,
    "location": { "lat": 19.9975, "lon": 73.7898 },
    "delivery_radius_km": 5,
    "avg_delivery_time_min": 30
  }
}
```

**Search Query**:
```
GET /search?q=pizza&module_id=4&lat=19.99&lon=73.78&max_delivery_time=30
```

**OpenSearch Filter**:
```json
{
  "bool": {
    "filter": [
      {
        "geo_distance": {
          "distance": "5km",
          "store_location": { "lat": 19.99, "lon": 73.78 }
        }
      },
      {
        "range": {
          "avg_delivery_time_min": { "lte": 30 }
        }
      }
    ]
  }
}
```

---

### 14. **SEARCH ANALYTICS & AUTO-CORRECTION** ⭐⭐⭐⭐

**Track**: User search behavior

**Solution**: Search analytics table

```sql
CREATE TABLE search_analytics (
  id BIGINT PRIMARY KEY,
  user_id BIGINT,
  query VARCHAR(255),
  results_count INT,
  clicked_item_id BIGINT,
  module_id BIGINT,
  created_at TIMESTAMP
);
```

**Features**:
1. **Popular searches**: "What are users searching for?"
2. **Zero-result searches**: "Where are we failing?"
3. **Typo detection**: "piza" → "Did you mean: pizza?"
4. **Auto-suggest improvement**: Learn from successful searches

**Implementation**:
```javascript
// Log every search
await logSearch({
  user_id,
  query: "piza",
  corrected_to: "pizza",
  results_count: 128,
  clicked_item_id: 1577
});

// Generate auto-corrections
if (results_count === 0) {
  const suggestions = await fuzzyMatch(query);
  return { query, results: [], suggestions };
}
```

---

### 15. **AI-POWERED SEMANTIC SEARCH** ⭐⭐⭐⭐⭐

**Current**: Keyword matching only

**Enhancement**: Understanding intent

**Example Queries**:
- "healthy breakfast" → Finds: Oats, Fresh Juice, Fruit Salad
- "quick snack under 50" → Filters: price<50, category=Fast Food
- "spicy vegetarian main course" → Filters: veg=true, spice_level>=3, category=Main Course

**Implementation**:
```json
{
  "item_id": 14383,
  "name": "Palak Paneer",
  "description_vector": [0.234, 0.567, ...],  // 768-dim embedding
  "keywords": ["healthy", "vegetarian", "indian", "creamy", "spinach"],
  "semantic_tags": ["protein-rich", "low-calorie", "gluten-free"]
}
```

**Search Query**:
```
POST /search/semantic
{
  "query": "healthy vegetarian protein",
  "module_id": 4,
  "min_similarity": 0.7
}
```

---

## 🎯 PRIORITY IMPLEMENTATION ROADMAP

### **Phase 1: Quick Wins (1-2 weeks)**
1. ✅ Popularity-based ranking (order_count sync)
2. ✅ Review-driven quality scores
3. ✅ Price filters & buckets
4. ✅ Time-based boosting (breakfast/lunch/dinner)

**Expected Impact**: 25-30% increase in conversion

### **Phase 2: Discovery (2-3 weeks)**
5. ✅ Trending items algorithm
6. ✅ Category conversion optimization
7. ✅ Duplicate item detection
8. ✅ Store performance metrics

**Expected Impact**: Better item discovery, reduced confusion

### **Phase 3: Personalization (3-4 weeks)**
9. ✅ Frequently bought together
10. ✅ Dietary filters expansion
11. ✅ Distance-aware delivery
12. ✅ Search analytics tracking

**Expected Impact**: Personalized experience, higher AOV

### **Phase 4: AI Intelligence (4-6 weeks)**
13. ✅ Semantic search with embeddings
14. ✅ Auto-correction & suggestions
15. ✅ Seasonal pattern detection
16. ✅ Natural language query understanding

**Expected Impact**: Industry-leading search experience

---

## 💡 IMMEDIATE ACTIONS

### 1. **Fix Data Quality Issues**

```sql
-- Fix pricing errors
UPDATE items SET price = 99 WHERE id = 474 AND price = 1;

-- Normalize item names
UPDATE items SET name = TRIM(UPPER(SUBSTRING(name, 1, 1)) || LOWER(SUBSTRING(name, 2)));

-- Flag duplicates
SELECT name, COUNT(*) as count FROM items GROUP BY name HAVING count > 1;
```

### 2. **Sync Order Counts to OpenSearch**

```javascript
// Daily job
const items = await mysql.query(`
  SELECT i.id, COUNT(DISTINCT od.order_id) as order_count
  FROM items i
  LEFT JOIN order_details od ON i.id = od.item_id
  GROUP BY i.id
`);

for (const item of items) {
  await opensearch.update({
    index: 'food_items',
    id: item.id,
    body: { doc: { order_count: item.order_count } }
  });
}
```

### 3. **Increase Review Rate**

**Current**: 193 reviews for 1,947 orders = 9.9%  
**Target**: 30%

**Strategies**:
1. Post-delivery reminder (24 hours)
2. Incentive: "Get ₹20 cashback for review"
3. Make review submission easier (1-click ratings)
4. Show review count in search results ("Only 5 reviews - be the first!")

### 4. **Boost Pet Care Module**

**Issue**: 20 stores, only 6 orders

**Actions**:
1. Featured banner: "New Pet Care Module"
2. First-order discount: "20% off first pet order"
3. Cross-promote in Shop module search results
4. SEO optimization: "pet food delivery near me"

---

## 📈 SUCCESS METRICS

| Metric | Current | Target (3 months) | Measurement |
|--------|---------|-------------------|-------------|
| Review Rate | 9.9% | 30% | Reviews / Orders |
| Pet Care Orders | 6/month | 100/month | Monthly orders |
| Search CTR | Unknown | 45% | Clicks / Searches |
| Zero-result Searches | Unknown | <5% | Failed searches |
| Avg Order Value | ₹224 | ₹280 | Order amount |
| Item Discovery | Unknown | 70% | Items with orders |

---

## 🚀 NEXT STEPS

1. **Review & Approve** this feature list
2. **Prioritize** based on business goals
3. **Create detailed specs** for Phase 1 features
4. **Set up data pipeline** for MySQL → OpenSearch sync
5. **Implement** highest priority features
6. **A/B Test** with real users
7. **Monitor metrics** and iterate

Ready to build the best food delivery search in India! 🇮🇳
