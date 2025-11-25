# Immediate Action Plan - Search Improvements

## Executive Summary

✅ **Search is working well** - 85% relevance, fast response times  
🔴 **Main issues:** Data quality, missing synonyms, semantic search integration bug  
📊 **Priority:** Fix data and config issues before considering ML training

---

## Priority 1: Data Quality Fixes (2-3 hours)

### Issue 1: Missing Price/Brand Data in Ecom

**Check the problem:**
```bash
# See how many items missing price/brand
curl -sS 'http://localhost:9200/ecom_items_v3/_search' -H 'Content-Type: application/json' -d '{
  "size": 0,
  "aggs": {
    "missing_price": {"missing": {"field": "price"}},
    "missing_brand": {"missing": {"field": "brand"}},
    "total": {"value_count": {"field": "_id"}}
  }
}' | jq '.aggregations'
```

**Root cause options:**
1. Data missing in source MySQL database
2. CDC pipeline not syncing these fields
3. OpenSearch mapping issue

**Fix path:**
```bash
# Check source database
mysql -h localhost -u your_user -p mangwale_db -e "
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN price IS NULL OR price = 0 THEN 1 ELSE 0 END) as missing_price,
  SUM(CASE WHEN brand IS NULL OR brand = '' THEN 1 ELSE 0 END) as missing_brand
FROM ecom_items 
WHERE status = 1;"

# If data exists in MySQL but missing in OpenSearch, check CDC connector
curl -X GET http://localhost:8083/connectors/mysql-mangwale/status | jq
```

**Action:** Review the numbers and let me know which path to take.

---

### Issue 2: Missing Inventory (Detergent, Fresh Milk)

**Check if products exist:**
```bash
# Check for detergent in source
mysql -h localhost -u your_user -p mangwale_db -e "
SELECT id, name, category_name, price 
FROM ecom_items 
WHERE (name LIKE '%detergent%' OR name LIKE '%washing%' OR category_name LIKE '%Cleaning%')
  AND status = 1 
LIMIT 10;"

# Check for fresh milk
mysql -h localhost -u your_user -p mangwale_db -e "
SELECT id, name, category_name, price, brand
FROM ecom_items 
WHERE name LIKE '%milk%' 
  AND category_name IN ('Dairy', 'Milk', 'Beverages')
  AND status = 1 
LIMIT 10;"
```

**Expected outcomes:**
- **Products exist in MySQL:** CDC sync issue → Force resync or fix connector
- **Products don't exist:** Inventory gap → Business team needs to add products

**Action:** Please run these queries and share results.

---

## Priority 2: Add Synonym Mappings (1 hour)

### Regional Term Synonyms

Current problem: Query "curd" returns irrelevant results because no synonym mapping.

**Solution:** Add synonym analyzer to OpenSearch indices.

### Implementation Option 1: Runtime Synonym Filter (Quick - No Reindex)

Add synonyms at query time without reindexing:

```bash
# Test synonym expansion in query
curl -sS 'http://localhost:3100/search/ecom?q=curd&size=5' 

# Modify search query to expand synonyms programmatically
```

**Code change needed in `search.service.ts`:**

```typescript
// Add at top of search.service.ts
private readonly SYNONYM_MAP = {
  // Dairy products
  'curd': ['curd', 'yogurt', 'yoghurt', 'dahi'],
  'paneer': ['paneer', 'cottage cheese'],
  
  // Vegetables
  'brinjal': ['brinjal', 'eggplant', 'baingan', 'aubergine'],
  'capsicum': ['capsicum', 'bell pepper', 'shimla mirch'],
  'coriander': ['coriander', 'cilantro', 'dhania'],
  'lady finger': ['lady finger', 'okra', 'bhindi'],
  
  // Grains
  'atta': ['atta', 'wheat flour', 'whole wheat flour'],
  'maida': ['maida', 'all purpose flour', 'refined flour'],
  'besan': ['besan', 'gram flour', 'chickpea flour'],
  
  // Spices
  'jeera': ['jeera', 'cumin', 'cumin seeds'],
  'haldi': ['haldi', 'turmeric', 'turmeric powder'],
  'mirch': ['mirch', 'chili', 'chilli', 'red chili'],
};

private expandSynonyms(query: string): string {
  const lowerQuery = query.toLowerCase();
  for (const [key, synonyms] of Object.entries(this.SYNONYM_MAP)) {
    if (lowerQuery.includes(key)) {
      // Return all synonyms joined with OR
      return synonyms.join(' OR ');
    }
  }
  return query;
}

// In searchFood() and searchEcom() methods, before building query:
const expandedQuery = this.expandSynonyms(searchDto.q);
// Use expandedQuery in multi_match query
```

