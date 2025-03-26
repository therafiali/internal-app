"use client";
import React, { useState, useEffect } from "react";
import { AdminHeader } from "@/app/components/Headers";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import Loader from "@/app/components/Loader";
import { Search } from "lucide-react";
import Image from 'next/image'

interface User {
  name: string;
  email: string;
  department: string;
  role: string;
}

interface ManyChatData {
  key: string;
  id: string;
  page_id: string;
  name: string;
  profile_pic: string;
  custom_fields: {
    load_game_platform?: string;
    load_username?: string;
    load_amount?: string;
    load_promo_code?: string;
    team_code?: string;
    feedback_category?: string;
    feedback_rating?: string;
    feedback_text?: string;
  };
}

interface Feedback {
  _id: string;
  messengerId: string;
  pageId: string;
  playerName: string;
  category: string;
  rating: number;
  text: string;
  manyChatData: ManyChatData;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  status: string;
  data: {
    feedback: Feedback[];
    pagination: {
      total: number;
      totalPages: number;
      currentPage: number;
      limit: number;
    };
  };
}

type FeedbackCategory = 'all' | 'support' | 'bug' | 'suggestion';
type RatingFilter = 'all' | '1' | '2' | '3' | '4' | '5';

const FeedbackPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [activeFilter, setActiveFilter] = useState<FeedbackCategory>('all');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRating, setSelectedRating] = useState<"All Ratings" | string>("All Ratings");
  const [selectedCategory, setSelectedCategory] = useState<"All Categories" | string>("All Categories");

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const token = Cookies.get('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/feedback/get-all-feedback`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data: ApiResponse = await response.json();
        setFeedbacks(data.data.feedback);
      } else {
        console.error('Failed to fetch feedbacks');
      }
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
    } finally {
      setLoading(false);
    }
  };



  const filteredFeedbacks = feedbacks
    .filter(feedback => activeFilter === 'all' || feedback.category === activeFilter)
    .filter(feedback => ratingFilter === 'all' || feedback.rating === parseInt(ratingFilter));

  const FeedbackDetailsModal = () => {
    if (!selectedFeedback) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[#1a1a1a] rounded-lg w-[600px] border border-gray-800">
          <div className="flex justify-between items-center p-4 border-b border-gray-800">
            <h2 className="text-xl font-semibold text-white">Feedback Details</h2>
            <button 
              onClick={() => setShowDetailsModal(false)}
              className="text-gray-400 hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-400">Player Name</h3>
              <p className="text-white">{selectedFeedback.playerName}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-400">Category</h3>
              <span className={`inline-block px-3 py-1 rounded-full text-xs
                ${selectedFeedback.category === 'support' ? 'bg-blue-500/20 text-blue-500' :
                  selectedFeedback.category === 'bug' ? 'bg-red-500/20 text-red-500' :
                  'bg-green-500/20 text-green-500'}`}>
                {selectedFeedback.category.charAt(0).toUpperCase() + selectedFeedback.category.slice(1)}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-400">Rating</h3>
              <span className={`inline-block px-3 py-1 rounded-full text-xs
                ${selectedFeedback.rating >= 4 ? 'bg-green-500/20 text-green-500' :
                  selectedFeedback.rating >= 2 ? 'bg-yellow-500/20 text-yellow-500' :
                  'bg-red-500/20 text-red-500'}`}>
                {selectedFeedback.rating} Stars
              </span>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-400">Feedback Text</h3>
              <p className="text-white whitespace-pre-wrap">{selectedFeedback.text}</p>
            </div>

            {selectedFeedback.manyChatData.profile_pic && (
              <div>
                <h3 className="text-sm font-medium text-gray-400">Profile Picture</h3>
                <Image 
                  src={selectedFeedback.manyChatData.profile_pic} 
                  alt="User Profile"
                  width={100}
                  height={100}
                  className="mt-2 rounded-lg max-h-[300px] object-contain"
                />
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-gray-400">Additional Information</h3>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <p className="text-sm text-gray-400">Game Platform:</p>
                  <p className="text-white">{selectedFeedback.manyChatData.custom_fields.load_game_platform || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Username:</p>
                  <p className="text-white">{selectedFeedback.manyChatData.custom_fields.load_username || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Team Code:</p>
                  <p className="text-white">{selectedFeedback.manyChatData.custom_fields.team_code || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-400">Submitted At</h3>
              <p className="text-white">{new Date(selectedFeedback.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Calculate statistics
  const stats = {
    total: feedbacks.length,
    averageRating: feedbacks.length > 0 
      ? (feedbacks.reduce((acc, curr) => acc + curr.rating, 0) / feedbacks.length).toFixed(1)
      : 0,
    pendingResponses: feedbacks.filter(f => !f.manyChatData.custom_fields.feedback_text).length,
    averageResponseTime: "2.5h", // This would need to be calculated from actual data
  };

  // Calculate rating distribution
  const ratingDistribution = {
    5: (feedbacks.filter(f => f.rating === 5).length / feedbacks.length * 100) || 0,
    4: (feedbacks.filter(f => f.rating === 4).length / feedbacks.length * 100) || 0,
    3: (feedbacks.filter(f => f.rating === 3).length / feedbacks.length * 100) || 0,
    2: (feedbacks.filter(f => f.rating === 2).length / feedbacks.length * 100) || 0,
    1: (feedbacks.filter(f => f.rating === 1).length / feedbacks.length * 100) || 0,
  };

  // Calculate category distribution
  const categoryDistribution = {
    "Game Experience": 45,
    "Customer Support": 25,
    "Payment Process": 15,
    "Platform Stability": 10,
    "Others": 5,
  };

  if (!user || user.department !== "Admin") {
    return null;
  }

  if (loading) {
    return <Loader text="Feedbacks" />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* <AdminHeader user={user}  /> */}
      <div className="flex-1 pl-64 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">Player Feedbacks</h1>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Feedbacks */}
            <div className="relative">
              <div className="relative bg-gradient-to-br from-[#2a2a2a] to-[#1f1f1f] p-4 rounded-xl border border-[#3d3d3d] shadow-xl">
                <div className="mb-3">
                  <span className="text-emerald-400 font-medium tracking-wide">TOTAL</span>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold text-white">{stats.total}</p>
                      <p className="text-sm text-gray-400">Feedbacks</p>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">↑ 15% vs last month</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Average Rating */}
            <div className="relative">
              <div className="relative bg-gradient-to-br from-[#2a2a2a] to-[#1f1f1f] p-4 rounded-xl border border-[#3d3d3d] shadow-xl">
                <div className="mb-3">
                  <span className="text-emerald-400 font-medium tracking-wide">RATING</span>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold text-white">{stats.averageRating}</p>
                      <p className="text-sm text-gray-400">Average</p>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full">★★★★★</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pending Responses */}
            <div className="relative">
              <div className="relative bg-gradient-to-br from-[#2a2a2a] to-[#1f1f1f] p-4 rounded-xl border border-[#3d3d3d] shadow-xl">
                <div className="mb-3">
                  <span className="text-emerald-400 font-medium tracking-wide">PENDING</span>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold text-white">{stats.pendingResponses}</p>
                      <p className="text-sm text-gray-400">Responses</p>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <span className="text-xs text-orange-400 bg-orange-400/10 px-2 py-1 rounded-full">Needs Attention</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Response Time */}
            <div className="relative">
              <div className="relative bg-gradient-to-br from-[#2a2a2a] to-[#1f1f1f] p-4 rounded-xl border border-[#3d3d3d] shadow-xl">
                <div className="mb-3">
                  <span className="text-emerald-400 font-medium tracking-wide">RESPONSE</span>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold text-white">{stats.averageResponseTime}</p>
                      <p className="text-sm text-gray-400">Average Time</p>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full">↓ 30min improvement</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Rating Distribution and Categories */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* Rating Distribution */}
            <div className="bg-[#1a1a1a] rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Rating Distribution</h3>
              <div className="space-y-3">
                {Object.entries(ratingDistribution).reverse().map(([rating, percentage]) => (
                  <div key={rating} className="flex items-center gap-2">
                    <span className="text-sm text-gray-400 w-8">{rating} ★</span>
                    <div className="flex-1 h-2 bg-[#242424] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-400 w-12">{percentage.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Feedback Categories */}
            <div className="bg-[#1a1a1a] rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Feedback Categories</h3>
              <div className="space-y-3">
                {Object.entries(categoryDistribution).map(([category, percentage]) => (
                  <div key={category} className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">{category}</span>
                    <span className="text-sm text-gray-400">{percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-[#1a1a1a] rounded-lg p-4 mb-6">
            <div className="flex gap-4 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search feedbacks by player name or content..."
                  className="w-full pl-10 pr-4 py-2 bg-[#242424] text-white rounded-lg border border-gray-800 focus:outline-none focus:border-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="px-4 py-2 bg-[#242424] text-white rounded-lg border border-gray-800"
                value={selectedRating}
                onChange={(e) => setSelectedRating(e.target.value)}
              >
                <option>All Ratings</option>
                {[5,4,3,2,1].map(rating => (
                  <option key={rating} value={rating}>{rating} Stars</option>
                ))}
              </select>
              <select
                className="px-4 py-2 bg-[#242424] text-white rounded-lg border border-gray-800"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option>All Categories</option>
                {Object.keys(categoryDistribution).map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Feedback List */}
          <div className="space-y-4">
            {feedbacks.map((feedback) => (
              <div key={feedback._id} className="bg-[#1a1a1a] rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                      {feedback.playerName[0]}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white">{feedback.playerName}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              className={`w-4 h-4 ${i < feedback.rating ? 'text-yellow-500' : 'text-gray-600'} fill-current`}
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <span className="text-sm text-gray-400">•</span>
                        <span className="text-sm text-gray-400">{feedback.category}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-sm text-gray-400">
                    {new Date(feedback.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-gray-300">{feedback.text}</p>
                <div className="flex justify-end mt-4">
                  <button className="text-blue-500 hover:text-blue-400 text-sm">Reply</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {showDetailsModal && <FeedbackDetailsModal />}
    </div>
  );
};

export default FeedbackPage;
