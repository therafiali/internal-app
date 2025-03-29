"use client";
import { useState, useEffect, useCallback } from "react";
import { AdminHeader, OperationsHeader } from "@/app/components/Headers";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

import { useActivityLogger } from '@/hooks/useActivityLogger';
import { supabase } from '@/lib/supabase';
import Image from "next/image";
import TimeElapsed from "@/app/components/TimeElapsed";
import { useUserName } from "@/hooks/useUserName";


interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
}

interface ProcessedBy {
  name: string;
  email: string;
}

interface PaymentMethod {
  type: string;
  details: string;
}

interface AssignedRedeem {
  redeemId: string;
  amount: number;
  assignedAt: string;
  tagType: string;
  paymentMethods: {
    type: string;
    username: string;
    _id: string;
  }[];
  playerDetails: {
    username: string;
    totalAmount: number;
    amountPaid: number;
    amountHold: number;
    amountAvailable: number;
  };
}

interface RechargeRequest {
  rechargeId: string;
  recharge_id: string | null;
  playerName: string;
  messengerId: string;
  gamePlatform: string;
  gameUsername: string;
  amount: number;
  bonusAmount: number;
  vipCode: string;
  manychat_data: {
    profile: {
      profilePic: string;
    };
  };
  promo_type: string;
  status: string;
  screenshotUrl: string;
  teamCode: string;
  promotion: string | null;
  createdAt: string;
  processedAt: string;
  processedBy: ProcessedBy;
  paymentMethod: PaymentMethod;
  assignedRedeem: AssignedRedeem;
  promo_code: string | null;
  promo_amount: number;
  processing_state: {
    status: 'idle' | 'in_progress';
    processed_by: string | null;
    modal_type: 'process_modal' | 'reject_modal' | 'approve_modal' | 'verify_modal' | 'payment_modal' | 'none';
  };
}