**Testing:**
```bash
# After code change, test
curl 'http://localhost:3100/search/ecom?q=curd&size=5'
# Should now return yogurt/dahi products
```

**Do you want me to implement this code change?**

---

### Implementation Option 2: Index-Level Synonyms (Proper - Requires Reindex)

Create new indices with synonym analyzer:

```json
PUT /ecom_items_v4
{
  "settings": {
    "analysis": {
      "filter": {
        "indian_synonyms": {
          "type": "synonym",
          "synonyms": [
            "curd, yogurt, yoghurt, dahi",
            "paneer, cottage cheese",
            "brinjal, eggplant, baingan, aubergine",
            "capsicum, bell pepper, shimla mirch",
            "coriander, cilantro, dhania",
            "atta, wheat flour",
            "besan, gram flour, chickpea flour"
          ]
        }
      },
      "analyzer": {
        "indian_food_analyzer": {
          "tokenizer": "standard",
          "filter": [
            "lowercase",
            "indian_synonyms"
          ]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "name": {
        "type": "text",
        "analyzer": "indian_food_analyzer"
      },
      "description": {
        "type": "text",
        "analyzer": "indian_food_analyzer"
      }
      // ... rest of mappings
    }
  }
}
```

**Pros:** More robust, better performance  
**Cons:** Requires full reindex (30-60 minutes)

**Do you want to do this now or go with Option 1 first?**

---

## Priority 3: Fix Semantic Search Fallback (2 hours)

### Current Issue

Food semantic search falls back to keyword search (returns `knn: null`)

**Evidence:**
```json
// Query: "butter chicken"
{
  "knn_search": null,
  "semantic_search": null,
  "items": ["Butter Chicken", "Butter Chicken", "Butter Chicken"]
}
```

### Debugging Steps

**Step 1: Add Debug Logging**

```typescript
// In search.service.ts, in semanticSearch() method around line 622

async semanticSearch(module: 'food' | 'ecom', searchDto: SearchDto) {
  const startTime = Date.now();
  
  try {
    // Get embedding from service
    const embeddingResponse = await fetch(
      `${this.configService.get('EMBEDDING_API_URL')}/embed`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: [searchDto.q] }),
      },
    );

    // ADD THIS LOGGING
    console.log('[SEMANTIC SEARCH DEBUG]', {
      module,
      query: searchDto.q,
      embeddingUrl: this.configService.get('EMBEDDING_API_URL'),
      responseStatus: embeddingResponse.status,
      responseOk: embeddingResponse.ok,
    });

    if (!embeddingResponse.ok) {
      console.error('[SEMANTIC SEARCH ERROR] Embedding API failed', {
        status: embeddingResponse.status,
        statusText: embeddingResponse.statusText,
      });
      // Fall back to keyword search
      return this.searchFood(searchDto); // or searchEcom
    }

    const embeddingData = await embeddingResponse.json();
    console.log('[SEMANTIC SEARCH DEBUG] Got embeddings', {
      embeddingsCount: embeddingData.embeddings?.length,
      vectorLength: embeddingData.embeddings?.[0]?.length,
    });

    const queryVector = embeddingData.embeddings[0];
    
    // ... rest of method
  } catch (error) {
    console.error('[SEMANTIC SEARCH ERROR] Exception thrown', {
      error: error.message,
      stack: error.stack,
    });
    // Fall back
    return this.searchFood(searchDto);
  }
}
```

**Step 2: Test with Logging**

