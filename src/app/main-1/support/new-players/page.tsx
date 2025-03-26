"use client";
import { useState, useEffect, useCallback } from "react";
import { AdminHeader, SupportHeader } from "@/app/components/Headers";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import Image from "next/image";
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { createClient } from '@supabase/supabase-js';
import { X } from 'lucide-react';
import { convertEntFormat } from '@/utils/entFormat';
import { EntType } from '@/supabase/types';

// Define User interface with ENT access
interface User {
  id?: string;
  name: string;
  email: string;
  department: string;
  role: string;
  ent_access?: EntType[];
}

export interface PlayerRequest {
  id: string;
  manychat_data: {
    custom_fields: {
      firekirin_username: string | null;
      gamevault_username: string | null;
      juwa_username: string | null;
      orionstars_username: string | null;
      team_code: string;
      entry_code: string | null;
      entry_valid: boolean | null;
      load_amount: string | null;
      load_game_platform: string | null;
    };
    first_name: string;
    last_name: string;
    name: string;
    email?: string;
    profile_pic: string;
    subscribed: string;
    last_interaction: string;
  };
  registration_status: string;
  created_at: string;
  referrer_code?: string;
  referred_by?: {
    vip_code: string;
    player_name: string;
    team: string;
    status: string;
    date_joined: string;
    profile: {
      profile_pic: string;
      full_name: string;
      first_name: string;
      last_name: string;
      gender: string;
      language: string;
      timezone: string;
    };
  };
}

// interface PaginationResponse {
//   pendingPlayers: PlayerRequest[];
//   totalPages: number;
//   currentPage: number;
// }

interface LoadingState {
  id: string;
  action: "approved" | "rejected";
}

interface NotificationModal {
  show: boolean;
  type: 'success' | 'error' | 'warning';
  message: string;
}

const getTimeElapsed = (date: string) => {
  const now = new Date();
  const past = new Date(date);
  const diff = now.getTime() - past.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  // Calculate the time string
  let timeString;
  if (days > 0) {
    const weeks = Math.floor(days / 7);
    if (weeks > 0) timeString = `${weeks}w ${days % 7}d`;
    else timeString = `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    timeString = `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    timeString = `${minutes}m`;
  } else {
    timeString = 'Just now';
  }

  // Determine color based on elapsed time
  let colorClass;
  if (hours <= 1) {
    colorClass = 'text-green-500'; // Up to 1 hour - Green
  } else if (hours <= 2) {
    colorClass = 'text-yellow-500'; // Between 1-2 hours - Yellow
  } else if (hours <= 4) {
    colorClass = 'text-orange-500'; // Between 2-4 hours - Orange
  } else {
    colorClass = 'text-red-500'; // More than 4 hours - Red
  }

  return { timeString, colorClass };
};

// Verify Supabase URL and key are available
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('Supabase URL or Anon Key is missing');
}

// Move Supabase client outside of component to prevent multiple instances
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  }
);

interface UsePlayerRequestsReturn {
  players: PlayerRequest[];
  totalPages: number;
  currentPage: number;
  loading: boolean;
  error: string | null;
  fetchPlayers: (page: number, status: string) => Promise<void>;
  setPlayers: React.Dispatch<React.SetStateAction<PlayerRequest[]>>;
  setTotalPages: React.Dispatch<React.SetStateAction<number>>;
}

const ITEMS_PER_PAGE = 10;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchPlayersWithRetry = async (
  page: number,
  status: string,
  user: User | null,
  retryCount = 0
): Promise<{ data: any[] | null; count: number | null; error: any }> => {
  try {
    // If user has no ENT access, return empty result immediately
    if (!user?.ent_access || user.ent_access.length === 0) {
      console.log('No ENT access, returning empty result');
      return { data: [], count: 0, error: null };
    }

    // Calculate the range for pagination
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE - 1;

    console.log('Fetching players with status:', status);
    console.log('Page range:', { start, end });
    console.log('User ENT access:', convertEntFormat.formatUserDetails(user));

    const entAccessWithHyphens = convertEntFormat.getUserEntAccess(user);

    // First, get the count of total records for pagination
    const { count: totalCount } = await supabase
      .from('pending_players')
      .select('*', { count: 'exact', head: true })
      .eq('registration_status', status)
      .in('team_code', entAccessWithHyphens);

    console.log('Count result:', totalCount);

    // Then fetch the actual data for the current page
    const { data, error: dataError } = await supabase
      .from('pending_players')
      .select('*')
      .eq('registration_status', status)
      .in('team_code', entAccessWithHyphens)
      .range(start, end)
      .order('created_at', { ascending: false });

    console.log('Fetch result:', { data, error: dataError });

    if (dataError) throw dataError;

    return { data, count: totalCount || 0, error: null };
  } catch (error) {
    console.error('Error in fetchPlayersWithRetry:', error);
    if (retryCount < MAX_RETRIES) {
      console.log(`Retry attempt ${retryCount + 1} of ${MAX_RETRIES}`);
      await sleep(RETRY_DELAY * (retryCount + 1));
      return fetchPlayersWithRetry(page, status, user, retryCount + 1);
    }
    return { data: null, count: null, error };
  }
};

