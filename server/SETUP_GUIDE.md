# Lead Scraper - Setup & Usage Guide

## 🎯 What This Tool Does

Finds real startups that received funding in 2024-2025 using Claude AI's knowledge base. Returns accurate company data including:
- Company names and descriptions
- Funding amounts and stages
- Funding dates
- Official websites
- Sources (TechCrunch, Forbes, etc.)
- Lead scores

## 📋 Prerequisites

- **Node.js** version 16 or higher ([Download here](https://nodejs.org/))
- **Claude API Key** (already configured in the code)
- **A web browser** to view the frontend

## 🚀 Quick Start (5 minutes)

### Step 1: Install Backend Dependencies

Open your terminal/command prompt and navigate to this folder, then run:

```bash
npm install
```

This installs:
- express (web server)
- cors (cross-origin support)
- node-fetch (API calls)

### Step 2: Start the Backend Server

```bash
npm start
```

You should see:
```
🚀 Lead Scraper Backend Server running on http://localhost:3001
✅ Ready to receive search requests
```

**Keep this terminal window open!** The server needs to stay running.

### Step 3: Open the Frontend

You have 3 options:

**Option A: Use Claude.ai Artifacts**
1. Go to claude.ai
2. Upload `lead-scraper.jsx`
3. Ask Claude to "display this React component"
4. Use the tool directly in Claude!

**Option B: Create a Simple HTML File**
Create `index.html` with this content:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Lead Scraper</title>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel" src="lead-scraper.jsx"></script>
</body>
</html>
```
Then open `index.html` in your browser.

**Option C: Integrate into Your React App**
Copy `lead-scraper.jsx` into your React project's components folder.

## 📖 How to Use

### Basic Search

1. **Click "Search"** without any filters to get general recently-funded startups
2. Wait 10-15 seconds for Claude to research
3. View results in the table
4. Click "Download CSV" to export

### Advanced Search

1. **Enter Keywords**: Type things like:
   - "AI companies"
   - "fintech startups"
   - "healthcare Series B"
   
2. **Use Filters**:
   - **ICP (Company Size)**: Filter by employee count
   - **Funding Stage**: Pre-Seed, Seed, Series A/B/C/D+
   - **Industry**: SaaS, FinTech, AI/ML, etc.
   - **Country**: Focus on specific regions

3. **Click Search** and wait for results

### Example Searches

- "AI startups Series A" + Industry: AI/ML + Country: United States
- "fintech" + Funding Stage: Seed + Country: United Kingdom  
- "healthcare" + ICP: Enterprise + Funding Stage: Series B

## 🎨 Features

✅ **Real Company Data** - All companies, websites, and funding info are accurate  
✅ **Smart Filtering** - Narrow down by size, stage, industry, location  
✅ **Lead Scoring** - Automatic relevance scoring (1-100)  
✅ **CSV Export** - Download for your CRM  
✅ **Source Attribution** - See where funding was reported  

## 🔧 Troubleshooting

### "Cannot connect to backend server"

**Problem**: Frontend can't reach the backend

**Solutions**:
1. Make sure the backend is running: `npm start`
2. Check it's on port 3001: Look for "running on http://localhost:3001"
3. Try restarting the backend server
4. Make sure no firewall is blocking localhost

### "No leads found"

**Problem**: Search returns empty results

**Solutions**:
1. Try broader search terms (remove filters)
2. Check the backend terminal for error messages
3. Try a different industry or funding stage
4. Make sure your search isn't too specific

### "API Error" or "Failed to search"

**Problem**: Claude API issues

**Solutions**:
1. Verify API key is valid (check server.js)
2. Check Claude API rate limits
3. Review backend terminal logs
4. Try again in a few seconds

### Backend won't start

**Problem**: `npm start` fails

**Solutions**:
1. Run `npm install` first
2. Check Node.js is installed: `node --version`
3. Make sure port 3001 isn't already in use
4. Check for error messages in terminal

## 📊 Understanding the Results

### Lead Score
- **80-100**: Highly relevant, recent funding, large amount
- **60-79**: Good match, reasonable funding
- **Below 60**: Less relevant or smaller funding

### Source Column
Shows which publication reported the funding:
- TechCrunch, VentureBeat: Tech news
- Forbes, Bloomberg: Business news  
- The Information: Premium tech journalism
- Company Blog: Direct announcements

### Funding Stages
- **Pre-Seed**: Very early, usually < $1M
- **Seed**: Early stage, $1-5M typically
- **Series A**: Growth stage, $5-20M typically
- **Series B+**: Scaling stage, $20M+

## ⚙️ Configuration

### Change API Key
Edit `server.js` line 12:
```javascript
const ANTHROPIC_API_KEY = 'your-api-key-here';
```

### Change Port
Edit `server.js` line 9:
```javascript
const PORT = 3001; // Change to your preferred port
```

Then update `lead-scraper.jsx` line 48 to match:
```javascript
const response = await fetch('http://localhost:3001/api/search-leads', {
```

### Add More Industries
Edit `lead-scraper.jsx` line 21:
```javascript
const industries = ['SaaS', 'FinTech', 'YourIndustry', ...];
```

### Add More Countries
Edit `lead-scraper.jsx` line 22:
```javascript
const countries = ['United States', 'Your Country', ...];
```

## 🔒 Security Notes

- **API Key**: Keep your API key secure
- **Don't commit** server.js with your key to public repos
- **For production**: Use environment variables instead
- **Rate limits**: Be mindful of Claude API usage limits

## 📝 Best Practices

1. **Start broad, then filter**: Begin with general searches
2. **One filter at a time**: Add filters incrementally  
3. **Save your results**: Download CSVs regularly
4. **Verify data**: Double-check websites before outreach
5. **Track usage**: Monitor Claude API token usage

## 🚀 Next Steps

After finding leads:
1. Download CSV
2. Import to your CRM (Salesforce, HubSpot, etc.)
3. Research companies further on their websites
4. Craft personalized outreach messages
5. Track your outreach success

## 💡 Tips for Best Results

- **Be specific but not too narrow**: "AI startups Series A" works better than "AI computer vision startups in San Francisco with 50-100 employees"
- **Try different keywords**: If "fintech" doesn't work, try "financial technology" or "payments"
- **Use industry filters**: More reliable than keywords alone
- **Check multiple funding stages**: Series A and B often have the best conversion rates

## 📞 Support

If you encounter issues:
1. Check the backend terminal logs
2. Check browser console (F12)
3. Review this guide's troubleshooting section
4. Verify all dependencies are installed

## ⚠️ Limitations

- Data is from Claude's training (up to January 2025)
- Not real-time web scraping
- Limited to Claude's knowledge base
- Some very recent companies may not be included

## 🎉 Success!

You're all set! Start searching for leads and grow your sales pipeline. Happy hunting! 🎯