```bash
# Restart API
pkill -f "node.*search-api" && sleep 2
cd /home/ubuntu/Devs/Search
nohup node dist/search-api/src/main.js > /tmp/search-api.log 2>&1 &

# Test semantic search
curl 'http://localhost:3100/search/semantic/food?q=biryani&size=3'

# Check logs
tail -50 /tmp/search-api.log | grep SEMANTIC
```

**Expected findings:**
- EMBEDDING_API_URL might be undefined
- Embedding API might be returning errors
- Query vector might be malformed
- OpenSearch KNN query might be failing

**Do you want me to add this debug logging now?**

---

### Likely Root Causes

1. **ConfigService not loading .env properly**
   ```typescript
   // Check if EMBEDDING_API_URL is being read
   console.log('ENV Check:', {
     embeddingUrl: process.env.EMBEDDING_API_URL,
     fromConfig: this.configService.get('EMBEDDING_API_URL'),
   });
   ```

2. **Food vs Ecom index mismatch**
   - Ecom works, food doesn't → Different index configuration?
   - Check if food_items_v3 has different mapping than ecom_items_v3

3. **Vector field name mismatch**
   ```bash
   # Verify field name in index
   curl -sS 'http://localhost:9200/food_items_v3/_mapping' | jq '.food_items_v3.mappings.properties.item_vector'
   curl -sS 'http://localhost:9200/ecom_items_v3/_mapping' | jq '.ecom_items_v3.mappings.properties.item_vector'
   ```

---

## Priority 4: Boost Relevance for Better Results (1 hour)

### Issue: Pet Food Dominates "Biscuit" Query

**Current results:**
```
Query: "biscuit"
Results: [Dog biscuit, Cat biscuit, Dog biscuit, Human biscuit, Cat biscuit]
```

**Expected:** Human biscuits should come first

### Solution: Category Boosting

**Code change in `search.service.ts`:**

```typescript
// In searchEcom() method, modify query to add boost

const query = {
  bool: {
    must: [
      {
        multi_match: {
          query: searchDto.q,
          fields: [
            'name^3',
            'title^2', 
            'description',
            'brand',
            'category_name^2',
          ],
        },
      },
    ],
    should: [
      // Boost human food categories
      {
        terms: {
          category_name: [
            'Biscuits & Cookies',
            'Snacks & Namkeen', 
            'Bakery',
            'Breakfast & Cereals',
          ],
          boost: 3.0,
        },
      },
      // De-boost pet categories
      {
        terms: {
          category_name: ['Dog Food', 'Cat Food', 'Pet Care'],
          boost: 0.3,
        },
      },
    ],
    filter: [
      // existing filters
    ],
  },
};
```

**Alternative: Category Detection**

```typescript
// Detect if query is likely pet-related
private isPetQuery(query: string): boolean {
  const petKeywords = ['dog', 'cat', 'puppy', 'kitten', 'pet'];
  return petKeywords.some(kw => query.toLowerCase().includes(kw));
}

// In searchEcom():
const isPet = this.isPetQuery(searchDto.q);
if (!isPet) {
  // Add filter to exclude pet categories for non-pet queries
  query.bool.must_not = [
    { terms: { category_name: ['Dog Food', 'Cat Food', 'Pet Care'] } }
  ];
}
```

**Do you want me to implement category boosting?**

---

## Quick Win: Improve "Milk" Query Results

### Current Issue
Query "milk" returns milk-containing products (masala, dog food) instead of primary milk products.

### Solution 1: Check Inventory
```bash
# See all milk products
curl -sS 'http://localhost:9200/ecom_items_v3/_search' \
  -H 'Content-Type: application/json' -d '{
  "size": 20,
  "query": {
    "bool": {
      "should": [
        {"match": {"name": "milk"}},
        {"match": {"category_name": "Dairy"}}
      ]
    }
  },
  "_source": ["name", "category_name", "brand", "price"]
}' | jq '.hits.hits[]._source'
```

### Solution 2: Boost Exact Matches
```typescript
// In searchEcom() multi_match query
{
  multi_match: {
    query: searchDto.q,
    fields: ['name^3', 'title^2', 'description', 'brand', 'category_name^2'],
    type: 'best_fields', // Add this - prioritizes documents matching in a single field
    tie_breaker: 0.3,
  },
}
```

