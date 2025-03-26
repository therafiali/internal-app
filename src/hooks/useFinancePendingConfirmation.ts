import { useEffect, useState } from 'react';
import { supabase } from '@/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useCTActivityLogger } from './useCTActivityLogger';

export type RechargeRequest = {
  id: string;
  recharge_id: string;
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
};

type Stats = {
  pending: number;
  failed: number;
  completed: number;
  disputed: number;
};

const isBase64 = (str: string): boolean => {
  try {
    return btoa(atob(str)) === str;
  } catch (err) {
    return false;
  }
};

const uploadScreenshot = async (base64Data: string, requestId: string): Promise<string | null> => {
  try {
    // Remove data URL prefix if present
    const base64Content = base64Data.includes('base64,') 
      ? base64Data.split('base64,')[1] 
      : base64Data;

    // Convert base64 to Blob
    const byteCharacters = atob(base64Content);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
      const slice = byteCharacters.slice(offset, offset + 1024);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    const blob = new Blob(byteArrays, { type: 'image/png' });

    // Upload to Supabase Storage
    const fileName = `screenshots/${requestId}/${Date.now()}.png`;
    const { data, error } = await supabase.storage
      .from('recharge-screenshots')
      .upload(fileName, blob, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('recharge-screenshots')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading screenshot:', error);
    return null;
  }
};

export const useFinancePendingConfirmation = (status: string, page: number, limit: number) => {
  const [requests, setRequests] = useState<RechargeRequest[]>([]);
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    failed: 0,
    completed: 0,
    disputed: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);
  const { logCTActivity } = useCTActivityLogger();
  console.log('status', status);
  // Function to fetch requests
  const fetchRequests = async () => {
    try {
      const start = (page - 1) * limit;
      const end = start + limit - 1;
      console.log("Fetching requests with params:", {
        status,
        page,
        limit,
        start,
        end
      });

      let query = supabase
        .from('recharge_requests')
        .select('*')
        .is('assigned_redeem', null)
        .range(start, end)
        .order('created_at', { ascending: false });

      // Only apply status filter if it's provided and not 'all'
      if (status && status !== 'all') {
        query = query.eq('deposit_status', status);
      }

      let { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      console.log("Fetched data:", {
        count: data?.length || 0,
        firstItem: data?.[0],
        lastItem: data?.[data?.length - 1]
      });

      // Process screenshots if they are base64
      const processedData = await Promise.all((data || []).map(async (request) => {
        if (request.screenshot_url && isBase64(request.screenshot_url)) {
          const publicUrl = await uploadScreenshot(request.screenshot_url, request.id);
          if (publicUrl) {
            // Update the request with the new URL
            const { error: updateError } = await supabase
              .from('recharge_requests')
              .update({ screenshot_url: publicUrl })
              .eq('id', request.id);

            if (updateError) {
              console.error('Error updating screenshot URL:', updateError);
            }

            return { ...request, screenshot_url: publicUrl };
          }
        }
        return request;
      }));

      setRequests(processedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch stats
  const fetchStats = async () => {
    try {
      const statuses = ['paid', 'failed', 'verified', 'disputed'];
      const counts = await Promise.all(
        statuses.map(async (statusType) => {
          if (statusType === 'paid') {
            // Get combined count for sc_processed and completed
            const { count } = await supabase
              .from('recharge_requests')
              .select('*', { count: 'exact', head: true })
              .eq('deposit_status', 'paid')
              .is('assigned_redeem', null);
            return { status: statusType, count: count || 0 };
          }
          
          const { count } = await supabase
            .from('recharge_requests')
            .select('*', { count: 'exact', head: true })
            .eq('deposit_status', statusType)
            .is('assigned_redeem', null);
          return { status: statusType, count: count || 0 };
        })
      );

      const newStats = {
        pending: counts.find(c => c.status === 'paid')?.count || 0,
        failed: counts.find(c => c.status === 'failed')?.count || 0,
        completed: counts.find(c => c.status === 'verified')?.count || 0,
        disputed: counts.find(c => c.status === 'disputed')?.count || 0,
      };

      setStats(newStats);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  // Function to update request status
  const updateRequestStatus = async (
    requestId: string,
    rechargeId: string,
    newStatus: string,
    notes?: string,
    rejectReason?: string
  ) => {
    try {
      // Validate status before updating
      const validStatuses = [
        'pending',
        'assigned',
        'completed',
        'rejected',
        'hold_in_progress',
        'hold_complete',
        'sc_submitted',
        'sc_processed',
        'sc_rejected',
        'verified',
        'failed',
        'disputed'
      ];

      if (!validStatuses.includes(newStatus)) {
        throw new Error(`Invalid status: ${newStatus}. Must be one of: ${validStatuses.join(', ')}`);
      }

      // Get the current request data to check assigned_ct
      const { data: currentRequest, error: fetchError } = await supabase
        .from('recharge_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      const currentUser = (await supabase.auth.getUser()).data.user;
      const userMetadata = currentUser?.user_metadata;

      // If status is being set to verified and there's an assigned_ct, update company tag balance
      if (newStatus === 'verified' && currentRequest?.assigned_ct) {
        const { c_id, amount, cashtag } = currentRequest.assigned_ct;

        // First get current values and verify the company tag exists
        const { data: companyTags, error: fetchCtError } = await supabase
          .from('company_tags')
          .select('balance, total_received, transaction_count, name, id')
          .eq('cashtag', cashtag)
          .eq('status', 'active')
          .single();

        if (fetchCtError) {
          console.error('Failed to fetch company tag:', fetchCtError);
          throw new Error(`Company tag ${cashtag} not found or inaccessible`);
        }

        if (!companyTags) {
          throw new Error(`Company tag ${cashtag} not found`);
        }

        try {
          // Update company tag balance and transaction count
          const { error: updateCtError } = await supabase
            .from('company_tags')
            .update({
              balance: companyTags.balance + amount,
              total_received: companyTags.total_received + amount,
              transaction_count: companyTags.transaction_count + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', companyTags.id);

          if (updateCtError) {
            throw updateCtError;
          }

          // Log CT received activity only if company tag exists and update was successful
          await logCTActivity({
            ct_id: companyTags.id, // Use the verified company tag ID
            tag: cashtag,
            tag_name: companyTags.name,
            action_type: 'RECEIVED',
            action_description: `Recharge request ${rechargeId}`,
            status: 'success',
            user_id: currentUser?.id || '',
            user_name: userMetadata?.name || '',
            user_department: userMetadata?.department || '',
            user_role: userMetadata?.role || '',
            amount: amount,
            balance_before: companyTags.balance,
            balance_after: companyTags.balance + amount,
            additional_details: {
              recharge_request_id: requestId,
              player_name: currentRequest.player_name,
              messenger_id: currentRequest.messenger_id
            }
          });
        } catch (error) {
          console.error('Error updating company tag or logging activity:', error);
          throw error;
        }
      }

      // If status is being set to failed and there's an assigned_ct, log the failure
      if (newStatus === 'failed' && currentRequest?.assigned_ct) {
        const { c_id, amount, cashtag } = currentRequest.assigned_ct;
        
        try {
          // First verify the company tag exists
          const { data: companyTags, error: fetchCtError } = await supabase
            .from('company_tags')
            .select('name, balance, id')
            .eq('cashtag', cashtag)
            .eq('status', 'active')
            .single();

          if (fetchCtError) {
            console.error('Failed to fetch company tag for failed status:', fetchCtError);
            // Continue with the status update but don't log the activity
          } else if (companyTags) {
            // Only log activity if company tag exists
            await logCTActivity({
              ct_id: companyTags.id, // Use the verified company tag ID
              tag: cashtag,
              tag_name: companyTags.name,
              action_type: 'FAILED',
              action_description: `Recharge request ${rechargeId}`,
              status: 'failed',
              user_id: currentUser?.id || '',
              user_name: userMetadata?.name || '',
              user_department: userMetadata?.department || '',
              user_role: userMetadata?.role || '',
              amount: amount,
              balance_before: companyTags.balance,
              balance_after: companyTags.balance,
              additional_details: {
                recharge_request_id: requestId,
                player_name: currentRequest.player_name,
                messenger_id: currentRequest.messenger_id,
                failure_reason: rejectReason || notes
              }
            });
          }
        } catch (error) {
          console.error('Error logging failed activity:', error);
          // Continue with the status update even if logging fails
        }
      }

      const updateData: any = {
        deposit_status: newStatus,
        processed_by: currentUser?.id,
        processed_at: new Date().toISOString(),
      };

      if (notes) updateData.notes = notes;
      if (rejectReason) updateData.rejected_reason = rejectReason;
      if (newStatus === 'disputed') updateData.disputed_by = {
        id: (await supabase.auth.getUser()).data.user?.id,
        name: (await supabase.auth.getUser()).data.user?.user_metadata.name,
        role: (await supabase.auth.getUser()).data.user?.user_metadata.role,
        department: (await supabase.auth.getUser()).data.user?.user_metadata.department,
        employee_code: (await supabase.auth.getUser()).data.user?.user_metadata.employee_code,
      };

      const { error: updateError } = await supabase
        .from('recharge_requests')
        .update(updateData)
        .eq('id', requestId);

      if (updateError) {
        if (updateError.code === '23514' && updateError.message.includes('valid_status')) {
          throw new Error(`Invalid status transition to '${newStatus}'. Please check the allowed status values.`);
        }
        throw updateError;
      }

      // Fetch updated data
      await Promise.all([fetchRequests(), fetchStats()]);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'An error occurred while updating the request status';
      setError(errorMessage);
      console.error('Error updating request status:', err);
      return false;
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    if (realtimeChannel) {
      realtimeChannel.unsubscribe();
    }

    const channel = supabase
      .channel('recharge_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recharge_requests',
        },
        () => {
          // Refresh data when changes occur
          fetchRequests();
          fetchStats();
        }
      )
      .subscribe();

    setRealtimeChannel(channel);

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [status, page, limit]);

  // Initial data fetch
  useEffect(() => {
    fetchRequests();
    fetchStats();
  }, [status, page, limit]);

  return {
    requests,
    stats,
    loading,
    error,
    updateRequestStatus,
  };
}; 