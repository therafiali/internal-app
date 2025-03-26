"use client"
import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { OperationsHeader } from '@/app/components/Headers';
import { AdminHeader } from '@/app/components/Headers';
import RefreshButton from '@/app/components/RefreshButton';
import Image from 'next/image';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { supabase } from '@/lib/supabase';
import { X, Loader2 } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
}

interface TransferRequest {
  id: string;
  created_at: string;
  updated_at: string;
  vip_code: string;
  player_name: string;
  player_image: string;
  messenger_id: string;
  team_code: string;
  init_by: 'agent' | 'player';
  from_platform: string;
  from_username: string;
  to_platform: string;
  to_username: string;
  amount: number;
  status: 'pending' | 'completed' | 'rejected';
  processed_by: string | null;
  processed_at: string | null;
  agent_name: string;
  agent_department: string;
  notes: string;
  manychat_data: any;
  processing_state: {
    status: 'idle' | 'in_progress';
    processed_by: string | null;
    modal_type: 'process_modal' | 'reject_modal' | 'approve_modal' | 'verify_modal' | 'payment_modal' | 'none';
  };
}

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (rejectReason?: string) => Promise<void>;
  title: string;
  description: string;
  type: 'approve' | 'reject';
  request: TransferRequest;
}

const ActionModal: React.FC<ActionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  type,
  request
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processText, setProcessText] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(type === 'reject' ? rejectReason : undefined);
      onClose();
    } catch (error) {
      console.error('Error processing action:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isProcessValid = processText.toLowerCase() === 'process';
  const isFormValid = type === 'approve' ? isProcessValid : (isProcessValid && rejectReason.trim().length > 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-lg border border-gray-800/20 shadow-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <p className="text-gray-300">{description}</p>
          </div>

          <div className="bg-[#252b3b] rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Transfer ID</p>
                <p className="text-sm text-white">{request.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Player</p>
                <p className="text-sm text-white">{request.player_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">From</p>
                <p className="text-sm text-white">{request.from_platform} - {request.from_username}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">To</p>
                <p className="text-sm text-white">{request.to_platform} - {request.to_username}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Amount</p>
                <p className="text-sm text-white">${request.amount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Team Code</p>
                <p className="text-sm text-white">{request.team_code}</p>
              </div>
            </div>
          </div>

          {/* Process Text Field */}
          <div className="space-y-2">
            {type === 'reject' && (
              <div className="mb-4">
                <label className="text-sm text-gray-400">Reason for Rejection</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  className="w-full bg-[#252b3b] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 mt-2"
                  rows={3}
                />
                {rejectReason.trim().length === 0 && (
                  <p className="text-sm text-red-500 mt-1">Please provide a reason for rejection</p>
                )}
              </div>
            )}
            <label className="text-sm text-gray-400">Type "process" to confirm</label>
            <input
              type="text"
              value={processText}
              onChange={(e) => setProcessText(e.target.value)}
              onPaste={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              placeholder="Type 'process' to enable confirmation"
              className="w-full bg-[#252b3b] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            />
            {processText && !isProcessValid && (
              <p className="text-sm text-red-500">Please type "process" exactly to confirm</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || !isFormValid}
            className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2
              ${type === 'approve' 
                ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                : 'bg-red-500 text-white hover:bg-red-600'
              } transition-all duration-200 transform hover:scale-105 active:scale-95 
              disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              type === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const Page = () => {
  const router = useRouter();
  const { logActivity } = useActivityLogger();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'Pending' | 'Completed' | 'Rejected'>('Pending');
  const [activeTeamCode, setActiveTeamCode] = useState<'ALL' | 'ENT-1' | 'ENT-2' | 'ENT-3'>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [transferRequests, setTransferRequests] = useState<TransferRequest[]>([]);
  const [stats, setStats] = useState({
    pending: 0,
    completed: 0,
    rejected: 0,
    total: 0
  });
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: 'approve' | 'reject';
    request: TransferRequest | null;
  }>({
    isOpen: false,
    type: 'approve',
    request: null
  });

  // Authentication effect
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
        router.push('/login');
        return;
      }
      setUser(parsedUser);
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/login');
    }
  }, [router]);

  // Add getDefaultProcessingState helper function
  const getDefaultProcessingState = () => ({
    status: 'idle' as const,
    processed_by: null,
    modal_type: 'none' as const
  });

  // Update fetchTransferRequests to ensure processing_state is initialized
  const fetchTransferRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsRefreshing(true);

      // First fetch all requests for stats
      const { data: allTransferData, error: allTransferError } = await supabase
        .from('transfer_requests')
        .select('*');

      if (allTransferError) throw allTransferError;

      // Calculate stats from all requests
      const stats = {
        pending: allTransferData.filter(r => r.status === 'pending').length,
        completed: allTransferData.filter(r => r.status === 'completed').length,
        rejected: allTransferData.filter(r => r.status === 'rejected').length,
        total: allTransferData.length
      };

      setStats(stats);

      // Then fetch filtered requests for the current tab
      const { data: filteredTransferData, error: transferError } = await supabase
        .from('transfer_requests')
        .select('*')
        .eq('status', activeTab.toLowerCase())
        .order('created_at', { ascending: false });

      if (transferError) throw transferError;

      // Transform the filtered data to ensure processing_state is initialized
      const transformedRequests = (filteredTransferData || []).map(request => ({
        ...request,
        processing_state: request.processing_state || getDefaultProcessingState()
      }));

      setTransferRequests(transformedRequests);
    } catch (error) {
      console.error("Error fetching transfer requests:", error);
      const message = error instanceof Error ? error.message : "An error occurred while fetching transfer requests";
      setIsRefreshing(false);
      setTransferRequests([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab]);

  // Effect to fetch data when tab changes
  useEffect(() => {
    fetchTransferRequests();
  }, [activeTab, activeTeamCode]);

  const handleRefresh = async () => {
    await fetchTransferRequests();
  };

  const handleStatsCardClick = (tab: 'Pending' | 'Completed' | 'Rejected') => {
    setActiveTab(tab);
    // Scroll to table section
    const tableElement = document.querySelector('.table-section');
    if (tableElement) {
      tableElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const getTimeElapsed = (timestamp: string) => {
    const now = new Date();
    const logTime = new Date(timestamp);
    const diff = now.getTime() - logTime.getTime();

    const hours = diff / (1000 * 60 * 60);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);

    let color = 'text-green-500';
    if (hours > 6) color = 'text-red-500';
    else if (hours > 3) color = 'text-orange-500';
    else if (hours > 1) color = 'text-yellow-500';

    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return { text: `${days}d ago`, color };
    }
    if (hours >= 1) {
      return { text: `${Math.floor(hours)}h ago`, color };
    }
    return { text: `${minutes}m ago`, color };
  };

  // Add useEffect for realtime subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('transfer_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transfer_requests'
        },
        async (payload) => {
          console.log('Transfer realtime update received:', payload);
          await fetchTransferRequests();
        }
      )
      .subscribe((status) => {
        console.log('Transfer subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Add auto-open modal effect
  useEffect(() => {
    const handleAutoOpenModal = async () => {
      if (!user?.id) return;

      // Find any request that's in progress and assigned to current user
      const inProgressRequest = transferRequests.find(
        (request) =>
          request.processing_state.status === "in_progress" &&
          request.processing_state.processed_by === user.id
      );

      if (inProgressRequest) {
        setActionModal({
          isOpen: true,
          type: inProgressRequest.processing_state.modal_type === 'process_modal' ? 'approve' : 'reject',
          request: inProgressRequest
        });
      }
    };

    if (user?.id && transferRequests.length > 0) {
      handleAutoOpenModal();
    }
  }, [transferRequests, user?.id]);

  // Update handleApprove
  const handleApprove = async (request: TransferRequest) => {
    try {
      // Check if request is already being processed
      if (request.processing_state?.status === 'in_progress') {
        alert('This request is currently being processed by another user.');
        return;
      }

      // Update processing state directly
      const { error: updateError } = await supabase
      .from('transfer_requests')
      .update({
        processing_state: {
          status: 'in_progress',
          processed_by: user?.id || null,
          modal_type: 'process_modal'
        }
      })
      .eq('id', request.id);

    if (updateError) throw updateError;

      // Fetch the updated request to confirm our update
      const { data: updatedRequest, error: fetchError } = await supabase
        .from('transfer_requests')
        .select('*')
        .eq('id', request.id)
        .single();

      if (fetchError || !updatedRequest) {
        console.error('Error fetching updated request:', fetchError);
        return;
      }

      // Verify we got the lock
      if (updatedRequest.processing_state?.processed_by !== user?.id) {
        console.log('Could not acquire processing state - request might be locked by another user');
        return;
      }

      setActionModal({
        isOpen: true,
        type: 'approve',
        request: updatedRequest
      });
    } catch (error) {
      console.error('Error setting processing state:', error);
    }
  };

  // Update handleReject
  const handleReject = async (request: TransferRequest) => {
    try {
      // Check if request is already being processed
      if (request.processing_state?.status === 'in_progress') {
        alert('This request is currently being processed by another user.');
        return;
      }

      const { error: updateError } = await supabase
      .from('transfer_requests')
      .update({
        processing_state: {
          status: 'in_progress',
          processed_by: user?.id || null,
          modal_type: 'reject_modal'
        }
      })
      .eq('id', request.id);

    if (updateError) throw updateError;

      // Fetch the updated request to confirm our update
      const { data: updatedRequest, error: fetchError } = await supabase
        .from('transfer_requests')
        .select('*')
        .eq('id', request.id)
        .single();

      if (fetchError || !updatedRequest) {
        console.error('Error fetching updated request:', fetchError);
        return;
      }

      // Verify we got the lock
      if (updatedRequest.processing_state?.processed_by !== user?.id) {
        console.log('Could not acquire processing state - request might be locked by another user');
        return;
      }

      setActionModal({
        isOpen: true,
        type: 'reject',
        request: updatedRequest
      });
    } catch (error) {
      console.error('Error setting processing state:', error);
    }
  };

  // Update handleModalClose
  const handleModalClose = async () => {
    if (!actionModal.request || !user?.id) return;

    try {
      // Release processing state directly
      const { error: updateError } = await supabase
      .from('transfer_requests')
      .update({
        processing_state: {
          status: 'idle',
          processed_by: null,
          modal_type: 'none'
        }
      })
      .eq('id', actionModal.request.id);

      if (updateError) {
        console.error('Error releasing processing state:', updateError);
        return;
      }

      setActionModal({ isOpen: false, type: 'approve', request: null });
    } catch (error) {
      console.error('Error resetting processing state:', error);
    }
  };

  // Update handleConfirmAction
  const handleConfirmAction = async (rejectReason?: string) => {
    if (!actionModal.request || !user?.id) return;

    try {
      // Update everything in a single operation
      const { error: updateError } = await supabase
        .from('transfer_requests')
        .update({
          status: actionModal.type === 'approve' ? 'completed' : 'rejected',
          processed_by: user?.name,
          processed_at: new Date().toISOString(),
          notes: actionModal.type === 'reject' ? rejectReason : actionModal.request.notes,
          processing_state: {
            status: 'idle',
            processed_by: null,
            modal_type: 'none'
          }
        })
        .eq('id', actionModal.request.id)
        .single();

      if (updateError) throw updateError;

      await fetchTransferRequests();
      setActionModal({ isOpen: false, type: 'approve', request: null });
    } catch (error) {
      console.error(`Error ${actionModal.type}ing transfer:`, error);
    }
  };

  if (!user) return null;
  
  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">

      <div className="flex-1 pl-64">
        <main className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
              Transfer Requests
            </h1>
            <RefreshButton onClick={handleRefresh} isLoading={isRefreshing} />
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {/* Pending Card */}
            <div 
              onClick={() => handleStatsCardClick('Pending')}
              className={`relative bg-[#1a1a1a] rounded-2xl p-6 cursor-pointer transform transition-all duration-200 hover:scale-105 ${
                activeTab === 'Pending' ? 'scale-105 before:opacity-100' : ''
              } before:absolute before:inset-0 before:bg-gradient-to-b before:from-amber-500/20 before:to-transparent before:rounded-2xl before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 group`}
            >
              <div className={`absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent ${activeTab === 'Pending' ? 'opacity-100' : ''}`}></div>
              <div className={`absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-amber-500/10 to-transparent ${activeTab === 'Pending' ? 'opacity-100' : ''}`}></div>
              <div className={`absolute inset-y-0 -left-px w-px bg-gradient-to-b from-transparent via-amber-500/50 to-transparent transition-opacity duration-500 ${activeTab === 'Pending' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></div>
              <div className={`absolute inset-y-0 -right-px w-px bg-gradient-to-b from-transparent via-amber-500/50 to-transparent transition-opacity duration-500 ${activeTab === 'Pending' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xl text-amber-500 font-medium tracking-wider">PENDING</div>
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className={`text-3xl font-bold text-white mb-1 transition-transform duration-300 ${activeTab === 'Pending' ? 'scale-105' : 'group-hover:scale-105'}`}>{stats.pending}</div>
                <div className="text-sm text-gray-400 mb-4">Requests</div>
              </div>
            </div>

            {/* Completed Card */}
            <div 
              onClick={() => handleStatsCardClick('Completed')}
              className={`relative bg-[#1a1a1a] rounded-2xl p-6 cursor-pointer transform transition-all duration-200 hover:scale-105 ${
                activeTab === 'Completed' ? 'scale-105 before:opacity-100' : ''
              } before:absolute before:inset-0 before:bg-gradient-to-b before:from-emerald-500/20 before:to-transparent before:rounded-2xl before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 group`}
            >
              <div className={`absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent ${activeTab === 'Completed' ? 'opacity-100' : ''}`}></div>
              <div className={`absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent ${activeTab === 'Completed' ? 'opacity-100' : ''}`}></div>
              <div className={`absolute inset-y-0 -left-px w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent transition-opacity duration-500 ${activeTab === 'Completed' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></div>
              <div className={`absolute inset-y-0 -right-px w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent transition-opacity duration-500 ${activeTab === 'Completed' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xl text-emerald-500 font-medium tracking-wider">COMPLETED</div>
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className={`text-3xl font-bold text-white mb-1 transition-transform duration-300 ${activeTab === 'Completed' ? 'scale-105' : 'group-hover:scale-105'}`}>{stats.completed}</div>
                <div className="text-sm text-gray-400 mb-4">Requests</div>
              </div>
            </div>

            {/* Rejected Card */}
            <div 
              onClick={() => handleStatsCardClick('Rejected')}
              className={`relative bg-[#1a1a1a] rounded-2xl p-6 cursor-pointer transform transition-all duration-200 hover:scale-105 ${
                activeTab === 'Rejected' ? 'scale-105 before:opacity-100' : ''
              } before:absolute before:inset-0 before:bg-gradient-to-b before:from-red-500/20 before:to-transparent before:rounded-2xl before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 group`}
            >
              <div className={`absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent ${activeTab === 'Rejected' ? 'opacity-100' : ''}`}></div>
              <div className={`absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-red-500/10 to-transparent ${activeTab === 'Rejected' ? 'opacity-100' : ''}`}></div>
              <div className={`absolute inset-y-0 -left-px w-px bg-gradient-to-b from-transparent via-red-500/50 to-transparent transition-opacity duration-500 ${activeTab === 'Rejected' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></div>
              <div className={`absolute inset-y-0 -right-px w-px bg-gradient-to-b from-transparent via-red-500/50 to-transparent transition-opacity duration-500 ${activeTab === 'Rejected' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xl text-red-500 font-medium tracking-wider">REJECTED</div>
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
                <div className={`text-3xl font-bold text-white mb-1 transition-transform duration-300 ${activeTab === 'Rejected' ? 'scale-105' : 'group-hover:scale-105'}`}>{stats.rejected}</div>
                <div className="text-sm text-gray-400 mb-4">Requests</div>
              </div>
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

          {/* Table */}
          <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-gray-800/20">
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">PENDING SINCE</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">TEAM CODE</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">TRANSFER ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">ACC ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">PLAYER</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">NOTES</th>
                      {activeTab === 'Pending' && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">ACTIONS</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {transferRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-[#252b3b]">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {request.created_at && (
                            <div className="flex flex-col">
                              <span className={`text-sm font-medium ${getTimeElapsed(request.created_at).color}`}>
                                {getTimeElapsed(request.created_at).text}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(request.created_at).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="bg-blue-500/10 text-blue-500 px-2 py-1 rounded-lg text-xs">
                            {request.team_code || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{request.id}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{request.vip_code}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <Image 
                              src={request.player_image || `https://ui-avatars.com/api/?name=${request.player_name}`}
                              alt={request.player_name}
                              width={32}
                              height={32}
                              className="rounded-full"
                            />
                            <span className="text-sm text-gray-300">{request.player_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-300 line-clamp-2">{request.notes}</span>
                        </td>
                        {activeTab === 'Pending' && (
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApprove(request)}
                                disabled={request.processing_state?.status === 'in_progress'}
                                className={`p-1.5 rounded-lg ${
                                  request.processing_state?.status === 'in_progress'
                                    ? 'bg-gray-500/10 text-gray-500 cursor-not-allowed'
                                    : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                                }`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleReject(request)}
                                disabled={request.processing_state?.status === 'in_progress'}
                                className={`p-1.5 rounded-lg ${
                                  request.processing_state?.status === 'in_progress'
                                    ? 'bg-gray-500/10 text-gray-500 cursor-not-allowed'
                                    : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                                }`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Update Action Modal */}
      {actionModal.isOpen && actionModal.request && (
        <ActionModal
          isOpen={actionModal.isOpen}
          onClose={handleModalClose}
          onConfirm={handleConfirmAction}
          title={actionModal.type === 'approve' ? 'Approve Transfer Request' : 'Reject Transfer Request'}
          description={actionModal.type === 'approve' 
            ? 'Are you sure you want to approve this transfer request? This action cannot be undone.'
            : 'Are you sure you want to reject this transfer request? This action cannot be undone.'
          }
          type={actionModal.type}
          request={actionModal.request}
        />
      )}
    </div>
  );
};

export default Page;