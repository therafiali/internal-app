"use client";
import React, { useState, useEffect } from 'react';
import { AdminHeader } from '../../components/Headers';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

interface User {
  name: string;
  email: string;
  department: string;
  role: string;
}

interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  pendingReferrals: number;
  totalEarnings: number;
  conversionRate: number;
}

interface ReferralHistory {
  id: string;
  referredUser: string;
  email: string;
  status: 'completed' | 'pending' | 'failed';
  date: string;
  reward: number;
}

const dummyStats: ReferralStats = {
  totalReferrals: 156,
  activeReferrals: 89,
  pendingReferrals: 12,
  totalEarnings: 3240,
  conversionRate: 68.5
};

const dummyHistory: ReferralHistory[] = [
  {
    id: 'REF001',
    referredUser: 'John Smith',
    email: 'john.smith@example.com',
    status: 'completed',
    date: '2024-01-25',
    reward: 50
  },
  {
    id: 'REF002',
    referredUser: 'Emma Wilson',
    email: 'emma.w@example.com',
    status: 'pending',
    date: '2024-01-24',
    reward: 50
  },
  {
    id: 'REF003',
    referredUser: 'Michael Brown',
    email: 'michael.b@example.com',
    status: 'completed',
    date: '2024-01-23',
    reward: 50
  },
  {
    id: 'REF004',
    referredUser: 'Sarah Davis',
    email: 'sarah.d@example.com',
    status: 'failed',
    date: '2024-01-22',
    reward: 0
  }
];

const ReferralPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [referralLink] = useState('https://yourapp.com/ref/USER123');
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      router.push("/login");
    }
  }, [router]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    // You can add a toast notification here
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-emerald-500 bg-emerald-500/10';
      case 'pending':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'failed':
        return 'text-red-500 bg-red-500/10';
      default:
        return 'text-gray-500 bg-gray-500/10';
    }
  };



  // Loading state while user data is being fetched
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Only render the main content if user exists
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <AdminHeader user={user}  />
      <div className="flex-1 pl-64 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-white">Referral Program</h1>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Referral Link
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-5 gap-6 mb-8">
            {/* Total Referrals */}
            <div className="bg-gradient-to-br from-[#132416] to-[#0f1f13] rounded-2xl p-1">
              <div className="bg-[#0a0a0a] rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/10 rounded-lg">
                    <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Total Referrals</div>
                    <div className="text-2xl font-bold text-white">{dummyStats.totalReferrals}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Referrals */}
            <div className="bg-gradient-to-br from-[#132416] to-[#0f1f13] rounded-2xl p-1">
              <div className="bg-[#0a0a0a] rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/10 rounded-lg">
                    <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Active</div>
                    <div className="text-2xl font-bold text-white">{dummyStats.activeReferrals}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pending Referrals */}
            <div className="bg-gradient-to-br from-[#1f1a0f] to-[#1a160d] rounded-2xl p-1">
              <div className="bg-[#0a0a0a] rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-500/10 rounded-lg">
                    <svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Pending</div>
                    <div className="text-2xl font-bold text-white">{dummyStats.pendingReferrals}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Earnings */}
            <div className="bg-gradient-to-br from-[#132416] to-[#0f1f13] rounded-2xl p-1">
              <div className="bg-[#0a0a0a] rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/10 rounded-lg">
                    <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Total Earnings</div>
                    <div className="text-2xl font-bold text-white">${dummyStats.totalEarnings}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Conversion Rate */}
            <div className="bg-gradient-to-br from-[#132416] to-[#0f1f13] rounded-2xl p-1">
              <div className="bg-[#0a0a0a] rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/10 rounded-lg">
                    <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Conversion Rate</div>
                    <div className="text-2xl font-bold text-white">{dummyStats.conversionRate}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Referral Link Card */}
          <div className="bg-[#1a1a1a] rounded-2xl p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Your Referral Link</h2>
            <div className="flex gap-4">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 px-4 py-2 bg-[#242424] border border-gray-700 rounded-lg text-white focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Referral History */}
          <div className="bg-[#1a1a1a] rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Referral History</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">ID</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">User</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Email</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Reward</th>
                  </tr>
                </thead>
                <tbody>
                  {dummyHistory.map((referral) => (
                    <tr key={referral.id} className="border-b border-gray-800 last:border-0">
                      <td className="py-3 px-4 text-gray-300">{referral.id}</td>
                      <td className="py-3 px-4 text-white">{referral.referredUser}</td>
                      <td className="py-3 px-4 text-gray-300">{referral.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(referral.status)}`}>
                          {referral.status.charAt(0).toUpperCase() + referral.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-300">{new Date(referral.date).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-emerald-500 font-medium">${referral.reward}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralPage;