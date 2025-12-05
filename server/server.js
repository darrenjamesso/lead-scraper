// Backend Server for Lead Scraper
// Run with: node server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

// Function to extract root domain from URL
function cleanWebsiteUrl(url) {
  if (!url || url === 'N/A' || url === '') {
    return 'N/A';
  }

  try {
    // Remove protocol (http://, https://)
    let cleaned = url.replace(/^https?:\/\//i, '');

    // Remove www.
    cleaned = cleaned.replace(/^www\./i, '');

    // Remove everything after the first slash (paths, query params, etc.)
    cleaned = cleaned.split('/')[0];

    // Remove query params and hash fragments (in case there's no slash)
    cleaned = cleaned.split('?')[0].split('#')[0];

    // Remove any trailing dots
    cleaned = cleaned.replace(/\.+$/, '');

    // Final validation - must look like a domain
    const domainPattern = /^[a-z0-9-]+\.[a-z]{2,}$/i;
    if (!domainPattern.test(cleaned)) {
      console.log(`⚠️ cleanWebsiteUrl: Could not extract valid domain from "${url}"`);
      return 'N/A';
    }

    return cleaned;
  } catch (error) {
    console.error(`Error cleaning URL "${url}":`, error.message);
    return 'N/A';
  }
}

// Website validation function - REJECTS URLs with paths, protocols, www
function isValidWebsite(website) {
  if (!website || website === 'N/A') {
    return true; // N/A is acceptable
  }

  // REJECT if contains protocol (http://, https://)
  if (website.match(/^https?:\/\//i)) {
    console.log(`⚠️ REJECTED: Website contains protocol: ${website}`);
    return false;
  }

  // REJECT if contains www.
  if (website.match(/^www\./i)) {
    console.log(`⚠️ REJECTED: Website contains www.: ${website}`);
    return false;
  }

  // REJECT if contains path separator (/)
  if (website.includes('/')) {
    console.log(`⚠️ REJECTED: Website contains path: ${website}`);
    return false;
  }

  // REJECT if contains query params or fragments (?, #)
  if (website.includes('?') || website.includes('#')) {
    console.log(`⚠️ REJECTED: Website contains query/fragment: ${website}`);
    return false;
  }

  // List of SOURCE domains that should NEVER be in website field
  const sourceDomains = [
    // Placeholder/test domains
    'example.com',
    'company.com',
    'startup.com',
    'business.com',
    'test.com',
    'demo.com',
    'placeholder.com',

    // News sites
    'techcrunch.com',
    'bloomberg.com',
    'forbes.com',
    'venturebeat.com',
    'theverge.com',
    'wired.com',
    'reuters.com',
    'wsj.com',
    'ft.com',
    'theinformation.com',
    'techmeme.com',
    'businessinsider.com',
    'cnbc.com',
    'techradar.com',

    // Databases/directories
    'crunchbase.com',
    'pitchbook.com',
    'producthunt.com',
    'ycombinator.com',
    'angellist.com',
    'wellfound.com',

    // Social media
    'linkedin.com',
    'twitter.com',
    'x.com',
    'facebook.com',
    'instagram.com',
    'youtube.com',
    'tiktok.com',

    // Blog platforms (CRITICAL - these are article/blog sites, not company homepages)
    'medium.com',
    'substack.com',
    'wordpress.com',
    'blogger.com',
    'tumblr.com',
    'ghost.io',
    'notion.site',
    'hashnode.com',
    'dev.to',

    // Additional source sites (often confused with company websites)
    'mashed.com',
    'thetakeout.com',
    'wikipedia.org',
    'autoevolution.com',
    'eatthis.com',
    'tastingtable.com',
    'delish.com',
    'eater.com'
  ];

  // Check if it's a news/profile/source site
  const websiteLower = website.toLowerCase();
  for (const sourceDomain of sourceDomains) {
    if (websiteLower.includes(sourceDomain)) {
      console.log(`⚠️ REJECTED: SOURCE DOMAIN in website field: ${website} (contains ${sourceDomain})`);
      return false;
    }
  }

  // Must look like a real domain (basic check)
  const domainPattern = /^[a-z0-9-]+\.[a-z]{2,}$/i;
  if (!domainPattern.test(website)) {
    console.log(`⚠️ REJECTED: Invalid domain format: ${website}`);
    return false;
  }

  return true;
}

// Function to clean and validate websites
function validateAndFixWebsites(leads) {
  console.log('\n🌐 WEBSITE CLEANING & VALIDATION:');

  return leads.map(lead => {
    const originalWebsite = lead.website;

    // STEP 1: Clean the URL (strip protocols, paths, www)
    if (lead.website && lead.website !== 'N/A') {
      const cleaned = cleanWebsiteUrl(lead.website);

      if (cleaned !== lead.website) {
        console.log(`  🧹 CLEANED: ${lead.companyName}`);
        console.log(`     BEFORE: "${lead.website}"`);
        console.log(`     AFTER:  "${cleaned}"`);
        lead.website = cleaned;
      }
    }

    // STEP 2: Validate the cleaned website
    if (!lead.website || lead.website === 'N/A') {
      console.log(`  ${lead.companyName}: No website (N/A)`);
      return lead;
    }

    if (!isValidWebsite(lead.website)) {
      console.log(`  ⚠️ REJECTED: ${lead.companyName}`);
      console.log(`     Invalid website: "${lead.website}"`);
      console.log(`     Setting to: "N/A"`);
      lead.website = 'N/A';
    } else {
      console.log(`  ✓ VALID: ${lead.companyName} → ${lead.website}`);
    }

    return lead;
  });
}

// Main endpoint to search for leads
app.post('/api/search-leads', async (req, res) => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 BACKEND: Received search request');
    console.log('  Raw searchQuery:', req.body.searchQuery);
    console.log('  Raw filters:', JSON.stringify(req.body.filters, null, 2));
    console.log('='.repeat(80));

    const { searchQuery, filters } = req.body;

    console.log('\n⏱️  [0s] Search started');
    const searchStartTime = Date.now();

    console.log('\n📝 EXTRACTED VALUES:');
    console.log('  searchQuery:', searchQuery);
    console.log('  filters.icp:', filters.icp);
    console.log('  filters.fundingStage:', filters.fundingStage);
    console.log('  filters.industry:', filters.industry);
    console.log('  filters.country:', filters.country);

    // Don't add any default - use exactly what user typed
    if (!searchQuery || searchQuery.trim() === '') {
      return res.json({
        success: false,
        error: 'Please enter a search query',
        leads: []
      });
    }

    let enhancedQuery = searchQuery.trim();

    // Only add funding-related terms if user is searching for funding
    const fundingKeywords = ['funded', 'funding', 'raised', 'investment', 'series', 'seed', 'venture', 'capital'];
    const isSearchingForFunding = fundingKeywords.some(keyword =>
      searchQuery.toLowerCase().includes(keyword)
    ) || filters.fundingStage;

    // Only add startup terms if user mentions startups
    const startupKeywords = ['startup', 'startups'];
    const isSearchingForStartups = startupKeywords.some(keyword =>
      searchQuery.toLowerCase().includes(keyword)
    );

    // Build query based on what user is actually searching for
    if (filters.industry) {
      enhancedQuery += ` ${filters.industry}`;
    }

    if (filters.country) {
      enhancedQuery += ` in ${filters.country}`;
    }

    // Only add funding terms if relevant
    if (isSearchingForFunding) {
      if (filters.fundingStage) {
        enhancedQuery += ` ${filters.fundingStage}`;
      }
      enhancedQuery += ' funding investment raised capital 2024 2025';
    }

    // Only add startup terms if user mentioned startups
    if (isSearchingForStartups) {
      enhancedQuery += ' startup entrepreneurship';
    }

    // For general searches, keep it clean and generic
    // Don't add ANY automatic terms

    console.log('\n🔧 QUERY ENHANCEMENT:');
    console.log('  Original query:', searchQuery);
    console.log('  Enhanced query:', enhancedQuery);
    console.log('  isSearchingForFunding:', isSearchingForFunding);
    console.log('  isSearchingForStartups:', isSearchingForStartups);
    console.log('  Length change:', enhancedQuery.length - searchQuery.length, 'chars');

    console.log('\n=== SEARCH DEBUG ===');
    console.log('User query:', searchQuery);
    console.log('Filters:', JSON.stringify(filters, null, 2));
    console.log('Enhanced query:', enhancedQuery);
    console.log('Is funding search?:', isSearchingForFunding);
    console.log('Is startup search?:', isSearchingForStartups);
    console.log('==================\n');
    console.log('Generating 50 leads in batches...');

    // Generate leads in batches for progressive loading
    const batchSize = 10;  // Smaller batches for progressive updates
    const numBatches = 5;  // More batches = more frequent updates
    const allLeads = [];

    // Helper function to perform Tavily search
    const performSearch = async (query) => {
      try {
        console.log(`Searching Tavily for: ${query}`);
        const response = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            api_key: TAVILY_API_KEY,
            query: query,
            search_depth: "advanced",
            include_answer: true,
            max_results: 10
          })
        });

        if (!response.ok) {
          throw new Error(`Tavily API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Tavily search failed:', error);
        return null;
      }
    };

    // PARALLEL BATCH PROCESSING - Execute all batches simultaneously
    console.log(`⏱️  [${((Date.now() - searchStartTime) / 1000).toFixed(1)}s] Starting batch calls...`);
    const startTime = Date.now();
    console.log(`🚀 Starting ${numBatches} batch${numBatches > 1 ? 'es' : ''} IN PARALLEL for maximum speed...`);

    // Create a function to process a single batch
    const processBatch = async (batchIndex) => {
      const batchNum = batchIndex + 1;
      console.log(`Batch ${batchNum}/${numBatches} starting...`);

      try {
        // Perform web search first
        const searchResults = await performSearch(enhancedQuery);
        const searchContext = searchResults ? JSON.stringify(searchResults.results) : "No search results available.";

        console.log(`Batch ${batchNum}: Got ${searchResults?.results?.length || 0} search results from Tavily`);
        if (searchResults?.results?.length > 0) {
          console.log(`Batch ${batchNum} sample:`, searchResults.results[0].title);
        }
        console.log(`Batch ${batchNum}: Asking Claude to extract leads...`);

        console.log('\n🤖 CALLING CLAUDE API:');
        console.log('  Model: claude-sonnet-4-20250514');
        console.log('  Max tokens: 6000');
        console.log('  Search query being used:', enhancedQuery);
        console.log('  Search context length:', searchContext.length, 'chars');

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 12000,  // Need enough tokens for complete JSON with 50 leads
            messages: [
              {
                role: 'user',
                content: `════════════════════════════════════════════════════════════════════════════════
⚠️  CRITICAL REMINDER ⚠️

website = COMPANY'S WEBSITE (where THEY live) - ROOT DOMAIN ONLY!
  ✅ CORRECT: "openai.com", "stripe.com", "acme-ai.com"
  ❌ WRONG: "https://openai.com", "www.stripe.com", "acme-ai.com/about"

source = WHERE YOU FOUND THEM (article/database)
  Example: "TechCrunch", "Crunchbase", "Bloomberg"

DOMAIN-ONLY FORMATTING RULES:
✅ DO: Use just the root domain (e.g., "company.com")
❌ DON'T: Include protocols (http://, https://)
❌ DON'T: Include www. prefix
❌ DON'T: Include paths (/blog, /about, /news/article)
❌ DON'T: Include query params (?id=123)

NEVER put "techcrunch.com" in the website field!
NEVER put "crunchbase.com" in the website field!
NEVER put article URLs in the website field!

The website field is for THE COMPANY'S ROOT DOMAIN ONLY!
════════════════════════════════════════════════════════════════════════════════

You are a sales lead researcher finding relevant companies based on search criteria.

Your job is to find companies that match what the user is looking for, which may include:
- Recently funded companies (if user asks for funding)
- Companies of any age (new startups to established businesses)
- Companies in specific industries
- Companies in specific locations
- Companies matching specific criteria (size, type, stage)

DO NOT require that companies have recent funding unless the user specifically asks for it.

**UNDERSTANDING BUSINESS SIGNALS:**

A "signal" is any indicator that a company is active, growing, or potentially a good lead.

**Signal Types You Can Search For:**

1. FUNDING: Raised capital, announced funding round
2. HIRING: Actively hiring, job postings, recruiting
3. PRODUCT: Launched product/feature, Product Hunt
4. EXPANSION: New office/location, entered new market
5. PARTNERSHIP: Strategic partnerships, integrations
6. PRESS: Featured in publications, won awards
7. ACQUISITION: Acquired/acquired by another company
8. REGULATORY: SEC filings (Form D, Reg D), IPO prep

**REGULATORY FILING SIGNALS - WHAT THEY ARE:**

Regulatory filings are LEGAL DOCUMENTS companies must file when raising money or going public. They are PUBLIC RECORDS and extremely reliable lead sources.

**Key Filing Types:**

**Form D (Reg D):**
  - Filed when companies raise money through private placement
  - Shows: company name, amount raised, date filed, industry, location
  - Filed within 15 days of first sale of securities
  - HIGHLY VALUABLE: Shows companies actively raising capital
  - Source: SEC EDGAR database (sec.gov)

**Form S-1 (IPO Filing):**
  - Filed when company plans to go public
  - Indicates: Major liquidity event, institutional investors
  - Less common but extremely valuable

**Form 8-K:**
  - Filed for major corporate events
  - Includes: Acquisitions, leadership changes, material agreements
  - Can indicate significant changes

**WHY REGULATORY FILINGS ARE VALUABLE:**

✅ 100% Verified Data:
  - Legal requirement to file
  - Information is accurate (legal penalties for false info)
  - No "fake" filings

✅ Time-Sensitive:
  - Filed immediately after raising capital
  - Often BEFORE press releases
  - Get leads before competition

✅ Complete Information:
  - Company name, address, industry
  - Amount raised (exact figure)
  - Date of first sale
  - Sometimes: Use of proceeds

✅ Actionable:
  - Companies just raised money = have budget
  - Perfect timing for sales outreach
  - High conversion potential

**Signal Keywords Reference:**
- FUNDING: "funded", "funding", "raised", "investment", "Series A/B/C", "seed", "venture", "VC"
- HIRING: "hiring", "recruiting", "jobs", "careers", "job opening", "seeking", "we're hiring"
- PRODUCT: "launched", "launch", "released", "new product", "announced", "beta", "unveiled"
- EXPANSION: "expansion", "expanding", "new office", "new location", "entered market", "opened"
- PARTNERSHIP: "partnership", "partnered", "collaboration", "integration", "alliance", "deal"
- PRESS: "featured in", "covered by", "award", "recognition", "interview", "mentioned"
- ACQUISITION: "acquired", "acquisition", "merger", "bought", "purchased", "M&A"
- REGULATORY: "filed", "Form D", "Reg D", "SEC", "IPO", "S-1"

**DEFAULT BEHAVIOR:**
- Funding search → Require FUNDING signal
- Hiring search → Require HIRING signal
- Product search → Require PRODUCT signal
- General search → ANY signal or NO signal required

**UNDERSTANDING THE SEARCH REQUEST:**

BEFORE you start searching, determine:

1. What signal type is the user looking for?

   FUNDING: "funded", "funding", "raised", "investment"
   → Example: "recently funded AI companies"

   HIRING: "hiring", "recruiting", "jobs", "careers"
   → Example: "companies hiring AI engineers"

   PRODUCT: "launched", "launch", "released", "new product"
   → Example: "companies that launched products last month"

   EXPANSION: "expansion", "new office", "expanding to"
   → Example: "companies expanding to Europe"

   PARTNERSHIP: "partnership", "partnered", "collaboration"
   → Example: "companies that partnered with Salesforce"

   PRESS: "featured in", "award", "recognition"
   → Example: "companies featured in TechCrunch"

   ACQUISITION: "acquired", "acquisition", "merger"
   → Example: "companies that made acquisitions"

   REGULATORY: "filed", "Reg D", "Form D", "SEC filing"
   → Example: "Reg D filings last 48 hours"

   NO SIGNAL (general): Just industry/location, no signal keywords
   → Example: "AI companies", "restaurants"
   → Action: Find companies regardless of signal

**MULTI-SIGNAL QUERY EXAMPLES:**

Example 1: "AI companies that are hiring"
- Primary signal: HIRING
- Industry: AI/ML
- Search for: AI companies + active job postings
- Output: signalType "hiring", signalData with jobCount, departments, seniority
- Also include: Industry "AI/ML", employeeCount, foundedYear

Example 2: "SaaS companies that launched on Product Hunt"
- Primary signal: PRODUCT_LAUNCH
- Industry: SaaS
- Search for: SaaS companies + Product Hunt launches
- Output: signalType "product_launch", signalData with productName, platform, reception
- Also include: Industry "SaaS", Product Hunt upvotes, launch reception

Example 3: "Fintech partnerships announced this week"
- Primary signal: PARTNERSHIP
- Industry: FinTech
- Timeframe: 7d
- Search for: Fintech companies + partnership announcements + last 7 days
- Output: signalType "partnership", signalData with partner, type, scope, value

Example 4: "Form D filings in last 48 hours"
- Primary signal: REGULATORY_FILING
- Timeframe: 48h
- Search for: SEC Form D filings + dates after ${new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().split('T')[0]}
- Output: signalType "regulatory_filing", signalData with filingType, amount, regType, agency

Example 5: "Restaurant expansions in California"
- Primary signal: EXPANSION
- Industry: Restaurant/Food
- Location: California
- Search for: Restaurant chains + new locations in CA + expansion news
- Output: signalType "expansion", signalData with type "geographic expansion", details, market, scale

Example 6: "Tech acquisitions last 30 days"
- Primary signal: ACQUISITION
- Industry: Technology
- Timeframe: 30d
- Search for: M&A announcements + tech companies + dates after ${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
- Output: signalType "acquisition", signalData with type, target, value, reason

Example 7: "SaaS companies in NYC that are hiring engineers"
- Primary signal: HIRING
- Industry: SaaS
- Location: New York City
- Job type: Engineering
- Search for: SaaS + NYC + engineering job postings
- Output: signalType "hiring", departments ["Engineering"], specific to NYC locations

Example 8: "Healthcare startups that raised Series A"
- Primary signal: FUNDING
- Industry: Healthcare
- Funding stage: Series A
- Search for: Healthcare companies + Series A announcements
- Output: signalType "funding", signalData with stage "Series A", amount, investors

**REGULATORY FILING QUERY EXAMPLES:**

Example 9: "Reg D filings last 48 hours"
- Primary signal: REGULATORY
- Timeframe: 48h
- Search for: All Form D filings from last 2 days
- Cutoff date: ${new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().split('T')[0]}
- Output: signalType "regulatory_filing" with complete filing details
- Must include: filingDate, offeringAmount, company location

Example 10: "Form D filings last week"
- Primary signal: REGULATORY
- Timeframe: 7d
- Search for: All Form D filings from past 7 days
- Cutoff date: ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
- Output: signalType "regulatory_filing" with filing information
- Sort by: Most recent first

Example 11: "Recent SEC filings"
- Primary signal: REGULATORY
- Timeframe: 30d (default for "recent")
- Search for: Recent Form D and other SEC filings
- Cutoff date: ${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
- Output: Mix of Form D, S-1, 8-K filings
- Focus on: Form D (most common)

Example 12: "Companies that filed with SEC"
- Primary signal: REGULATORY
- Timeframe: Any recent filings
- Search for: Companies with recent SEC filings
- Output: All filing types (Form D, S-1, 8-K)
- Include: Filing date, type, amount if applicable

**ADVANCED FILING QUERY EXAMPLES:**

Example 13: "Reg D filings last 48 hours fintech over $5M"
- Timeframe: Last 48 hours (strict)
- Industry: FinTech
- Amount: ≥ $5M
- Result: Recent, large fintech filings
- ALL 3 criteria must be met

Example 14: "Form D healthcare California $10M+"
- Industry: Healthcare/Biotech
- Location: California
- Amount: ≥ $10M
- Result: Large CA healthcare filings

Example 15: "Small tech company Reg D filings last week"
- Industry: Technology
- Amount: Under $2M (implied by "small")
- Timeframe: Last 7 days
- Result: Recent small tech filings

Example 16: "New AI startups that filed Form D"
- Industry: AI/Machine Learning
- Age: New (0-2 years, founded 2023-2025)
- Signal: Form D filing
- Result: Recently founded AI companies with filings

Example 17: "Large private placements San Francisco"
- Amount: $20M+ (implied by "large")
- Location: San Francisco, CA
- Result: Substantial SF company filings

Example 18: "Recent Reg D filings SaaS companies over $3M"
- Timeframe: Last 30 days (implied by "recent")
- Industry: SaaS
- Amount: ≥ $3M
- Result: Recent, mid-to-large SaaS filings

**UNIVERSAL BUSINESS EXAMPLES (NON-STARTUP):**

Example 19: "Restaurants in NYC"
- NO signal required (general search)
- Industry: Restaurants/Food Service
- Location: New York City
- Search for: NYC restaurant companies
- Output: signalType "none", fundingStage "N/A", fundingAmount "N/A"
- Result: ANY NYC restaurants (established, new, chains, independent)

Example 20: "Manufacturing companies in Texas"
- NO funding required
- Industry: Manufacturing
- Location: Texas
- Search for: Texas manufacturers
- Output: signalType "none", funding fields "N/A"
- Result: ALL types of manufacturers (small, large, old, new)

Example 21: "Plumbing businesses California"
- NO startup bias
- Industry: Plumbing/HVAC/Trades
- Location: California
- Search for: CA plumbing companies
- Output: signalType "none", funding "N/A"
- Result: Traditional service businesses

Example 22: "Car dealerships expanding to new locations"
- Primary signal: EXPANSION
- Industry: Automotive/Retail
- Search for: Car dealer expansion news
- Output: signalType "expansion", funding "N/A"
- Result: Established dealerships opening new locations

Example 23: "Family-owned businesses over 50 years old"
- Age: Mature (founded before 1975)
- NO funding required (likely bootstrapped)
- Search for: Long-established family businesses
- Output: foundedYear before 1975, funding "N/A"
- Result: Multi-generational traditional businesses

2. Is this a funding-focused search? (already covered in #1 signal detection)
   Same as FUNDING signal above

3. Is this an industry/type search?
   Keywords: "AI companies", "restaurants", "SaaS", "retail stores"
   Action: Focus on finding companies in that industry, funding optional

3. Is this a location search?
   Keywords: "in NYC", "San Francisco", "United States", "Germany"
   Action: Focus on location matching, funding optional

4. Is this an age/stage search?
   Keywords: "established", "10+ years", "mature", "new"
   Action: Focus on company age, funding optional

5. What timeframe does the user want?

The user may specify a timeframe filter: ${filters.timeframe || 'Any Time'}

Possible values:
- "24h" = Last 24 hours only
- "48h" = Last 48 hours only
- "7d" = Last 7 days only
- "30d" = Last 30 days only
- "90d" = Last 90 days only
- "2024-2025" = Only from 2024 or 2025
- "2023" = Only from 2023
- "2022" = Only from 2022
- "2020-2023" = From 2020 to 2023
- "2015-2020" = From 2015 to 2020
- "before-2015" = Companies founded before 2015 (10+ years old)
- "" (empty) or "Any Time" = No time restriction

OR the user may include timeframe keywords in their search:
- "last 24 hours", "today" → 24h
- "last 48 hours", "last 2 days" → 48h
- "last week", "last 7 days" → 7d
- "last month", "last 30 days" → 30d
- "10+ years", "established", "mature" → before-2015
- No time keywords → Any Time

**Action based on timeframe:**

If "24h", "48h", "7d", "30d", "90d":
  → Find ONLY activity/announcements/events within that time window
  → Be very strict about dates
  → Current date for reference: ${new Date().toISOString().split('T')[0]}

If "2024-2025", "2023", "2022", or year ranges:
  → Find companies/activity from those specific years only
  → Exclude other years

If "before-2015":
  → Find companies founded before 2015
  → Look for established, mature businesses with 10+ year history
  → Do NOT require recent activity

If "Any Time" or empty:
  → NO time restrictions at all
  → Include companies of any age
  → Include activity from any date
  → Do not favor recent over old

**Timeframe Query Examples:**

Query: "Reg D filings last 48 hours"
Timeframe: Auto-detected as "48h"
→ Find ONLY companies that filed in the last 48 hours (after ${new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().split('T')[0]})

Query: "AI companies"
Timeframe: "Any Time"
→ Find AI companies regardless of age (could be from 1990s or 2024)

Query: "Recently funded startups"
Timeframe: Not specified, but "recently funded" implies 2024-2025
→ Find companies funded in 2024-2025

Query: "Established restaurants"
Timeframe: Auto-detected as "before-2015" (established = 10+ years)
→ Find restaurants founded before 2015

Query: "Product launches last week"
Timeframe: Auto-detected as "7d"
→ Find ONLY products launched in the last 7 days

Query: "Manufacturing companies"
Timeframe: "Any Time"
→ Find manufacturers of any age, any founding date

6. What company age/maturity does the user want?

The user may specify a company age filter: ${filters.companyAge || 'Any'}

Possible values:
- "new" = 0-2 years old (founded 2023-2025)
- "growing" = 3-5 years old (founded 2020-2022)
- "established" = 6-10 years old (founded 2015-2019)
- "mature" = 10+ years old (founded before 2015)
- "" (empty) or "Any" = No age restriction

OR the user may include age keywords in their search query:
- "new", "newly founded", "recent startup" → new (0-2 years)
- "growing", "emerging", "scale-up" → growing (3-5 years)
- "established", "proven", "stable" → established (6-10 years)
- "mature", "legacy", "veteran", "10+ years", "decades" → mature (10+ years)

**How to interpret company age:**

Company Age is about WHEN THE COMPANY WAS FOUNDED, not when they received funding.

A company founded in 2010 that raised Series A in 2024 is:
  → 14 years old = MATURE company
  → NOT a new startup

A company founded in 2024 is:
  → Less than 1 year old = NEW company
  → Even if they raised $50M

**Age Categories Reference:**

New (0-2 years):
  → Founded: 2023, 2024, 2025
  → Characteristics: Early-stage, building product, finding PMF
  → Often: Pre-Seed, Seed stage

Growing (3-5 years):
  → Founded: 2020, 2021, 2022
  → Characteristics: Scaling, growing team, expanding market
  → Often: Series A, B stage

Established (6-10 years):
  → Founded: 2015, 2016, 2017, 2018, 2019
  → Characteristics: Proven model, stable revenue, known brand
  → Often: Series C, D or profitable

Mature (10+ years):
  → Founded: 2014 or earlier
  → Characteristics: Industry veterans, established reputation, legacy systems
  → Often: Late-stage, profitable, or public

**Company Age Query Examples:**

Example 1: "New AI startups"
→ Age: Auto-detected as "new" (0-2 years)
→ Find: AI companies founded 2023-2025
→ Exclude: AI companies founded 2022 or earlier

Example 2: "Established restaurants in NYC"
→ Age: Auto-detected as "established" (6-10 years)
→ Find: NYC restaurants founded 2015-2019
→ Exclude: Brand new restaurants (2024) and very old ones (pre-2015)

Example 3: "Mature manufacturing companies"
→ Age: Auto-detected as "mature" (10+ years)
→ Find: Manufacturers founded 2014 or earlier
→ Exclude: Companies founded 2015 or later

Example 4: "SaaS companies" (no age specified)
→ Age: Any
→ Find: SaaS companies of all ages (2025 to 1990s)
→ Include: Mix of new, growing, established, and mature

Example 5: "Legacy financial institutions"
→ Age: Auto-detected as "mature" (10+ years, possibly 50+ years)
→ Find: Banks, insurers founded decades ago
→ Exclude: Fintech startups from 2020s

Example 6: "Recently founded e-commerce brands"
→ Age: Auto-detected as "new" (0-2 years)
→ Find: E-commerce companies founded 2023-2025
→ Exclude: Older e-commerce businesses

Examples:

Query: "recently funded AI startups"
→ This IS funding-focused → Require funding data

Query: "AI companies in San Francisco"
→ This is NOT funding-focused → Funding optional, focus on AI + SF

Query: "established restaurants"
→ This is NOT funding-focused → Funding optional, focus on established + restaurants

Query: "SaaS companies"
→ This is NOT funding-focused → Funding optional, focus on SaaS

TAVILY SEARCH RESULTS:
${searchContext}

TARGET: Find exactly ${batchSize} companies matching criteria below.

**CRITICAL: UNDERSTANDING SEARCH INTENT**

The query and filters define EXACT requirements. Interpret them correctly:

**FUNDING STAGE INTERPRETATION:**
- "early-stage" / "early stage" → ONLY Pre-Seed & Seed (NOT Series A/B/C)
- "late-stage" / "late stage" → ONLY Series C, D, E+ (NOT Pre-Seed/Seed/A/B)
- "growth-stage" / "growth stage" → ONLY Series B, C, D (NOT Pre-Seed/Seed or E+)
- Specific filter → EXACT match only (Seed = Seed ONLY, not extensions/bridges)

**SIZE/AGE KEYWORDS:**
- "small startups" / "small companies" → 1-50 employees, <$10M funding, Pre-Seed/Seed/early A
- "large startups" / "big companies" → 200+ employees, >$50M funding, Series C, D+
- "new startups" / "newly funded" → Founded 2023-2025, first round 2024-2025, Pre-Seed/Seed
- "established" / "mature" → Founded 2018-2021, multiple rounds, Series B/C/D+

**INDUSTRY STRICTNESS:**
- "AI" = AI/ML core product ONLY (NOT general SaaS with AI features)
- "FinTech" = Financial technology ONLY (NOT general SaaS serving banks)
- "HealthTech" = Healthcare technology ONLY (NOT general wellness apps)
- Stay within exact industry, no drift to adjacent categories

SEARCH CRITERIA (MUST MATCH ALL):
- Query: "${enhancedQuery}" ${enhancedQuery.includes('early') ? '← Interpret as Pre-Seed/Seed ONLY' : enhancedQuery.includes('late') ? '← Interpret as Series C/D+ ONLY' : enhancedQuery.includes('small') ? '← 1-50 employees, <$10M' : ''}
- Funding Stage: ${filters.fundingStage || 'Any'} ${filters.fundingStage ? '← EXACT MATCH (filter overrides query)' : ''}
- Industry: ${filters.industry || 'Any'} ${filters.industry ? '← EXACT industry, no drift' : ''}
- Country: ${filters.country || 'Any'} ${filters.country ? '← EXACT location match' : ''}
${isSearchingForFunding || filters.fundingStage ? '- Funding Date: 2024 or 2025 ONLY (user is searching for funding)' : '- Funding Date: Any year acceptable (funding is OPTIONAL for this search)'}

**FUNDING DATA - OPTIONAL:**

${isSearchingForFunding || filters.fundingStage ?
                    `This IS a funding-focused search:
  ✅ Prioritize companies with funding information
  ✅ Include funding date, amount, stage
  ✅ Focus on recent funding (2024-2025)
  ✅ Companies without funding data should be excluded` :
                    `This is NOT a funding-focused search:
  ✅ Find companies that match other criteria (industry, location, type)
  ✅ Funding information is optional - can be "N/A"
  ✅ Do not filter out companies without funding data
  ✅ Focus on relevance to search query
  ✅ Companies can be excellent leads even with ALL funding fields as "N/A"`}

RULE: Funding is only required when the user explicitly searches for funded companies.

${batchIndex > 0 ? `**BATCH ${batchIndex + 1} INSTRUCTIONS:**\nFind DIFFERENT companies than batch 1. Search for:\n- Lesser-known verified companies\n- Different geographic regions or sub-categories\n- Different time periods (early 2024 vs late 2025)\n- YC launches, Product Hunt features, VC announcements\n- Regional/industry publications not used in batch 1\nMaximize variety while maintaining quality.\n` : ''}

**DIVERSIFY YOUR SOURCES** - Use sources appropriate to the search query:

**USER SEARCHED FOR: "${enhancedQuery}"**

${isSearchingForStartups || isSearchingForFunding ? `
**IF SEARCHING FOR TECH STARTUPS/FUNDING:**
**Tech News:** TechCrunch, VentureBeat, The Information, Ars Technica, Tech.eu, TechNode
**Platforms:** Product Hunt, Y Combinator, Hacker News, BetaList, Indie Hackers
**Accelerators/VCs:** Techstars, 500 Startups, a16z, Sequoia, First Round, Founders Fund
**Databases:** Crunchbase, PitchBook, AngelList, Wellfound
**Regional Tech:** Silicon Canals, EU-Startups, BetaKit, e27, YourStory, Sifted, GeekWire
` : `
**FOR TRADITIONAL/GENERAL BUSINESSES:**
**Business Directories:** BBB, Chamber of Commerce, Yelp, Local business journals
**Business News:** Bloomberg, Forbes, Reuters, WSJ, Financial Times, Business Insider
**Industry Directories:** Industry-specific databases and publications
**Local News:** City business journals, regional newspapers, trade publications
`}

**INDUSTRY-SPECIFIC SOURCES:**
${filters.industry === 'FinTech' || enhancedQuery.toLowerCase().includes('fintech') ? '- FinTech: FinTech Futures, Finextra, The Fintech Times, Banking Dive' : ''}
${filters.industry === 'HealthTech' || enhancedQuery.toLowerCase().includes('health') ? '- Healthcare: MedCity News, Healthcare IT News, MobiHealthNews, Becker\'s Hospital Review' : ''}
${filters.industry === 'SaaS' || enhancedQuery.toLowerCase().includes('saas') ? '- SaaS: SaaS Mag, G2, Capterra, Software World' : ''}
${enhancedQuery.toLowerCase().includes('restaurant') || enhancedQuery.toLowerCase().includes('food') ? '- Restaurants: QSR Magazine, Restaurant Business, Nation\'s Restaurant News, FSR Magazine' : ''}
${enhancedQuery.toLowerCase().includes('retail') || enhancedQuery.toLowerCase().includes('store') ? '- Retail: Retail Dive, Chain Store Age, Retail TouchPoints, Progressive Grocer' : ''}
${enhancedQuery.toLowerCase().includes('manufacturing') ? '- Manufacturing: Manufacturing.net, Industry Week, Modern Manufacturing, Plant Engineering' : ''}
${enhancedQuery.toLowerCase().includes('construction') || enhancedQuery.toLowerCase().includes('contractor') ? '- Construction: ENR, Construction Dive, Builder Magazine, Contractor Magazine' : ''}
${enhancedQuery.toLowerCase().includes('automotive') || enhancedQuery.toLowerCase().includes('car') ? '- Automotive: Automotive News, WardsAuto, Auto Remarketing' : ''}
- CleanTech: GreenBiz, CleanTechnica
- DevTools: InfoQ, The New Stack

**RULE: Match sources to query type. Don't use startup sources for traditional businesses, and vice versa.**

**CRITICAL RULES:**

1. **EXACT CRITERIA MATCHING**
   - "Seed" stage → ONLY Seed (NOT Series A/B/C)
   - "AI/ML" industry → ONLY AI companies (NOT FinTech/SaaS)
   - "United States" → ONLY US (NOT UK/Canada)
   - If ANY criteria doesn't match → EXCLUDE

2. **WEBSITE FORMAT**
   ✅ CORRECT: "company.com", "startup.io", "app.ai"
   ❌ WRONG: "techcrunch.com/article", "crunchbase.com/organization", "linkedin.com/company", "producthunt.com/posts/name", "ycombinator.com/companies/name"

   RULE: Company domain ONLY. Infer from name if needed (e.g., "Acme Inc" → "acme.com")

3. **SOURCE FORMAT**
   ✅ CORRECT: "TechCrunch", "Y Combinator", "Bloomberg", "Product Hunt", "Crunchbase", "a16z", "Sifted"
   ❌ WRONG: "Press Release", "Company Blog", "Website", "News", "Unknown", "N/A"

   RULE: Real publication/platform name from search results. If unknown, skip company.

4. **DESCRIPTION QUALITY**
   ✅ CORRECT: "AI-powered fraud detection for banking"
   ❌ WRONG: "Technology company", "Startup", "Software platform"

   RULE: Specific description from search results.

**VERIFICATION CHECKLIST** (Every company):
1. ✅ Matches query intent: "${enhancedQuery}" (early-stage? small? new?)?
2. ✅ Matches stage: ${filters.fundingStage || 'inferred from query'}? (Be STRICT: early=Pre-Seed/Seed, late=C/D+)
3. ✅ Matches industry EXACTLY: ${filters.industry || 'any'}? (No drift to adjacent)
4. ✅ Matches size/age from query keywords?
5. ✅ Matches country: ${filters.country || 'any'}?
6. ✅ Website is company domain (not article/profile)?
7. ✅ Funding date is 2024 or 2025? ${isSearchingForFunding || filters.fundingStage ? '(REQUIRED - user is searching for funding)' : '(OPTIONAL - funding not required for this search)'}
   ${isSearchingForFunding || filters.fundingStage ? '- If user searched "recently funded" → YES, require 2024-2025' : '- If user searched "AI companies" → NO, funding date can be N/A or any year'}
   ${isSearchingForFunding || filters.fundingStage ? '' : '- If user searched "established businesses" → NO, funding not required at all'}
8. ✅ Source is real publication?
9. ✅ Description is specific?
10. ✅ Does the company/activity match the timeframe requirement?

Check the timeframe: ${filters.timeframe || 'Any Time'}

If "24h", "48h", "7d", "30d", "90d":
  → The activity date MUST fall within this window from today
  → Today is: ${new Date().toISOString().split('T')[0]}
  → Calculate cutoff date and verify activity is after it
  → If activity is older → EXCLUDE

If "2024-2025":
  → The activity/founding year MUST be 2024 or 2025
  → If from 2023 or earlier → EXCLUDE

If specific year or year range:
  → The activity/founding year MUST be within that range
  → Outside the range → EXCLUDE

If "before-2015":
  → The company MUST be founded before 2015
  → Look for: "Founded 2014", "Established 2010", "20 years in business"
  → If founded 2015 or later → EXCLUDE

If "Any Time":
  → NO DATE RESTRICTIONS
  → Include companies from any era
  → Include activity from any time period
  → Focus purely on matching other criteria

11. ✅ Does the company match the age/maturity requirement?

Check the company age filter: ${filters.companyAge || 'Any'}

If "new" (0-2 years):
  → Company must be founded in 2023, 2024, or 2025
  → Look for: "Founded 2024", "Launched 2023", "Established 2025"
  → If founded 2022 or earlier → EXCLUDE

If "growing" (3-5 years):
  → Company must be founded in 2020, 2021, or 2022
  → If founded 2019 or earlier → EXCLUDE
  → If founded 2023 or later → EXCLUDE

If "established" (6-10 years):
  → Company must be founded in 2015, 2016, 2017, 2018, or 2019
  → If founded 2014 or earlier → EXCLUDE (too mature)
  → If founded 2020 or later → EXCLUDE (too new)

If "mature" (10+ years):
  → Company must be founded in 2014 or earlier
  → Look for: "Founded 2010", "Established 2005", "Since 1998", "Family-owned for 3 generations"
  → If founded 2015 or later → EXCLUDE

If "Any" or not specified:
  → NO age restrictions
  → Include companies of any founding year
  → Mix brand new (2025) with century-old (1925)

**CRITICAL: Company age is about FOUNDING DATE, not funding date.**

Example:
- Company founded in 2010, raised Series D in 2024
  → Age: 14 years old = MATURE
  → NOT a new company just because they raised funding recently

**SELF-CHECK:** "Does this REALLY match what user is looking for? Am I being too loose?"
**IF UNSURE OR ANY = NO → EXCLUDE COMPANY**

**DO NOT EXCLUDE COMPANIES FOR:**

❌ WRONG - Don't exclude for these reasons:
- "No funding information available" ${isSearchingForFunding || filters.fundingStage ? '(UNLESS user is searching for funding)' : '(This is OK!)'}
- "Funding date is not 2024/2025" ${isSearchingForFunding || filters.fundingStage ? '(User wants recent funding)' : '(This is OK!)'}
- "No funding stage listed" ${isSearchingForFunding || filters.fundingStage ? '(UNLESS user is searching for funding)' : '(This is OK!)'}
- "Bootstrapped / self-funded" ${isSearchingForFunding || filters.fundingStage ? '(User wants VC funding)' : '(This is OK!)'}

✅ CORRECT - Only exclude for these reasons:
- Doesn't match user's industry criteria
- Doesn't match user's location criteria
- Doesn't match user's size criteria
- Doesn't match user's timeframe criteria
- Doesn't match user's company age criteria
- Cannot verify company actually exists
- Website is invalid (article URL, profile page)
- More than 40% of required fields are N/A
- Company is clearly irrelevant to search

REMEMBER: ${isSearchingForFunding || filters.fundingStage ? 'User wants funded companies - funding is REQUIRED' : 'User wants companies in an industry/location - funding is OPTIONAL'}

**SEARCH STRATEGY FOR ${batchSize} COMPANIES:**

**SIGNAL-SPECIFIC SEARCH STRATEGIES:**

When user searches for FUNDING signals:
  ✅ Search terms: "raised", "funding round", "investment", "Series A/B/C", "seed round", "venture capital", "VC"
  ✅ Sources: TechCrunch, Crunchbase, PitchBook, VentureBeat, company press releases, investor announcements
  ✅ Look for: Round announcements, investor names, funding amounts, valuation, lead investor
  ✅ Output: signalType "funding" with investors array, stage, amount

When user searches for HIRING signals:
  ✅ Search terms: "hiring", "now hiring", "careers", "jobs at", "join our team", "we're growing", "recruiting", "job openings"
  ✅ Sources: Company careers pages, LinkedIn job postings, AngelList jobs, Built In, Wellfound, Indeed
  ✅ Look for: Number of open positions, departments hiring, job titles, seniority levels, growth indicators
  ✅ Output: signalType "hiring" with jobCount, departments, seniority, growthIndicator

When user searches for PRODUCT signals:
  ✅ Search terms: "launches", "launched", "announces", "unveils", "releases", "Product Hunt", "new product", "beta launch"
  ✅ Sources: Product Hunt, company blogs, tech news sites, launch announcements, Show HN
  ✅ Look for: Product name, launch date, features, user reception, upvotes, reviews
  ✅ Output: signalType "product_launch" with productName, type, platform, reception

When user searches for EXPANSION signals:
  ✅ Search terms: "expansion", "new office", "new location", "enters market", "opening", "expanding to", "market entry"
  ✅ Sources: Business news, real estate announcements, company blogs, PR newswires, commercial real estate sites
  ✅ Look for: Location details, market being entered, office size, expansion stage, investment in expansion
  ✅ Output: signalType "expansion" with type, details, market, scale

When user searches for PARTNERSHIP signals:
  ✅ Search terms: "partnership", "partners with", "collaboration", "integration", "alliance", "strategic partnership", "announces partnership"
  ✅ Sources: Company press releases, partner announcements, integration marketplaces (Zapier, Salesforce AppExchange)
  ✅ Look for: Partner company name, partnership type, integration details, mutual value proposition, announcement date
  ✅ Output: signalType "partnership" with partner, type, scope, value

When user searches for PRESS signals:
  ✅ Search terms: "featured in", "covered by", "profile", "interview", "spotlight", "award winner", "best of", "top company"
  ✅ Sources: Major publications (Forbes, WSJ, NYT, Bloomberg), industry media, award sites, "best of" lists
  ✅ Look for: Publication name, article type, recognition type, significance, awards won
  ✅ Output: signalType "press_mention" with publication, type, topic, significance

When user searches for ACQUISITION signals:
  ✅ Search terms: "acquires", "acquired", "acquisition", "merger", "M&A", "buys", "purchases", "acquired by"
  ✅ Sources: Business news (WSJ, Bloomberg, Reuters), SEC filings, M&A databases, press releases
  ✅ Look for: Acquirer/target names, deal value, strategic rationale, closing date, terms
  ✅ Output: signalType "acquisition" with type ("acquired"/"acquired by"), target, value, reason

When user searches for REGULATORY signals:
  ✅ Search terms: "Form D", "Reg D", "SEC filing", "regulatory filing", "506(b)", "506(c)", "EDGAR", "filed with SEC", "Rule 506", "private placement"
  ✅ Sources: SEC EDGAR database (sec.gov/edgar), PitchBook (tracks filings), Crunchbase (aggregates filings), business journals, filing aggregator websites
  ✅ Look for: Filing type (Form D, S-1, etc.), amount raised, regulation type (506b/506c), filing date, exemption type
  ✅ Output: signalType "regulatory_filing" with filingType, amount, regType, agency

**HOW TO SEARCH FOR REGULATORY FILINGS:**

**Primary Source: SEC EDGAR Database**
  - URL: sec.gov/edgar
  - Searchable database of all SEC filings
  - Updated daily
  - Free public access

**Basic Search Approach:**

For "Reg D filings" or "Form D filings":
  1. Search: "SEC Form D filed [date range]"
  2. Look for: Recent Form D filings
  3. Extract: Company name, amount, industry, date
  4. Verify: Filing is real and within timeframe

**Search Terms to Use:**
  - "Form D filing" + timeframe
  - "Regulation D" + industry
  - "SEC filing" + company type
  - "Rule 506" (common Reg D exemption)
  - "Private placement" + industry

**Sources to Search:**
  - SEC EDGAR Direct (sec.gov/edgar) - PRIMARY SOURCE
  - PitchBook (tracks and aggregates filings)
  - Crunchbase (aggregates SEC filings)
  - Business journals (report on local filings)
  - Filing aggregator websites

**REGULATORY FILINGS BY INDUSTRY:**

Form D filings include SIC (Standard Industrial Classification) codes or industry descriptions. Use these to filter by industry.

**Common Industries in Filings:**

**Technology/Software:**
  - SIC 7370-7379 (Computer services)
  - SIC 7371 (Computer programming services)
  - SIC 7372 (Prepackaged software)
  - Keywords: "software", "technology", "internet", "platform", "SaaS"
  - Search: "Form D technology", "Form D software", "Form D SaaS"

**Financial Services:**
  - SIC 6000-6999 (Finance, insurance, real estate)
  - SIC 6282 (Investment advice)
  - SIC 6211 (Security brokers)
  - Keywords: "financial", "fintech", "payment", "lending", "investment"
  - Search: "Form D fintech", "Form D finance"

**Healthcare/Biotech:**
  - SIC 2834 (Pharmaceutical preparations)
  - SIC 8000-8099 (Health services)
  - SIC 2835 (In vitro diagnostics)
  - Keywords: "healthcare", "biotech", "pharmaceutical", "medical"
  - Search: "Form D biotech", "Form D healthcare"

**Real Estate:**
  - SIC 6500-6599 (Real estate)
  - SIC 6552 (Land subdividers)
  - Keywords: "real estate", "property", "development"
  - Search: "Form D real estate fund"

**Energy:**
  - SIC 1300-1389 (Oil and gas extraction)
  - Keywords: "energy", "oil", "gas", "renewable"
  - Search: "Form D energy", "Form D oil gas"

**Consumer/Retail:**
  - SIC 5000-5999 (Retail trade)
  - Keywords: "retail", "consumer", "e-commerce"
  - Search: "Form D retail", "Form D consumer"

**How to Apply Industry Filtering:**

Query: "Reg D filings fintech"
  → Look for SIC codes 6000-6999
  → Look for keywords: "financial", "payment", "fintech", "banking"
  → Exclude non-fintech companies
  → Only return financial technology companies

Query: "Form D healthcare last week"
  → Look for SIC codes 2834, 8000-8099
  → Look for keywords: "healthcare", "biotech", "medical", "pharmaceutical"
  → Recent filings only (last 7 days)
  → Only return healthcare-related companies

Query: "Recent SEC filings AI"
  → Look for keywords: "artificial intelligence", "AI", "machine learning", "ML"
  → May be in software/technology SIC codes
  → Return AI/ML focused companies only

**TIME-CRITICAL FILING SEARCHES:**

Regulatory filings are MOST valuable when fresh (24-48 hours old).

**Why timing matters for filings:**
  - Company just closed funding → Has budget NOW
  - Before press release → Get in early
  - Before competition → First mover advantage
  - Filing data is time-stamped precisely

**Handling time-sensitive filing searches:**

Query: "Reg D filings last 24 hours"
  → Filing date MUST be: ${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]} or later
  → Today is: ${new Date().toISOString().split('T')[0]}
  → Be EXTREMELY strict with dates
  → Exclude anything older than 24 hours

Query: "Reg D filings last 48 hours"
  → Filing date MUST be: ${new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().split('T')[0]} or later
  → Strictly enforce 48-hour window
  → Use precise date math

Query: "Form D filings last week"
  → Filing date MUST be within last 7 days
  → Cutoff: ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
  → Check every filing date

Query: "Recent Reg D filings" (vague timeframe)
  → Default to last 30 days
  → Sort by filing date (newest first)
  → Cutoff: ${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}

**CRITICAL: Date verification for filings**

Before including ANY filing:
  - Check filing date against current date: ${new Date().toISOString().split('T')[0]}
  - Calculate age in hours/days
  - Verify it falls within requested timeframe
  - If outside timeframe → EXCLUDE COMPLETELY
  - Filing dates are EXACT - use them precisely

**FILTERING BY OFFERING AMOUNT:**

Users may want filings above or below certain thresholds.

**Understanding Offering Amounts:**

Form D shows two amounts:
  - "Total offering amount": How much they're raising (target)
  - "Amount sold": How much they've raised so far

**USE TOTAL OFFERING AMOUNT for filtering:**
  - This is their fundraising goal
  - Better indicator of company size/budget
  - More consistent across filings

**Amount-Based Query Patterns:**

Query: "Reg D filings over $10M"
  → offeringAmount must be ≥ $10,000,000
  → Focus on larger raises
  → Exclude anything under $10M

Query: "Form D filings under $5M"
  → offeringAmount must be ≤ $5,000,000
  → Smaller/early-stage companies
  → Exclude large raises

Query: "Form D filings $1M-$5M"
  → offeringAmount between $1M and $5M
  → Mid-sized raises
  → Exclude under $1M and over $5M

Query: "Large Reg D filings"
  → Interpret as $20M+ (implicit threshold)
  → Focus on substantial raises

Query: "Small private placements"
  → Interpret as under $2M
  → Early-stage/smaller companies

**Amount Categories:**

Micro: Under $500K
  - Very early stage
  - Friends & family rounds
  - Lead score: 65-75

Small: $500K - $2M
  - Seed stage typically
  - Small startups
  - Lead score: 70-80

Medium: $2M - $10M
  - Series A/B range
  - Growing companies
  - Lead score: 75-85

Large: $10M - $50M
  - Series B/C range
  - Substantial companies
  - Lead score: 85-95

Very Large: $50M+
  - Late stage
  - Major raises
  - Lead score: 90-100

**COMBINING MULTIPLE FILING CRITERIA:**

Users can combine timeframe + industry + amount + location + age filters.

**Example Combinations:**

Query: "Reg D filings last 48 hours fintech over $5M"
→ Timeframe: Last 48 hours
→ Industry: FinTech
→ Amount: ≥ $5M
→ ALL criteria must match
→ Result: Recent, large fintech filings

Query: "Form D healthcare last week $10M+"
→ Timeframe: Last 7 days
→ Industry: Healthcare
→ Amount: ≥ $10M
→ Result: Recent, substantial healthcare filings

Query: "Small Reg D filings tech companies"
→ Amount: Under $2M (implied by "small")
→ Industry: Technology
→ Result: Small tech company filings

Query: "Recent large private placements AI"
→ Timeframe: Last 30 days (implied by "recent")
→ Amount: $20M+ (implied by "large")
→ Industry: AI
→ Result: Recent, large AI filings

**RULE: All specified criteria must be satisfied (AND logic, not OR).**

**REGULATORY FILINGS + COMPANY AGE:**

Query: "New startups that filed Form D"
→ Age: New (0-2 years, founded 2023-2025)
→ Signal: Regulatory filing
→ Find: Recently founded companies with Form D filings
→ Common scenario: Seed-stage companies filing for first institutional round

Query: "Established companies recent Reg D filings"
→ Age: Established (6-10 years, founded 2015-2019)
→ Signal: Regulatory filing (recent)
→ Find: Established companies raising growth capital
→ Less common but valuable: Proven companies with new funding

Query: "Mature companies that filed with SEC"
→ Age: Mature (10+ years, founded before 2015)
→ Signal: Regulatory filing
→ Find: Long-standing companies raising capital
→ Rare but interesting: Pivots, new divisions, or expansion

**Notes on Age + Filing Combinations:**

Common: New/Growing companies + Form D
  - New startups often file Form D for seed/Series A
  - High volume of these combinations

Uncommon: Established/Mature companies + Form D
  - Older companies typically raise later-stage rounds
  - May indicate: Restructuring, pivot, spin-off, or growth capital

**FILTERING FILINGS BY LOCATION:**

Form D filings include company address (city, state).

Query: "Reg D filings California"
→ Filter to companies with CA address
→ Look for: California, CA, San Francisco, Los Angeles, etc.

Query: "Form D filings San Francisco last week"
→ Location: San Francisco, CA
→ Timeframe: Last 7 days
→ Find: SF-based companies with recent filings

Query: "Recent private placements New York fintech"
→ Location: New York
→ Industry: FinTech
→ Find: NY fintech companies with filings

Query: "Reg D filings Austin tech"
→ Location: Austin, TX
→ Industry: Technology
→ Find: Austin tech companies with filings

**How to Match Locations:**

Filings show:
  - Primary business address
  - City, State format

Match on:
  - Full state name OR abbreviation (California OR CA)
  - City name (San Francisco, Austin, Boston)
  - Region (Bay Area = SF/San Jose/Oakland)

**SEARCH STRATEGY BASED ON TIMEFRAME:**

Timeframe: ${filters.timeframe || 'Any Time'}

${['24h', '48h', '7d', '30d', '90d'].includes(filters.timeframe) ?
                    `When timeframe is recent (24h-90d):
  - Use search terms: "last 24 hours", "last week", "today", "yesterday", "recent"
  - Look for: news articles, press releases, announcements with recent dates
  - Prioritize sources: Company blogs, press releases, news sites with timestamps
  - Verify dates carefully before including
  - Today's date: ${new Date().toISOString().split('T')[0]}` :
                    filters.timeframe === 'before-2015' ?
                      `When timeframe is "before-2015":
  - Use search terms: "established", "founded", "since", "history", "decades in business"
  - Look for: Company histories, about pages, timeline mentions
  - Prioritize sources: Company websites, business directories, historical records
  - Verify founding year before including` :
                      filters.timeframe && filters.timeframe !== 'Any Time' ?
                        `When timeframe is specific years (${filters.timeframe}):
  - Include the year in search terms
  - Filter results to only those years
  - Verify year matches before including` :
                        `When timeframe is "Any Time":
  - Use broad search terms without date restrictions
  - Accept results from any time period
  - Do NOT exclude based on age or date
  - Focus on relevance to query, not recency`}

**SEARCH STRATEGY BY COMPANY AGE:**

Company Age: ${filters.companyAge || 'Any'}

${filters.companyAge === 'new' ?
                    `When searching for NEW companies (0-2 years):
  ✅ Search terms: "founded 2023", "founded 2024", "launched 2024", "new startup", "recently launched"
  ✅ Sources: Startup news (TechCrunch launches), Product Hunt, Y Combinator batches
  ✅ Look for: Launch announcements, first funding rounds, "founded by" articles
  ✅ Verify: Founded 2023 or later` :
                    filters.companyAge === 'growing' ?
                      `When searching for GROWING companies (3-5 years):
  ✅ Search terms: "founded 2020", "founded 2021", "founded 2022", "scale-up", "growing startup"
  ✅ Sources: Growth stage news, Series A/B announcements
  ✅ Look for: Expansion news, team growth, new markets
  ✅ Verify: Founded 2020-2022` :
                      filters.companyAge === 'established' ?
                        `When searching for ESTABLISHED companies (6-10 years):
  ✅ Search terms: "founded 2015", "established", "proven", "since 2017"
  ✅ Sources: Industry publications, company about pages, business directories
  ✅ Look for: Company histories, milestone announcements, "celebrating X years"
  ✅ Verify: Founded 2015-2019` :
                        filters.companyAge === 'mature' ?
                          `When searching for MATURE companies (10+ years):
  ✅ Search terms: "founded 2014", "founded 2010", "legacy", "veteran", "decades in business", "since 2005"
  ✅ Sources: Company websites (About/History pages), BBB listings, industry associations, business directories
  ✅ Look for: "Established in [year]", "X years of experience", anniversary announcements
  ✅ Verify: Founded 2014 or earlier` :
                          `When NO age specified (Any):
  ✅ Include companies of all ages
  ✅ Mix new startups with mature businesses
  ✅ Do NOT favor one age over another`}

**SOURCES BY COMPANY AGE:**

${filters.companyAge === 'new' ?
                    `For NEW companies (0-2 years):
  - Product Hunt (product launches)
  - Y Combinator (batch announcements)
  - TechCrunch (startup launches)
  - BetaList (new startups)
  - Hacker News (Show HN posts)` :
                    ['established', 'mature'].includes(filters.companyAge) ?
                      `For ESTABLISHED/MATURE companies (6+ years):
  - Better Business Bureau (BBB) listings
  - Dun & Bradstreet directory
  - Industry association directories
  - LinkedIn company pages (check "Founded" date)
  - Company "About Us" / "History" pages
  - Chamber of Commerce listings
  - Trade association directories
  - Inc. 5000 archives
  - Forbes lists (various years)` :
                      `For ALL ages:
  - Crunchbase (shows founded date)
  - PitchBook (shows founded date)
  - Company websites (About/History sections)`}

To find enough leads, search broadly within criteria:
- Include ALL sub-categories of "${filters.industry || 'the industry'}"
- Search YC launches, Product Hunt features, accelerator announcements
- Check VC portfolio updates and regional publications
- Search industry-specific publications
- But NEVER compromise on matching criteria

**TARGET:** Exactly ${batchSize} verified companies.

**FUNDING FIELDS - WHEN N/A IS ACCEPTABLE:**

${isSearchingForFunding || filters.fundingStage ?
                    `This IS a funding-focused search:
  - fundingAmount: Must have value (not N/A)
  - fundingStage: Must have value (not N/A)
  - fundingDate: Must have value (not N/A)` :
                    `This is NOT a funding-focused search:
  - fundingAmount: "N/A" is perfectly acceptable
  - fundingStage: "N/A" is perfectly acceptable
  - fundingDate: "N/A" is perfectly acceptable

Companies can still be excellent leads even with ALL funding fields as "N/A" if they match other criteria.

Examples of valid leads with N/A funding:
- "AI SaaS companies" → Find AI/SaaS companies (funding: N/A is fine)
- "Restaurants in NYC" → Find NYC restaurants (funding: N/A is fine)
- "Established manufacturers" → Find manufacturers (funding: N/A is fine)`}

**LEAD SCORE CALCULATION:**

Lead scores should reflect:
1. How well the company matches search criteria (40 points)
2. Signal strength and relevance (30 points)
3. Signal recency (20 points)
4. Data completeness and quality (10 points)

**Base Score (40 points max):**
- Perfect industry match: +15
- Location match: +10
- Company size match: +10
- Overall relevance: +5

**Signal Score (30 points max):**

For FUNDING signals:
- Large funding ($10M+): +30
- Medium funding ($3-10M): +25
- Small funding (<$3M): +20
- Top-tier investors: +5 bonus
- No funding data: +0 (if funding search), +15 (if not funding search)

For HIRING signals:
- 20+ open positions: +30
- 10-19 positions: +25
- 5-9 positions: +20
- 1-4 positions: +15
- Senior/exec roles: +5 bonus

For PRODUCT_LAUNCH signals:
- Product Hunt #1: +30
- Product Hunt top 5: +25
- Major launch coverage: +20
- Small launch: +15
- Viral reception: +5 bonus

For EXPANSION signals:
- Multi-market expansion: +30
- Single market expansion: +25
- New office/location: +20
- International expansion: +5 bonus

For PARTNERSHIP signals:
- Major partner (FAANG, Fortune 500): +30
- Mid-tier partner: +25
- Strategic partnership: +20
- Integration partnership: +15

For PRESS_MENTION signals:
- Top-tier publication (WSJ, Forbes, Bloomberg): +30
- Industry publication: +25
- Award/recognition: +25
- Standard press mention: +15

For ACQUISITION signals:
- $50M+ deal: +30
- $10-50M deal: +25
- <$10M deal: +20
- Strategic rationale clear: +5 bonus

For REGULATORY_FILING signals:
- $10M+ filing: +30
- $5-10M filing: +25
- <$5M filing: +20
- 506(c) (public solicitation): +5 bonus

**LEAD SCORING FOR REGULATORY FILINGS:**

Base score for filings: 75 (filings are high-quality verified leads)

Add signal points (30 max):
  - $20M+ offering: +30
  - $10M-$20M offering: +25
  - $5M-$10M offering: +20
  - $1M-$5M offering: +15

Add recency bonus (20 max):
  - Filed within 24 hours: +20 (EXTREMELY fresh, highest value)
  - Filed within 48 hours: +18 (Very fresh, very high value)
  - Filed within 7 days: +15 (Fresh, high value)
  - Filed within 30 days: +10 (Recent, good value)
  - Filed 30-90 days ago: +5 (Older but still relevant)

Add regulation type bonus:
  - Rule 506(c) (allows public solicitation): +5
  - S-1 (IPO filing): +10 (extremely valuable)

Example filing scores:
  - $25M filing from yesterday: 75 (base) + 30 (amount) + 20 (24h recency) = 125 → capped at 100
  - $8M filing from 3 days ago: 75 + 20 + 15 = 110 → capped at 100
  - $2M filing from 2 weeks ago: 75 + 15 + 10 = 100
  - $500K filing from 60 days ago: 75 + 10 + 5 = 90

**Why regulatory filings score high:**
  - Verified data (legal document, 100% accurate)
  - Immediate budget availability (just raised capital)
  - Time-sensitive opportunity (first contact advantage)
  - Less competition (most salespeople don't monitor SEC filings)
  - High conversion potential (money in hand, ready to spend)

**ADVANCED LEAD SCORING FOR COMPLEX FILINGS:**

Base score for any filing: 75

Add recency bonus (20 max):
  - Filed within 24 hours: +20 (EXTREMELY fresh, highest value)
  - Filed within 48 hours: +18 (Very fresh, very high value)
  - Filed within 7 days: +15 (Fresh, high value)
  - Filed within 30 days: +10 (Recent, good value)
  - Filed 30-90 days ago: +5 (Older but still relevant)

Add amount bonus (15 max):
  - $50M+ offering: +15 (very large)
  - $20M-$50M offering: +10 (large)
  - $10M-$20M offering: +5 (substantial)
  - $5M-$10M offering: +0 (medium)
  - Under $1M offering: -5 (small, less budget)

Add industry match bonus (10 max):
  - Exact industry match to user's target: +10
  - Related industry: +5
  - Generic/unspecified: +0

Add location match bonus (5 max):
  - Specific city/location match: +5
  - State match: +3
  - No location specified: +0

Add age bonus:
  - New startup with filing (shows immediate traction): +5
  - Mature company with filing (shows revival/pivot): +10
  - Growing/established: +0

Add filing type bonus:
  - Form S-1 (IPO): +10 (extremely valuable, major budget)
  - Form D with 506(c): +5 (allows public solicitation)
  - Standard Form D: +0

**Example Advanced Scoring:**

$30M fintech filing from yesterday in San Francisco (exact match):
  - Base: 75
  - Recency (24h): +20
  - Amount ($30M): +10
  - Industry match (fintech): +10
  - Location match (SF): +5
  - Total: 120 → Capped at 100

$5M healthcare filing from 5 days ago (industry match):
  - Base: 75
  - Recency (5 days): +15
  - Amount ($5M): +0
  - Industry match: +10
  - Total: 100

$500K random filing from 3 weeks ago:
  - Base: 75
  - Recency (3 weeks): +10
  - Amount ($500K): -5
  - Total: 80

IPO filing (Form S-1) $200M:
  - Base: 75
  - Filing type (S-1): +10
  - Amount ($200M): +15
  - Total: 100

For NO signal:
- If signal search: +0 (should exclude)
- If general search: +15 (base score)

**Recency Score (20 points max):**
- Last 24-48 hours: +20
- Last 7 days: +18
- Last 30 days: +15
- Last 90 days: +12
- Last 6 months: +8
- Last year: +5
- Older than 1 year: +2
- No date/N/A: +5 (neutral)

**Data Quality Score (10 points max):**
- All fields complete: +10
- 1-2 N/A fields: +8
- 3-4 N/A fields: +6
- 5+ N/A fields: +3
- Missing critical data: +0

**Total Score Range: 0-100**

**Scoring Examples:**

Example 1: "AI companies that are hiring"
- Industry match (AI): +15
- Signal (hiring, 15 positions): +25
- Recency (jobs posted last week): +18
- Data quality (complete): +10
- TOTAL: 68

Example 2: "Series A funding last 30 days"
- Funding signal ($15M Series A): +30
- Recency (3 weeks ago): +15
- Top-tier investor: +5 bonus
- Data quality: +10
- TOTAL: 60 (base) + signal points = 90

Example 3: "Restaurant expansions in California"
- Location match (CA): +10
- Industry match (restaurant): +15
- Expansion signal (new location): +20
- Recency (last month): +15
- Data quality: +8
- TOTAL: 68

Example 4: "Form D filings last 48 hours"
- Regulatory signal ($8M filing): +25
- Recency (yesterday): +20
- Data quality (complete): +10
- Relevance: +5
- TOTAL: 60 (base) + 60 (signal+recency+quality) = 90

**Signal Match Priority:**
- If user searches for specific signal → Companies WITH that signal should score 70-100
- If user searches for specific signal → Companies WITHOUT that signal should be excluded
- If general search (no signal) → Any signal or no signal is fine, score 50-90

**OUTPUT DATA - INCLUDE TIMEFRAME INFORMATION:**

For each company, you must include:

- **activityDate**: The date when the relevant signal occurred
  - For funding: funding date
  - For filing: filing date
  - For launch: launch date
  - For hiring: when job was posted
  - For established companies: "N/A" if no recent activity
  - Format: "2024-11-25" or "November 2024" or "N/A"

- **foundedYear**: When the company was founded (if available)
  - For established business searches, this is CRITICAL
  - Format: "2015", "2010", "1998"
  - If unknown: "N/A"

**FOUNDED YEAR - NOW CRITICAL:**

For EVERY company, you MUST attempt to find and include:

- **foundedYear**: The year the company was founded
  - Format: "2024", "2015", "2010", "1998"
  - This is REQUIRED for age-based searches
  - If you cannot find it → Mark as "N/A" but note this is a data gap

**How to find founded year:**

1. Company website - "About Us" or "Our Story" page
   - Look for: "Founded in", "Established", "Since", "Started in"

2. LinkedIn company page
   - Shows founded year prominently

3. Crunchbase / PitchBook
   - Always includes founded date

4. News articles
   - Launch announcements, founder profiles

5. Business registrations
   - Incorporation date, business license date

**COMBINING AGE AND FUNDING CRITERIA:**

User can search for combinations like:
- "Established companies that recently raised funding"
- "Mature businesses with Series B funding"
- "New startups with seed funding"

How to handle:

Query: "Established companies recently funded"
→ Age: Established (6-10 years, founded 2015-2019)
→ Funding: Recent (2024-2025)
→ Find: Companies founded 2015-2019 that raised funding in 2024-2025
→ Example: A 2017 company that raised Series C in 2024 ✅

Query: "New startups Series A"
→ Age: New (0-2 years, founded 2023-2025)
→ Funding: Series A
→ Find: Very fast-growing startups that went from founding to Series A quickly
→ Example: A 2023 company with Series A in 2024 ✅
→ Note: This is rare but possible

Query: "Mature companies Seed funding"
→ Age: Mature (10+ years, founded 2014 or earlier)
→ Funding: Seed
→ This combination is unusual (mature companies rarely do seed rounds)
→ Might find: Pivoted companies, spin-offs, new divisions
→ If no results: Explain this combination is rare

**RULE: Both criteria must be satisfied. Age AND funding requirements both apply.**

**WHY COMPANY AGE MATTERS FOR LEADS:**

NEW companies (0-2 years):
  → Early adopters of new products
  → Still forming processes and vendors
  → Open to new solutions
  → May have budget constraints but high growth potential

GROWING companies (3-5 years):
  → Proven product-market fit
  → Scaling operations rapidly
  → Need tools to handle growth
  → Better budgets than new startups

ESTABLISHED companies (6-10 years):
  → Stable revenue and operations
  → Mature buying processes
  → Looking for scalability and efficiency
  → Substantial budgets

MATURE companies (10+ years):
  → Industry veterans
  → Deep pockets but slower to change
  → May have legacy systems to replace
  → Long sales cycles but high contract values

This context helps understand why users filter by age - they're targeting specific buyer profiles.

**CRITICAL: "ANY TIME" SEARCHES**

When timeframe is "Any Time" or not specified:

DO:
✅ Include companies of any age (brand new to 50+ years old)
✅ Include activity from any date (today's news to historical records)
✅ Mix old and new companies freely
✅ Focus purely on relevance to search criteria
✅ Give equal weight to established and new companies

DO NOT:
❌ Favor recent companies over old ones
❌ Exclude companies because they're "too old"
❌ Exclude companies because they're "too new"
❌ Apply hidden date filters
❌ Assume user wants recent activity

**WEBSITE FIELD - CRITICAL RULES:**

The website field is THE MOST IMPORTANT field for users. They will click "Visit Site" to go there.

✅ CORRECT - Real, verified company websites:
  - "openai.com" (verified company domain)
  - "anthropic.com" (verified company domain)
  - "stripe.com" (verified company domain)
  - "acme-corp.io" (if you can verify this company exists)

❌ WRONG - Never include these:
  - "N/A" is BETTER than a fake URL
  - Made-up URLs like "aicompany123.com" (if you can't verify it exists)
  - Placeholder URLs like "example.com", "company.com"
  - News article URLs like "techcrunch.com/article/company-raises-money"
  - Profile pages like "crunchbase.com/organization/company"
  - LinkedIn URLs like "linkedin.com/company/acme"
  - Social media like "twitter.com/company"
  - URLs from your training data that might not exist anymore

**HOW TO FIND REAL WEBSITES:**

⚠️ CRITICAL: Find the company's HOMEPAGE domain, NOT article URLs! ⚠️

**WRONG APPROACH - DON'T DO THIS:**
❌ You find article: "techcrunch.com/2024/acme-raises-funding"
❌ Extract domain: "techcrunch.com"
❌ This is the ARTICLE site, not the company!

❌ You find blog post: "medium.com/acme-blog/announcement"
❌ Extract domain: "medium.com"
❌ This is the BLOG platform, not the company!

**CORRECT APPROACH - DO THIS:**
✅ Article says: "Acme AI (acme-ai.com) raised $10M"
✅ Extract: "acme-ai.com"
✅ This IS the company's domain!

✅ Article says: "Visit Acme at www.acme-ai.com for more"
✅ Extract: "acme-ai.com" (strip www.)
✅ This IS the company's domain!

**STEP-BY-STEP:**

1. Check if the search results EXPLICITLY MENTION the company's official homepage
2. Look for URLs in format: "companyname.com", "company.io", "company.ai"
3. Verify the domain matches the company name
4. NEVER use the URL of the article itself
5. NEVER use blog platform URLs (medium.com, substack.com, etc.)
6. NEVER use news site URLs (techcrunch.com, bloomberg.com, etc.)
7. If you CANNOT find their ACTUAL HOMEPAGE → Use "N/A"

**VERIFICATION QUESTIONS:**

Before including a website, ask yourself:
- ❓ Is this the COMPANY'S homepage, not an article ABOUT them?
- ❓ Did the article explicitly mention this as their website?
- ❓ Does this domain match the company name?
- ❓ Am I 100% confident this is the real company homepage?

If you answer NO to any question → Use "N/A"

**CRITICAL RULE:**
"N/A" is INFINITELY BETTER than the wrong URL or an article URL.

IT IS BETTER TO PUT "N/A" THAN TO PUT A BLOG/ARTICLE URL!

A user clicking "Visit Site" should go to the COMPANY HOMEPAGE, not a news article.
Better to show "N/A" and let them Google it themselves.

════════════════════════════════════════════════════════════════════════════════
⚠️⚠️⚠️ CRITICAL: DO NOT CONFUSE WEBSITE AND SOURCE ⚠️⚠️⚠️

**website** = THE COMPANY'S HOMEPAGE (where they operate their business)
  Examples: "donandmillies.com", "happyjoes.com", "runzarestaurant.com"

**source** = THE FULL URL WHERE YOU FOUND THIS INFORMATION (article/directory)
  Examples: "https://mashed.com/article/restaurant-chains",
            "https://thetakeout.com/best-midwest-restaurants",
            "https://en.wikipedia.org/wiki/Runza"

YOU MUST KEEP THESE SEPARATE!

For "Don & Millie's" found in a Mashed article:
  ✅ CORRECT:
     website: "donandmillies.com"     ← Company's homepage
     source: "https://mashed.com/article/midwest-restaurants"  ← Article URL

  ❌ WRONG:
     website: "mashed.com"            ← NO! That's the source!
     source: "Mashed"

RULE:
- website = Company domain ONLY (donandmillies.com, runza.com)
- source = FULL URL where you found this info (https://mashed.com/article/...)
════════════════════════════════════════════════════════════════════════════════

Return ONLY valid JSON:

{
  "leads": [
    {
      "companyName": "Exact name from results",
      "description": "Specific what they do",
      "fundingStage": ${isSearchingForFunding || filters.fundingStage ? '"Seed"' : '"Seed" or "N/A"'},
      "fundingAmount": ${isSearchingForFunding || filters.fundingStage ? '"$5M"' : '"$5M" or "N/A"'},
      "fundingDate": ${isSearchingForFunding || filters.fundingStage ? '"March 2024"' : '"March 2024" or "N/A"'},
      "activityDate": ${['24h', '48h', '7d', '30d', '90d'].includes(filters.timeframe) ? '"2024-11-25"' : '"2024-11-25" or "N/A"'},
      "foundedYear": ${filters.timeframe === 'before-2015' ? '"2010"' : '"2010" or "N/A"'},
      "signalType": "funding",
      "signalData": {
        "stage": "Seed",
        "amount": "$5M",
        "investors": ["Acme Ventures", "Tech Capital"]
      },
      "signalDate": "March 2024",
      "industry": "AI/ML",
      "country": "United States",
      "website": "donandmillies.com",  // ← COMPANY'S HOMEPAGE ONLY (domain only, no paths)
      "employeeCount": "10-50",
      "source": "https://techcrunch.com/article/company-raises-5m",  // ← FULL URL WHERE YOU FOUND THIS
      "leadScore": 85
    }
  ]
}

**CRITICAL RULES:**

1. **website**: MUST be the company's actual homepage
   - Find their official website separately
   - Format: "companyname.com" (domain only, no paths)
   - If you cannot find it → "N/A"
   - NEVER use the article/source URL

2. **source**: MUST be the FULL URL where you found this information
   - Format: "https://techcrunch.com/article/company-raises-5m"
   - Include the complete URL with https://
   - This is where the user can verify your information

**SELF-CHECK BEFORE SUBMISSION:**

✅ Website Verification:
- [ ] Every website is either a REAL company domain OR "N/A"
- [ ] I found each website URL in actual search results
- [ ] No made-up domains like "company123.com"
- [ ] No news article URLs like "techcrunch.com/article"
- [ ] No profile pages like "crunchbase.com/org/company"
- [ ] No placeholder domains like "example.com"
- [ ] I am 100% confident each website will work if clicked

✅ Domain-Only Formatting:
- [ ] NO website contains "http://" or "https://"
- [ ] NO website contains "www."
- [ ] NO website contains "/" (paths)
- [ ] NO website contains "?" or "#" (query params/fragments)
- [ ] Every website is JUST the root domain (e.g., "company.com")

✅ Source vs Website Verification:
- [ ] Every "website" is a COMPANY domain (donandmillies.com, runza.com)
- [ ] NO "website" contains source domains (mashed.com, wikipedia.org, thetakeout.com, etc.)
- [ ] Every "source" is a FULL URL (https://mashed.com/article/...)
- [ ] NO "source" is just text like "Mashed" or "Wikipedia"
- [ ] I found company websites SEPARATELY from where I found the info

**If I couldn't verify a company's website → I used "N/A"**

**SIGNAL FIELDS EXPLAINED:**

For EVERY company, you MUST include these three signal fields:

1. **signalType**: What type of business activity was found
   - Values: "funding", "hiring", "product_launch", "expansion", "partnership", "press_mention", "acquisition", "regulatory_filing", "none"
   - If multiple signals exist, choose the MOST RELEVANT to the user's search
   - If no specific signal found, use "none"

2. **signalData**: Object with signal-specific details
   - Structure varies by signalType (see examples below)
   - Include all available relevant details
   - Can be empty object {} if signalType is "none"

3. **signalDate**: When the signal occurred
   - Format: "November 2024" or "2024-11-25" (prefer specific dates when available)
   - Use the date of the signal event, not today's date
   - Can be "N/A" if date unavailable

**SIGNAL DATA STRUCTURES BY TYPE:**

**FUNDING Signal:**
{
  "signalType": "funding",
  "signalData": {
    "stage": "Series A",
    "amount": "$15M",
    "investors": ["Sequoia Capital", "a16z"],
    "leadInvestor": "Sequoia Capital"
  },
  "signalDate": "October 2024"
}

**HIRING Signal:**
{
  "signalType": "hiring",
  "signalData": {
    "jobCount": "15 open positions",
    "departments": ["Engineering", "Sales"],
    "seniority": "Senior and Executive roles",
    "growthIndicator": "Expanding team rapidly"
  },
  "signalDate": "November 2024"
}

**PRODUCT_LAUNCH Signal:**
{
  "signalType": "product_launch",
  "signalData": {
    "productName": "API v2.0",
    "type": "New feature release",
    "platform": "Product Hunt",
    "reception": "500+ upvotes, #1 product of day"
  },
  "signalDate": "2024-11-15"
}

**EXPANSION Signal:**
{
  "signalType": "expansion",
  "signalData": {
    "type": "Geographic expansion",
    "details": "Opened London office",
    "market": "European market entry",
    "scale": "20-person team"
  },
  "signalDate": "September 2024"
}

**PARTNERSHIP Signal:**
{
  "signalType": "partnership",
  "signalData": {
    "partner": "Salesforce",
    "type": "Integration partnership",
    "scope": "Native integration in AppExchange",
    "value": "Access to Salesforce customer base"
  },
  "signalDate": "August 2024"
}

**PRESS_MENTION Signal:**
{
  "signalType": "press_mention",
  "signalData": {
    "publication": "TechCrunch",
    "type": "Feature article",
    "topic": "AI innovation award winner",
    "significance": "Industry recognition"
  },
  "signalDate": "2024-11-01"
}

**ACQUISITION Signal:**
{
  "signalType": "acquisition",
  "signalData": {
    "type": "Acquired company",
    "target": "DataFlow Inc",
    "value": "$25M",
    "reason": "Expand data infrastructure capabilities"
  },
  "signalDate": "July 2024"
}

**REGULATORY_FILING Signal:**
{
  "signalType": "regulatory_filing",
  "signalData": {
    "filingType": "Form D (Reg D)",
    "filingDate": "2024-11-25",
    "offeringAmount": "$5,000,000",
    "amountSold": "$2,500,000",
    "rule": "Rule 506(b)",
    "useOfProceeds": "Working capital and product development"
  },
  "signalDate": "2024-11-25"
}

**DATA TO EXTRACT FROM FORM D FILINGS:**

Required fields (available in all Form D filings):
  - **companyName**: Exact legal name from filing
  - **filingDate**: When filed with SEC (format: "YYYY-MM-DD")
  - **offeringAmount**: Total amount company is raising
  - **Company address**: City and State (for "country" field)
  - **Industry**: Industry description or SIC code

Optional fields (if available in filing):
  - **amountSold**: Amount already raised at time of filing
  - **useOfProceeds**: What money will be used for
  - **rule**: Usually "Rule 506(b)" or "Rule 506(c)"
  - **accessionNumber**: Unique SEC filing ID

**Complete Output Format for Form D Filing:**

{
  "companyName": "Acme Technologies Inc.",
  "description": "Filed Form D to raise $5M for business expansion",
  "signalType": "regulatory_filing",
  "signalData": {
    "filingType": "Form D (Reg D)",
    "filingDate": "2024-11-25",
    "offeringAmount": "$5,000,000",
    "amountSold": "$2,500,000",
    "rule": "Rule 506(b)",
    "useOfProceeds": "Working capital and product development"
  },
  "signalDate": "2024-11-25",
  "fundingStage": "N/A",
  "fundingAmount": "N/A",
  "fundingDate": "N/A",
  "activityDate": "2024-11-25",
  "foundedYear": "N/A",
  "industry": "Technology",
  "country": "United States",
  "website": "acmetechnologies.com",
  "employeeCount": "N/A",
  "source": "SEC EDGAR",
  "leadScore": 90
}

**HANDLING IPO FILINGS (FORM S-1):**

Query: "Companies that filed for IPO"
→ Filing type: Form S-1 (IPO registration)
→ Find: Companies planning to go public
→ Source: SEC EDGAR Form S-1 filings

Query: "Recent IPO filings"
→ Filing type: Form S-1
→ Timeframe: Last 90 days (IPO process is longer)
→ Find: Companies in IPO pipeline

Query: "Tech companies filing for IPO"
→ Filing type: Form S-1
→ Industry: Technology
→ Find: Tech companies going public

**IPO Filing Data to Extract:**

{
  "companyName": "TechCorp Inc.",
  "description": "Filed for IPO on NASDAQ, planning $200M offering",
  "signalType": "regulatory_filing",
  "signalData": {
    "filingType": "Form S-1 (IPO Registration)",
    "filingDate": "2024-10-15",
    "offeringAmount": "$200,000,000",
    "intendedExchange": "NASDAQ",
    "underwriters": "Goldman Sachs, Morgan Stanley"
  },
  "signalDate": "2024-10-15",
  "fundingStage": "IPO",
  "fundingAmount": "$200M",
  "fundingDate": "N/A",
  "activityDate": "2024-10-15",
  "foundedYear": "2015",
  "industry": "Technology",
  "country": "United States",
  "website": "techcorp.com",
  "employeeCount": "500-1000",
  "source": "SEC EDGAR",
  "leadScore": 95
}

**IPO vs Form D:**
- Form D: Private placement (not going public)
- Form S-1: IPO registration (going public)
- Both indicate capital raising but different contexts
- IPO filings are extremely valuable leads (major budget, high visibility)

**CRITICAL: Website Field for Regulatory Filings**

Form D filings DON'T include company websites. You MUST:
  1. Extract company name from filing
  2. Search separately: "[company name] official website"
  3. Verify it's the correct company (match location, industry)
  4. Include website in output
  5. If cannot find → "N/A"

Example:
  - Filing shows: "Acme Technologies Inc, Austin TX"
  - Search: "Acme Technologies Austin TX website"
  - Verify: Company in Austin, tech industry
  - Result: acmetechnologies.com

**Do NOT:**
  - Make up website URLs
  - Use generic domains
  - Skip website lookup entirely
  - Use sec.gov or filing URLs as company website

**NO Signal Found:**
{
  "signalType": "none",
  "signalData": {},
  "signalDate": "N/A"
}

**IMPORTANT SIGNAL RULES:**

✅ Every company MUST have signal fields (even if "none")
✅ Choose signalType based on what user is searching for
✅ If user searches "hiring", prioritize hiring signal over funding signal
✅ If user searches "launched", prioritize product_launch signal
✅ signalData structure should match the examples above
✅ Include as much detail as you can find in signalData
✅ signalDate should be the actual event date, not discovery date
✅ If company has multiple signals, choose the most recent or most relevant
✅ For general searches without signal keywords, use funding signal if available, otherwise "none"

### ✅ Search Intent Matching - FINAL CHECK

Before submitting, verify:
- [ ] I understood whether this is a funding-focused search or not
- [ ] If NOT funding-focused: I included companies regardless of funding status
- [ ] If funding-focused: I only included companies with funding data
- [ ] I didn't exclude relevant companies just because they lack funding info
- [ ] Companies match the ACTUAL search criteria (industry, location, type)
- [ ] Lead scores reflect relevance, not just funding status

### ✅ Timeframe Compliance Check

- [ ] I identified the timeframe requirement: ${filters.timeframe || 'Any Time'}
- [ ] For time-specific searches (24h, 48h, 7d): I verified ALL results fall within the window
- [ ] For "Before 2015": I verified ALL companies were founded before 2015
- [ ] For year-specific searches: I verified ALL results match the year(s)
- [ ] For "Any Time": I included companies regardless of age or activity date
- [ ] I included activityDate and foundedYear in my output
- [ ] I did NOT apply hidden date filters when "Any Time" was selected

${['24h', '48h', '7d', '30d', '90d'].includes(filters.timeframe) ?
                    `If timeframe is "${filters.timeframe}" and today is ${new Date().toISOString().split('T')[0]}:
  → Cutoff date is ${new Date(Date.now() - (filters.timeframe === '24h' ? 1 : filters.timeframe === '48h' ? 2 : filters.timeframe === '7d' ? 7 : filters.timeframe === '30d' ? 30 : 90) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
  → ALL results must have activity after this cutoff
  → If ANY result is older → I MUST REMOVE IT` :
                    filters.timeframe === 'before-2015' ?
                      `If timeframe is "Before 2015":
  → ALL companies must be founded before 2015
  → Look for founding years: 2014, 2010, 2000, 1995, etc.
  → If ANY company is founded 2015 or later → I MUST REMOVE IT` :
                      `If timeframe is "Any Time":
  → NO restrictions on dates
  → I have NOT excluded based on age
  → I have mixed old and new companies freely`}

### ✅ Company Age Compliance

- [ ] I identified the company age requirement: ${filters.companyAge || 'Any'}
- [ ] For "new": ALL companies are founded 2023-2025
- [ ] For "growing": ALL companies are founded 2020-2022
- [ ] For "established": ALL companies are founded 2015-2019
- [ ] For "mature": ALL companies are founded 2014 or earlier
- [ ] For "Any": I included companies of all ages
- [ ] I included foundedYear for EVERY company (or "N/A" if unavailable)
- [ ] I calculated company age correctly based on FOUNDING date, not funding date
- [ ] I did NOT confuse "recently funded" with "recently founded"

**Common Mistakes to Avoid:**

❌ Confusing founding year with funding year
  → A company founded in 2010 that raised money in 2024 is 14 years old, not new

❌ Excluding old companies from "Any" searches
  → When age is "Any", include 50-year-old companies alongside new startups

❌ Including wrong ages
  → If filter is "established" (6-10 years), don't include 15-year-old companies

**TIMEFRAME EXAMPLES - CORRECT BEHAVIOR:**

Scenario 1: User searches "Reg D filings last 48 hours"
- Timeframe: 48h
- Today: ${new Date().toISOString().split('T')[0]}
- Cutoff: ${new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().split('T')[0]}
- CORRECT: Return companies that filed on ${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]} or ${new Date().toISOString().split('T')[0]}
- WRONG: Return companies that filed on ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}

Scenario 2: User searches "AI companies" with no timeframe
- Timeframe: Any Time
- CORRECT: Return OpenAI (2015), Anthropic (2021), DeepMind (2010), new startups (2024)
- WRONG: Return only 2024-2025 companies

Scenario 3: User searches "Established restaurants"
- Timeframe: Auto-detect "before-2015"
- CORRECT: Return restaurants founded 2014, 2010, 2000, 1990, 1950
- WRONG: Return restaurants founded 2020, 2023

Scenario 4: User searches "Product launches" + Timeframe: "Last 7 Days"
- Today: ${new Date().toISOString().split('T')[0]}
- Cutoff: ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
- CORRECT: Return products launched ${new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} to ${new Date().toISOString().split('T')[0]}
- WRONG: Return products launched ${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}

Scenario 5: User searches "SaaS companies" + Timeframe: "2020-2023"
- CORRECT: Return SaaS companies founded in 2020, 2021, 2022, 2023
- WRONG: Return companies founded in 2019 or 2024

### ✅ Signal Matching Check

Before submitting, verify signal alignment:
- [ ] I identified what signal(s) the user is searching for based on keywords
- [ ] For FUNDING searches (keywords: "funded", "raised", "investment"): signalType is "funding" with complete funding data
- [ ] For HIRING searches (keywords: "hiring", "jobs", "recruiting"): signalType is "hiring" with job/recruiting details
- [ ] For PRODUCT searches (keywords: "launched", "product launch", "Product Hunt"): signalType is "product_launch" with launch details
- [ ] For EXPANSION searches (keywords: "expansion", "new office", "new market"): signalType is "expansion" with growth details
- [ ] For PARTNERSHIP searches (keywords: "partnership", "integration", "collaboration"): signalType is "partnership" with partner info
- [ ] For PRESS searches (keywords: "featured", "award", "press"): signalType is "press_mention" with publication details
- [ ] For ACQUISITION searches (keywords: "acquired", "acquisition", "M&A"): signalType is "acquisition" with M&A details
- [ ] For REGULATORY searches (keywords: "Form D", "Reg D", "SEC filing"): signalType is "regulatory_filing" with filing details
- [ ] For general searches (no signal keywords): Used most relevant signal found or "none"
- [ ] ALL companies have signalType, signalData, and signalDate fields (no missing fields)
- [ ] signalData structure matches the correct format for the signalType (see examples above)
- [ ] I did NOT return companies with wrong signal types (e.g., funding signal when user searched for hiring)
- [ ] If no signal found, I used signalType "none" with empty signalData {}

**Signal Priority Rules:**
- If user searches with signal keywords → Match that signal type
- If multiple signals exist → Choose the one matching user's search
- If no signal keywords → Use funding signal if available, otherwise "none"
- Never mix signals (one signalType per company in results)

### ✅ Regulatory Filing Basic Check

For regulatory filing searches (Form D, Reg D, SEC filings):

- [ ] I searched SEC EDGAR or reliable filing sources
- [ ] All filings are real and verifiable in SEC database
- [ ] Filing dates match the timeframe requirement EXACTLY
- [ ] For "last 24h/48h": I calculated exact cutoff from today: ${new Date().toISOString().split('T')[0]}
- [ ] ALL filings are within the date window (strictly enforced)
- [ ] Company names are exact legal names from filing
- [ ] Offering amounts are from actual filings (not estimated)
- [ ] I looked up company websites separately (filings don't include websites)
- [ ] If website not found → Marked as "N/A"
- [ ] signalType = "regulatory_filing" for ALL results
- [ ] signalData includes: filingType, filingDate, offeringAmount
- [ ] signalDate matches filingDate precisely
- [ ] Source = "SEC EDGAR" or verified filing source
- [ ] I did NOT include filings outside the timeframe

**Common filing mistakes to avoid:**

❌ Including filings outside the requested timeframe
❌ Making up filing amounts or data
❌ Using wrong company website (or sec.gov URLs)
❌ Confusing filing date with first sale date
❌ Including non-existent or fake filings
❌ Missing the website lookup step
❌ Using funding-related fields for regulatory filings (fundingStage, fundingAmount should be "N/A")

### ✅ Advanced Filing Filter Check

For regulatory filing searches with multiple criteria (industry + amount + location + age):

- [ ] Industry filtering applied correctly
  → If "fintech" → ALL results are financial technology companies
  → If "healthcare" → ALL results are healthcare/biotech
  → Used SIC codes or keywords to verify industry

- [ ] Amount filtering applied correctly
  → If "over $10M" → ALL offerings are ≥ $10,000,000
  → If "$1M-$5M" → ALL offerings are in range ($1M to $5M)
  → If "small" → ALL offerings under $2M
  → If "large" → ALL offerings $20M+
  → Used TOTAL OFFERING AMOUNT (not amount sold)

- [ ] Location filtering applied correctly
  → If "California" → ALL companies located in CA
  → If "San Francisco" → ALL companies in San Francisco
  → Matched on city/state from filing address

- [ ] Timeframe still enforced strictly
  → If "last 48 hours" → ALL filings within 48h window
  → Combined with other filters (AND logic)
  → No old filings slipped through

- [ ] Age filtering (if specified)
  → If "new startups" → Companies founded 2023-2025
  → If "established" → Companies founded 2015-2019
  → Combined with filing requirement

- [ ] ALL criteria satisfied simultaneously (AND logic)
  → Every filter requirement met for EVERY result
  → No partial matches included
  → No results that fail any single criterion

- [ ] IPO filings (Form S-1) handled correctly
  → If "IPO" → filingType is "Form S-1 (IPO Registration)"
  → Lead score reflects IPO value (95-100)
  → intendedExchange and underwriters included

**Final Verification for Complex Queries:**

For query "Reg D filings last 48 hours fintech over $5M":
  - [ ] ALL filings are from last 48 hours ✓
  - [ ] ALL companies are fintech ✓
  - [ ] ALL offerings are ≥ $5M ✓
  - [ ] NO results fail any of the 3 criteria ✓

### ✅ CRITICAL: Query Matching Check

**USER'S ACTUAL QUERY: "${enhancedQuery}"**

BEFORE submitting results, verify:

- [ ] I read the user's actual search query: "${enhancedQuery}"
- [ ] I understood what type of companies they want
- [ ] I did NOT assume they want startups unless they said "startups"
- [ ] I did NOT require funding data unless they searched for funding terms
- [ ] I matched the query EXACTLY, not what I think they might want
- [ ] Every company I returned actually matches "${enhancedQuery}"

**EXAMPLE VALIDATION CHECKS:**

If query is "restaurants in NYC":
  ✅ All results are NYC restaurants (NOT tech startups)
  ✅ Funding is N/A (restaurants don't need VC funding)
  ✅ Sources: Yelp, local business journals, restaurant industry publications
  ❌ NOT: Tech startups, funded companies, TechCrunch articles

If query is "AI companies":
  ✅ All results are AI/ML companies (any type, any funding status)
  ✅ Mix of startups AND established companies
  ✅ Funding optional (some funded, some not)
  ❌ NOT: Only VC-backed startups, only funded companies

If query is "recently funded fintech":
  ✅ All results have recent funding data (funding REQUIRED)
  ✅ All results are fintech
  ✅ Funding from 2024-2025
  ❌ NOT: Companies without funding, old funding rounds

If query is "manufacturing businesses":
  ✅ All results are manufacturing companies (NOT tech, NOT startups)
  ✅ Funding optional (likely bootstrapped/traditional)
  ✅ Sources: Industry publications, business directories
  ❌ NOT: Tech companies, funded startups, SaaS companies

If query is "plumbing companies Texas":
  ✅ All results are plumbing/trade businesses in Texas
  ✅ Traditional service businesses (NOT startups)
  ✅ Funding N/A (not VC-backed)
  ❌ NOT: Tech companies, startups, funded companies

**FINAL CHECK:**
- Is this query about STARTUPS? ${isSearchingForStartups ? 'YES' : 'NO'}
- Is this query about FUNDING? ${isSearchingForFunding ? 'YES' : 'NO'}
- Query type: ${isSearchingForStartups ? 'STARTUP-FOCUSED' : isSearchingForFunding ? 'FUNDING-FOCUSED' : 'GENERAL BUSINESS SEARCH'}

${!isSearchingForStartups && !isSearchingForFunding ? '⚠️ This is a GENERAL business search - DO NOT require startup status or funding!' : ''}

CRITICAL: ${batchSize} companies, all criteria matched, diverse sources, verified data.`
              }
            ]
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`Batch ${batchNum} Claude API error:`, errorData);
          throw new Error(`Claude API error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();

        console.log('\n✅ CLAUDE RESPONDED:');
        console.log('  Response received successfully');

        const textContent = data.content.find(block => block.type === 'text');

        if (!textContent) {
          throw new Error('No text content in response');
        }

        let responseText = textContent.text;
        console.log('  Response length:', responseText.length, 'characters');
        console.log('  First 200 chars:', responseText.substring(0, 200).replace(/\n/g, ' '));
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          responseText = jsonMatch[0];
        }

        // Clean up common JSON issues
        responseText = responseText
          .replace(/,\s*}/g, '}')  // Remove trailing commas before }
          .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
          .replace(/\n/g, ' ')     // Replace newlines with spaces
          .replace(/\r/g, '')      // Remove carriage returns
          .trim();

        let parsedData;
        try {
          parsedData = JSON.parse(responseText);
        } catch (parseError) {
          console.error(`Batch ${batchNum} JSON Parse Error:`, parseError.message);
          console.error('Problematic JSON:', responseText.substring(0, 500));
          console.warn(`⚠️ Batch ${batchNum} failed due to JSON parse error, but continuing with other batches...`);
          return { success: false, leads: [] };
        }

        if (!parsedData.leads || !Array.isArray(parsedData.leads)) {
          console.warn(`⚠️ Batch ${batchNum} returned invalid data format, but continuing with other batches...`);
          return { success: false, leads: [] };
        }

        console.log('\n📊 PARSED LEADS:');
        console.log('  Total leads from Claude:', parsedData.leads.length);
        if (parsedData.leads.length > 0) {
          console.log('  First lead:', JSON.stringify(parsedData.leads[0], null, 2).substring(0, 300) + '...');
        }

        console.log(`✅ Batch ${batchNum} complete: ${parsedData.leads.length} leads`);
        return { success: true, leads: parsedData.leads };

      } catch (error) {
        console.error(`❌ Batch ${batchNum} failed:`, error.message);
        console.warn(`Continuing with other batches...`);
        return { success: false, leads: [] };
      }
    };

    // Execute all batches in parallel using Promise.all()
    const batchPromises = Array.from({ length: numBatches }, (_, i) => processBatch(i));
    const batchResults = await Promise.all(batchPromises);

    // Collect leads from all successful batches
    for (const result of batchResults) {
      if (result.success && result.leads.length > 0) {
        allLeads.push(...result.leads);
      }
    }

    const endTime = Date.now();
    const totalTime = ((endTime - startTime) / 1000).toFixed(1);
    const successfulBatches = batchResults.filter(r => r.success).length;

    console.log(`\n⚡ PARALLEL PROCESSING COMPLETE:`);
    console.log(`   Total time: ${totalTime} seconds`);
    console.log(`   Successful batches: ${successfulBatches}/${numBatches}`);
    console.log(`   Total leads: ${allLeads.length}`);
    console.log(`   Speed: ~${(allLeads.length / parseFloat(totalTime)).toFixed(1)} leads/second\n`);

    console.log(`Total leads generated: ${allLeads.length}`);

    // Apply ICP filter if needed
    let filteredLeads = allLeads;
    if (filters.icp && filteredLeads.length > 0) {
      filteredLeads = filteredLeads.filter(lead => {
        const employeeCount = lead.employeeCount.toLowerCase();
        if (filters.icp.includes('Enterprise') && (employeeCount.includes('1000') || employeeCount.includes('1,000'))) return true;
        if (filters.icp.includes('Mid-Market') && (employeeCount.includes('200') || employeeCount.includes('500') || employeeCount.includes('999'))) return true;
        if (filters.icp.includes('SMB') && (employeeCount.includes('50') || employeeCount.includes('100') || employeeCount.includes('199'))) return true;
        if (filters.icp.includes('Startup') && (employeeCount.includes('1-') || employeeCount.includes('10') || employeeCount.includes('20') || employeeCount.includes('49'))) return true;
        return false;
      });
    }

    // Remove duplicates based on company name
    const uniqueLeads = [];
    const seenNames = new Set();

    for (const lead of filteredLeads) {
      const normalizedName = lead.companyName.toLowerCase().trim();
      if (!seenNames.has(normalizedName)) {
        seenNames.add(normalizedName);
        uniqueLeads.push(lead);
      }
    }

    // Validate and fix website vs source confusion
    uniqueLeads = validateAndFixWebsites(uniqueLeads);

    console.log(`Returning ${uniqueLeads.length} unique leads`);

    console.log(`⏱️  [${((Date.now() - searchStartTime) / 1000).toFixed(1)}s] Sending response`);

    console.log('\n📤 SENDING RESPONSE:');
    console.log('  Success: true');
    console.log('  Final lead count:', uniqueLeads.length);
    console.log('  Total search time:', ((Date.now() - searchStartTime) / 1000).toFixed(1), 'seconds');
    if (uniqueLeads.length > 0) {
      console.log('  Sample lead:', uniqueLeads[0].companyName);
    }
    console.log('='.repeat(80) + '\n');

    return res.json({
      success: true,
      leads: uniqueLeads,
      totalFound: uniqueLeads.length
    });

  } catch (error) {
    console.error('Error in search-leads:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// SSE Streaming endpoint for progressive loading
app.get('/api/search-stream', async (req, res) => {
  const { searchQuery, filters: filtersJSON } = req.query;

  // Parse filters from query string
  const filters = JSON.parse(filtersJSON || '{}');

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  console.log('\n🌊 STREAMING SEARCH:', searchQuery);
  console.log('Filters:', JSON.stringify(filters, null, 2));

  const searchStartTime = Date.now();

  try {
    // Don't add any default - use exactly what user typed
    if (!searchQuery || searchQuery.trim() === '') {
      res.write(`data: ${JSON.stringify({ error: 'Please enter a search query' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    let enhancedQuery = searchQuery.trim();

    // Only add funding-related terms if user is searching for funding
    const fundingKeywords = ['funded', 'funding', 'raised', 'investment', 'series', 'seed', 'venture', 'capital'];
    const isSearchingForFunding = fundingKeywords.some(keyword =>
      searchQuery.toLowerCase().includes(keyword)
    ) || filters.fundingStage;

    // Only add startup terms if user mentions startups
    const startupKeywords = ['startup', 'startups'];
    const isSearchingForStartups = startupKeywords.some(keyword =>
      searchQuery.toLowerCase().includes(keyword)
    );

    // Build query based on what user is actually searching for
    if (filters.industry) {
      enhancedQuery += ` ${filters.industry}`;
    }

    if (filters.country) {
      enhancedQuery += ` in ${filters.country}`;
    }

    // Only add funding terms if relevant
    if (isSearchingForFunding) {
      if (filters.fundingStage) {
        enhancedQuery += ` ${filters.fundingStage}`;
      }
      enhancedQuery += ' funding investment raised capital 2024 2025';
    }

    // Only add startup terms if user mentioned startups
    if (isSearchingForStartups) {
      enhancedQuery += ' startup entrepreneurship';
    }

    console.log('Enhanced query:', enhancedQuery);
    console.log('Starting 2 batches in parallel (reduced for Vercel timeout)...');

    // Generate leads in batches for progressive loading
    const batchSize = 10;
    const numBatches = 2; // Reduced from 5 to fit in Vercel's 10s timeout

    // Helper function to perform Tavily search
    const performSearch = async (query) => {
      try {
        const response = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            api_key: TAVILY_API_KEY,
            query: query,
            search_depth: "advanced",
            include_answer: true,
            max_results: 10
          })
        });

        if (!response.ok) {
          throw new Error(`Tavily API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Tavily search failed:', error);
        return null;
      }
    };

    // Create a function to process a single batch
    const processBatch = async (batchIndex) => {
      const batchNum = batchIndex + 1;
      console.log(`Batch ${batchNum}/${numBatches} starting...`);

      try {
        // Perform web search first
        const searchResults = await performSearch(enhancedQuery);
        const searchContext = searchResults ? JSON.stringify(searchResults.results) : "No search results available.";

        console.log(`Batch ${batchNum}: Got ${searchResults?.results?.length || 0} search results from Tavily`);

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 12000,
            messages: [
              {
                role: 'user',
                content: `════════════════════════════════════════════════════════════════════════════════
⚠️  CRITICAL REMINDER ⚠️

website = COMPANY'S WEBSITE (where THEY live) - ROOT DOMAIN ONLY!
  ✅ CORRECT: "openai.com", "stripe.com", "acme-ai.com"
  ❌ WRONG: "https://openai.com", "www.stripe.com", "acme-ai.com/about"

source = WHERE YOU FOUND THEM (article/database)
  Example: "TechCrunch", "Crunchbase", "Bloomberg"

DOMAIN-ONLY FORMATTING RULES:
✅ DO: Use just the root domain (e.g., "company.com")
❌ DON'T: Include protocols (http://, https://)
❌ DON'T: Include www. prefix
❌ DON'T: Include paths (/blog, /about, /news/article)
❌ DON'T: Include query params (?id=123)

NEVER put "techcrunch.com" in the website field!
NEVER put "crunchbase.com" in the website field!
NEVER put article URLs in the website field!

The website field is for THE COMPANY'S ROOT DOMAIN ONLY!
════════════════════════════════════════════════════════════════════════════════

You are a sales lead researcher finding relevant companies based on search criteria.

Your job is to find companies that match what the user is looking for, which may include:
- Recently funded companies (if user asks for funding)
- Companies of any age (new startups to established businesses)
- Companies in specific industries
- Companies in specific locations
- Companies matching specific criteria (size, type, stage)

DO NOT require that companies have recent funding unless the user specifically asks for it.

Search results from the web:
${searchContext}

User's search: "${searchQuery}"
Filters: ${JSON.stringify(filters)}

STRICT REQUIREMENTS:
1. Return EXACTLY ${batchSize} companies (no more, no less)
2. Each company must be UNIQUE (different from others in this batch and previous batches)
3. Each company must be REAL (from the search results provided)
4. Fill all fields with actual data (no "Not specified" or empty values)

${batchIndex > 0 ? `**BATCH ${batchIndex + 1} INSTRUCTIONS:**
This is batch ${batchIndex + 1} of ${numBatches}. Previous batches already returned other companies.
You MUST return ${batchSize} DIFFERENT companies than those in previous batches.
Use the search results to find new, unique companies.` : ''}

**WEBSITE FIELD - CRITICAL RULES:**

The website field is THE MOST IMPORTANT field for users. They will click "Visit Site" to go there.

✅ CORRECT - Real, verified company websites:
  - "openai.com" (verified company domain)
  - "anthropic.com" (verified company domain)
  - "stripe.com" (verified company domain)
  - "acme-corp.io" (if you can verify this company exists)

❌ WRONG - Never include these:
  - "N/A" is BETTER than a fake URL
  - Made-up URLs like "aicompany123.com" (if you can't verify it exists)
  - Placeholder URLs like "example.com", "company.com"
  - News article URLs like "techcrunch.com/article/company-raises-money"
  - Profile pages like "crunchbase.com/organization/company"
  - LinkedIn URLs like "linkedin.com/company/acme"
  - Social media like "twitter.com/company"
  - URLs from your training data that might not exist anymore

**HOW TO FIND REAL WEBSITES:**

⚠️ CRITICAL: Find the company's HOMEPAGE domain, NOT article URLs! ⚠️

**WRONG APPROACH - DON'T DO THIS:**
❌ You find article: "techcrunch.com/2024/acme-raises-funding"
❌ Extract domain: "techcrunch.com"
❌ This is the ARTICLE site, not the company!

❌ You find blog post: "medium.com/acme-blog/announcement"
❌ Extract domain: "medium.com"
❌ This is the BLOG platform, not the company!

**CORRECT APPROACH - DO THIS:**
✅ Article says: "Acme AI (acme-ai.com) raised $10M"
✅ Extract: "acme-ai.com"
✅ This IS the company's domain!

✅ Article says: "Visit Acme at www.acme-ai.com for more"
✅ Extract: "acme-ai.com" (strip www.)
✅ This IS the company's domain!

**STEP-BY-STEP:**

1. Check if the search results EXPLICITLY MENTION the company's official homepage
2. Look for URLs in format: "companyname.com", "company.io", "company.ai"
3. Verify the domain matches the company name
4. NEVER use the URL of the article itself
5. NEVER use blog platform URLs (medium.com, substack.com, etc.)
6. NEVER use news site URLs (techcrunch.com, bloomberg.com, etc.)
7. If you CANNOT find their ACTUAL HOMEPAGE → Use "N/A"

**VERIFICATION QUESTIONS:**

Before including a website, ask yourself:
- ❓ Is this the COMPANY'S homepage, not an article ABOUT them?
- ❓ Did the article explicitly mention this as their website?
- ❓ Does this domain match the company name?
- ❓ Am I 100% confident this is the real company homepage?

If you answer NO to any question → Use "N/A"

**CRITICAL RULE:**
"N/A" is INFINITELY BETTER than the wrong URL or an article URL.

IT IS BETTER TO PUT "N/A" THAN TO PUT A BLOG/ARTICLE URL!

A user clicking "Visit Site" should go to the COMPANY HOMEPAGE, not a news article.
Better to show "N/A" and let them Google it themselves.

**CRITICAL DISTINCTION: website vs source**

- **website**: The company's OFFICIAL website where THEY operate
  → Example: "openai.com" (OpenAI's website)
  → Example: "stripe.com" (Stripe's website)
  → Example: "acme-ai.com" (Acme AI's website)

- **source**: Where YOU found this information (the article/database)
  → Example: "TechCrunch" (you read about them on TechCrunch)
  → Example: "Crunchbase" (you found them in Crunchbase database)
  → Example: "Bloomberg" (you read about them in Bloomberg)

**NEVER CONFUSE THESE TWO!**

**CORRECT EXAMPLES:**

Example 1:
You find an article on TechCrunch about "Acme AI" at the URL:
"techcrunch.com/2024/10/15/acme-ai-raises-10m"

CORRECT output:
{
  "companyName": "Acme AI",
  "website": "acme-ai.com",  // ← Company's website (find this separately)
  "source": "TechCrunch"     // ← Where you found the info
}

WRONG output:
{
  "companyName": "Acme AI",
  "website": "techcrunch.com",  // ❌ NO! That's the source, not company
  "source": "TechCrunch"
}

Example 2:
You find "Stripe" information on Crunchbase at:
"crunchbase.com/organization/stripe"

CORRECT output:
{
  "companyName": "Stripe",
  "website": "stripe.com",       // ← Company's actual website
  "source": "Crunchbase"         // ← Where you found them
}

WRONG output:
{
  "companyName": "Stripe",
  "website": "crunchbase.com",   // ❌ NO! That's where you found them
  "source": "Crunchbase"
}

Example 3:
You find "OpenAI" in a Bloomberg article that mentions their website:

CORRECT output:
{
  "companyName": "OpenAI",
  "website": "openai.com",       // ← Company's website mentioned in article
  "source": "Bloomberg"          // ← Where you found this info
}

**HOW TO FIND THE COMPANY'S ACTUAL WEBSITE:**

⚠️ CRITICAL: Find the company's HOMEPAGE domain, NOT article URLs! ⚠️

**WRONG APPROACH - DON'T DO THIS:**
❌ You find article: "techcrunch.com/2024/acme-raises-funding"
❌ Extract domain: "techcrunch.com"
❌ This is the ARTICLE site, not the company!

❌ You find blog post: "medium.com/acme-blog/announcement"
❌ Extract domain: "medium.com"
❌ This is the BLOG platform, not the company!

**CORRECT APPROACH - DO THIS:**
✅ Article says: "Acme AI (acme-ai.com) raised $10M"
✅ Extract: "acme-ai.com"
✅ This IS the company's domain!

✅ Article says: "Visit Acme at www.acme-ai.com for more"
✅ Extract: "acme-ai.com"
✅ This IS the company's domain!

Step 1: Find the company in search results

Step 2: Look for their official HOMEPAGE domain (NOT article URLs):
  ✅ Article explicitly mentions: "Visit them at acme-ai.com"
  ✅ Article explicitly mentions: "Learn more at company.com"
  ✅ Search result snippet shows: "acme-ai.com - AI Analytics Platform"
  ✅ Search result directly shows their homepage domain
  ✅ Company is well-known: (OpenAI → openai.com, Stripe → stripe.com)

  ❌ NEVER use the URL of the article itself
  ❌ NEVER use the URL of a blog platform
  ❌ NEVER use the URL of a news site
  ❌ NEVER guess the domain from company name

Step 2.5: EXTRACT ROOT DOMAIN ONLY (no protocols, no paths, no www):

If you find a full URL, extract ONLY the root domain:

  Input URL                              →  Output (website field)
  ────────────────────────────────────────────────────────────────
  "https://acme-ai.com"                 →  "acme-ai.com"
  "http://www.stripe.com"               →  "stripe.com"
  "https://openai.com/blog/announcement"→  "openai.com"
  "www.company.com/about"               →  "company.com"
  "startup.io/products?ref=123"         →  "startup.io"
  "https://www.example.com/page#hash"   →  "example.com"

ALWAYS strip:
  ❌ Protocols (https://, http://)
  ❌ www. prefix
  ❌ Paths (/blog, /about, /products)
  ❌ Query params (?ref=123, ?id=456)
  ❌ Hash fragments (#section)

Step 3: Verify the website makes sense:
  ✅ Domain matches company name (Acme AI → acme-ai.com)
  ✅ Domain looks like a business website (.com, .io, .ai, .co)
  ✅ NOT a news site (techcrunch.com, bloomberg.com)
  ✅ NOT a database (crunchbase.com, pitchbook.com)
  ✅ NOT a profile page (linkedin.com/company/acme)

Step 4: If you CANNOT find their ACTUAL HOMEPAGE domain:
  → Use "N/A" ✅ (This is PERFECTLY ACCEPTABLE)
  → DON'T use the article URL ❌
  → DON'T use the blog platform URL ❌
  → DON'T use the database URL ❌
  → DON'T use the news site URL ❌
  → DON'T guess or make up a domain ❌
  → DON'T extract domain from article URLs ❌

**IT IS BETTER TO PUT "N/A" THAN TO PUT THE WRONG WEBSITE!**

If the article/search result doesn't explicitly mention the company's homepage:
  → website: "N/A" ✅

Only put a domain if you are 100% certain it's THE COMPANY'S HOMEPAGE.

**REMEMBER:**
- website = WHERE THE COMPANY IS (their home on the internet)
- source = WHERE YOU FOUND INFO ABOUT THEM (article/database)

These are COMPLETELY DIFFERENT fields!

════════════════════════════════════════════════════════════════════════════════
⚠️⚠️⚠️ CRITICAL: DO NOT CONFUSE WEBSITE AND SOURCE ⚠️⚠️⚠️

**website** = THE COMPANY'S HOMEPAGE (where they operate their business)
  Examples: "donandmillies.com", "happyjoes.com", "runzarestaurant.com"

**source** = THE FULL URL WHERE YOU FOUND THIS INFORMATION (article/directory)
  Examples: "https://mashed.com/article/restaurant-chains",
            "https://thetakeout.com/best-midwest-restaurants",
            "https://en.wikipedia.org/wiki/Runza"

YOU MUST KEEP THESE SEPARATE!

For "Don & Millie's" found in a Mashed article:
  ✅ CORRECT:
     website: "donandmillies.com"     ← Company's homepage
     source: "https://mashed.com/article/midwest-restaurants"  ← Article URL

  ❌ WRONG:
     website: "mashed.com"            ← NO! That's the source!
     source: "Mashed"

For "Runza" found on Wikipedia:
  ✅ CORRECT:
     website: "runza.com"             ← Company's homepage
     source: "https://en.wikipedia.org/wiki/Runza"  ← Wikipedia page

  ❌ WRONG:
     website: "wikipedia.org"         ← NO! That's the source!
     source: "Wikipedia"

RULE:
- website = Company domain ONLY (donandmillies.com, runza.com)
- source = FULL URL where you found this info (https://mashed.com/article/...)
════════════════════════════════════════════════════════════════════════════════

Return data in this EXACT JSON format:
{
  "leads": [
    {
      "companyName": "Exact company name",
      "description": "What the company does (1-2 sentences)",
      "industry": "Primary industry",
      "fundingAmount": "e.g., $5M or N/A",
      "fundingStage": "e.g., Series A, Seed, N/A",
      "fundingDate": "e.g., Nov 2024 or N/A",
      "country": "Country name",
      "companySize": "e.g., 1-50, 51-200, etc.",
      "website": "donandmillies.com",  // ← COMPANY'S HOMEPAGE ONLY (domain only, no paths)
      "source": "https://mashed.com/article/restaurant-chains-midwest",  // ← FULL URL WHERE YOU FOUND THIS
      "leadScore": 85
    }
  ]
}

**CRITICAL RULES:**

1. **website**: MUST be the company's actual homepage
   - Find their official website separately
   - Format: "companyname.com" (domain only, no paths)
   - If you cannot find it → "N/A"
   - NEVER use the article/source URL

2. **source**: MUST be the FULL URL where you found this information
   - Format: "https://mashed.com/article/best-restaurants"
   - Include the complete URL with https://
   - This is where the user can verify your information

**SELF-CHECK BEFORE SUBMISSION:**

✅ Website Verification:
- [ ] Every website is either a REAL company domain OR "N/A"
- [ ] I found each website URL in actual search results
- [ ] No made-up domains like "company123.com"
- [ ] No news article URLs like "techcrunch.com/article"
- [ ] No profile pages like "crunchbase.com/org/company"
- [ ] No placeholder domains like "example.com"
- [ ] I am 100% confident each website will work if clicked

✅ Domain-Only Formatting:
- [ ] NO website contains "http://" or "https://"
- [ ] NO website contains "www."
- [ ] NO website contains "/" (paths)
- [ ] NO website contains "?" or "#" (query params/fragments)
- [ ] Every website is JUST the root domain (e.g., "company.com")

✅ Source vs Website Verification:
- [ ] Every "website" is a COMPANY domain (donandmillies.com, runza.com)
- [ ] NO "website" contains source domains (mashed.com, wikipedia.org, thetakeout.com, etc.)
- [ ] Every "source" is a FULL URL (https://mashed.com/article/...)
- [ ] NO "source" is just text like "Mashed" or "Wikipedia"
- [ ] I found company websites SEPARATELY from where I found the info

**If I couldn't verify a company's website → I used "N/A"**`
              }
            ]
          })
        });

        const data = await response.json();

        if (data.content && data.content[0] && data.content[0].text) {
          const responseText = data.content[0].text;
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);

          if (jsonMatch) {
            const parsedData = JSON.parse(jsonMatch[0]);

            if (parsedData.leads && Array.isArray(parsedData.leads)) {
              console.log(`✅ Batch ${batchNum} completed: ${parsedData.leads.length} leads`);
              return parsedData.leads;
            }
          }
        }

        console.log(`❌ Batch ${batchNum} failed: Invalid response format`);
        return [];

      } catch (error) {
        console.error(`❌ Batch ${batchNum} error:`, error.message);
        return [];
      }
    };

    // Execute all batches in parallel and stream results as they complete
    const batchPromises = [];
    for (let i = 0; i < numBatches; i++) {
      batchPromises.push(
        processBatch(i).then(leads => {
          // Validate and fix website vs source confusion
          if (leads && leads.length > 0) {
            leads = validateAndFixWebsites(leads);

            // Stream this batch immediately when it completes
            res.write(`data: ${JSON.stringify({
              batch: i + 1,
              leads: leads,
              progress: Math.round(((i + 1) / numBatches) * 100)
            })}\n\n`);
          }
          return leads;
        })
      );
    }

    // Wait for all batches to complete
    await Promise.all(batchPromises);

    const totalTime = ((Date.now() - searchStartTime) / 1000).toFixed(1);
    console.log(`🏁 All batches completed in ${totalTime}s`);

    // Send completion signal
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('Error in search-stream:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Lead Scraper API is running' });
});

// Start server only if running directly (not imported by Vercel)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🚀 Lead Scraper Backend Server running on http://localhost:${PORT}`);
    console.log(`\nEndpoints:`);
    console.log(`  POST http://localhost:${PORT}/api/search-leads (batch mode)`);
    console.log(`  GET  http://localhost:${PORT}/api/search-stream (progressive SSE)`);
    console.log(`  GET  http://localhost:${PORT}/api/health`);
    console.log(`\n✅ Ready to receive search requests\n`);
  });
}

module.exports = app;
