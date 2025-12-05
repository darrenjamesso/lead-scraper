// Quick Test Script
// Run this to verify the backend is working: node test.js

const fetch = require('node-fetch');

console.log('🧪 Testing Lead Scraper Backend\n');

async function testBackend() {
  try {
    // Test 1: Health Check
    console.log('Test 1: Checking if backend is running...');
    const healthResponse = await fetch('http://localhost:3001/api/health');
    
    if (!healthResponse.ok) {
      throw new Error('Backend is not responding. Make sure to run "npm start" first!');
    }
    
    const healthData = await healthResponse.json();
    console.log('✅ Backend is running!');
    console.log(`   Status: ${healthData.status}\n`);

    // Test 2: Search for leads
    console.log('Test 2: Searching for AI startups...');
    const searchResponse = await fetch('http://localhost:3001/api/search-leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        searchQuery: 'AI startups',
        filters: {
          fundingStage: 'Series A',
          industry: 'AI/ML',
          country: '',
          icp: ''
        }
      })
    });

    if (!searchResponse.ok) {
      throw new Error('Search failed. Check backend logs for details.');
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.success) {
      throw new Error(`Search error: ${searchData.error}`);
    }

    console.log('✅ Search successful!');
    console.log(`   Found ${searchData.totalFound} leads\n`);

    // Display first 3 leads
    console.log('Preview of results:\n');
    searchData.leads.slice(0, 3).forEach((lead, index) => {
      console.log(`${index + 1}. ${lead.companyName}`);
      console.log(`   ${lead.fundingAmount} (${lead.fundingStage}) - ${lead.fundingDate}`);
      console.log(`   ${lead.website}`);
      console.log(`   Source: ${lead.source}\n`);
    });

    console.log('🎉 All tests passed!');
    console.log('\n✅ Your Lead Scraper is ready to use!');
    console.log('   Open the frontend to start finding leads.\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure backend is running: npm start');
    console.log('2. Check that port 3001 is available');
    console.log('3. Verify your API key is correct in server.js');
    console.log('4. Check backend terminal for error messages\n');
    process.exit(1);
  }
}

testBackend();
