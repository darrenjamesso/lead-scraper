# 🔍 Universal Lead Scraper

AI-powered lead generation system that finds ANY type of company based on custom criteria. Get 50 structured, verified leads in under 2 minutes.

## 🎯 What It Does

Search for companies using natural language and get structured data including company name, website, industry, location, funding info, and more.

**Example Searches:**
- "AI startups Series A" → Recently funded AI companies
- "Established plumbing companies 10+ years" → Mature trade businesses
- "Reg D filings last 48 hours" → Recent SEC filings
- "Companies hiring AI engineers" → Active job postings
- "Restaurants in NYC" → Local businesses

## Prerequisites

Before running this application, you'll need:

1. **Anthropic API Key**
   - Sign up at [Anthropic Console](https://console.anthropic.com/)
   - Get your API key from the dashboard

2. **Tavily API Key**
   - Sign up at [Tavily](https://tavily.com/)
   - Get your API key for web search capabilities

3. **Node.js**
   - Version 14 or higher
   - Download from [nodejs.org](https://nodejs.org/)

## Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd lead-scraper-v3
   ```

2. Install dependencies for both server and client:
   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

3. Configure environment variables:
   - Create a `.env` file in the `server` directory
   - Add your API keys:
     ```env
     ANTHROPIC_API_KEY=your_anthropic_api_key_here
     TAVILY_API_KEY=your_tavily_api_key_here
     PORT=3000
     ```

4. Start the application:
   ```bash
   # In the server directory
   cd server
   npm run dev

   # In a new terminal, start the client
   cd client
   npm run dev
   ```

5. Access the application:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
# Force rebuild
