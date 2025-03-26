"use client"
import React, { useState } from 'react';

interface SearchProps {
  onSearch: (filters: SearchFilters) => void;
}

export interface SearchFilters {
  requestId: string;
  gamePlatform: string;
  gameUsername: string;
  paymentUsername: string;
  requestType: string;
  vipCode: string;
  teamCode: string;
  playerName: string;
  status: string;
  dateRange: {
    start: string;
    end: string;
  };
}

const Search: React.FC<SearchProps> = ({ onSearch }) => {
  const [filters, setFilters] = useState<SearchFilters>({
    requestId: '',
    gamePlatform: '',
    gameUsername: '',
    paymentUsername: '',
    requestType: 'all',
    vipCode: '',
    teamCode: '',
    playerName: '',
    status: '',
    dateRange: {
      start: '',
      end: ''
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(filters);
  };

  return (
    <div className="bg-[#1a1a1a] p-6 rounded-lg shadow-lg mb-6">
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Request Type */}
          <div>
            <label htmlFor="requestType" className="block text-sm font-medium text-gray-400 mb-1">
              Request Type
            </label>
            <select
              id="requestType"
              name="requestType"
              value={filters.requestType}
              onChange={handleInputChange}
              className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2.5 text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Requests</option>
              <option value="recharge">Recharge</option>
              <option value="redeem">Redeem</option>
            </select>
          </div>

          {/* Request ID */}
          <div>
            <label htmlFor="requestId" className="block text-sm font-medium text-gray-400 mb-1">
              Request ID
            </label>
            <input
              type="text"
              id="requestId"
              name="requestId"
              value={filters.requestId}
              onChange={handleInputChange}
              placeholder="Enter Request ID"
              className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2.5 text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Game Platform */}
          <div>
            <label htmlFor="gamePlatform" className="block text-sm font-medium text-gray-400 mb-1">
              Game Platform
            </label>
            <input
              type="text"
              id="gamePlatform"
              name="gamePlatform"
              value={filters.gamePlatform}
              onChange={handleInputChange}
              placeholder="Enter Game Platform"
              className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2.5 text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Game Username */}
          <div>
            <label htmlFor="gameUsername" className="block text-sm font-medium text-gray-400 mb-1">
              Game Username
            </label>
            <input
              type="text"
              id="gameUsername"
              name="gameUsername"
              value={filters.gameUsername}
              onChange={handleInputChange}
              placeholder="Enter Game Username"
              className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2.5 text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Payment Username */}
          <div>
            <label htmlFor="paymentUsername" className="block text-sm font-medium text-gray-400 mb-1">
              Payment Username
            </label>
            <input
              type="text"
              id="paymentUsername"
              name="paymentUsername"
              value={filters.paymentUsername}
              onChange={handleInputChange}
              placeholder="Enter Payment Username"
              className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2.5 text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Search Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors duration-200"
          >
            Search
          </button>
        </div>
      </form>
    </div>
  );
};

export default Search;