import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useCTActivityLogger } from './useCTActivityLogger';

export interface PaymentMethod {
  type: string;
  username: string;
  amount?: number;
  cashtag?: string;
  reference?: string;
  notes?: string;
  timestamp?: string;
  identifier?: string;
}

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

export interface RedeemRequest {
  redeemId: string;
  redeem_id: string | null;
  init_id: string | null;
  vip_code: string;
  player_name: string;
  messenger_id: string | null;
  team_code: string;
  game_platform: string;
  game_username: string;
  total_amount: number;
  amount_paid: number;
  init_by: string | null;
  amount_hold: number;
  amount_available: number;
  action_status: 'idle' | 'in_progress';
  paymentMethods: PaymentMethod[];
  status: string;
  notes: string | null;
  manychat_data: ManyChatData;
  agent_name: string;
  agent_department: string;
  processed_by: string | null;
  processed_at: string | null;
  verified_by: string | null;
  verified_id: string | null;
  verified_at: string | null;
  verification_remarks: string | null;
  created_at: string;
  updated_at: string;
  requestedAt: string;
  player_data: {
    profile: {
      profilePic: string;
    };
  };
  processing_state: {
    status: 'idle' | 'in_progress';
    processed_by: string | null;
    modal_type: 'process_modal' | 'reject_modal' | 'approve_modal' | 'verify_modal' | 'payment_modal' | 'none';
  };
}

interface Stats {
  pending: number;
  verification_failed: number;
  rejected: number;
  under_processing: number;
  queued: number;
  processed: number;
  paused: number;
  completed: number;
  partiallyPaid: number;
}

