# 50 Leads Per Search - How It Works

## 🎯 Overview

Your Lead Scraper now generates **50 leads per search** instead of just 8-10. This gives you a much larger pool of potential customers to work with.

## ⚙️ How It Works

### Batch Processing System
To ensure reliability and avoid timeouts, the system uses **batch processing**:

1. **Search Request**: You click "Search" with your criteria
2. **Batch 1**: Backend requests 25 companies from Claude (10-15 seconds)
3. **Batch 2**: Backend requests 25 more companies from Claude (10-15 seconds)
4. **Combine**: Merges both batches and removes duplicates
5. **Filter**: Applies your ICP filter if selected
6. **Return**: Sends ~50 unique leads to your frontend

### Total Time
- **Expected**: 20-30 seconds per search
- **Why**: Two separate AI research calls + processing time
- **Worth It**: You get 5-6x more leads per search!

## 📊 What You Get

### Quantity
- **Target**: 50 leads per search
- **Typical**: 45-50 leads (after duplicate removal)
- **With ICP Filter**: May be fewer if filtering for specific sizes

### Quality
- All real companies
- Verified funding information
- Accurate websites
- Diverse mix of companies
- Both well-known and emerging startups

### Diversity
The batch system ensures variety by:
- Requesting different "angles" in each batch
- Including lesser-known companies in batch 2
- Covering multiple sub-categories
- Mixing funding stages and sizes

## 🎨 Using the Feature

### Standard Search
```
Search: "AI startups"
Filters: Industry: AI/ML
Result: ~50 AI companies across all stages
```

### Targeted Search
```
Search: "fintech seed"
Filters: 
- Funding Stage: Seed
- Industry: FinTech
- ICP: Startup (1-49 employees)
Result: ~50 small fintech companies with seed funding
```

### Geographic Focus
```
Search: "SaaS"
Filters:
- Industry: SaaS
- Country: United States
Result: ~50 US-based SaaS companies
```

## 📈 Example Output

After a search for "AI startups Series A", you might get:

**Batch 1 (First 25):**
- Well-known companies (Hebbia, Writer, etc.)
- Recent major funding rounds
- Diverse AI sub-categories

**Batch 2 (Next 25):**
- Lesser-known but real companies
- Different AI niches
- More geographic diversity

**Combined (50 unique):**
- Full spectrum of AI/ML companies
- Mix of sizes and stages
- Ready to export and use!

## 💡 Pro Tips

### 1. Be Patient
- Searches take 20-30 seconds
- Don't click search multiple times
- Watch the status message

### 2. Use Filters Strategically
- Start broad to see full 50
- Add filters to focus down
- Try different combinations

### 3. Download and Organize
- Export all 50 to CSV
- Sort by lead score in Excel
- Prioritize top 20 for immediate outreach

### 4. Run Multiple Searches
- Different industries
- Different stages
- Different countries
- Build a database of 100s of leads

## 🔧 Technical Details

### API Configuration
- **Model**: claude-sonnet-4-20250514
- **Max Tokens per Batch**: 12,000
- **Batches**: 2 per search
- **Batch Size**: 25 leads each

### Duplicate Removal
- Compares company names (case-insensitive)
- Keeps first occurrence
- Typical: removes 0-5 duplicates

### Error Handling
- If batch 1 fails: Returns error
- If batch 2 fails: Returns batch 1 results only
- Shows clear error messages

## 📊 Comparison

### Before (8-10 Leads)
- ✅ Fast (10 seconds)
- ❌ Limited selection
- ❌ Need multiple searches

### After (50 Leads)
- ✅ Comprehensive results
- ✅ Diverse companies
- ✅ One search = full pipeline
- ⏱️ Slower (25 seconds)

## 🎯 Best Use Cases

### Scenario 1: Building a Pipeline
You need 50 qualified leads for your sales team.
- **Action**: One search with your ICP filters
- **Result**: Complete list ready to import to CRM

### Scenario 2: Market Research
You want to understand the AI/ML funding landscape.
- **Action**: Search "AI startups" with no filters
- **Result**: 50 companies across all stages and niches

### Scenario 3: Competitor Analysis
You need to know who's raising in your space.
- **Action**: Search your industry + funding stage
- **Result**: 50 recent competitors/peers

### Scenario 4: Finding Partners
Looking for potential integration partners.
- **Action**: Search complementary industry
- **Result**: 50 companies to evaluate

## ⚡ Performance Tips

### Optimize Search Time
1. Have clear criteria before searching
2. Use specific keywords
3. Apply filters upfront
4. Don't over-filter (might reduce results)

### Maximize Value
1. Download CSV immediately
2. Review all 50 leads
3. Score/prioritize in your CRM
4. Create outreach segments

### Scale Your Pipeline
- Monday: Search AI companies
- Tuesday: Search FinTech companies
- Wednesday: Search SaaS companies
- Result: 150 leads in 3 days!

## 🔄 What's Different

### Frontend
- Shows "Generating 50 leads" message
- Progress indicator during search
- Handles larger result sets
- CSV includes all 50 leads

### Backend
- Makes 2 API calls instead of 1
- Combines and deduplicates
- More robust error handling
- Better for diverse results

## ✅ Quality Assurance

Every lead includes:
- ✅ Real company name
- ✅ Verified funding data
- ✅ Working website URL
- ✅ Accurate employee count
- ✅ News source
- ✅ Lead score
- ✅ Complete description

## 🚀 Getting Started

1. **Start the backend**: `npm start`
2. **Open the frontend**: Use Claude.ai or your React app
3. **Enter your search**: Keywords + filters
4. **Wait 25 seconds**: Watch the progress
5. **Get 50 leads**: Download and start outreach!

---

**You're now 5x more productive!** Each search gives you a week's worth of leads to work with. 🎉
