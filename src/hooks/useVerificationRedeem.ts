import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { RedeemRequest } from '@/redux/features/rejectRequestsSlice';

interface PaymentMethod {
  type: string;
  username: string;
}

interface ManyChatData {
  _id: string;
  team: string;
  status: string;
  profile: {
    gender: string;
    fullName: string;
    language: string;
    lastName: string;
    timezone: string;
    firstName: string;
    profilePic: string;
  };
  vipCode: string;
  platforms: {
    firekirin_username: string | null;
    orionstars_username: string | null;
  };
  playerName: string;
}

type TabType = 'Pending' | 'Processed' | 'Rejected';

export function useVerificationRedeem(activeTab: TabType = 'Pending') {
  const [redeemRequests, setRedeemRequests] = useState<RedeemRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Get status based on active tab
  const getStatusForTab = useCallback((tab: TabType) => {
    switch (tab) {
      case 'Pending':
        return 'verification_pending';
      case 'Processed':
        return 'queued';
      case 'Rejected':
        return 'verification_failed';
      default:
        return 'verification_pending';
    }
  }, []);

  // Function to fetch redeem requests
  const fetchRedeemRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const status = getStatusForTab(activeTab);
      const { data, error } = await supabase
        .from('redeem_requests')
        .select('*')
        .in('status', Array.isArray(status) ? status : [status])
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRedeemRequests(data || []);
    } catch (err) {
      console.error('Error fetching redeem requests:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [activeTab, getStatusForTab]);

  // Function to handle real-time updates
  const handleRealtimeUpdate = useCallback((payload: any) => {
    console.log('Change received!', payload);
    
    const { eventType, new: newRecord, old: oldRecord } = payload;
    const currentStatus = getStatusForTab(activeTab);
    
    setRedeemRequests(prev => {
      switch (eventType) {
        case 'INSERT':
          // Only add if status matches current tab
          if (newRecord.status === currentStatus) {
            return [newRecord, ...prev];
          }
          return prev;
          
        case 'DELETE':
          return prev.filter(request => request.id !== oldRecord.id);
          
        case 'UPDATE':
          // If status changed from current tab's status, remove it
          if (oldRecord.status === currentStatus && newRecord.status !== currentStatus) {
            return prev.filter(request => request.id !== newRecord.id);
          }
          // If status changed to current tab's status, add it
          if (oldRecord.status !== currentStatus && newRecord.status === currentStatus) {
            return [newRecord, ...prev];
          }
          // If status is still current tab's status, update it
          if (newRecord.status === currentStatus) {
            return prev.map(request => 
              request.id === newRecord.id ? newRecord : request
            );
          }
          return prev;
          
        default:
          return prev;
      }
    });
  }, [activeTab, getStatusForTab]);

  // Set up real-time subscription
  useEffect(() => {
    // Clean up existing subscription
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    // Set up new subscription
    channelRef.current = supabase
      .channel('redeem_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'redeem_requests'
        },
        handleRealtimeUpdate
      )
      .subscribe();

    // Initial fetch
    fetchRedeemRequests();

    // Cleanup subscription
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [fetchRedeemRequests, handleRealtimeUpdate, activeTab]);

  // Function to approve a request
  const approveRequest = useCallback(async (id: string) => {
    try {
      const currentUser = await supabase.auth.getUser();
      const userId = currentUser.data.user?.id;

      // First get the request data before updating
      const { data: requestData, error: fetchError } = await supabase
        .from('redeem_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!requestData) throw new Error('Request not found');
      console.log("requestData",requestData)

      const { error } = await supabase
        .from('redeem_requests')
        .update({
          status: 'queued',
          verified_id: userId,
          notes: null,
          processing_state: {
            status: 'idle',
            processed_by: userId,
            modal_type: 'none'
          },
          action_status: 'idle',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      // Remove the request from local state immediately
      setRedeemRequests(prev => prev.filter(request => request.id !== id));
      
      return { success: true, data: requestData };
    } catch (err) {
      console.error('Error approving request:', err);
      return { success: false, error: err instanceof Error ? err.message : 'An error occurred' };
    }
  }, []);

  // Function to reject a request
  const rejectRequest = useCallback(async (id: string, remarks: string) => {
    console.log('Rejecting request:', id, remarks);
    try {
      const currentUser = await supabase.auth.getUser();
      const userId = currentUser.data.user?.id;

      const { error } = await supabase
        .from('redeem_requests')
        .update({
          status: 'verification_failed',
          verified_by: userId,
          
          notes: remarks,
          processing_state: {
            status: 'idle',
            processed_by: userId,
            modal_type: 'none'
          },
          action_status: 'idle',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      // Remove the request from local state immediately
      setRedeemRequests(prev => prev.filter(request => request.id !== id));
      
      return { success: true };
    } catch (err) {
      console.error('Error rejecting request:', err);
      return { success: false, error: err instanceof Error ? err.message : 'An error occurred' };
    }
  }, []);

  return {
    redeemRequests,
    loading,
    error,
    fetchRedeemRequests,
    approveRequest,
    rejectRequest
  };
} 