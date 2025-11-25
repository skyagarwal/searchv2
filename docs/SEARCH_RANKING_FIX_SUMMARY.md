# Search Ranking Fix - Summary

## Problem
When searching for items/stores, results were not properly prioritized. For example, searching "spicy tadka" would show items from unrelated stores first instead of:
1. Items with matching keywords first
2. Items from stores with matching keywords second
3. Then sorted by distance

## Solution Implemented

### Item Search (`searchItemsByModule`)
**New Priority Order:**
1. **Item name matches** - Items where the query matches the item name/description
2. **Store name matches** - Items from stores where the query matches the store name
3. **Distance** - Sort by proximity (if geo coordinates provided)

**Implementation:**
- Performs two separate searches:
  - Primary search: Items matching query in item fields
  - Secondary search: Stores matching query, then their items
- Combines results with `matchType` field ('item_name', 'store_name', 'none')
- Sorts by: match type priority → relevance score → distance

### Store Search
**New Priority Order:**
1. **Store name matches** - Stores where the query matches the store name
2. **Item name matches** - Stores that have items matching the query
3. **Distance** - Sort by proximity (if geo coordinates provided)

**Implementation:**
- Enhanced existing multi-source search
- Updated match type priority: name > item > category
- Added distance calculation and sorting
- Maintains proper priority in sorting logic

## Code Changes

### Files Modified
- `apps/search-api/src/search/search.service.ts`
  - `searchItemsByModule()` - Lines ~4003-4200
  - Store search function - Lines ~2340-2400

### Key Changes
1. Added `matchType` tracking for items
2. Enhanced sorting with three-tier priority
3. Added store name search for items
4. Improved distance-based sorting

## Testing

### Test Queries
```bash
# Item search - should prioritize items with "spicy tadka" in name
curl "https://search.test.mangwale.ai/v2/search/items?q=spicy+tadka&module_id=4&size=10"

# Store search - should prioritize stores with "spicy tadka" in name
curl "https://search.test.mangwale.ai/v2/search/stores?q=spicy+tadka&module_id=4&size=10"
```

### Expected Behavior
- Items with exact name matches appear first
- Items from stores with matching names appear second
- Results within same priority level sorted by distance (if geo provided)
- Fallback to popularity/rating if no geo

## Status

✅ **Code Changes**: Complete
✅ **Build**: Successful
🔄 **Deployment**: In progress (container connectivity issues being resolved)
⏳ **Testing**: Pending full deployment

## Next Steps

1. Resolve OpenSearch connectivity (container networking)
2. Test with real queries
3. Monitor performance
4. Gather user feedback
5. Iterate based on results

## Notes

- Redis connection errors are non-critical (caching disabled)
- OpenSearch connectivity needs to be verified
- Distance sorting only works when lat/lon provided
- Match type field is for internal sorting, not exposed in API response

