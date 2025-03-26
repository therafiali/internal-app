"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import { AdminHeader, SupportHeader } from "@/app/components/Headers";
import Image from 'next/image'
import { User } from "@/app/types";
import { supabase } from '@/lib/supabase';

interface PaymentMethod {
  type: string;
  username: string;
  _id: string;
}

interface GameLimit {
  amount: number;
  game_name: string;
  timestamp: string;
}

interface DailyRedeemLimit {
  limit: number;
  redeemed: number;
  remaining: number;
  lastUpdated: string;
}

interface ProcessedBy {
  name: string;
  email: string;
  role: string;
}

interface RedeemHistory {
  id: string;
  redeem_id: string;
  vip_code: string;
  total_amount: number;
  game_platform: string;
  status: string;
  created_at: string;
  processed_at?: string;
  processed_by?: ProcessedBy | null;
}

interface RechargeRequest {
  id: string;
  recharge_id: string;
  vip_code: string;
  amount: number;
  game_platform: string;
  status: string;
  created_at: string;
  processed_at?: string;
  processed_by?: ProcessedBy | null;
}

interface Profile {
  gender: string;
  fullName: string;
  language: string;
  lastName: string;
  timezone: string;
  firstName: string;
  profilePic: string;
}

interface ReferredBy {
  name: string;
  profilePic: string;
  vipCode: string;
  team: string;
  referralDate: string;
}

interface Referral {
  name: string;
  profilePic: string;
  vipCode: string;
  team: string;
  status: string;
  bonusAwarded: boolean;
  totalDeposits: number;
  totalRedeemed: number;
  referralDate: string;
}

interface ReferralData {
  playerName: string;
  vipCode: string;
  team: string;
  referralCount: number;
  referralBonusBalance: number;
  referredBy: ReferredBy | null;
  referrals: Referral[];
}

interface GameUsernames {
  fireKirin: string | null;
  gameVault: string | null;
  orionStars: string | null;
}

interface Player {
  id: string;
  vip_code: string;
  messenger_id: string;
  player_name: string;
  referred_by: string | null;
  referred_by_vip_code: string | null;
  referral_count: number;
  referral_bonus_balance: number;
  profile: Profile;
  game_usernames: GameUsernames;
  payment_methods: PaymentMethod[];
  game_limits: GameLimit[];
  created_at: string;
  updated_at: string;
  total_deposits: number;
  total_redeemed: number;
  holding_percentage: number;
  last_seen: string;
  team: string;
  status: string;
  last_reset_time: string;
  daily_redeem_limit: string;
}

// Add pagination interfaces
interface PaginationInfo {
  totalRequests: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

interface RedeemHistoryState {
  data: RedeemHistory[];
  pagination: PaginationInfo;
  isLoading: boolean;
}

interface RechargeHistoryState {
  data: RechargeRequest[];
  pagination: PaginationInfo;
  isLoading: boolean;
}

// Add Supabase response interfaces
interface SupabaseReferredBy {
  id: string;
  vip_code: string;
  player_name: string;
  team: string;
  profile?: {
    profilePic?: string;
  };
  created_at: string;
}

interface SupabaseReferral {
  id: string;
  player_name: string;
  vip_code: string;
  team: string;
  status: string;
  total_deposits: number;
  total_redeemed: number;
  profile?: {
    profilePic?: string;
  };
  created_at: string;
  bonus_awarded: boolean;
}

interface SupabasePlayerData {
  id: string;
  vip_code: string;
  messenger_id: string;
  player_name: string;
  referred_by: null | string;
  referred_by_vip_code: null | string;
  referral_count: number;
  referral_bonus_balance: number;
  profile: Profile;
  game_usernames: GameUsernames;
  payment_methods: PaymentMethod[];
  game_limits: { [key: string]: GameLimit };
  daily_redeem_limit: {
    limit: number;
    redeemed: number;
    remaining: number;
    lastUpdated: string | null;
  };
  created_at: string;
  updated_at: string;
  referredBy: null | any; // Skip referredBy for now as mentioned
}

const PlayerDetailsPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [redeemHistory, setRedeemHistory] = useState<RedeemHistoryState>({
    data: [],
    pagination: { totalRequests: 0, totalPages: 0, currentPage: 1, limit: 10 },
    isLoading: false
  });
  const [rechargeHistory, setRechargeHistory] = useState<RechargeHistoryState>({
    data: [],
    pagination: { totalRequests: 0, totalPages: 0, currentPage: 1, limit: 10 },
    isLoading: false
  });

