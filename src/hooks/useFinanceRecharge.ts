import { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/supabase/client";

export interface ManyChatProfile {
  gender: string;
  fullName: string;
  language: string;
  lastName: string;
  timezone: string;
  firstName: string;
  profilePic: string;
}

export interface ManyChatPlatforms {
  firekirin_username: string | null;
  orionstars_username: string | null;
}

export interface ManyChatData {
  _id: string;
  team: string;
  status: string;
  profile: ManyChatProfile;
  vipCode: string;
  platforms: ManyChatPlatforms;
  playerName: string;
  messengerId: string;
}

export interface PendingDeposit {
  init_id: string;
  initiated_by: {
    name: string;
    employee_code: string;
    profile_pic: string;
  };
  redeem_id: string;
  rechargeId: string;
  recharge_id: string | null;
  vip_code: string;
  player_name: string;
  player_details: {
    firstName: string;
    lastName: string;
    fullName: string;
  };
  messenger_id: string;
  teamCode: string;
  game_platform: string;
  game_username: string;
  amount: number;
  bonus_amount: number;
  credits_loaded: number;
  status: string;
  processing_state: 'idle' | 'in_progress';
  promo_code: string | null;
  promo_type: string | null;
  payment_method: JSON | null;
  screenshot_url: string | null;
  notes: string | null;
  manychat_data: ManyChatData;
  agent_name: string;
  agent_department: string;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  profile_pic?: string;
  assigned_redeem?: {
    redeem_id: string;
    amount: number;
    type: string;
    assigned_at: string;
  };
  platform_usernames: {
    firekirin: string | null;
    orionstars: string | null;
  };
  assigned_ct: {
    c_id: string;
    type: string;
    amount: number;
    cashtag: string;
    assigned_at: string;
    assigned_by: string;
    company_tag:string;
  };
}

export interface PendingWithdrawal {
  redeemId: string;
  redeem_id: string;
  totalAmount: number;
  amountHold: number;
  redeem_online_status: boolean;
  amountAvailable: number;
  amountPaid: number;
  paymentMethods: Array<{
    type: string;
    username: string;
    _id?: string;
  }>;
  profile_pic?: string;
  name?: string;
  created_at: string;
  online_status: boolean;
}

export interface CompanyTag {
  id: string;
  name: string;
  ctType: string;
  cashtag: string;
  balance: number;
  limit: number;
}

interface Stats {
  pending: number;
  assigned: number;
  completed: number;
}

export const useFinanceRecharge = () => {
  const [deposits, setDeposits] = useState<PendingDeposit[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<PendingWithdrawal[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    assigned: 0,
    completed: 0
  });

  // Updated transform function to include all fields
  const transformRechargeRequest = (data: any): PendingDeposit => {
    // Get platform usernames from manychat data
    const platformUsernames = {
      firekirin: data.manychat_data?.platforms?.firekirin_username,
      orionstars: data.manychat_data?.platforms?.orionstars_username
    };

    // Determine game username and platform
    const game_username = data.game_username || 
      (data.game_platform === 'Fire Kirin' ? platformUsernames.firekirin :
       data.game_platform === 'Orion Stars' ? platformUsernames.orionstars : null);

    // Get player's full name from manychat data if available
    const playerName = data.manychat_data?.profile?.fullName || data.player_name;
    const firstName = data.manychat_data?.profile?.firstName || '';
    const lastName = data.manychat_data?.profile?.lastName || '';

    return {
      rechargeId: data.id,
      redeem_id: data.redeem_id,
      recharge_id: data.recharge_id,
      vip_code: data.vip_code,
      player_name: playerName,
      player_details: {
        firstName,
        lastName,
        fullName: playerName
      },
      initiated_by: {
        name: data.initiated_by?.name,
        employee_code: data.initiated_by?.employee_code,
        profile_pic: data.initiated_by?.profile_pic
      },
      messenger_id: data.messenger_id,
      teamCode: data.team_code,
      game_platform: data.game_platform || '',
      game_username: game_username || '',
      amount: data.amount,
      bonus_amount: data.bonus_amount,
      credits_loaded: data.credits_loaded,
      status: data.status,
      processing_state: data.processing_state || 'idle',
      promo_code: data.promo_code,
      promo_type: data.promo_type,
      payment_method: data.payment_method,
      screenshot_url: data.screenshot_url,
      notes: data.notes,
      manychat_data: data.manychat_data,
      agent_name: data.agent_name,
      agent_department: data.agent_department,
      processed_by: data.processed_by,
      processed_at: data.processed_at,
      created_at: data.created_at,
      init_id: data.init_id,
      updated_at: data.updated_at,
      profile_pic: data.manychat_data?.profile?.profilePic || `https://ui-avatars.com/api/?name=${playerName}`,
      assigned_redeem: data.assigned_redeem,
      platform_usernames: platformUsernames,
      assigned_ct: {
        c_id: data?.assigned_ct?.c_id,
        type: data?.assigned_ct?.type,
        amount: data?.assigned_ct?.amount,
        cashtag: data?.assigned_ct?.cashtag,
        assigned_at: data?.assigned_ct?.assigned_at,
        assigned_by: data?.assigned_ct?.assigned_by,
        company_tag:data?.assigned_ct?.company_tag
      }
    };
  };

  // Function to fetch recharge requests
  const fetchDeposits = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('recharge_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedData = data.map(transformRechargeRequest);
      setDeposits(transformedData);

    
      // Fetch stats
      const statsData = {
        pending: data.filter(r => r.status === 'pending').length,
        assigned: data.filter(r => r.status === 'assigned' || r.status === 'assigned_and_hold').length,
        completed: data.filter(r => r.status === 'completed').length
      };
      setStats(statsData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching recharge requests:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  console.log("deposits hook", deposits);
  // Function to fetch pending withdrawals
  const fetchPendingWithdrawals = useCallback(async () => {
    try {
      setLoadingWithdrawals(true);
      const { data, error } = await supabase
        .from('redeem_requests')
        .select('id, redeem_id, amount_hold, total_amount, amount_available, amount_paid, payment_methods, player_name, player_data, init_id, created_at, redeem_online_status')
        .in('status', ['queued', 'queued_partially_paid'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedData = data.map(item => ({
        redeemId: item.id,
        redeem_id: item.redeem_id,
        totalAmount: item.total_amount,
        amountAvailable: item.amount_available,
        amountPaid: item.amount_paid,
        amountHold: item.amount_hold || 0,
        paymentMethods: item.payment_methods || [],
        profile_pic: item.player_data?.profile?.profilePic || `https://ui-avatars.com/api/?name=${item.player_name}`,
        name: item.player_name,
        redeem_online_status: item.redeem_online_status,
        created_at: item.created_at,
        online_status: item.redeem_online_status
      }));

      setPendingWithdrawals(transformedData);
    } catch (err) {
      console.error('Error fetching pending withdrawals:', err);
    } finally {
      setLoadingWithdrawals(false);
    }
  }, []);

  // Function to fetch available tags
  const fetchAvailableTags = useCallback(async (rechargeId: string) => {
    try {
      setLoadingTags(true);
      const { data, error } = await supabase
        .from('company_tags')
        .select('*')
        .eq('status', 'active');

      if (error) throw error;

      return data;
    } catch (err) {
      console.error('Error fetching available tags:', err);
      return [];
    } finally {
      setLoadingTags(false);
    }
  }, []);

  // Function to handle P2P assignment
  const handleP2PAssign = async (rechargeId: string, redeemId: string, amount: number, matchType: string) => {
    console.log("[handleP2PAssign] Starting assignment with:", {
      rechargeId,
      redeemId,
      amount,
      matchType
    });

    try {
      // Validate UUIDs
      if (!rechargeId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        throw new Error('Invalid recharge ID format');
      }
      if (!redeemId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        throw new Error('Invalid redeem ID format');
      }

      // First, get the redeem request to check payment methods
      const { data: redeemData, error: redeemError } = await supabase
        .from('redeem_requests')
        .select('payment_methods, status, total_amount, amount_hold, amount_paid')
        .eq('id', redeemId)
        .single();

      if (redeemError) {
        console.error('[handleP2PAssign] Error fetching redeem:', redeemError);
        throw redeemError;
      }

      console.log("[handleP2PAssign] Redeem data:", {
        paymentMethods: redeemData.payment_methods,
        status: redeemData.status,
        totalAmount: redeemData.total_amount,
        amountHold: redeemData.amount_hold,
        amountPaid: redeemData.amount_paid
      });

      // Ensure payment_methods is in the correct format
      const paymentMethods = redeemData.payment_methods || [];

      // Get recharge request details
      const { data: rechargeData, error: rechargeError } = await supabase
        .from('recharge_requests')
        .select('status, amount')
        .eq('id', rechargeId)
        .single();

      if (rechargeError) {
        console.error('[handleP2PAssign] Error fetching recharge:', rechargeError);
        throw rechargeError;
      }

      console.log("[handleP2PAssign] Recharge data:", {
        status: rechargeData.status,
        amount: rechargeData.amount
      });

      const { data, error } = await supabase
        .rpc('handle_p2p_assign', {
          p_recharge_id: rechargeId,
          p_assign_amount: amount,
          p_redeem_id: redeemId,
          p_match_type: matchType,
          p_payment_methods: paymentMethods
        });

      if (error) {
        console.error('[handleP2PAssign] Error in RPC call:', error);
        throw error;
      }

      // Log success
      console.log('[handleP2PAssign] Success:', data);

      // Refresh both deposits and withdrawals to get latest data
      await Promise.all([
        fetchDeposits(),
        fetchPendingWithdrawals()
      ]);

      return data;
    } catch (err) {
      console.error('[handleP2PAssign] Error:', err);
      throw err;
    }
  };

  // Function to handle CT assignment
  const handleCTAssign = async (rechargeId: string, tagId: string, amount: number,company_tag: string, user_id: string, user: any) => {
    try {
      const { data, error } = await supabase
        .from('recharge_requests')
        .update({
          status: 'assigned',
          assigned_tag: {
            tag_id: tagId,
            amount: amount,
            company_tag: company_tag
          },
          finance_by: {
            name: user?.name,
            employee_code: user?.employee_code,
            profile_pic: user?.user_profile_pic
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', rechargeId)
        .select();

      if (error) throw error;

      await fetchDeposits();
      return data;
    } catch (err) {
      throw err;
    }
  };

  // Add a helper function to check if a withdrawal has enough available amount
  const checkWithdrawalAvailability = (withdrawal: PendingWithdrawal, requiredAmount: number): boolean => {
    const totalAmount = withdrawal.totalAmount || 0;
    const amountHold = withdrawal.amountHold || 0;
    const amountPaid = withdrawal.amountPaid || 0;
    const availableToHold = totalAmount - amountHold - amountPaid;
    return availableToHold >= requiredAmount;
  };

  // Add process recharge request function
  const processRechargeRequest = async (
    rechargeId: string,
    status: string,
    processedBy: string,
    notes: string
  ) => {
    try {
      const { data, error } = await supabase.rpc('process_recharge_request', {
        p_recharge_id: rechargeId,
        p_status: status,
        p_processed_by: processedBy,
        p_notes: notes
      });

      if (error) {
        console.error('[processRechargeRequest] Error:', error);
        throw error;
      }

      // Update the recharge request with the new status
      await supabase
        .from('recharge_requests')
        .update({
          assigned_id: processedBy,
        })
        .eq('id', rechargeId)
        .select();

      if (error) throw error;
      

      // Log success
      console.log('[processRechargeRequest] Success:', data);

      // Refresh deposits to get latest data
      await fetchDeposits();

      return data;
    } catch (err) {
      console.error('[processRechargeRequest] Error:', err);
      throw err;
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchDeposits();

    // Set up realtime subscriptions
    const rechargeChannel = supabase.channel('recharge-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recharge_requests'
        },
        (payload) => {
          console.log('Recharge request changed:', payload);
          fetchDeposits(); // Refresh data when changes occur
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'redeem_requests'
        },
        (payload) => {
          console.log('Redeem request changed:', payload);
          fetchPendingWithdrawals(); // Refresh withdrawals data
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      rechargeChannel.unsubscribe();
    };
  }, [fetchDeposits, fetchPendingWithdrawals]);

  return {
    deposits,
    pendingWithdrawals,
    loading,
    loadingWithdrawals,
    loadingTags,
    error,
    stats,
    fetchDeposits,
    fetchPendingWithdrawals,
    fetchAvailableTags,
    handleP2PAssign,
    handleCTAssign,
    checkWithdrawalAvailability,
    processRechargeRequest
  };
};
