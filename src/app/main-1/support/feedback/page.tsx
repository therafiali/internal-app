"use client";
import React, { useState, useEffect } from "react";
import { AdminHeader, SupportHeader } from "@/app/components/Headers";
import { useRouter } from "next/navigation";
import Loader from "@/app/components/Loader";
import { Search } from "lucide-react";
import Image from 'next/image'
import { useFeedback, Feedback } from '@/hooks/useFeedback';

interface User {
  name: string;
  email: string;
  department: string;
  role: string;
}

type FeedbackCategory = 'all' | 'support' | 'bug' | 'suggestion';
type RatingFilter = 'all' | '1' | '2' | '3' | '4' | '5';

const FeedbackPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeFilter, setActiveFilter] = useState<FeedbackCategory>('all');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRating, setSelectedRating] = useState<"All Ratings" | string>("All Ratings");
  const [selectedCategory, setSelectedCategory] = useState<"All Categories" | string>("All Categories");
  const { 
    feedbacks, 
    loading, 
    error, 
    fetchFeedbacks, 
    getStats, 
    getRatingDistribution, 
    getCategoryDistribution,
    filterFeedbacks 
  } = useFeedback();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    fetchFeedbacks();
  }, [user]);

  // Get filtered feedbacks
  const filteredFeedbacks = filterFeedbacks({
    searchQuery,
    selectedRating,
    selectedCategory
  });

  // Get statistics
  const stats = getStats();

  // Get rating distribution
  const ratingDistribution = getRatingDistribution();

  // Get category distribution
  const categoryDistribution = getCategoryDistribution();

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      {user.department === 'Support' ? (
        <SupportHeader user={user} />
      ) : (
        <AdminHeader user={user} />
      )}
      <div className="flex-1 pl-64">
        <main className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
              Player Feedback
            </h1>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {/* Total Feedback Card */}
            <div className="bg-[#1a1a1a] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xl text-blue-500 font-medium">TOTAL FEEDBACK</div>
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{stats.total}</div>
              <div className="text-sm text-gray-400">Responses</div>
            </div>

            {/* Average Rating Card */}
            <div className="bg-[#1a1a1a] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xl text-yellow-500 font-medium">AVERAGE RATING</div>
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{stats.averageRating}</div>
              <div className="text-sm text-gray-400">Out of 5</div>
            </div>

            {/* Pending Responses Card */}
            <div className="bg-[#1a1a1a] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xl text-red-500 font-medium">PENDING RESPONSES</div>
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{stats.pendingResponses}</div>
              <div className="text-sm text-gray-400">Awaiting Response</div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-[#1a1a1a] rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Filter Feedback</h2>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search feedback..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 px-4 py-2 bg-[#111111] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Rating Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Filter by Rating
                </label>
                <select
                  value={selectedRating}
                  onChange={(e) => setSelectedRating(e.target.value)}
                  className="w-full px-4 py-2 bg-[#111111] border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All Ratings">All Ratings</option>
                  <option value="5">5 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="2">2 Stars</option>
                  <option value="1">1 Star</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Filter by Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 bg-[#111111] border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All Categories">All Categories</option>
                  {categoryDistribution.map(({ category }) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Feedback Table */}
          <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-gray-800/20">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex justify-center items-center p-8">
                  <Loader text="Loading feedback..." />
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        PLAYER NAME
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        CATEGORY
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        RATING
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        FEEDBACK
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        DATE
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filteredFeedbacks.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                          No feedback found matching your filters
                        </td>
                      </tr>
                    ) : (
                      filteredFeedbacks.map((feedback) => (
                        <tr key={feedback.id} className="hover:bg-[#252b3b]">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-8 w-8 flex-shrink-0">
                                {feedback.manychat_data?.profile_pic && (
                                  <Image
                                    className="h-8 w-8 rounded-full"
                                    src={feedback.manychat_data.profile_pic}
                                    alt=""
                                    width={32}
                                    height={32}
                                  />
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-white">
                                  {feedback.player_name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-500/10 text-blue-500">
                              {feedback.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, index) => (
                                <svg
                                  key={index}
                                  className={`h-4 w-4 ${
                                    index < feedback.rating
                                      ? "text-yellow-500"
                                      : "text-gray-600"
                                  }`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-300">
                              {feedback.text}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                            {new Date(feedback.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="grid grid-cols-2 gap-8 mt-8">
            <div className="bg-[#1a1a1a] rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Rating Distribution</h3>
              <div className="space-y-4">
                {ratingDistribution.map(({ rating, count, percentage }) => (
                  <div key={rating} className="flex items-center">
                    <div className="w-20 text-sm text-gray-400">
                      {rating} {rating === 1 ? 'Star' : 'Stars'}
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-20 text-sm text-gray-400">
                      {count} ({percentage}%)
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Distribution */}
            <div className="bg-[#1a1a1a] rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Category Distribution</h3>
              <div className="space-y-4">
                {categoryDistribution.map(({ category, count, percentage }) => (
                  <div key={category} className="flex items-center">
                    <div className="w-24 text-sm text-gray-400 truncate">
                      {category}
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-20 text-sm text-gray-400">
                      {count} ({percentage}%)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default FeedbackPage;
