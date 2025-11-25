# Search Ranking Improvements

## Changes Implemented

### 1. Item Search Priority
**Priority Order:**
1. **Item name matches** - Items with matching keywords in their name/description
2. **Store name matches** - Items from stores with matching keywords in store name
3. **Distance** - Sort by proximity (if geo coordinates provided)

**Implementation:**
- Modified `searchItemsByModule()` in `search.service.ts`
- Performs two searches:
  - Primary: Items matching query in item name/description
  - Secondary: Stores matching query, then their items
- Combines results with proper priority sorting
- Distance is used as tertiary sort criteria

### 2. Store Search Priority
**Priority Order:**
1. **Store name matches** - Stores with matching keywords in their name
2. **Item name matches** - Stores that have items with matching keywords
3. **Distance** - Sort by proximity (if geo coordinates provided)

**Implementation:**
- Modified store search in `search.service.ts`
- Enhanced existing multi-source search logic
- Properly prioritizes store name matches over item matches
- Distance is used as tertiary sort criteria

## Code Changes

### Item Search (`searchItemsByModule`)
- Added `matchType` field to track match source ('item_name', 'store_name', 'none')
- Enhanced sorting logic with three-tier priority:
  1. Match type (item_name > store_name)
  2. Relevance score
  3. Distance (if geo available)

### Store Search
- Updated match type priority: name > item > category
- Added distance calculation and sorting
- Maintains existing multi-source search (name, category, items)

## Testing

Test the improvements with:
```bash
# Item search - should show items with "spicy tadka" in name first, then items from stores with "spicy tadka" in name
curl "https://search.test.mangwale.ai/v2/search/items?q=spicy+tadka&module_id=4&size=10"

# Store search - should show stores with "spicy tadka" in name first, then stores with items matching "spicy tadka"
curl "https://search.test.mangwale.ai/v2/search/stores?q=spicy+tadka&module_id=4&size=10"
```

## Future Enhancements

See `SEARCH_ENHANCEMENT_SUGGESTIONS.md` for detailed recommendations.

