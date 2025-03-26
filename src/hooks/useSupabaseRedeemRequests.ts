import { useEffect, useState } from 'react';
import { supabase } from '@/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { RedeemRequest } from '@/types/requests';

interface PaymentMethod {
  type: string;
  username: string;
}

interface ManyChatProfile {
  gender: string;
  fullName: string;
  language: string;
  lastName: string;
  timezone: string;
  firstName: string;
  profilePic: string;
}

interface ManyChatPlatforms {
  firekirin_username: string | null;
  orionstars_username: string | null;
}

interface ManyChatData {
  _id: string;
  team: string;
  status: string;
  profile: ManyChatProfile;
  vipCode: string;
  platforms: ManyChatPlatforms;
  playerName: string;
}

interface Stats {
  pending: number;
  verification_failed: number;
  rejected: number;
  under_processing: number;
  disputed: number;
}

interface UseSupabaseRedeemRequestsProps {
  activeTab: 'Pending' | 'VerificationFailed' | 'Rejected' | 'Disputed';
  activeTeamCode: 'ALL' | 'ENT-1' | 'ENT-2' | 'ENT-3';
  limit: number;
}

export function useSupabaseRedeemRequests({
  activeTab,
  activeTeamCode,
  limit
}: UseSupabaseRedeemRequestsProps) {
  const [redeemRequests, setRedeemRequests] = useState<RedeemRequest[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statsData, setStatsData] = useState<Stats>({
    pending: 0,
    verification_failed: 0,
    rejected: 0,
    under_processing: 0,
    disputed: 0
  });
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // Function to get status based on active tab
  const getStatusFilter = () => {
    switch (activeTab) {
      case 'Pending':
        return 'pending';
      case 'VerificationFailed':
        return 'verification_failed';
      case 'Rejected':
        return 'rejected';
      case 'Disputed':
        return 'disputed';
      default:
        return 'pending';
    }
  };

  // Function to fetch stats
  const fetchStats = async () => {
    try {
      const { data: statsData, error: statsError } = await supabase
        .from('redeem_requests')
        .select('status', { count: 'exact' })
        .in('status', ['pending', 'verification_failed', 'rejected', 'under_processing', 'disputed']);

      if (statsError) throw statsError;

      const stats = {
        pending: statsData.filter(r => r.status === 'pending').length,
        verification_failed: statsData.filter(r => r.status === 'verification_failed').length,
        rejected: statsData.filter(r => r.status === 'rejected').length,
        under_processing: statsData.filter(r => r.status === 'under_processing').length,
        disputed: statsData.filter(r => r.status === 'disputed').length
      };

      setStatsData(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Function to fetch redeem requests
  const fetchRedeemRequests = async () => {
    try {
      setIsLoading(true);
      const status = getStatusFilter();
      const start = (currentPage - 1) * limit;
      const end = start + limit - 1;

      let query = supabase
        .from('redeem_requests')
        .select('*', { count: 'exact' })
        .eq('status', status)
        .range(start, end)
        .order('created_at', { ascending: false });

      // Add team code filter if not 'ALL'
      if (activeTeamCode !== 'ALL') {
        query = query.eq('team_code', activeTeamCode);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setRedeemRequests(data || []);
      setTotalRecords(count || 0);
      setTotalPages(Math.ceil((count || 0) / limit));
    } catch (error) {
      console.error('Error fetching redeem requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle real-time updates
  const setupRealtimeSubscription = () => {
    if (channel) {
      channel.unsubscribe();
    }

    const newChannel = supabase.channel('redeem-requests-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'redeem_requests' },
        (payload) => {
          console.log('Change received!', payload);
          // Refresh data when changes occur
          fetchRedeemRequests();
          fetchStats();
        }
      )
      .subscribe();

    setChannel(newChannel);
  };

  // Effect for initial load and when filters change
  useEffect(() => {
    fetchRedeemRequests();
    fetchStats();
  }, [activeTab, activeTeamCode, currentPage, limit]);

  // Effect for real-time subscription
  useEffect(() => {
    setupRealtimeSubscription();
    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, []);

  // Function to manually refresh data
  const refresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchRedeemRequests(), fetchStats()]);
    setIsRefreshing(false);
  };

  return {
    redeemRequests,
    currentPage,
    totalPages,
    totalRecords,
    isLoading,
    isRefreshing,
    statsData,
    refresh,
    setCurrentPage
  };
} 