  // Add user authentication and authorization check
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.department !== "Support" && parsedUser.department !== "Admin") {
        router.push("/login");
        return;
      }
      setUser(parsedUser);
    } catch (error) {
      console.error("Error parsing user data:", error);
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    console.log('Component mounted, fetching data...');
    const fetchPlayerData = async () => {
      try {
        const pathSegments = window.location.pathname.split('/');
        const vipCode = pathSegments[pathSegments.length - 1];
        
        if (!vipCode) {
          console.error('No VIP code found in URL');
          router.push('/main/support/players');
          return;
        }

        console.log('Fetching data for VIP code:', vipCode);

        // Fetch player data using Supabase
        const { data: rawPlayerData, error: playerError } = await supabase
          .from('players')
          .select('*')
          .eq('vip_code', vipCode)
          .single();

        if (playerError) {
          throw playerError;
        }

        if (!rawPlayerData) {
          throw new Error('Player not found');
        }

        // Transform player data to match the expected format
        const transformedPlayer: Player = {
          id: rawPlayerData.id,
          vip_code: rawPlayerData.vip_code,
          messenger_id: rawPlayerData.messenger_id,
          player_name: rawPlayerData.player_name,
          referred_by: rawPlayerData.referred_by,
          referred_by_vip_code: rawPlayerData.referred_by_vip_code,
          referral_count: rawPlayerData.referral_count,
          referral_bonus_balance: rawPlayerData.referral_bonus_balance,
          profile: rawPlayerData.profile,
          game_usernames: rawPlayerData.game_usernames || {
            fireKirin: null,
            gameVault: null,
            orionStars: null
          },
          payment_methods: rawPlayerData.payment_methods || [],
          game_limits: rawPlayerData.game_limits || [],
          created_at: rawPlayerData.created_at,
          updated_at: rawPlayerData.updated_at,
          total_deposits: rawPlayerData.total_deposits,
          total_redeemed: rawPlayerData.total_redeemed,
          holding_percentage: rawPlayerData.holding_percentage,
          last_seen: rawPlayerData.last_seen,
          team: rawPlayerData.team || '',
          status: rawPlayerData.status || 'active',
          last_reset_time: rawPlayerData.last_reset_time,
          daily_redeem_limit: rawPlayerData.daily_redeem_limit || {
            limit: 0,
            redeemed: 0,
            remaining: 0,
            lastUpdated: new Date().toISOString()
          }
        };

        setPlayer(transformedPlayer);

        // For now, we'll set minimal referral data since the structure is different
        const referralInfo: ReferralData = {
          playerName: rawPlayerData.player_name,
          vipCode: rawPlayerData.vip_code,
          team: '', // This field might need to be added to your database
          referralCount: rawPlayerData.referral_count,
          referralBonusBalance: rawPlayerData.referral_bonus_balance,
          referredBy: null, // Skip for now as mentioned
          referrals: [] // Will need separate query to fetch referrals if needed
        };
        setReferralData(referralInfo);

        // Fetch initial redeem and recharge history
        await fetchRedeemHistory(1);
        await fetchRechargeHistory(1);

      } catch (error) {
        console.error('Error fetching player data:', error);
        router.push('/main/support/players');
      }
    };

    fetchPlayerData();
  }, [router]);

  const fetchRedeemHistory = async (page = 1) => {
    const pathSegments = window.location.pathname.split('/');
    const vipCode = pathSegments[pathSegments.length - 1];
    if (!vipCode) return;

    setRedeemHistory(prev => ({ ...prev, isLoading: true }));
    try {
      const { data, error, count } = await supabase
        .from('redeem_requests')
        .select('*', { count: 'exact' })
        .eq('vip_code', vipCode)
        .order('created_at', { ascending: false })
        .range((page - 1) * 10, page * 10 - 1);

      if (error) throw error;

      const totalPages = Math.ceil((count || 0) / 10);

      setRedeemHistory({
        data: data || [],
        pagination: {
          totalRequests: count || 0,
          totalPages,
          currentPage: page,
          limit: 10
        },
        isLoading: false
      });
    } catch (error) {
      console.error('Error fetching redeem history:', error);
      setRedeemHistory(prev => ({ ...prev, isLoading: false }));
    }
  };

  const fetchRechargeHistory = async (page = 1) => {
    const pathSegments = window.location.pathname.split('/');
    const vipCode = pathSegments[pathSegments.length - 1];
    if (!vipCode) return;

    setRechargeHistory(prev => ({ ...prev, isLoading: true }));
    try {
      const { data, error, count } = await supabase
        .from('recharge_requests')
        .select('*', { count: 'exact' })
        .eq('vip_code', vipCode)
        .order('created_at', { ascending: false })
        .range((page - 1) * 10, page * 10 - 1);

      if (error) throw error;

      const totalPages = Math.ceil((count || 0) / 10);

      setRechargeHistory({
        data: data || [],
        pagination: {
          totalRequests: count || 0,
          totalPages,
          currentPage: page,
          limit: 10
        },
        isLoading: false
      });
    } catch (error) {
      console.error('Error fetching recharge history:', error);
      setRechargeHistory(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleVerificationFailedAction = async (redeemId: string, status: 'pending' | 'under_processing' | 'rejected', remarks?: string) => {
    try {
      const token = Cookies.get('token');
      if (!token) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}api/players/redeem-requests/verification-failed/${redeemId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status,
            remarks: remarks || undefined,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update verification failed status');
      }

      const result = await response.json();
      if (result.success) {
        // Refresh the redeem history after successful update
        fetchRedeemHistory(redeemHistory.pagination.currentPage);
      }
    } catch (error) {
      console.error('Error updating verification failed status:', error);
    }
  };

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a]">
      {/* {user.department === "Support" ? (
        <SupportHeader user={user} />
      ) : (
        <AdminHeader user={user} />
      )} */}
      <div className="flex-1 pl-64">
        <main className="p-8 space-y-8">
          {/* Back Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/main/support/players')}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Players
            </button>
          </div>

          <div className="grid grid-cols-12 gap-8">
            {/* Player Info Card */}
            <div className="col-span-3 bg-[#1a1a1a]/60 backdrop-blur-xl rounded-2xl p-8 border border-white/5 shadow-xl">
              <div className="text-center mb-8">
                <div className="h-24 w-24 mx-auto bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center mb-6 ring-4 ring-purple-500/10">
                  <span className="text-4xl text-purple-500">
                    {player?.profile?.profilePic ? (
                      <Image src={player.profile.profilePic} alt="profile" width={96} height={96} className="rounded-full object-cover" />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                        {player?.player_name?.charAt(0) || 'U'}
                      </div>
                    )}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-blue-500">
                  {player?.player_name || 'Not available'}
                </h2>
                <p className="text-sm text-gray-400 font-medium">{player?.vip_code || 'Not available'}</p>
              </div>

              <div className="space-y-6">
                {player?.team && (
                  <div className="flex items-center gap-3 text-gray-300 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium">Team: </span>
                    <span className="text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full text-sm font-medium ml-auto">
                      {player.team}
                    </span>
                  </div>
                )}

                {player?.profile?.gender && (
                  <div className="flex items-center gap-3 text-gray-300 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-sm font-medium capitalize">Gender: {player.profile.gender}</span>
                  </div>
                )}

                {player?.profile?.timezone && (
                  <div className="flex items-center gap-3 text-gray-300 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium">Timezone: {player.profile.timezone}</span>
                  </div>
                )}

                {/* {player?.profile?.language && (
                  <div className="flex items-center gap-3 text-gray-300 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                    <span className="text-sm font-medium">Language: {player.profile.language}</span>
                  </div>
                )} */}

                {player?.created_at && (
                  <div className="flex items-center gap-3 text-gray-300 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium">Joined: {new Date(player.created_at).toLocaleDateString()}</span>
                  </div>
                )}

                {player?.last_seen && (
                  <div className="flex items-center gap-3 text-gray-300 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span className="text-sm font-medium">Last seen: {new Date(player.last_seen).toLocaleDateString()}</span>
                  </div>
                )}

                {player?.status && (
                  <div className="flex items-center gap-3 text-gray-300 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium capitalize">Status: {player.status}</span>
                  </div>
                )}

                {/* Game Usernames Section */}
                <div className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-3 text-gray-300 mb-4">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium">Game Usernames</span>
                  </div>
                  <div className="space-y-3 pl-8">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Fire Kirin:</span>
                      {player?.game_usernames?.fireKirin ? (
                        <span className="text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full">
                          {player.game_usernames.fireKirin}
                        </span>
                      ) : (
                        <span className="text-gray-500 italic">Not set</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Game Vault:</span>
                      {player?.game_usernames?.gameVault ? (
                        <span className="text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full">
                          {player.game_usernames.gameVault}
                        </span>
                      ) : (
                        <span className="text-gray-500 italic">Not set</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Orion Stars:</span>
                      {player?.game_usernames?.orionStars ? (
                        <span className="text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full">
                          {player.game_usernames.orionStars}
                        </span>
                      ) : (
                        <span className="text-gray-500 italic">Not set</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="col-span-9 space-y-8">
    
              {/* Redeem History Section */}
              <div className="bg-[#1a1a1a]/60 backdrop-blur-xl rounded-2xl p-8 border border-white/5 shadow-xl">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h2 className="text-xl font-semibold text-white">Redeem History</h2>
                  </div>
                  <span className="text-sm px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-400 font-medium">
                    Total Redeemed: ${player?.total_redeemed?.toLocaleString() || '0.00'}
                  </span>
                </div>
                <div className="overflow-hidden rounded-xl border border-white/5">
                  {redeemHistory.isLoading ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500" />
                    </div>
                  ) : redeemHistory.data.length > 0 ? (
                    <>
                      <table className="w-full">
                        <thead className="bg-white/5">
                          <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            <th className="px-6 py-4">Redeem ID</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4">Platform</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {redeemHistory.data.map((item) => (
                            <tr key={item.id} className="text-sm hover:bg-white/5 transition-colors">
                              <td className="px-6 py-4 text-gray-300 font-medium">{item.redeem_id}</td>
                              <td className="px-6 py-4 text-gray-300">${item.total_amount?.toLocaleString()}</td>
                              <td className="px-6 py-4 text-gray-300">{item.game_platform}</td>
                              <td className="px-6 py-4">
                                <span className={`px-3 py-1 text-xs capitalize rounded-full font-medium ${
                                  item.status === 'completed'
                                    ? 'bg-green-500/10 text-green-400'
                                    : 'bg-amber-500/10 text-amber-400'
                                }`}>
                                  {item.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-gray-300">
                                {new Date(item.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {/* Enhanced Pagination */}
                      <div className="flex justify-between items-center p-4 bg-white/5">
                        <span className="text-sm text-gray-400">
                          Page {redeemHistory.pagination.currentPage} of {redeemHistory.pagination.totalPages}
                        </span>
                        <div className="flex gap-3">
                          <button
                            onClick={() => fetchRedeemHistory(redeemHistory.pagination.currentPage - 1)}
                            disabled={redeemHistory.pagination.currentPage === 1}
                            className="px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-400 rounded-lg font-medium disabled:opacity-50 hover:from-blue-500/20 hover:to-purple-500/20 transition-all"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => fetchRedeemHistory(redeemHistory.pagination.currentPage + 1)}
                            disabled={redeemHistory.pagination.currentPage === redeemHistory.pagination.totalPages}
                            className="px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-400 rounded-lg font-medium disabled:opacity-50 hover:from-blue-500/20 hover:to-purple-500/20 transition-all"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-400 text-center py-12">No redeem history available</p>
                  )}
                </div>
              </div>

              {/* Recharge Requests Section */}
              <div className="bg-[#1a1a1a]/60 backdrop-blur-xl rounded-2xl p-8 border border-white/5 shadow-xl">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h2 className="text-xl font-semibold text-white">Recharge History</h2>
                  </div>
                  <span className="text-sm px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-400 font-medium">
                    Total Deposits: ${player?.total_deposits?.toLocaleString() || '0.00'}
                  </span>
                </div>
                <div className="overflow-hidden rounded-xl border border-white/5">
                  {rechargeHistory.isLoading ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500" />
                    </div>
                  ) : rechargeHistory.data.length > 0 ? (
                    <>
                      <table className="w-full">
                        <thead className="bg-white/5">
                          <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            <th className="px-6 py-4">Recharge ID</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4">Platform</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {rechargeHistory.data.map((item) => (
                            <tr key={item.id} className="text-sm hover:bg-white/5 transition-colors">
                              <td className="px-6 py-4 text-gray-300 font-medium">{item?.recharge_id}</td>
                              <td className="px-6 py-4 text-gray-300">${item.amount?.toLocaleString()}</td>
                              <td className="px-6 py-4 text-gray-300">{item.game_platform}</td>
                              <td className="px-6 py-4">
                                <span className={`px-3 py-1 text-xs rounded-full capitalize font-medium ${
                                  item.status === 'completed'
                                    ? 'bg-green-500/10 text-green-400'
                                    : 'bg-amber-500/10 text-amber-400'
                                }`}>
                                  {item.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-gray-300">
                                {new Date(item.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {/* Enhanced Pagination */}
                      <div className="flex justify-between items-center p-4 bg-white/5">
                        <span className="text-sm text-gray-400">
                          Page {rechargeHistory.pagination.currentPage} of {rechargeHistory.pagination.totalPages}
                        </span>
                        <div className="flex gap-3">
                          <button
                            onClick={() => fetchRechargeHistory(rechargeHistory.pagination.currentPage - 1)}
                            disabled={rechargeHistory.pagination.currentPage === 1}
                            className="px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-400 rounded-lg font-medium disabled:opacity-50 hover:from-blue-500/20 hover:to-purple-500/20 transition-all"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => fetchRechargeHistory(rechargeHistory.pagination.currentPage + 1)}
                            disabled={rechargeHistory.pagination.currentPage === rechargeHistory.pagination.totalPages}
                            className="px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-400 rounded-lg font-medium disabled:opacity-50 hover:from-blue-500/20 hover:to-purple-500/20 transition-all"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-400 text-center py-12">No recharge history available</p>
                  )}
                </div>
              </div>

              {/* Game Limits Section */}
              <div className="bg-[#1a1a1a]/60 backdrop-blur-xl rounded-2xl p-8 border border-white/5 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                  <h2 className="text-xl font-semibold text-white">Game Limits</h2>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  {player?.game_limits ? (
                    Object.entries(player.game_limits).map(([game_name, limit]) => (
                      <div key={game_name} className="p-6 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-gray-300 font-medium">{game_name}</span>
                          <span className="text-blue-400">
                            ${limit.amount?.toLocaleString()}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Last Updated:</span>
                            <span className="text-gray-300">{new Date(limit.timestamp).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 col-span-2 text-center py-8">No game limits available</p>
                  )}
                </div>
              </div>

              {/* Referrals Section */}
              <div className="bg-[#1a1a1a]/60 backdrop-blur-xl rounded-2xl p-8 border border-white/5 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h2 className="text-lg font-semibold text-white">Referrals</h2>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-500">
                    {referralData?.referralCount || 0} members
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 ml-2">
                    ${referralData?.referralBonusBalance || 0} bonus
                  </span>
                </div>

                {/* Referred By Section */}
                {referralData?.referredBy && (
                  <div className="mb-6 p-4 bg-[#242424] rounded-lg">
                    <h3 className="text-sm font-medium text-gray-400 mb-3">Referred By</h3>
                    <div className="flex items-center gap-4">
                      <Image 
                        src={referralData.referredBy.profilePic} 
                        alt={referralData.referredBy.name}
                        width={80}
                        height={80}
                        className="rounded-full"
                      />
                      <div>
                        <p className="text-white font-medium">{referralData.referredBy.name}</p>
                        <p className="text-sm text-gray-400">
                          {referralData.referredBy.team} · {referralData.referredBy.vipCode}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 ml-auto">
                        {new Date(referralData.referredBy.referralDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Referrals List */}
                <div className="overflow-x-auto">
                  {referralData?.referrals?.length ? (
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs font-medium text-gray-400 uppercase">
                          <th className="px-4 py-2">Member</th>
                          <th className="px-4 py-2">Team</th>
                          <th className="px-4 py-2">VIP Code</th>
                          <th className="px-4 py-2">Total Deposits</th>
                          <th className="px-4 py-2">Total Redeemed</th>
                          <th className="px-4 py-2">Status</th>
                          <th className="px-4 py-2">Bonus</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {referralData.referrals.map((referral, index) => (
                          <tr key={index} className="text-sm">
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-3">
                                <Image 
                                  src={referral.profilePic} 
                                  alt={referral.name}
                                  width={80}
                                  height={80}
                                  className="rounded-full"
                                />
                                <span className="text-gray-300">{referral.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-gray-300">{referral.team}</td>
                            <td className="px-4 py-2 text-gray-300">{referral.vipCode}</td>
                            <td className="px-4 py-2 text-gray-300">
                              ${referral.totalDeposits?.toLocaleString()}
                            </td>
                            <td className="px-4 py-2 text-gray-300">
                              ${referral.totalRedeemed?.toLocaleString() || '0'}
                            </td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                referral.status === 'active'
                                  ? 'bg-green-500/10 text-green-500'
                                  : 'bg-amber-500/10 text-amber-500'
                              }`}>
                                {referral.status}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                referral.bonusAwarded
                                  ? 'bg-emerald-500/10 text-emerald-500'
                                  : 'bg-gray-500/10 text-gray-500'
                              }`}>
                                {referral.bonusAwarded ? 'Awarded' : 'Pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-gray-400 text-center py-4">No referrals available</p>
                  )}
                </div>
              </div>
                        {/* Notes Section */}
                        <div className="bg-[#1a1a1a]/60 backdrop-blur-xl rounded-2xl p-8 border border-white/5 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-xl font-semibold text-white">Notes</h2>
                  <span className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-400 font-medium">
                    Active
                  </span>
                </div>
                <p className="text-gray-400">No notes available</p>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PlayerDetailsPage;