### Solution 3: Boost by Category for Dairy Queries
```typescript
// Detect dairy queries
const dairyKeywords = ['milk', 'curd', 'yogurt', 'paneer', 'cheese', 'butter'];
const isDairyQuery = dairyKeywords.some(kw => searchDto.q.toLowerCase().includes(kw));

if (isDairyQuery) {
  query.bool.should.push({
    term: { category_name: 'Dairy', boost: 2.0 }
  });
}
```

---

## Testing Checklist

After implementing fixes, test these queries:

### Food Queries
- [ ] `biryani` - Should return biryani dishes
- [ ] `pizza` - Should return pizza dishes  
- [ ] `dosa` - Should return dosa varieties
- [ ] `butter chicken` - Should return chicken dishes
- [ ] `ice cream` - Should return ice cream flavors
- [ ] `coffee` - Should return beverages

### Ecom Queries
- [ ] `milk` - Should return dairy milk products first
- [ ] `biscuit` - Should return human biscuits first (not pet food)
- [ ] `diaper` - Should return baby diapers
- [ ] `curd` - Should return yogurt/dahi products (after synonym fix)
- [ ] `detergent` - Should return cleaning products (after inventory fix)

### Edge Cases
- [ ] `biriyani` (typo) - Should fuzzy match to biryani
- [ ] `paneer` - Should work without synonyms
- [ ] `dahi` - Should work with synonyms (maps to curd/yogurt)

---

## Decision Points - Please Review

### Decision 1: Synonym Implementation
**Question:** Use runtime synonym expansion (quick, no reindex) or index-level synonyms (proper, needs reindex)?

**My recommendation:** Start with runtime expansion (Priority 2, Option 1) for immediate fix, then schedule reindex with proper analyzer.

**Your choice:** Option 1 / Option 2 / Both (quick fix now, proper fix later)

---

### Decision 2: Debug Semantic Search Now?
**Question:** Should we add debug logging and investigate semantic search fallback?

**Context:** Keyword search is working well (85% relevance), so semantic search is not critical immediately.

**My recommendation:** Fix data quality and synonyms first (higher user impact), then debug semantic search.

**Your choice:** Debug now / After data fixes / Low priority

---

### Decision 3: Category Boosting
**Question:** Implement category boosting for better relevance (biscuit, milk queries)?

**My recommendation:** Yes - Quick win, 1 hour work, immediate improvement.

**Your choice:** Implement / Skip / After other fixes

---

### Decision 4: ML Training Consideration
**Question:** Do you want to explore ML model training/fine-tuning?

**Context:** Current issues are NOT model-related (data quality, synonyms, config bugs). Training won't help until those are fixed.

**My recommendation:** **NO TRAINING YET** - Fix infrastructure first, reassess in 2 weeks.

**Your choice:** Agree (no training) / Want to explore / Revisit later

---

## What Would You Like Me to Do Next?

Please choose option(s):

1. ✅ **Add runtime synonym expansion** (1 hour) - Quick fix for "curd", "brinjal" queries
2. 🔍 **Run data quality audit queries** (15 min) - Check missing price/brand/inventory
3. 🐛 **Add debug logging for semantic search** (30 min) - Find why it's falling back  
4. 🎯 **Implement category boosting** (1 hour) - Fix "biscuit", "milk" result ordering
5. 📊 **Generate detailed analytics report** (30 min) - Query patterns, popular searches
6. 📚 **Create index-level synonym mapping** (2 hours) - Proper solution with reindex
7. ⚙️ **Other** - Tell me what you'd like to focus on

**Just reply with the numbers you want me to work on** (e.g., "1 and 4" or "Let's do 2 first")

---

## Summary

✅ **Good news:** Your search is working well! 85% relevance is solid.  
🔴 **Main issues:** Data quality (missing info) and missing synonyms  
🟡 **Medium issue:** Semantic search integration bug (not blocking users)  
🟢 **Training:** Not needed - fix data/config first  

**Estimated time to fix high-priority issues:** 4-5 hours  
**Expected improvement:** 85% → 95% relevance

Ready when you are! 🚀