const OperationsRechargePage = () => {
  const router = useRouter();
  const { logActivity } = useActivityLogger();
  const { userName, getUserName } = useUserName();
  const [user, setUser] = useState<User | null>(null);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RechargeRequest | null>(null);
  const [creditsLoaded, setCreditsLoaded] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectNotes, setRejectNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [rechargeRequests, setRechargeRequests] = useState<RechargeRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTeamCode, setActiveTeamCode] = useState<'ALL' | 'ENT-1' | 'ENT-2' | 'ENT-3'>('ALL');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processText, setProcessText] = useState("");

  // Helper function to transform recharge request data
  const transformRechargeRequest = useCallback((data: any): RechargeRequest => ({
    rechargeId: data.id,
    recharge_id: data.recharge_id,
    playerName: data.player_name,
    messengerId: data.messenger_id,
    gamePlatform: data.game_platform,
    gameUsername: data.game_username,
    amount: data.amount,
    bonusAmount: data.bonus_amount,
    vipCode: data.vip_code,
    status: data.status,
    screenshotUrl: data.screenshot_url,
    teamCode: data.team_code,
    promotion: data.promotion,
    promo_code: data.promo_code,
    promo_type: data.promo_type,
    createdAt: data.created_at,
    processedAt: data.processed_at,
    promo_amount: data.promo_amount,
    processedBy: {
      name: data.processed_by,
      email: ''
    },
    manychat_data: data.manychat_data,
    paymentMethod: data.payment_method,
    assignedRedeem: data.assigned_redeem,
    processing_state: {
      status: data.processing_state?.status || 'idle',
      processed_by: data.processing_state?.processed_by || null,
      modal_type: data.processing_state?.modal_type || 'none'
    }
  }), []);

  // Update real-time subscription
  useEffect(() => {
    if (!user) return;

    // Subscribe to recharge_requests changes
    const channel = supabase.channel('recharge-requests-channel')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'recharge_requests'
        },
        (payload: any) => {
          console.log('Change received!', payload);
          
          // Handle different events
          switch (payload.eventType) {
            case 'INSERT':
              if (payload.new.status === 'sc_processed') {
                setRechargeRequests(prev => [transformRechargeRequest(payload.new), ...prev]);
              }
              break;

            case 'UPDATE':

              if (payload.new.status === 'sc_processed') {
                setRechargeRequests(prev => [transformRechargeRequest(payload.new), ...prev]);
              }
              // If status changed to completed or rejected, remove from list
              if (payload.new.status === 'completed' || payload.new.status === 'rejected' ) {
                setRechargeRequests(prev => 
                  prev.filter(request => request.rechargeId !== payload.new.id)
                );
                
                // If this was the selected request, close the modal
                if (selectedRequest?.rechargeId === payload.new.id) {
                  setShowProcessModal(false);
                  setProcessText("");
                  setSelectedRequest(null);
                }
              } 
              // Otherwise update the request in the list
              else {
                setRechargeRequests(prev => 
                  prev.map(request => 
                    request.rechargeId === payload.new.id
                      ? transformRechargeRequest(payload.new)
                      : request
                  )
                );

                // If this is the currently selected request, update it
                if (selectedRequest?.rechargeId === payload.new.id) {
                  setSelectedRequest(transformRechargeRequest(payload.new));
                  
                  // If the request is no longer in progress and modal is open, close it
                  if (payload.new.processing_state.status === 'idle' && 
                      payload.old.processing_state.status === 'in_progress' && 
                      showProcessModal) {
                    setShowProcessModal(false);
                    setProcessText("");
                  }
                }
              }
              break;

            case 'DELETE':
              setRechargeRequests(prev => 
                prev.filter(request => request.rechargeId !== payload.old.id)
              );
              
              // If this is the currently selected request, close the modal
              if (selectedRequest?.rechargeId === payload.old.id) {
                setShowProcessModal(false);
                setProcessText("");
                setSelectedRequest(null);
              }
              break;
          }
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      channel.unsubscribe();
    };
  }, [user, selectedRequest, showProcessModal, transformRechargeRequest]);

  const fetchRechargeRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch recharge requests from Supabase
      const { data: rechargeData, error: rechargeError } = await supabase
        .from('recharge_requests')
        .select('*')
        .eq('status', 'sc_processed')
        .order('created_at', { ascending: false });

      if (rechargeError) throw rechargeError;

      // Transform the data to match your component's expected format
      const transformedRequests = (rechargeData || []).map(request => transformRechargeRequest(request));

      setRechargeRequests(transformedRequests);
    } catch (error) {
      console.error("Error fetching recharge requests:", error);
      const message = error instanceof Error ? error.message : "An error occurred while fetching recharge requests";
      setError(message);
      setRechargeRequests([]);
    } finally {
      setLoading(false);
    }
  }, [transformRechargeRequest]);

  useEffect(() => {
    const token = Cookies.get('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.department !== 'Operations' && parsedUser.department !== 'Admin') {
        router.push('/logout');
        return;
      }
      setUser(parsedUser);
      fetchRechargeRequests();
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/login');
    }
  }, [router, fetchRechargeRequests]);

  // Add useEffect to handle auto-opening modals based on processing_state
  useEffect(() => {
    const handleAutoOpenModal = async () => {
      if (!user?.id) return;

      // Find any request that's in progress and assigned to current user
      const inProgressRequest = rechargeRequests.find(
        (request) =>
          request.processing_state.status === "in_progress" &&
          request.processing_state.processed_by === user.id
      );

      if (inProgressRequest) {
        setSelectedRequest(inProgressRequest);
        
        // Fetch the processor's name
        if (inProgressRequest.processing_state.processed_by) {
          getUserName(inProgressRequest.processing_state.processed_by);
        }
        
        // Open appropriate modal based on modal_type
        switch (inProgressRequest.processing_state.modal_type) {
          case "process_modal":
            setShowProcessModal(true);
            break;
          default:
            // If modal_type is none or unknown, release the lock
            await supabase.rpc("release_request_processing", {
              request_id: inProgressRequest.rechargeId,
              user_id: user.id,
            });
            break;
        }
      }
    };

    if (user?.id && rechargeRequests.length > 0) {
      handleAutoOpenModal();
    }
  }, [rechargeRequests, user?.id, getUserName]);

  // Add useEffect to fetch processor name when a request's processing state changes
  useEffect(() => {
    const fetchProcessorName = async () => {
      const processingRequests = rechargeRequests.filter(
        (request) => request.processing_state.status === "in_progress"
      );

      for (const request of processingRequests) {
        if (request.processing_state.processed_by) {
          await getUserName(request.processing_state.processed_by);
        }
      }
    };

    fetchProcessorName();
  }, [rechargeRequests, getUserName]);

  // if (loading) {
  //   return <></>;
  // }

  if (error) {
    return (
      <div className="flex min-h-screen bg-[#0a0a0a] items-center justify-center">
        <div className="text-red-500 bg-red-500/10 px-4 py-2 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  const filteredRequests = rechargeRequests.filter(request => {
    const matchesTeamCode = activeTeamCode === 'ALL' || request.teamCode === activeTeamCode;
    return matchesTeamCode;
  });



  const handleProcessClick = async (request: RechargeRequest) => {
    // Check if request is already being processed
    if (request.processing_state.status === 'in_progress') {
      return;
    }

    try {
      // Update processing_state to in_progress
      const { error: updateError } = await supabase
        .from('recharge_requests')
        .update({
          processing_state: {
            status: 'in_progress',
            processed_by: user?.id || null,
            modal_type: 'process_modal'
          }
        })
        .eq('id', request.rechargeId);

      if (updateError) throw updateError;

      // The UI will be updated automatically through the realtime subscription
      setSelectedRequest(request);
      setShowProcessModal(true);
    } catch (error) {
      console.error("Error updating processing state:", error);
    }
  };

  const handleProcessSubmit = async () => {
    if (!selectedRequest || !user) return;
    
    setIsProcessing(true);
    try {
      // Check if player is banned
      const { data: playerStatus, error: statusError } = await supabase
        .from('players')
        .select('status')
        .eq('vip_code', selectedRequest.vipCode)
        .single();

      if (statusError) {
        throw new Error(statusError.message);
      }

      if (playerStatus?.status === 'banned') {
        setError('This player is banned. Cannot process recharge request.');
        setIsProcessing(false);
        return;
      }

      // If there's a promotion, update promotion assignments
      if (selectedRequest.promo_code) {
        console.log('Processing promotion for VIP code:', selectedRequest.vipCode);
        
        // First check if there's an active assignment for this VIP code
        const { data: promotionAssignment, error: promotionError } = await supabase
          .from('promotion_assignments')
          .select('*')
          .eq('vip_code', selectedRequest.vipCode)
          .eq('status', 'assigned')
          .single();

        console.log('Found promotion assignment:', promotionAssignment);
        console.log('Promotion error:', promotionError);

        if (promotionError && promotionError.code !== 'PGRST116') {
          throw new Error(promotionError.message);
        }

        // If there's a promotion assignment, update its status
        if (promotionAssignment) {
          console.log('Updating promotion assignment:', promotionAssignment.id);
          
          // Try updating with both conditions to ensure we're targeting the correct record
          const { data: updateResult, error: updatePromotionError } = await supabase
            .from('promotion_assignments')
            .update({ 
              status: 'claimed',
              updated_at: new Date().toISOString()
            })
            .match({
              id: promotionAssignment.id,
              vip_code: selectedRequest.vipCode,
              status: 'assigned'
            })
            .select();

          console.log('Update result:', updateResult);
          console.log('Update error:', updatePromotionError);

          if (updatePromotionError) {
            throw new Error(updatePromotionError.message);
          }

          if (!updateResult || updateResult.length === 0) {
            throw new Error('Failed to update promotion assignment - no rows affected');
          }

          // Also record the promotion usage
          const { error: usageError } = await supabase
            .from('promotion_usage')
            .insert({
              promotion_id: promotionAssignment.promotion_id,
              user_id: user.id,
              team_id: selectedRequest.teamCode,
              game_id: selectedRequest.gamePlatform,
              amount: selectedRequest.amount,
              discount_amount: selectedRequest.promo_amount,
              final_amount: selectedRequest.amount + selectedRequest.promo_amount
            });

          if (usageError) {
            throw new Error(usageError.message);
          }
        } else {
          console.log('No active promotion assignment found for VIP code:', selectedRequest.vipCode);
        }
      }

      // Update the recharge request status in Supabase
      const { error: updateError } = await supabase
        .from('recharge_requests')
        .update({ 
          status: 'completed',
          processed_by: user.id,
          processed_at: new Date().toISOString(),
          credits_loaded: selectedRequest.amount + selectedRequest.promo_amount,
          processing_state: {
            status: 'idle',
            processed_by: null,
            modal_type: 'none'
          }
        })
        .eq('id', selectedRequest.rechargeId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // The realtime subscription will handle the UI update
      setShowProcessModal(false);
      setProcessText("");
      setSelectedRequest(null);
    } catch (error) {
      console.error("Error processing request:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectClick = async (request: RechargeRequest) => {
    try {
      // Update processing_state to in_progress with reject modal
      const { error: updateError } = await supabase
        .from('recharge_requests')
        .update({
          processing_state: {
            status: 'in_progress',
            processed_by: user?.id || null,
            modal_type: 'reject_modal'
          }
        })
        .eq('id', request.rechargeId);

      if (updateError) throw updateError;

      setSelectedRequest(request);
      setShowRejectModal(true);
    } catch (error) {
      console.error("Error updating processing state:", error);
    }
  };

  const handleRejectSubmit = async () => {
    try {
      if (!selectedRequest) return;

      // Update the recharge request status in Supabase
      const { error: updateError } = await supabase
        .from('recharge_requests')
        .update({ 
          status: 'rejected',
          rejected_reason: rejectReason,
          reject_notes: rejectNotes,
          processed_by: user?.name,
          processed_at: new Date().toISOString(),
          processing_state: {
            status: 'idle',
            processed_by: null,
            modal_type: 'none'
          }
        })
        .eq('id', selectedRequest.rechargeId)
        .select();

      if (updateError) {
        throw new Error(updateError.message);
      }

      setShowRejectModal(false);
      setRejectReason("");
      setRejectNotes("");
      setSelectedRequest(null);
      await fetchRechargeRequests();
    } catch (error) {
      const message = error instanceof Error ? error.message : "An error occurred while rejecting recharge";
      setError(message);
    }
  };

  // Add cleanup function for modal close
  const handleModalClose = async () => {
    if (!selectedRequest) return;

    try {
      // Update processing_state back to idle
      const { error: updateError } = await supabase
        .from('recharge_requests')
        .update({
          processing_state: {
            status: 'idle',
            processed_by: null,
            modal_type: 'none'
          }
        })
        .eq('id', selectedRequest.rechargeId);

      if (updateError) throw updateError;

      // The UI will be updated automatically through the realtime subscription
      setShowProcessModal(false);
      setProcessText("");
      setSelectedRequest(null);
    } catch (error) {
      console.error("Error resetting processing state:", error);
    }
  };

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      {user.department === 'Operations' ? (
        <OperationsHeader user={user}  />
      ) : (
        <AdminHeader user={user} />
      )}
      <div className="flex-1 pl-64">
        <main className="p-8">


          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-white">Recharge</h1>
              <span className="text-3xl font-bold text-gray-500">Requests</span>
            </div>
            
          </div>

          {/* Team Code Tabs */}
          <div className="flex space-x-4 mb-8 bg-[#1a1a1a] p-4 rounded-2xl border border-gray-800/20">
            <button
              onClick={() => setActiveTeamCode('ALL')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTeamCode === 'ALL'
                  ? 'bg-blue-500/10 text-blue-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              All Teams
            </button>
            <button
              onClick={() => setActiveTeamCode('ENT-1')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTeamCode === 'ENT-1'
                  ? 'bg-purple-500/10 text-purple-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ENT-1
            </button>
            <button
              onClick={() => setActiveTeamCode('ENT-2')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTeamCode === 'ENT-2'
                  ? 'bg-pink-500/10 text-pink-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ENT-2
            </button>
            <button
              onClick={() => setActiveTeamCode('ENT-3')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTeamCode === 'ENT-3'
                  ? 'bg-indigo-500/10 text-indigo-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ENT-3
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {/* Pending Card */}
            {/* <div 
              onClick={() => handleStatsCardClick('Pending')}
              className="relative bg-[#1a1a1a] rounded-2xl p-6 before:absolute before:inset-0 before:bg-gradient-to-b before:from-amber-500/20 before:to-transparent before:rounded-2xl before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 group cursor-pointer transform transition-transform duration-200 hover:scale-105"
            >
              <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>
              <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-amber-500/10 to-transparent"></div>
              <div className="absolute inset-y-0 -left-px w-px bg-gradient-to-b from-transparent via-amber-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-y-0 -right-px w-px bg-gradient-to-b from-transparent via-amber-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-amber-500 font-medium tracking-wider">PENDING</div>
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-1 transition-transform duration-300 group-hover:scale-105">{stats.pending}</div>
                <div className="text-sm text-gray-400 mb-4">Requests</div>
                <div className="flex items-center text-xs text-amber-500 bg-amber-500/10 rounded-lg px-3 py-2 backdrop-blur-sm">
                  Click to view pending
                </div>
              </div>
            </div> */}

            {/* Processed Card */}
            {/* <div 
              onClick={() => handleStatsCardClick('Processed')}
              className="relative bg-[#1a1a1a] rounded-2xl p-6 before:absolute before:inset-0 before:bg-gradient-to-b before:from-emerald-500/20 before:to-transparent before:rounded-2xl before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 group cursor-pointer transform transition-transform duration-200 hover:scale-105"
            >
              <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
              <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent"></div>
              <div className="absolute inset-y-0 -left-px w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-y-0 -right-px w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-emerald-500 font-medium tracking-wider">PROCESSED</div>
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-1 transition-transform duration-300 group-hover:scale-105">{stats.processed}</div>
                <div className="text-sm text-gray-400 mb-4">Requests</div>
                <div className="flex items-center text-xs text-emerald-500 bg-emerald-500/10 rounded-lg px-3 py-2 backdrop-blur-sm">
                  Click to view processed
                </div>
              </div>
            </div> */}

            {/* Rejected Card */}
            {/* <div 
              onClick={() => handleStatsCardClick('Rejected')}
              className="relative bg-[#1a1a1a] rounded-2xl p-6 before:absolute before:inset-0 before:bg-gradient-to-b before:from-red-500/20 before:to-transparent before:rounded-2xl before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 group cursor-pointer transform transition-transform duration-200 hover:scale-105"
            >
              <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent"></div>
              <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-red-500/10 to-transparent"></div>
              <div className="absolute inset-y-0 -left-px w-px bg-gradient-to-b from-transparent via-red-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-y-0 -right-px w-px bg-gradient-to-b from-transparent via-red-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-red-500 font-medium tracking-wider">REJECTED</div>
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-1 transition-transform duration-300 group-hover:scale-105">{stats.rejected}</div>
                <div className="text-sm text-gray-400 mb-4">Requests</div>
                <div className="flex items-center text-xs text-red-500 bg-red-500/10 rounded-lg px-3 py-2 backdrop-blur-sm">
                  Click to view rejected
                </div>
              </div>
            </div> */}

            {/* Total Card */}
            {/* <div 
              className="relative bg-[#1a1a1a] rounded-2xl p-6 before:absolute before:inset-0 before:bg-gradient-to-b before:from-blue-500/20 before:to-transparent before:rounded-2xl before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 group cursor-pointer transform transition-transform duration-200 hover:scale-105"
            >
              <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
              <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-blue-500/10 to-transparent"></div>
              <div className="absolute inset-y-0 -left-px w-px bg-gradient-to-b from-transparent via-blue-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-y-0 -right-px w-px bg-gradient-to-b from-transparent via-blue-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-blue-500 font-medium tracking-wider">TOTAL</div>
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-1 transition-transform duration-300 group-hover:scale-105">{stats.total}</div>
                <div className="text-sm text-gray-400 mb-4">Total Requests</div>
                <div className="flex items-center text-xs text-blue-500 bg-blue-500/10 rounded-lg px-3 py-2 backdrop-blur-sm">
                  All Time
                </div>
              </div>
            </div> */}
          </div>

          {/* Table */}
          <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-gray-800/20">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex justify-center items-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        PENDING SINCE
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        TEAM CODE
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        RECHARGE ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        PLAYER NAME
                      </th>
                      {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        TOTAL TO LOAD
                      </th> */}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filteredRequests.map((request, index) => (
                      <tr key={index} className="hover:bg-[#252b3b]">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {request.createdAt && (
                            <TimeElapsed 
                              date={request.createdAt}
                              className="flex flex-col items-start"
                              elapsedClassName="text-sm font-medium text-gray-300"
                              fullDateClassName="text-xs text-gray-400"
                            />
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                          {request.teamCode}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                          {request.recharge_id}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <Image
                              className="rounded-full"
                              src={request.manychat_data?.profile?.profilePic || `https://ui-avatars.com/api/?name=${request?.gameUsername}`}
                              alt={`${request?.gameUsername}'s profile`}
                              width={32}
                              height={32}
                            />
                            <div className="flex flex-col">
                              <span className="text-sm text-gray-300 ">{request.playerName || 'Unknown User'}</span>
                              <span className="text-xs text-gray-500">
                                {request.vipCode}
                              </span>
                            </div>
                          </div>
                        </td>
                        {/* <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-500">
                          ${request.amount || 0}
                        </td> */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleProcessClick(request)}
                              disabled={request.processing_state.status === 'in_progress'}
                              className={`px-3 py-1.5 text-xs font-medium ${
                                request.processing_state.status === 'in_progress'
                                  ? 'bg-gray-500/10 text-gray-500 cursor-not-allowed'
                                  : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                              } rounded-lg transition-all duration-200`}
                              title={
                                request.processing_state.status === 'in_progress'
                                  ? `This request is being processed by ${userName || 'another user'}`
                                  : ""
                              }
                            >
                              {request.processing_state.status === 'in_progress' ? 'Processing...' : 'Process'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Process Modal */}
      {showProcessModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] rounded-lg w-[1000px] border border-gray-800">
            <div className="flex justify-between items-center p-4 border-b border-gray-800">
              <h2 className="text-xl font-semibold text-white">Process Recharge Request</h2>
              <button
                onClick={handleModalClose}
                className="text-gray-400 hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-6 p-6">
              {/* Left Side - Details */}
              <div className="space-y-4">
                {/* Basic Information */}
                <div className="bg-[#252b3b] p-4 rounded-lg space-y-4">
                  <h3 className="text-sm font-medium text-gray-400 border-b border-gray-700 pb-2">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Recharge ID</label>
                      <div className="text-white">{selectedRequest.recharge_id}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Player Name</label>
                      <div className="text-white">{selectedRequest.playerName}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Acc Code</label>
                      <div className="text-purple-400">{selectedRequest.vipCode || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Team Code</label>
                      <div className="text-blue-400">{selectedRequest.teamCode}</div>
                    </div>
                  </div>
                </div>

                {/* Game Details */}
                <div className="bg-[#252b3b] p-4 rounded-lg space-y-4">
                  <h3 className="text-sm font-medium text-gray-400 border-b border-gray-700 pb-2">Game Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Game Username</label>
                      <div className="text-white">{selectedRequest.gameUsername}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Platform</label>
                      <div className="text-white">{selectedRequest.gamePlatform}</div>
                    </div>
                  </div>
                </div>

                {/* Amount Details */}
                <div className="bg-[#252b3b] p-4 rounded-lg space-y-4">
                  <h3 className="text-sm font-medium text-gray-400 border-b border-gray-700 pb-2">Amount Details</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Base Amount</label>
                      <div className="text-yellow-500">${selectedRequest.amount.toFixed(2)}</div>
                    </div>
                    {/* <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Bonus Amount</label>
                      <div className="text-emerald-500">${(selectedRequest.bonusAmount || 0).toFixed(2)}</div>
                    </div> */}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Bonus Amount</label>
                      <div className="text-blue-500 font-medium">
                        ${selectedRequest.promo_amount}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Total Amount</label>
                      <div className="text-blue-500 font-medium">
                        ${selectedRequest.promo_amount + selectedRequest.amount}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Promotion Details */}
                <div className="bg-[#252b3b] p-4 rounded-lg space-y-4">
                  <h3 className="text-sm font-medium text-gray-400 border-b border-gray-700 pb-2">Promotion Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Promotion</label>
                      <div className="text-white">{selectedRequest?.promo_code || 'No Promotion'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Type</label>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        selectedRequest?.promo_type
                          ? selectedRequest?.promo_type.includes('FIXED')
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-amber-500/10 text-amber-500'
                          : 'bg-gray-500/10 text-gray-500'
                      }`}>
                        {selectedRequest?.promo_type
                          ? selectedRequest?.promo_type.includes('FIXED')
                            ? 'Freeplay'
                            : 'Percentage'
                          : 'No Promo'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - Verification */}
              <div className="bg-[#252b3b] p-6 rounded-lg flex flex-col">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-white mb-6">Verification</h3>
                  <div className="space-y-6">
                    <div className="bg-[#1a1a1a] p-4 rounded-lg">
                      <div className="text-sm text-gray-400 mb-4">Please review the details carefully and type "process" below to confirm:</div>
                      <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Player:</span>
                          <span className="text-white">{selectedRequest.playerName}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Game Username:</span>
                          <span className="text-white">{selectedRequest.gameUsername}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Amount:</span>
                          <span className="text-blue-500">${((selectedRequest.amount || 0) + (selectedRequest.promo_amount || 0)).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-400">
                        Type "process" to confirm <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={processText}
                        onChange={(e) => setProcessText(e.target.value)}
                        onPaste={(e) => e.preventDefault()}
                        className={`w-full bg-[#1a1a1a] border rounded-lg px-4 py-2 text-white focus:outline-none ${
                          processText && processText.toLowerCase() !== "process"
                            ? "border-red-500 focus:border-red-500"
                            : "border-gray-800 focus:border-blue-500"
                        }`}
                        placeholder='Type "process" to enable approval'
                      />
                      {processText && processText.toLowerCase() !== "process" && (
                        <p className="text-xs text-red-500">Please type exactly "process" to enable approval</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-700">
                  <button
                    onClick={handleModalClose}
                    className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700"
                    disabled={isProcessing}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProcessSubmit}
                    disabled={isProcessing || processText.toLowerCase() !== "process"}
                    className={`px-4 py-2 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 flex items-center justify-center min-w-[100px] ${
                      isProcessing || processText.toLowerCase() !== "process" ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      'Process'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-[#1a1a1a] rounded-2xl p-6 w-[600px]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Reject Request</h2>
              <button
                onClick={() => setShowRejectModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg
                  className="w-6 h-6"
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
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Rejection Reason
                </label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white"
                >
                  <option value="">Select a reason...</option>
                  <option value="duplicate">Duplicate Request</option>
                  <option value="invalid">Invalid Information</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white h-24"
                  placeholder="Enter any additional notes..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button 
                onClick={handleRejectSubmit}
                disabled={!rejectReason}
                className={`px-4 py-2 text-white text-sm font-medium rounded-lg ${
                  rejectReason 
                    ? "bg-red-500 hover:bg-red-600" 
                    : "bg-red-500/50 cursor-not-allowed"
                }`}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationsRechargePage;
