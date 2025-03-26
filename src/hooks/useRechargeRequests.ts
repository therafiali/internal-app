import { useEffect, useState } from 'react';
import { supabase } from '@/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface RechargeRequest {
  id: string;
  vip_code: string;
  player_name: string;
  messenger_id: string;
  team_code: string;
  game_platform: string;
  game_username: string;
  amount: number;
  bonus_amount: number;
  credits_loaded: number;
  status: string;
  promo_code: string | null;
  promo_type: string | null;
  payment_method: string | null;
  screenshot_url: string | null;
  notes: string;
  manychat_data: any;
  agent_name: string;
  agent_department: string;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  assigned_redeem: any | null;
  action_status: string;
  identifier: string | null;
  rejected_reason: string | null;
  reject_notes: string | null;
  assigned_ct: {
    c_id: string;
    type: string;
    amount: number;
    cashtag: string;
    assigned_at: string;
    assigned_by: string;
  } | null;
}

interface UseRechargeRequestsProps {
  page: number;
  limit: number;
  status?: string;
}

interface Stats {
  pending: number;
  failed: number;
  completed: number;
  disputed: number;
}

export const useRechargeRequests = ({ page, limit, status }: UseRechargeRequestsProps) => {
  const [requests, setRequests] = useState<RechargeRequest[]>([]);
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    failed: 0,
    completed: 0,
    disputed: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('recharge_requests')
        .select('*')
        .range((page - 1) * limit, page * limit - 1);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setRequests(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statuses = ['pending', 'failed', 'sc_processed', 'disputed'];
      const counts = await Promise.all(
        statuses.map(async (statusType) => {
          const { count } = await supabase
            .from('recharge_requests')
            .select('*', { count: 'exact', head: true })
            .eq('status', statusType);
          return { status: statusType, count: count || 0 };
        })
      );

      const newStats = {
        pending: counts.find(c => c.status === 'pending')?.count || 0,
        failed: counts.find(c => c.status === 'failed')?.count || 0,
        completed: counts.find(c => c.status === 'sc_processed')?.count || 0,
        disputed: counts.find(c => c.status === 'disputed')?.count || 0
      };

      setStats(newStats);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('recharge_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recharge_requests'
        },
        async (payload) => {
          console.log('Realtime change:', payload);
          // Refresh data and stats when changes occur
          await Promise.all([fetchRequests(), fetchStats()]);
        }
      )
      .subscribe();

    setRealtimeChannel(channel);
  };

  useEffect(() => {
    fetchRequests();
    fetchStats();
    setupRealtimeSubscription();

    return () => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [page, limit, status]);

  const updateRequestStatus = async (
    requestId: string,
    newStatus: string,
    notes?: string,
    rejectedReason?: string
  ) => {
    try {
      const updateData: any = {
        status: newStatus,
        processed_by: (await supabase.auth.getUser()).data.user?.email,
        processed_at: new Date().toISOString()
      };

      if (notes) updateData.notes = notes;
      if (rejectedReason) updateData.rejected_reason = rejectedReason;

      const { error: updateError } = await supabase
        .from('recharge_requests')
        .update(updateData)
        .eq('id', requestId);

      if (updateError) throw updateError;

      // The realtime subscription will handle the UI update
    } catch (err) {
      throw err;
    }
  };

  return {
    requests,
    stats,
    loading,
    error,
    refetch: fetchRequests,
    updateRequestStatus
  };
}; 