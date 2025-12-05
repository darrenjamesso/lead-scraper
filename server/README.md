# Lead Scraper - Real Startup Funding Data

A professional lead generation tool that searches the web for recently funded startups using Claude AI with web search capabilities.

## Features

- ✅ **Real Data**: Searches actual web sources for verified funding announcements
- 🔍 **Smart Filtering**: Filter by funding stage, industry, country, and company size
- 📊 **Detailed Insights**: Get company descriptions, funding amounts, dates, and sources
- 📥 **CSV Export**: Download all leads for easy import into your CRM
- 🎯 **Lead Scoring**: Automatic scoring based on relevance and funding recency

## Architecture

This application consists of two parts:

1. **Frontend (React)**: `lead-scraper.jsx` - User interface
2. **Backend (Node.js)**: `server.js` - Handles Claude API calls with web search

## Setup Instructions

### Backend Setup

1. **Install Node.js** (if not already installed)
   - Download from: https://nodejs.org/
   - Version 16 or higher recommended

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start the Server**
   ```bash
   npm start
   ```
   
   The server will run at `http://localhost:3001`

### Frontend Setup

The frontend is a React component that can be:
- Used in an existing React application
- Run in the Claude.ai artifact viewer
- Integrated into your own web application

## Usage

1. **Start the backend server** (see above)

2. **Open the frontend** in your browser/React app

3. **Enter search criteria**:
   - Type keywords like "AI startups" or "fintech Series A"
   - Use filters to narrow down results:
     - Ideal Customer Profile (company size)
     - Funding Stage
     - Industry
     - Country

4. **Click Search** - The tool will:
   - Search the web for recent funding announcements
   - Extract verified data from reliable sources
   - Return 8-10 quality leads

5. **Review Results** in the table showing:
   - Company name and description
   - Funding details (amount, stage, date)
   - Industry and location
   - Company size
   - Source publication
   - Lead score

6. **Download CSV** to export all leads

## How It Works

1. **User enters search query** with optional filters
2. **Frontend sends request** to backend server
3. **Backend calls Claude API** with web search tools enabled
4. **Claude performs web searches** for funding announcements
5. **Claude extracts and structures data** from search results
6. **Backend applies filters** and returns clean data
7. **Frontend displays results** in a professional table

## API Key

The API key is included in `server.js`. For production use:
- Move the API key to an environment variable
- Use `.env` file with `dotenv` package
- Never commit API keys to public repositories

## Limitations

- **Web Search Required**: This tool needs internet access to search for real data
- **Rate Limits**: Claude API has rate limits on requests
- **Backend Required**: Cannot run purely in the browser due to CORS restrictions

## Customization

You can customize:
- **Funding stages** in the filters
- **Industries** list
- **Countries** list
- **Lead scoring algorithm** in the backend
- **Search query templates** to find better results

## Troubleshooting

### "Cannot connect to backend server"
- Make sure the backend is running: `npm start`
- Check that it's running on port 3001
- Verify no firewall is blocking localhost:3001

### "No leads found"
- Try broader search terms
- Remove some filters
- Check that the backend has internet access
- Review backend console logs for errors

### "API Error"
- Verify the API key is valid
- Check API rate limits
- Review Claude API status

## Future Enhancements

- [ ] Integrate real web search API (SerpAPI, Bing, etc.)
- [ ] Add more data sources (Crunchbase, PitchBook)
- [ ] Save search history
- [ ] Export to multiple formats (Excel, JSON)
- [ ] Automated email outreach templates
- [ ] CRM integration (Salesforce, HubSpot)

## Support

For issues or questions:
- Check backend console logs
- Check browser console (F12)
- Verify all dependencies are installed
- Ensure backend server is running

## License

Private use only - for your sales team's lead generation.