export const useFinanceRedeem = () => {
  const [redeemRequests, setRedeemRequests] = useState<RedeemRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RedeemRequest | null>(null);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    verification_failed: 0,
    rejected: 0,
    under_processing: 0,
    queued: 0,
    processed: 0,
    paused: 0,
    completed: 0,
    partiallyPaid: 0,
  });
  const [activeTab, setActiveTab] = useState<'All' | 'Queued' | 'Paused' | 'Partially Paid' | 'Completed'>('Queued');
  const { logCTActivity } = useCTActivityLogger();

  // Function to transform Supabase data to our RedeemRequest interface
  const transformRedeemRequest = (data: any): RedeemRequest => {
    // Parse processing_state if it's a string
    let processingState;
    try {
      processingState = typeof data.processing_state === 'string' 
        ? JSON.parse(data.processing_state)
        : data.processing_state || {
            status: 'idle',
            processed_by: null,
            modal_type: 'none'
          };
    } catch (e) {
      console.warn('Error parsing processing_state:', e);
      processingState = {
        status: 'idle',
        processed_by: null,
        modal_type: 'none'
      };
    }

    return {
      redeemId: data.id,
      redeem_id: data.redeem_id,
      init_id: data.init_id,
      vip_code: data.vip_code,
      player_name: data.player_name,
      messenger_id: data.messenger_id,
      team_code: data.team_code,
      game_platform: data.game_platform,
      game_username: data.game_username,
      total_amount: data.total_amount,
      amount_paid: data.amount_paid || 0,
      amount_hold: data.amount_hold || 0,
      amount_available: data.amount_available || 0,
      action_status: data.action_status || 'idle',
      paymentMethods: data.payment_methods || [],
      status: data.status,
      notes: data.notes,
      manychat_data: data.manychat_data,
      agent_name: data.agent_name,
      init_by: data.init_by,
      agent_department: data.agent_department,
      processed_by: data.processed_by,
      processed_at: data.processed_at,
      verified_by: data.verified_by,
      verified_at: data.verified_at,
      verified_id: data.verified_id,
      verification_remarks: data.verification_remarks,
      created_at: data.created_at,
      updated_at: data.updated_at,
      requestedAt: data.created_at,
      player_data: data.player_data,
      processing_state: processingState,
    };
  };

  // Function to fetch redeem requests based on status
  const fetchRedeemRequests = useCallback(async (status?: string | string[]) => {
    try {
      setLoading(true);
      let query = supabase.from('redeem_requests').select('*');

      if (status) {
        if (Array.isArray(status)) {
          query = query.in('status', status);
        } else {
          query = query.eq('status', status);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const transformedData = data.map(transformRedeemRequest);
      setRedeemRequests(transformedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  // Function to fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const { data: statsData, error } = await supabase
        .from('redeem_requests')
        .select('status');

      if (error) throw error;

      const newStats = {
        pending: 0,
        verification_failed: 0,
        rejected: 0,
        under_processing: 0,
        queued: 0,
        processed: 0,
        paused: 0,
        completed: 0,
        partiallyPaid: 0,
      };

      statsData?.forEach((item) => {
        switch (item.status) {
          case 'queued':
            newStats.queued++;
            break;
          case 'paused':
            newStats.paused++;
            break;
          case 'completed':
            newStats.completed++;
            break;
          case 'queued_partially_paid':
          case 'paused_partially_paid':
            newStats.partiallyPaid++;
            break;
          case 'verification_failed':
            newStats.verification_failed++;
            break;
          case 'rejected':
            newStats.rejected++;
            break;
          case 'under_processing':
            newStats.under_processing++;
            break;
          case 'pending':
            newStats.pending++;
            break;
          case 'processed':
            newStats.processed++;
            break;
        }
      });

      setStats(newStats);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  // Set up realtime subscription
  useEffect(() => {
    let realtimeChannel: RealtimeChannel;

    const setupRealtimeSubscription = () => {
      realtimeChannel = supabase
        .channel('redeem_requests_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'redeem_requests',
          },
          async (payload) => {
            console.log('Realtime update received:', payload);
            
            // If it's an update, transform and update the local state immediately
            if (payload.eventType === 'UPDATE') {
              setRedeemRequests(prevRequests => {
                const updatedRequests = [...prevRequests];
                const index = updatedRequests.findIndex(r => r.redeemId === payload.new.id);
                if (index !== -1) {
                  updatedRequests[index] = transformRedeemRequest(payload.new);
                }
                return updatedRequests;
              });
            }
            
            // Refresh full data
            const status = activeTab === 'All' ? undefined : 
              activeTab === 'Partially Paid' ? ['queued_partially_paid', 'paused_partially_paid'] :
              activeTab.toLowerCase();
            
            await Promise.all([
              fetchRedeemRequests(status),
              fetchStats()
            ]);
          }
        )
        .subscribe();
    };

    setupRealtimeSubscription();

    // Cleanup subscription on unmount
    return () => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [activeTab, fetchRedeemRequests, fetchStats, transformRedeemRequest]);

  // Process payment function
  const processPayment = async (
    redeemId: string,
    redeem_id: string,
    amount: number,
    paymentMethod: string,
    reference: string,
    notes: string,
    identifier: string
  ) => {
    try {
      console.log('[processPayment] Starting with params:---------------->', {
        redeemId,
        amount,
        paymentMethod,
        reference,
        notes,
        identifier
      });

      // First get the current request data
      const { data: currentRequest, error: fetchError } = await supabase
        .from('redeem_requests')
        .select('*')
        .eq('id', redeemId)
        .single();

      if (fetchError) {
        console.error('[processPayment] Error fetching current request:', fetchError);
        throw fetchError;
      }

      console.log('[processPayment] Current request data:', currentRequest);

      // Get the current company tag balance
      const { data: companyTags, error: companyTagError } = await supabase
        .from('company_tags')
        .select('*')
        .eq('cashtag', paymentMethod)
        .eq('status', 'active');

      console.log('[processPayment] Company tags:', companyTags);
      if (companyTagError) {
        console.error('[processPayment] Error fetching company tag:', companyTagError);
        throw companyTagError;
      }

      if (!companyTags || companyTags.length === 0) {
        throw new Error(`No active company tag found with cashtag: ${paymentMethod}`);
      }

      // Use the first active company tag
      const companyTag = companyTags[0];

      console.log('[processPayment] Company tag data:', companyTag);

      // Check if company tag has sufficient balance
      if (!companyTag || companyTag.balance < amount) {
        throw new Error(`Insufficient balance in company tag. Available: $${companyTag?.balance || 0}`);
      }

      // Get user data from localStorage
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;

      // Calculate new amounts
      const newAmountPaid = (currentRequest.amount_paid || 0) + amount;
      const newAmountHold = (currentRequest.amount_hold || 0) - amount;
      const newBalance = companyTag.balance - amount;
      
      // Validate hold amount
      if (newAmountHold < 0) {
        throw new Error(`Cannot process more than the held amount. Current hold: $${currentRequest.amount_hold}`);
      }

      // Determine new status
      const newStatus = newAmountPaid === currentRequest.total_amount 
        ? 'completed' 
        : newAmountPaid > 0 
          ? 'queued_partially_paid' 
          : 'queued';

      // Get the payment method details from the request
      const paymentMethodDetails = currentRequest.payment_methods?.[0] || {
        type: 'cashapp',
        username: currentRequest.game_username
      };

      // Create the new payment method entry
      const newPaymentMethod = {
        type: paymentMethodDetails.type,
        username: paymentMethodDetails.username,
        amount: amount,
        cashtag: paymentMethod,
        reference: reference || '',
        notes: notes || '',
        timestamp: new Date().toISOString(),
        identifier: identifier
      };

      // Combine existing and new payment methods
      const existingPaymentMethods = Array.isArray(currentRequest.payment_methods) 
        ? currentRequest.payment_methods 
        : [];
      const updatedPaymentMethods = [...existingPaymentMethods, newPaymentMethod];

      console.log('[processPayment] Prepared data:', {
        newStatus,
        newAmountPaid,
        newAmountHold,
        updatedPaymentMethods
      });

      // Update all fields in a single operation
      const { error: updateError } = await supabase
        .from('redeem_requests')
        .update({
          status: newStatus,
          notes: notes || null,
          amount_paid: newAmountPaid,
          amount_hold: newAmountHold,
          assign_ct: updatedPaymentMethods,
          processing_state: {
            status: 'idle',
            processed_by: null,
            modal_type: 'none'
          },
          finance_by: {
            name: user?.name,
            employee_code: user?.employee_code,
          },
          action_status: 'idle',
          finance_id: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', redeemId);

      if (updateError) {
        console.error('[processPayment] Database error:', updateError);
        throw updateError;
      }

      // Update company tag balance
      const { error: tagUpdateError } = await supabase
        .from('company_tags')
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('cashtag', paymentMethod);

      if (tagUpdateError) {
        // Log failed CT activity if there's an error
        if (user) {
          await logCTActivity({
            ct_id: companyTag.id,
            tag: paymentMethod,
            tag_name: companyTag.name,
            action_type: 'SENT',
            action_description: `Redeem request ${redeem_id}: ${tagUpdateError.message}`,
            status: 'failed',
            user_id: user.id,
            user_name: user.name,
            user_department: user.department,
            user_role: user.role,
            amount: amount,
            balance_before: companyTag.balance,
            balance_after: companyTag.balance,
            additional_details: {
              redeem_id: redeem_id,
              player_name: currentRequest.player_name,
              reference: reference,
              notes: notes,
              error: tagUpdateError.message
            }
          });
        }
        console.error('[processPayment] Error updating company tag:', tagUpdateError);
        throw tagUpdateError;
      }

      // Log successful CT activity after the payment is processed
      if (user) {
        await logCTActivity({
          ct_id: companyTag.id,
          tag: paymentMethod,
          tag_name: companyTag.name,
          action_type: 'SENT',
          action_description: `Redeem request ${redeem_id}`,
          status: 'success',
          user_id: user.id,
          user_name: user.name,
          user_department: user.department,
          user_role: user.role,
          amount: amount,
          balance_before: companyTag.balance,
          balance_after: newBalance,
          additional_details: {
            redeem_id: redeem_id,
            player_name: currentRequest.player_name,
            reference: reference,
            notes: notes
          }
        });
      }

      return { success: true };
    } catch (err) {
      // Log failed CT activity for any other errors
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;
      const error = err as Error & { companyTag?: { id: string; balance: number } };
    }
  };

  // Pause request function
  const pauseRequest = async (redeemId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('redeem_requests')
        .update({
          status: 'paused',
          processed_by: null,
          processed_at: new Date().toISOString(),
          notes: null,
          processing_state: {
            status: 'idle',
            processed_by: null,
            modal_type: 'none'
          },
          finance_by: {
            name: user?.name,
            employee_code: user?.employee_code,
          },
          action_status: 'idle',
          updated_at: new Date().toISOString()
        })
        .eq('id', redeemId);

      if (updateError) throw updateError;

      return { success: true };
    } catch (err) {
      throw err;
    }
  };

  // Resume request function
  const resumeRequest = async (redeemId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('redeem_requests')
        .update({
          status: 'queued',
          processed_by: null,
          processed_at: new Date().toISOString(),
          notes: null,
          processing_state: {
            status: 'idle',
            processed_by: null,
            modal_type: 'none'
          },
          finance_by: {
            name: user?.name,
            employee_code: user?.employee_code,
          },
          action_status: 'idle',
          updated_at: new Date().toISOString()
        })
        .eq('id', redeemId);

      if (updateError) throw updateError;

      return { success: true };
    } catch (err) {
      throw err;
    }
  };

  // Initial data fetch
  useEffect(() => {
    const status = activeTab === 'All' ? undefined : 
      activeTab === 'Partially Paid' ? ['queued_partially_paid', 'paused_partially_paid'] :
      activeTab.toLowerCase();
    
    fetchStats();
    fetchRedeemRequests(status);
  }, [activeTab, fetchRedeemRequests, fetchStats]);

  const handleModalClose = async () => {
    const userData = localStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;

    if (selectedRequest && user?.id) {
      try {
        console.log("[handleModalClose] Resetting processing state to idle");
        
        // First update the processing state in the database
        const { error: updateError } = await supabase
          .from('redeem_requests')
          .update({
            processing_state: {
              status: 'idle',
              processed_by: null,
              modal_type: 'none'
            }
          })
          .eq('id', selectedRequest.redeemId);

        if (updateError) {
          console.error("[handleModalClose] Error updating processing state:", updateError);
          throw updateError;
        }

        // Then release the processing lock
        const { error } = await supabase.rpc("release_request_processing", {
          request_id: selectedRequest.redeemId,
          user_id: user.id,
        });

        if (error) {
          console.error("[handleModalClose] Error resetting status:", error);
          throw error;
        }
      } catch (error) {
        console.error("[handleModalClose] Unexpected error:", error);
      }
    }
    setShowProcessModal(false);
    setSelectedRequest(null);
    fetchRedeemRequests();
  };

  return {
    redeemRequests,
    loading,
    error,
    stats,
    activeTab,
    setActiveTab,
    fetchRedeemRequests,
    processPayment,
    pauseRequest,
    resumeRequest,
    fetchStats,
    handleModalClose,
    selectedRequest,
    setSelectedRequest,
    showProcessModal,
    setShowProcessModal,
  };
}; 