import React, { useState, useMemo } from 'react';
import { Search, Filter, Download, Building2, DollarSign, MapPin, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';

// Add animation styles
const animationStyles = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .lead-appear {
    animation: slideIn 0.3s ease-out;
  }
`;

export default function LeadScraperApp() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [leads, setLeads] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [progress, setProgress] = useState(0);

  // Filter states
  const [filters, setFilters] = useState({
    icp: '',
    fundingStage: '',
    industry: '',
    country: ''
  });

  const fundingStages = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D+'];
  const industries = ['SaaS', 'FinTech', 'HealthTech', 'E-commerce', 'AI/ML', 'DeepTech', 'EdTech', 'CleanTech', 'Cybersecurity', 'Marketing Tech'];
  const countries = ['United States', 'United Kingdom', 'Canada', 'Germany', 'France', 'India', 'Singapore', 'Australia', 'Israel', 'Netherlands'];
  const icpOptions = ['Enterprise (1000+ employees)', 'Mid-Market (200-999 employees)', 'SMB (50-199 employees)', 'Startup (1-49 employees)'];

  const exampleSearches = [
    { text: 'AI startups Series A', query: 'AI startups Series A' },
    { text: 'Seed fintech companies', query: 'Seed fintech companies' },
    { text: 'Early-stage SaaS', query: 'Early-stage SaaS' }
  ];

  const searchLeads = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search query');
      return;
    }

    setIsSearching(true);
    setError('');
    setLeads([]);
    setProgress(0);
    setSearchStatus('Searching for leads... This may take up to 30 seconds.');

    try {
      console.log('Sending search request to /api/search-leads');

      const response = await fetch('/api/search-leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchQuery: searchQuery,
          filters: filters
        })
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Received data:', data);

      if (data.success && data.leads) {
        setLeads(data.leads);
        setProgress(100);
        console.log('Set leads:', data.leads.length);
      } else {
        setError(data.error || 'No leads found');
      }
    } catch (error) {
      console.error('Search failed:', error);
      setError('Cannot connect to backend. Please try again later.');
    } finally {
      setIsSearching(false);
      setSearchStatus('');
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      icp: '',
      fundingStage: '',
      industry: '',
      country: ''
    });
  };

  const handleExampleClick = (query) => {
    setSearchQuery(query);
  };

  const downloadCSV = () => {
    if (!Array.isArray(leads) || leads.length === 0) {
      alert('No leads to download');
      return;
    }

    // Create CSV headers
    const headers = ['Company Name', 'Description', 'Funding Stage', 'Funding Amount', 'Funding Date', 'Industry', 'Country', 'Company Size', 'Lead Score', 'Source', 'Website'];

    // Create CSV rows
    const rows = leads.map(lead => [
      lead.companyName || '',
      `"${(lead.description || '').replace(/"/g, '""')}"`,
      lead.fundingStage || '',
      lead.fundingAmount || '',
      lead.fundingDate || '',
      lead.industry || '',
      lead.country || '',
      lead.companySize || '',
      lead.leadScore || '',
      lead.source || '',
      lead.website || ''
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `leads_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== '').length;
  const isEmptyState = !isSearching && leads.length === 0 && !error;

  // Search Bar Component (reusable) - memoized to prevent re-creation
  const searchBarComponent = useMemo(() => (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 md:p-8 lg:p-10">
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 sm:left-5 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 pointer-events-none" />
          <input
            type="text"
            placeholder="Search for startups (e.g., 'AI companies', 'fintech Series A'...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isSearching && searchLeads()}
            className="w-full pl-10 sm:pl-12 md:pl-16 pr-4 sm:pr-6 py-4 sm:py-5 md:py-6 text-base sm:text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
          />
        </div>
        <div className="flex gap-3 sm:gap-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 text-base sm:text-lg rounded-lg border-2 transition-all flex-1 sm:flex-initial ${showFilters || activeFilterCount > 0
              ? 'border-purple-600 bg-purple-50 text-purple-700'
              : 'border-gray-300 bg-white text-gray-700 hover:border-purple-400'
              }`}
          >
            <Filter className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="bg-purple-600 text-white text-xs sm:text-sm rounded-full w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={searchLeads}
            disabled={isSearching}
            className="px-6 sm:px-8 md:px-12 py-4 sm:py-5 md:py-6 text-base sm:text-lg bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all font-semibold shadow-md hover:shadow-lg flex-1 sm:flex-initial"
          >
            {isSearching ? (
              <span className="flex items-center justify-center gap-2 sm:gap-3">
                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 animate-spin" />
                <span className="hidden sm:inline">Searching...</span>
              </span>
            ) : 'Search'}
          </button>
        </div>
      </div>

      {/* Example Searches */}
      <div className="mt-4 sm:mt-6 flex items-center gap-2 sm:gap-3 flex-wrap">
        <span className="text-sm sm:text-base text-gray-600">Try an example:</span>
        {exampleSearches.map((example, index) => (
          <button
            key={index}
            onClick={() => handleExampleClick(example.query)}
            className="px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors"
          >
            {example.text}
          </button>
        ))}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mt-4 sm:mt-6 md:mt-8 pt-4 sm:pt-6 md:pt-8 border-t border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
            {/* ICP Filter */}
            <div>
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2 sm:mb-3">
                Ideal Customer Profile
              </label>
              <select
                value={filters.icp}
                onChange={(e) => handleFilterChange('icp', e.target.value)}
                className="w-full px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              >
                <option value="">All Sizes</option>
                {icpOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            {/* Funding Stage Filter */}
            <div>
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2 sm:mb-3">
                Funding Stage
              </label>
              <select
                value={filters.fundingStage}
                onChange={(e) => handleFilterChange('fundingStage', e.target.value)}
                className="w-full px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              >
                <option value="">All Stages</option>
                {fundingStages.map(stage => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>
            </div>

            {/* Industry Filter */}
            <div>
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2 sm:mb-3">
                Industry
              </label>
              <select
                value={filters.industry}
                onChange={(e) => handleFilterChange('industry', e.target.value)}
                className="w-full px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              >
                <option value="">All Industries</option>
                {industries.map(industry => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </div>

            {/* Country Filter */}
            <div>
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2 sm:mb-3">
                Country
              </label>
              <select
                value={filters.country}
                onChange={(e) => handleFilterChange('country', e.target.value)}
                className="w-full px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              >
                <option value="">All Countries</option>
                {countries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="mt-4 sm:mt-6 text-sm sm:text-base text-purple-600 hover:text-purple-800 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  ), [searchQuery, showFilters, isSearching, activeFilterCount, filters]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 p-3 sm:p-4 md:p-6">
      {/* Inject animation styles */}
      <style>{animationStyles}</style>

      {isEmptyState ? (
        // CENTERED LAYOUT FOR EMPTY STATE
        <div className="min-h-screen flex items-center justify-center -mt-3 sm:-mt-4 md:-mt-6">
          <div className="max-w-[1400px] w-full px-2 sm:px-4">
            <div className="text-center mb-8 sm:mb-10 md:mb-12">
              {/* Icon and Heading */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5 md:mb-6">
                <TrendingUp className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 text-purple-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-3">Lead Scraper</h1>
              <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto mb-6 sm:mb-8 px-4">
                Find recently funded startups in seconds. Get verified leads with real funding data, company websites, and sources.
              </p>
            </div>

            {/* Centered Search Bar */}
            {searchBarComponent}
          </div>
        </div>
      ) : (
        // TOP LAYOUT FOR RESULTS/SEARCHING/ERROR
        <div className="max-w-[2000px] mx-auto">
          {/* Header */}
          <div className="mb-4 sm:mb-6 md:mb-8">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <TrendingUp className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 text-purple-600" />
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Lead Scraper</h1>
            </div>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl">Find recently funded startups in seconds. Get verified leads with real funding data, company websites, and sources.</p>
          </div>

          {/* Search Bar at Top */}
          <div className="mb-4 sm:mb-5 md:mb-6">
            {searchBarComponent}
          </div>

          {/* Search Status with Progress Bar */}
          {searchStatus && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-3">
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 animate-spin flex-shrink-0" />
                <p className="text-blue-700 font-medium text-sm sm:text-base">{searchStatus}</p>
              </div>
              {/* Progress Bar */}
              {progress > 0 && (
                <div className="relative">
                  <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs sm:text-sm text-blue-700 font-semibold">{progress}% Complete</span>
                    <span className="text-xs sm:text-sm text-blue-600">{leads.length} leads found so far</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 flex items-start gap-2 sm:gap-3">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1 text-sm sm:text-base">Error</h3>
                <p className="text-red-700 text-xs sm:text-sm whitespace-pre-wrap">{error}</p>
              </div>
            </div>
          )}

          {/* Results Section */}
          {leads.length > 0 && (
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              {/* Results Header */}
              <div className="p-4 sm:p-5 md:p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                    Found {leads.length} {leads.length === 1 ? 'Lead' : 'Leads'}
                  </h2>
                  <p className="text-gray-600 text-xs sm:text-sm mt-1">Real startups with verified funding data</p>
                </div>
                <button
                  onClick={downloadCSV}
                  className="flex items-center gap-2 px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-semibold shadow-md hover:shadow-lg text-sm sm:text-base w-full sm:w-auto justify-center"
                >
                  <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                  Download CSV
                </button>
              </div>

              {/* Results Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                        Company
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                        Funding
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                        Industry
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                        Location
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                        Size
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                        Lead Score
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                        Source
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                        Website
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {Array.isArray(leads) && leads.map((lead, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors lead-appear">
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                          <div className="flex items-start gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 text-sm sm:text-base">{lead.companyName || 'N/A'}</div>
                              <div className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">{lead.description || 'N/A'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                            <div>
                              <div className="font-semibold text-gray-900 text-sm sm:text-base">{lead.fundingAmount || 'N/A'}</div>
                              <div className="text-xs sm:text-sm text-gray-600">{lead.fundingStage || 'N/A'}</div>
                              <div className="text-xs text-gray-500 mt-1">{lead.fundingDate || 'N/A'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                          <span className="inline-flex px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium bg-blue-100 text-blue-800 rounded-full whitespace-nowrap">
                            {lead.industry || 'N/A'}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                          <div className="flex items-center gap-1 sm:gap-2 text-gray-700 text-xs sm:text-sm">
                            <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                            <span className="whitespace-nowrap">{lead.country || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-gray-700 text-xs sm:text-sm whitespace-nowrap">
                          {lead.companySize || 'N/A'}
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[60px]">
                              <div
                                className={`h-2 rounded-full ${(lead.leadScore || 0) >= 80 ? 'bg-green-500' :
                                  (lead.leadScore || 0) >= 60 ? 'bg-yellow-500' :
                                    'bg-orange-500'
                                  }`}
                                style={{ width: `${lead.leadScore || 0}%` }}
                              />
                            </div>
                            <span className="text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">{lead.leadScore || 0}</span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                          {lead.source && lead.source.startsWith('http') ? (
                            <a
                              href={lead.source}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-600 hover:text-purple-800 underline text-xs sm:text-sm"
                              title="View source article"
                            >
                              {new URL(lead.source).hostname.replace('www.', '')}
                            </a>
                          ) : (
                            <span className="text-xs sm:text-sm text-gray-600">{lead.source || 'N/A'}</span>
                          )}
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                          {lead.website && lead.website !== 'N/A' ? (
                            <a
                              href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-600 hover:text-purple-800 text-xs sm:text-sm font-medium hover:underline whitespace-nowrap"
                            >
                              Visit Site →
                            </a>
                          ) : (
                            <span className="text-xs sm:text-sm text-gray-400 italic">No website</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
