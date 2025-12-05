// Test script to check if Tavily can find traditional business funding
require('dotenv').config();
const fetch = require('node-fetch');

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

async function testSearch() {
  const queries = [
    'restaurant franchise funding 2024',
    'retail store expansion investment 2024',
    'pizza chain investment 2024',
    'car wash business funding 2024',
    'retail business Series A 2024',
    'gym franchise investment 2024'
  ];

  for (const query of queries) {
    console.log(`\n========================================`);
    console.log(`Testing: ${query}`);
    console.log(`========================================`);

    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: TAVILY_API_KEY,
          query: query,
          search_depth: 'advanced',
          include_answer: true,
          max_results: 5
        })
      });

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        console.log(`✅ Found ${data.results.length} results`);
        console.log(`\nSample results:`);
        data.results.slice(0, 3).forEach((result, i) => {
          console.log(`\n${i+1}. ${result.title}`);
          console.log(`   URL: ${result.url}`);
          console.log(`   Snippet: ${result.content.substring(0, 150)}...`);
        });
      } else {
        console.log('❌ No results found');
      }
    } catch (error) {
      console.error('Error:', error.message);
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testSearch().catch(console.error);