const usePlayerRequests = (initialPage: number): UsePlayerRequestsReturn => {
  const [players, setPlayers] = useState<PlayerRequest[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const fetchPlayers = useCallback(async (page: number, status: string = 'pending') => {
    try {
      setLoading(true);
      setError(null);

      console.log('Starting fetchPlayers with:', { page, status });
      const { data, count, error } = await fetchPlayersWithRetry(page, status, user);

      if (error) {
        console.error('Error from fetchPlayersWithRetry:', error);
        throw error;
      }

      if (data) {
        console.log('Successfully fetched players:', { 
          count, 
          dataLength: data.length,
          firstItem: data[0]
        });
        setPlayers(data);
        setCurrentPage(page);
        setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
      } else {
        console.log('No data returned from fetchPlayersWithRetry');
        setPlayers([]);
        setTotalPages(1);
      }
    } catch (err: any) {
      console.error('Error in fetchPlayers:', err);
      setError(err?.message || 'Failed to fetch players. Please try again.');
      setPlayers([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [user]); // Add user to dependency array

  return {
    players,
    totalPages,
    currentPage,
    loading,
    error,
    fetchPlayers,
    setPlayers,
    setTotalPages
  };
};

const NewPlayersPage = () => {
  const router = useRouter();

  const {
    players,
    totalPages,
    currentPage,
    loading,
    error,
    fetchPlayers,
    setPlayers,
    setTotalPages
  } = usePlayerRequests(1);

  const [actionLoading, setActionLoading] = useState<LoadingState | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [user, setUser] = useState<User | null>(null);
  const [notification, setNotification] = useState<NotificationModal>({
    show: false,
    type: 'success',
    message: ''
  });

  // Load user data only once
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(userData) as User;
      if (parsedUser.department !== "Support" && parsedUser.department !== "Admin") {
        router.push("/dashboard");
        return;
      }
      setUser(parsedUser);
    } catch (error: unknown) {
      console.error("Error in auth setup:", error);
      router.push("/login");
    }
  }, [router]);

  // Handle initial data fetch and polling
  useEffect(() => {
    if (!user) return;

    // Initial fetch only
    fetchPlayers(1, activeTab);
  }, [user, activeTab, fetchPlayers]);

  // Handle tab changes
  useEffect(() => {
    fetchPlayers(1, activeTab);
  }, [activeTab, fetchPlayers]);

  // Add real-time subscription
  useEffect(() => {
    // Only subscribe when we have a user
    if (!user) return;

    // Create a real-time subscription
    const channel = supabase.channel('custom-pending-players')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pending_players' },
        async (payload) => {
          console.log('Real-time update received:', payload);

          // Handle different types of changes
          switch (payload.eventType) {
            case 'INSERT':
              if (activeTab === 'pending' && payload.new.registration_status === 'pending') {
                // Refresh the list to include the new player
                await fetchPlayers(currentPage, activeTab);
              }
              break;

            case 'UPDATE':
              // If the status changed, we need to handle it based on our current tab
              if (payload.old.registration_status !== payload.new.registration_status) {
                if (
                  // If we're viewing the tab that matches the new status
                  (activeTab === payload.new.registration_status) ||
                  // Or if we're viewing the tab that matches the old status
                  (activeTab === payload.old.registration_status)
                ) {
                  // Refresh the list
                  await fetchPlayers(currentPage, activeTab);
                }
              } else if (activeTab === payload.new.registration_status) {
                // If the status didn't change but other fields did, and we're on the relevant tab
                await fetchPlayers(currentPage, activeTab);
              }
              break;

            case 'DELETE':
              if (activeTab === payload.old.registration_status) {
                // Refresh the list to remove the deleted player
                await fetchPlayers(currentPage, activeTab);
              }
              break;
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      channel.unsubscribe();
    };
  }, [user, activeTab, currentPage, fetchPlayers]);

  const handleLogout = () => {
    try {
      Cookies.remove("token");
      localStorage.removeItem("user");
      router.push("/login");
    } catch (error: unknown) {
      console.error("Error during logout:", error);
    }
  };

  // Add ManyChat message sending function
  const sendManyChatMessage = async (subscriberId: string, customMessage?: string, customFields?: Record<string, any>, teamCode?: string) => {
    try {
      // Determine ENT based on team code
      let ent: 'ENT1' | 'ENT2' | 'ENT3';
      
      // Map specific team codes to ENT options
      switch (teamCode) {
        case 'ENT-1':
          ent = 'ENT1';
          break;
        case 'ENT-2':
          ent = 'ENT2';
          break;
        case 'ENT-3':
          ent = 'ENT3';
          break;
        default:
          console.error('Invalid team code format:', teamCode);
          throw new Error(`Invalid team code format: ${teamCode}. Expected ENT-1, ENT-2, or ENT-3`);
      }

      console.log('Sending ManyChat message with ENT:', ent, 'for team code:', teamCode);

      const response = await fetch('/api/manychat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscriberId,
          message: customMessage || "Congratulations! Your registration has been approved. Welcome to our gaming community! 🎮",
          customFields: customFields || {
            registration_status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by: user?.name || 'System'
          },
          ent
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('ManyChat API error details:', errorData);
        throw new Error(errorData.error || 'Failed to send message');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending ManyChat message:', error);
      throw error instanceof Error ? error : new Error('Failed to send message');
    }
  };

  const handleAction = async (playerId: string, status: "approved" | "rejected") => {
    try {
      console.log('Starting handleAction with:', { playerId, status });

      setActionLoading({ id: playerId, action: status });

      // First, get the current status of the player
      const { data: currentPlayer, error: fetchError } = await supabase
        .from('pending_players')
        .select(`
          *,
          manychat_data
        `)
        .eq('id', playerId)
        .single();

      if (fetchError) {
        console.error('Error fetching player:', fetchError);
        throw fetchError;
      }

      // Check if player already exists
      if (status === "approved") {
        const { data: existingPlayer } = await supabase
          .from('players')
          .select('id, messenger_id')
          .eq('messenger_id', currentPlayer.manychat_data.id)
          .single();

        if (existingPlayer) {
          setNotification({
            show: true,
            type: 'warning',
            message: 'This player is already registered in the system. The request will be marked as processed.'
          });
        }

        // Send approval message via ManyChat with team code
        try {
          await sendManyChatMessage(
            currentPlayer.manychat_data.id,
            "Congratulations! Your registration has been approved. Welcome to our gaming community! 🎮",
            undefined,
            currentPlayer.manychat_data.custom_fields.team_code
          );
        } catch (manyChatError) {
          console.error('Error sending ManyChat message:', manyChatError);
          setNotification({
            show: true,
            type: 'warning',
            message: 'Player approved, but there was an error sending the notification message.'
          });
        }
      } else if (status === "rejected") {
        // Send rejection message via ManyChat with team code
        try {
          await sendManyChatMessage(
            currentPlayer.manychat_data.id,
            "We regret to inform you that your registration request has been declined. If you have any questions, please contact our support team. 🎮",
            undefined,
            currentPlayer.manychat_data.custom_fields.team_code
          );
        } catch (manyChatError) {
          console.error('Error sending ManyChat rejection message:', manyChatError);
          setNotification({
            show: true,
            type: 'warning',
            message: 'Player rejected, but there was an error sending the notification message.'
          });
        }
      }

      // Update the player's status in pending_players table
      const { data: updateData, error: updateError } = await supabase
        .from('pending_players')
        .update({ 
          registration_status: status,
          processed_by: user?.id || null,
          processed_at: new Date().toISOString()
        })
        .eq('id', playerId)
        .select();

      if (updateError) {
        console.error('Error updating player:', updateError);
        throw updateError;
      }

      // Show success notification
      setNotification({
        show: true,
        type: 'success',
        message: `Successfully ${status === "approved" ? "approved" : "rejected"} player registration`
      });

      // Refresh the players list
      await fetchPlayers(currentPage, activeTab);

      return { success: true };
    } catch (error) {
      console.error(`Error ${status}ing player:`, error);

      // Show error notification with more user-friendly message
      setNotification({
        show: true,
        type: 'error',
        message: error instanceof Error ? error.message : 
                 "An error occurred while updating player status. Please try again or contact support."
      });

      throw error;
    } finally {
      setActionLoading(null);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      fetchPlayers(newPage, activeTab);
    }
  };

  // Add Notification Modal component
  const NotificationModal = () => {
    if (!notification.show) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-[#1a1a1a] rounded-lg p-6 w-[400px] border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {notification.type === 'success' ? (
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : notification.type === 'warning' ? (
                <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
              <h3 className={`text-lg font-medium ${notification.type === 'success' ? 'text-emerald-500' : notification.type === 'warning' ? 'text-yellow-500' : 'text-red-500'}`}>
                {notification.type === 'success' ? 'Success' : notification.type === 'warning' ? 'Warning' : 'Error'}
              </h3>
            </div>
            <button 
              onClick={() => setNotification(prev => ({ ...prev, show: false }))}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-300">{notification.message}</p>
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setNotification(prev => ({ ...prev, show: false }))}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                notification.type === 'success' 
                  ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                  : notification.type === 'warning'
                    ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20'
                    : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
              }`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
        {/* {user.department === "Support" ? (
        <SupportHeader user={user} />
      ) : (
        <AdminHeader user={user} />
      )} */}
      <div className="flex-1 pl-64">
        <main className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-gray-400">Intercom</h1>

            </div>
            <button
              onClick={() => fetchPlayers(currentPage, activeTab)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              )}
              <span>Refresh</span>
            </button>
          </div>

          {/* Replace the old tabs section */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {/* Pending Card */}
            <div 
              onClick={() => setActiveTab("pending")}
              className={`relative bg-[#1a1a1a] rounded-2xl p-6 cursor-pointer transform transition-all duration-200 hover:scale-105 ${
                activeTab === "pending" ? 'scale-105 before:opacity-100' : ''
              } before:absolute before:inset-0 before:bg-gradient-to-b before:from-amber-500/20 before:to-transparent before:rounded-2xl before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 group`}
            >
              <div className={`absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent ${activeTab === "pending" ? 'opacity-100' : ''}`}></div>
              <div className={`absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-amber-500/10 to-transparent ${activeTab === "pending" ? 'opacity-100' : ''}`}></div>
              <div className={`absolute inset-y-0 -left-px w-px bg-gradient-to-b from-transparent via-amber-500/50 to-transparent transition-opacity duration-500 ${activeTab === "pending" ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></div>
              <div className={`absolute inset-y-0 -right-px w-px bg-gradient-to-b from-transparent via-amber-500/50 to-transparent transition-opacity duration-500 ${activeTab === "pending" ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xl text-amber-500 font-medium tracking-wider">PENDING</div>
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className={`text-3xl font-bold text-white mb-1 transition-transform duration-300 ${activeTab === "pending" ? 'scale-105' : 'group-hover:scale-105'}`}>
                  {players.filter(p => p.registration_status === "pending").length}
                </div>
                <div className="text-sm text-gray-400 mb-4">Requests</div>
              </div>
            </div>

            {/* Approved Card */}
            <div 
              onClick={() => setActiveTab("approved")}
              className={`relative bg-[#1a1a1a] rounded-2xl p-6 cursor-pointer transform transition-all duration-200 hover:scale-105 ${
                activeTab === "approved" ? 'scale-105 before:opacity-100' : ''
              } before:absolute before:inset-0 before:bg-gradient-to-b before:from-emerald-500/20 before:to-transparent before:rounded-2xl before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 group`}
            >
              <div className={`absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent ${activeTab === "approved" ? 'opacity-100' : ''}`}></div>
              <div className={`absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent ${activeTab === "approved" ? 'opacity-100' : ''}`}></div>
              <div className={`absolute inset-y-0 -left-px w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent transition-opacity duration-500 ${activeTab === "approved" ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></div>
              <div className={`absolute inset-y-0 -right-px w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent transition-opacity duration-500 ${activeTab === "approved" ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xl text-emerald-500 font-medium tracking-wider">APPROVED</div>
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className={`text-3xl font-bold text-white mb-1 transition-transform duration-300 ${activeTab === "approved" ? 'scale-105' : 'group-hover:scale-105'}`}>
                  {players.filter(p => p.registration_status === "approved").length}
                </div>
                <div className="text-sm text-gray-400 mb-4">Requests</div>
              </div>
            </div>

            {/* Rejected Card */}
            <div 
              onClick={() => setActiveTab("rejected")}
              className={`relative bg-[#1a1a1a] rounded-2xl p-6 cursor-pointer transform transition-all duration-200 hover:scale-105 ${
                activeTab === "rejected" ? 'scale-105 before:opacity-100' : ''
              } before:absolute before:inset-0 before:bg-gradient-to-b before:from-red-500/20 before:to-transparent before:rounded-2xl before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 group`}
            >
              <div className={`absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent ${activeTab === "rejected" ? 'opacity-100' : ''}`}></div>
              <div className={`absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-red-500/10 to-transparent ${activeTab === "rejected" ? 'opacity-100' : ''}`}></div>
              <div className={`absolute inset-y-0 -left-px w-px bg-gradient-to-b from-transparent via-red-500/50 to-transparent transition-opacity duration-500 ${activeTab === "rejected" ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></div>
              <div className={`absolute inset-y-0 -right-px w-px bg-gradient-to-b from-transparent via-red-500/50 to-transparent transition-opacity duration-500 ${activeTab === "rejected" ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xl text-red-500 font-medium tracking-wider">REJECTED</div>
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
                <div className={`text-3xl font-bold text-white mb-1 transition-transform duration-300 ${activeTab === "rejected" ? 'scale-105' : 'group-hover:scale-105'}`}>
                  {players.filter(p => p.registration_status === "rejected").length}
                </div>
                <div className="text-sm text-gray-400 mb-4">Requests</div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-gray-800/20">
            {loading ? (
              <div className="p-4 text-center text-gray-400">
                Loading players...
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-500">{error}</div>
            ) : players.length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                No players found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        PENDING SINCE
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        PLAYER NAME
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        TEAM CODE
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        REFERRED BY
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {players
                      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                      .map((player) => (
                      <tr key={player.id} className="hover:bg-[#252b3b]">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            {(() => {
                              const { timeString, colorClass } = getTimeElapsed(player.created_at);
                              return (
                                <>
                                  <span className={`text-xs font-medium ${colorClass}`}>
                                    {timeString}
                                  </span>
                                  <span className="text-sm text-gray-300">
                                    {new Date(player.created_at).toLocaleDateString()}
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 overflow-hidden">
                              {player.manychat_data.profile_pic ? (
                                <Image
                                  src={player.manychat_data.profile_pic}
                                  alt={player.manychat_data.name || "Player"}
                                  width={32}
                                  height={32}
                                  className="w-full h-full object-cover"
                                />
                              ) : player.manychat_data.first_name ? (
                                player.manychat_data.first_name.charAt(0)
                              ) : (
                                "?"
                              )}
                            </div>
                            <span className="ml-2 text-sm text-gray-300">
                              {player.manychat_data.name || "Unknown Player"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                          {player.manychat_data.custom_fields.team_code || "N/A"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 overflow-hidden">
                              {player.referred_by?.profile?.profile_pic ? (
                                <Image
                                  src={player.referred_by.profile.profile_pic}
                                  alt={player.referred_by.player_name || "Referrer"}
                                  width={32}
                                  height={32}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span>
                                  {player.referred_by?.player_name?.charAt(0) || "?"}
                                </span>
                              )}
                            </div>
                            <span className="ml-2 text-sm text-gray-300">
                              {player.referred_by?.player_name || "No Referrer"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAction(player.id, "approved")}
                              disabled={
                                actionLoading?.id === player.id ||
                                player.registration_status !== "pending"
                              }
                              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading?.id === player.id &&
                              actionLoading.action === "approved" ? (
                                <svg
                                  className="w-4 h-4 animate-spin"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="none"
                                  />
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </button>
                            <button
                              onClick={() => handleAction(player.id, "rejected")}
                              disabled={
                                actionLoading?.id === player.id ||
                                player.registration_status !== "pending"
                              }
                              className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading?.id === player.id &&
                              actionLoading.action === "rejected" ? (
                                <svg
                                  className="w-4 h-4 animate-spin"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="none"
                                  />
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {/* Pagination */}
            {!loading && !error && players.length > 0 && (
              <div className="flex justify-center gap-2 p-4">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded bg-blue-500/10 text-blue-500 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-gray-400">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded bg-blue-500/10 text-blue-500 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
      <NotificationModal />
    </div>
  );
};

export default NewPlayersPage;
