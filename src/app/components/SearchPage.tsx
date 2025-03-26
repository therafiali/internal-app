"use client"
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import Search, { SearchFilters } from '@/app/components/Search';
import { AdminHeader, SupportHeader } from '@/app/components/Headers';

import useRedeemRequests, { RedeemRequest } from '@/hooks/useRedeemRequests';
import { Eye } from 'lucide-react';
import RequestDetailsModal from '@/app/components/RequestDetailsModal';
import { useRechargeRequests } from '@/hooks/useRechargeRequests';
import { supabase } from '@/supabase/client';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { EntType } from '@/supabase/types';
import { convertEntFormat } from '@/utils/entFormat';

// Simplified interfaces
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
  messengerId?: string;
}

// Updated interfaces for Supabase
interface RechargeRequestExtended {
  type: 'recharge';
  id: string;
  recharge_id: string;
  vip_code: string;
  player_name: string;
  messenger_id: string | null;
  team_code: string;
  game_platform: string;
  game_username: string;
  amount: number;
  bonus_amount: number;
  credits_loaded: number;
  status: string;
  promo_code: string | null;
  promo_type: string | null;
  payment_method: PaymentMethod | null;
  screenshot_url: string | null;
  notes: string | null;
  manychat_data: ManyChatData;
  agent_name: string;
  agent_department: string;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  identifier: string | null;
}

interface RedeemRequestExtended {
  type: 'redeem';
  id: string;
  redeem_id: string;
  vip_code: string;
  player_name: string;
  messenger_id: string | null;
      team_code: string;
  game_platform: string;
  game_username: string;
  total_amount: number;
  status: string;
  payment_methods: PaymentMethod[];
  notes: string | null;
  manychat_data: ManyChatData;
  agent_name: string;
  agent_department: string;
  processed_by: string | null;
  processed_at: string | null;
  verified_by: string | null;
  verified_at: string | null;
  verification_remarks: string | null;
  created_at: string;
  updated_at: string;
}

interface RedeemApiResponse {
  redeemRequests: {
    _id: string;
    redeemId: string;
    username: string;
    gamePlatform: string;
    totalAmount: number;
    amountPaid: number;
    amountHold: number;
    amountAvailable: number;
    status: string;
    createdAt: string;
    requestedAt: string;
    entryCode: string;
    initBy: string;
    paymentMethods: PaymentMethod[];
    manyChatData?: {
      name: string;
      profile_pic: string;
      custom_fields: {
        team_code: string;
        entry_code: string;
        [key: string]: any;
      };
    };
    processedBy?: {
      _id: string;
      email: string;
      name: string;
    };
    processedAt?: string;
    remarks?: string;
    otp?: {
      attempts: number;
      maxAttempts: number;
    };
  }[];
  totalPages: number;
  currentPage: number;
  total: number;
}

type RequestType = RechargeRequestExtended | RedeemRequestExtended;

// Add getTimeElapsed helper function
const getTimeElapsed = (date: string) => {
  const now = new Date();
  const lastSeen = new Date(date);
  const diff = now.getTime() - lastSeen.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  if (seconds > 0) return `${seconds}s ago`;
  return 'Just now';
};

const getTimeElapsedColor = (date: string) => {
  const now = new Date();
  const lastSeen = new Date(date);
  const diff = now.getTime() - lastSeen.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 1) return 'text-emerald-500'; // Less than 1 hour
  if (hours < 4) return 'text-blue-500';    // Less than 4 hours
  if (hours < 24) return 'text-amber-500';  // Less than 24 hours
  return 'text-red-500';                    // More than 24 hours
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    case 'completed':
      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    case 'rejected':
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    case 'verification_failed':
      return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    case 'sc_submitted':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'processing':
      return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    default:
      return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  }
};

interface User {
  name: string;
  email: string;
  department: string;
  role: string;
}

const SearchPage = () => {
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);
  const [rechargeRequests, setRechargeRequests] = useState<RechargeRequestExtended[]>([]);
  const [rechargeLoading, setRechargeLoading] = useState(true);
  const [rechargeError, setRechargeError] = useState<string | null>(null);
  const [redeemRequests, setRedeemRequests] = useState<RedeemRequestExtended[]>([]);
  const [redeemLoading, setRedeemLoading] = useState(true);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [filteredRechargeRequests, setFilteredRechargeRequests] = useState<RechargeRequestExtended[]>([]);
  const [filteredRedeemRequests, setFilteredRedeemRequests] = useState<RedeemRequestExtended[]>([]);
  const [activeRequestType, setActiveRequestType] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<RequestType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequestType, setSelectedRequestType] = useState<'recharge' | 'redeem'>('recharge');

  console.log('Current user:', user);
  console.log('User ENT access:', user?.ent_access);

  // Fetch recharge requests from Supabase with ENT access filter
  const fetchRechargeRequests = useCallback(async () => {
    try {
      setRechargeLoading(true);

      // If user has no ENT access, return empty array
      if (!user?.ent_access || user.ent_access.length === 0) {
        console.log('No ENT access found for recharge requests');
        setRechargeRequests([]);
        setFilteredRechargeRequests([]);
        return;
      }

      console.log('Fetching recharge requests for user:', convertEntFormat.formatUserDetails(user));

      const { data: rechargeData, error } = await convertEntFormat
        .createEntFilteredQuery(supabase, 'recharge_requests', user)
        .order('created_at', { ascending: false });

      console.log('Recharge data response:', { rechargeData, error });

      if (error) throw error;

      const transformedRequests: RechargeRequestExtended[] = (rechargeData || []).map(request => ({
      type: 'recharge',
        id: request.id,
        recharge_id: request.recharge_id,
        vip_code: request.vip_code,
        player_name: request.player_name,
        messenger_id: request.messenger_id,
        team_code: request.team_code,
        game_platform: request.game_platform,
        game_username: request.game_username,
        amount: request.amount,
        bonus_amount: request.bonus_amount,
        credits_loaded: request.credits_loaded,
        status: request.status,
        promo_code: request.promo_code,
        promo_type: request.promo_type,
        payment_method: request.payment_method,
        screenshot_url: request.screenshot_url,
        notes: request.notes,
        manychat_data: request.manychat_data,
        agent_name: request.agent_name,
        agent_department: request.agent_department,
        processed_by: request.processed_by,
        processed_at: request.processed_at,
        created_at: request.created_at,
        updated_at: request.updated_at,
        identifier: request.identifier
      }));

      console.log('Transformed recharge requests:', transformedRequests);
      setRechargeRequests(transformedRequests);
    setFilteredRechargeRequests(transformedRequests);
    } catch (error) {
      console.error('Error in fetchRechargeRequests:', error);
      setRechargeError(error instanceof Error ? error.message : 'Failed to fetch recharge requests');
    } finally {
      setRechargeLoading(false);
    }
  }, [user]);

  // Fetch redeem requests from Supabase with ENT access filter
  const fetchRedeemRequests = useCallback(async () => {
    try {
      setRedeemLoading(true);

      // If user has no ENT access, return empty array
      if (!user?.ent_access || user.ent_access.length === 0) {
        console.log('No ENT access found for redeem requests');
        setRedeemRequests([]);
        setFilteredRedeemRequests([]);
        return;
      }

      console.log('Fetching redeem requests for user:', convertEntFormat.formatUserDetails(user));

      const { data: redeemData, error } = await convertEntFormat
        .createEntFilteredQuery(supabase, 'redeem_requests', user)
        .order('created_at', { ascending: false });

      console.log('Redeem data response:', { redeemData, error });

      if (error) throw error;

      const transformedRequests: RedeemRequestExtended[] = (redeemData || []).map(request => ({
        type: 'redeem',
        id: request.id,
        redeem_id: request.redeem_id,
        vip_code: request.vip_code,
        player_name: request.player_name,
        messenger_id: request.messenger_id,
        team_code: request.team_code,
        game_platform: request.game_platform,
        game_username: request.game_username,
        total_amount: request.total_amount,
        status: request.status,
        payment_methods: request.payment_methods,
        notes: request.notes,
        manychat_data: request.manychat_data,
        agent_name: request.agent_name,
        agent_department: request.agent_department,
        processed_by: request.processed_by,
        processed_at: request.processed_at,
        verified_by: request.verified_by,
        verified_at: request.verified_at,
        verification_remarks: request.verification_remarks,
        created_at: request.created_at,
        updated_at: request.updated_at
      }));

      console.log('Transformed redeem requests:', transformedRequests);
      setRedeemRequests(transformedRequests);
      setFilteredRedeemRequests(transformedRequests);
    } catch (error) {
      console.error('Error in fetchRedeemRequests:', error);
      setRedeemError(error instanceof Error ? error.message : 'Failed to fetch redeem requests');
    } finally {
      setRedeemLoading(false);
    }
  }, [user]);

  // Initial data fetch
  useEffect(() => {
    console.log('Effect triggered. User:', user);
    console.log('Active request type:', activeRequestType);
    
    if (!user) {
      console.log('No user found, redirecting to login');
      router.push('/login');
      return;
    }

    if (activeRequestType === 'recharge' || activeRequestType === 'all') {
      console.log('Fetching recharge requests...');
      fetchRechargeRequests();
    }
    if (activeRequestType === 'redeem' || activeRequestType === 'all') {
      console.log('Fetching redeem requests...');
      fetchRedeemRequests();
    }
  }, [activeRequestType, fetchRechargeRequests, fetchRedeemRequests, user, router]);

  const handleSearch = async (filters: SearchFilters) => {
    try {
      setActiveRequestType(filters.requestType);

      // Filter recharge requests with ENT access check
      const filteredRecharge = rechargeRequests.filter(request => {
        // Convert request team_code from ENT-1 to ENT1 format to match user's ent_access
        const requestTeamCode = convertEntFormat.toAuth(request.team_code);
        const hasEntAccess = user?.ent_access?.includes(requestTeamCode as EntType);
        if (!hasEntAccess) return false;

        const dateInRange = filters.dateRange.start && filters.dateRange.end ? 
          new Date(request.created_at) >= new Date(filters.dateRange.start) &&
          new Date(request.created_at) <= new Date(filters.dateRange.end) : true;
        
        return (
          (filters.requestId === '' || request.id.toLowerCase().includes(filters.requestId.toLowerCase())) &&
          (filters.gamePlatform === '' || request.game_platform.toLowerCase().includes(filters.gamePlatform.toLowerCase())) &&
          (filters.gameUsername === '' || request.game_username.toLowerCase().includes(filters.gameUsername.toLowerCase())) &&
          (filters.vipCode === '' || request.vip_code.toLowerCase().includes(filters.vipCode.toLowerCase())) &&
          (filters.teamCode === '' || request.team_code.toLowerCase().includes(filters.teamCode.toLowerCase())) &&
          (filters.playerName === '' || request.player_name.toLowerCase().includes(filters.playerName.toLowerCase())) &&
          (filters.status === '' || request.status.toLowerCase() === filters.status.toLowerCase()) &&
          dateInRange
        );
      });

      // Filter redeem requests with ENT access check
      const filteredRedeem = redeemRequests.filter(request => {
        // Convert request team_code from ENT-1 to ENT1 format to match user's ent_access
        const requestTeamCode = convertEntFormat.toAuth(request.team_code);
        const hasEntAccess = user?.ent_access?.includes(requestTeamCode as EntType);
        if (!hasEntAccess) return false;

        const hasMatchingPaymentUsername = filters.paymentUsername === '' || 
          request.payment_methods.some(pm => 
            pm.username.toLowerCase().includes(filters.paymentUsername.toLowerCase())
          );

        const dateInRange = filters.dateRange.start && filters.dateRange.end ? 
          new Date(request.created_at) >= new Date(filters.dateRange.start) &&
          new Date(request.created_at) <= new Date(filters.dateRange.end) : true;

        return (
          (filters.requestId === '' || request.id.toLowerCase().includes(filters.requestId.toLowerCase())) &&
          (filters.gamePlatform === '' || request.game_platform.toLowerCase().includes(filters.gamePlatform.toLowerCase())) &&
          (filters.gameUsername === '' || request.game_username.toLowerCase().includes(filters.gameUsername.toLowerCase())) &&
          (filters.vipCode === '' || request.vip_code.toLowerCase().includes(filters.vipCode.toLowerCase())) &&
          (filters.teamCode === '' || request.team_code.toLowerCase().includes(filters.teamCode.toLowerCase())) &&
          (filters.playerName === '' || request.player_name.toLowerCase().includes(filters.playerName.toLowerCase())) &&
          (filters.status === '' || request.status.toLowerCase() === filters.status.toLowerCase()) &&
          hasMatchingPaymentUsername &&
          dateInRange
        );
      });

      setFilteredRechargeRequests(filteredRecharge);
      setFilteredRedeemRequests(filteredRedeem);
    } catch (error) {
      console.error('Error in handleSearch:', error);
      setFilteredRechargeRequests([]);
      setFilteredRedeemRequests([]);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const FilterCards = () => {
    const searchInputRefs = {
      requestId: useRef<HTMLInputElement>(null),
      gamePlatform: useRef<HTMLInputElement>(null),
      gameUsername: useRef<HTMLInputElement>(null),
      paymentUsername: useRef<HTMLInputElement>(null),
      vipCode: useRef<HTMLInputElement>(null),
      teamCode: useRef<HTMLInputElement>(null),
      playerName: useRef<HTMLInputElement>(null),
      status: useRef<HTMLSelectElement>(null),
      startDate: useRef<HTMLInputElement>(null),
      endDate: useRef<HTMLInputElement>(null)
    };

    const performSearch = () => {
      const filters: SearchFilters = {
        requestId: searchInputRefs.requestId.current?.value || '',
        gamePlatform: searchInputRefs.gamePlatform.current?.value || '',
        gameUsername: searchInputRefs.gameUsername.current?.value || '',
        paymentUsername: searchInputRefs.paymentUsername.current?.value || '',
        vipCode: searchInputRefs.vipCode.current?.value || '',
        teamCode: searchInputRefs.teamCode.current?.value || '',
        playerName: searchInputRefs.playerName.current?.value || '',
        status: searchInputRefs.status.current?.value || '',
        dateRange: {
          start: searchInputRefs.startDate.current?.value || '',
          end: searchInputRefs.endDate.current?.value || ''
        },
        requestType: activeRequestType
      };

      handleSearch(filters);
    };

    const handleClear = () => {
      Object.values(searchInputRefs).forEach(ref => {
        if (ref.current) {
          ref.current.value = '';
        }
      });
      performSearch();
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        performSearch();
      }
    };

    return (
      <div className="mb-8">
        <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-gray-800/20 shadow-xl">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {/* All Requests Stat */}
            <div 
              onClick={() => setActiveRequestType('all')}
              className={`flex items-center p-4 rounded-xl transition-all duration-200 cursor-pointer
                ${activeRequestType === 'all' 
                  ? 'bg-blue-500/10 border border-blue-500/50' 
                  : 'bg-gray-800/30 border border-transparent hover:border-blue-500/30'}`}
            >
              <div className="p-3 bg-blue-500/10 rounded-lg mr-4">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{redeemRequests.length + rechargeRequests.length}</div>
                <div className="text-sm text-blue-500">All Requests</div>
              </div>
            </div>

            {/* Recharge Requests Stat */}
            <div 
              onClick={() => setActiveRequestType('recharge')}
              className={`flex items-center p-4 rounded-xl transition-all duration-200 cursor-pointer
                ${activeRequestType === 'recharge' 
                  ? 'bg-emerald-500/10 border border-emerald-500/50' 
                  : 'bg-gray-800/30 border border-transparent hover:border-emerald-500/30'}`}
            >
              <div className="p-3 bg-emerald-500/10 rounded-lg mr-4">
                <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{rechargeRequests.length}</div>
                <div className="text-sm text-emerald-500">Recharge</div>
              </div>
            </div>

            {/* Redeem Requests Stat */}
            <div 
              onClick={() => setActiveRequestType('redeem')}
              className={`flex items-center p-4 rounded-xl transition-all duration-200 cursor-pointer
                ${activeRequestType === 'redeem' 
                  ? 'bg-amber-500/10 border border-amber-500/50' 
                  : 'bg-gray-800/30 border border-transparent hover:border-amber-500/30'}`}
            >
              <div className="p-3 bg-amber-500/10 rounded-lg mr-4">
                <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 9a2 2 0 10-4 0v5a2 2 0 01-2 2h6m-6-4h4m8 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{redeemRequests.length}</div>
                <div className="text-sm text-amber-500">Redeem</div>
              </div>
            </div>
          </div>

          {/* Search Form */}
          <div className="space-y-6">
            {/* Basic Search Fields */}
            <div className="grid grid-cols-4 gap-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                </div>
                <input
                  ref={searchInputRefs.requestId}
                  type="text"
                  placeholder="Request ID"
                  onKeyDown={handleKeyPress}
                  className="w-full pl-10 pr-4 py-3 bg-[#0a0a0a] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <input
                  ref={searchInputRefs.vipCode}
                  type="text"
                  placeholder="VIP Code"
                  onKeyDown={handleKeyPress}
                  className="w-full pl-10 pr-4 py-3 bg-[#0a0a0a] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <input
                  ref={searchInputRefs.teamCode}
                  type="text"
                  placeholder="Team Code"
                  onKeyDown={handleKeyPress}
                  className="w-full pl-10 pr-4 py-3 bg-[#0a0a0a] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  ref={searchInputRefs.playerName}
                  type="text"
                  placeholder="Player Name"
                  onKeyDown={handleKeyPress}
                  className="w-full pl-10 pr-4 py-3 bg-[#0a0a0a] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Game and Payment Fields */}
            <div className="grid grid-cols-4 gap-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <input
                  ref={searchInputRefs.gamePlatform}
                  type="text"
                  placeholder="Game Platform"
                  onKeyDown={handleKeyPress}
                  className="w-full pl-10 pr-4 py-3 bg-[#0a0a0a] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  ref={searchInputRefs.gameUsername}
                  type="text"
                  placeholder="Game Username"
                  onKeyDown={handleKeyPress}
                  className="w-full pl-10 pr-4 py-3 bg-[#0a0a0a] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <input
                  ref={searchInputRefs.paymentUsername}
                  type="text"
                  placeholder="Payment Username"
                  onKeyDown={handleKeyPress}
                  className="w-full pl-10 pr-4 py-3 bg-[#0a0a0a] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <select
                  ref={searchInputRefs.status}
                  className="w-full pl-10 pr-4 py-3 bg-[#0a0a0a] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                  <option value="verification_failed">Verification Failed</option>
                  <option value="sc_submitted">Screenshot Submitted</option>
                  <option value="processing">Processing</option>
                </select>
              </div>
            </div>

            {/* Date Range Fields */}
            <div className="grid grid-cols-4 gap-4">
              <div className="relative col-span-2">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  ref={searchInputRefs.startDate}
                  type="datetime-local"
                  className="w-full pl-10 pr-4 py-3 bg-[#0a0a0a] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="relative col-span-2">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  ref={searchInputRefs.endDate}
                  type="datetime-local"
                  className="w-full pl-10 pr-4 py-3 bg-[#0a0a0a] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mt-6">
              <button
                onClick={performSearch}
                className="flex-1 px-6 py-3 bg-blue-500 text-white font-medium rounded-xl
                  hover:bg-blue-600 active:bg-blue-700 transition-all duration-200
                  flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search
              </button>
              <button
                onClick={handleClear}
                className="px-6 py-3 bg-gray-800 text-gray-300 font-medium rounded-xl
                  hover:bg-gray-700 active:bg-gray-600 transition-all duration-200
                  flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear
              </button>
            </div>
            <p className="text-sm text-gray-500 text-center mt-4">Press Enter in any field to search</p>
          </div>
        </div>
      </div>
    );
  };

  const handleViewDetails = (request: RequestType) => {
    setSelectedRequest(request);
    setSelectedRequestType(request.type);
    setIsModalOpen(true);
  };

  const isLoading = rechargeLoading || redeemLoading;
  const hasError = rechargeError || redeemError;

  if (hasError) {
    return (
      <div className="flex min-h-screen bg-[#0a0a0a] items-center justify-center">
        <div className="text-red-500">
          Error: {hasError}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] w-full">
      <div className="flex-1 pl-64">
        <main className="p-8">
          {/* Header Section */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              </div>
              <div>
              <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                Search Requests
              </h1>
                <p className="text-gray-400 mt-1">Search and manage player requests</p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              <FilterCards />
              {/* Results Section */}
              <div className="space-y-8">
                {/* Recharge Requests Table */}
                {(activeRequestType === 'all' || activeRequestType === 'recharge') && (
                  <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-gray-800/20 shadow-xl">
                    <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </div>
                        <div>
                        <h2 className="text-xl font-semibold text-white">Recharge Requests</h2>
                          <p className="text-sm text-gray-400">Manage and track player recharge requests</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm text-gray-400">Total Requests</div>
                          <div className="text-2xl font-bold text-white">{filteredRechargeRequests.length}</div>
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-black/20">
                            <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Request Details</th>
                            <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Player Info</th>
                            <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Game Details</th>
                            <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Amount Details</th>
                            <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Status & Time</th>
                            <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {filteredRechargeRequests.map(request => (
                            <tr key={request.id} className="hover:bg-gray-800/30 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="font-medium text-gray-200">{request.recharge_id  || request.id}</span>
                                  {/* <span className="text-xs text-gray-500">VIP: {request.vip_code}</span> */}
                                  <span className="text-xs text-gray-500">Team: {request.team_code}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-start gap-3">
                                  {request.manychat_data?.profile?.profilePic && (
                                    <img 
                                      src={request.manychat_data.profile.profilePic} 
                                      alt={request.player_name}
                                      className="w-8 h-8 rounded-full object-cover"
                                    />
                                  )}
                                  <div className="flex flex-col">
                                    <span className="font-medium text-gray-200">{request.player_name}</span>
                                    <span className="text-xs text-gray-500 capitalize">
                                      {request.manychat_data?.profile?.gender && `${request.manychat_data.profile.gender} • `}
                                      {request.manychat_data?.profile?.language}
                                    </span>
                                    {request.messenger_id && (
                                      <span className="text-xs text-blue-400">{request.vip_code}</span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col text-center">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-200">
                                    {request.game_platform}
                                </span>
                                  <span className="text-sm text-gray-300 mt-1">{request.game_username}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="text-lg font-semibold text-white">{formatAmount(request.amount)}</span>
                                  {request.bonus_amount > 0 && (
                                    <span className="text-xs text-emerald-400">+{formatAmount(request.bonus_amount)} bonus</span>
                                  )}
                                  {request.credits_loaded > 0 && (
                                    <span className="text-xs text-blue-400">{formatAmount(request.credits_loaded)} loaded</span>
                                  )}
                                  {request.promo_code && (
                                    <span className="text-xs text-purple-400">Promo: {request.promo_code}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-2">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border uppercase ${getStatusColor(request.status)}`}>
                                    {request.status}
                                  </span>
                                  <span className={`text-sm ${getTimeElapsedColor(request.created_at)}`}>
                                    {getTimeElapsed(request.created_at)}
                                </span>
                                  <div className="flex flex-col text-xs text-gray-500">
                                    <span>{request.agent_name && `Agent: ${request.agent_name}`}</span>
                                    <span>{request.agent_department && `Dept: ${request.agent_department}`}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => handleViewDetails(request)}
                                    className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                                >
                                    <Eye size={16} className="mr-1.5" />
                                    View Details
                                </button>
                                  {request.screenshot_url && (
                                    <a
                                      href={request.screenshot_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 transition-colors"
                                    >
                                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      Screenshot
                                    </a>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Redeem Requests Table */}
                {(activeRequestType === 'all' || activeRequestType === 'redeem') && (
                  <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-gray-800/20 shadow-xl mt-8">
                    <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 rounded-lg">
                          <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 9a2 2 0 10-4 0v5a2 2 0 01-2 2h6m-6-4h4m8 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-white">Redeem Requests</h2>
                      </div>
                      <span className="text-sm text-gray-500">{filteredRedeemRequests.length} requests found</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-black/20">
                            <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Request ID</th>
                            <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Game Platform</th>
                            <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Game Username</th>
                            <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Time Elapsed</th>
                            <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {filteredRedeemRequests.map(request => (
                            <tr key={request.id} className="hover:bg-gray-800/30 transition-colors">
                              <td className="px-6 py-4">
                                <span className="font-medium text-gray-200">{request.redeem_id || request.id}</span>
                                <div className="text-xs text-gray-500">VIP: {request.vip_code}</div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-200">
                                  {request.game_platform}
                                </span>
                                <div className="text-xs text-gray-500 mt-1">Team: {request.team_code}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-gray-300">{request.game_username}</div>
                                <div className="text-xs text-gray-500">{request.player_name}</div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase ${getStatusColor(request.status)}`}>
                                  {request.status}
                                </span>
                                <div className="text-xs text-gray-500 mt-1">${request.total_amount}</div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-sm ${getTimeElapsedColor(request.created_at)}`}>
                                  {getTimeElapsed(request.created_at)}
                                </span>
                                <div className="text-xs text-gray-500">
                                  {request.agent_name && `by ${request.agent_name}`}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <button
                                  onClick={() => handleViewDetails(request)}
                                  className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                                >
                                  <Eye size={16} className="mr-1" />
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
      {selectedRequest && (
        <RequestDetailsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          requestDetails={selectedRequest}
          type={selectedRequest?.type || 'recharge'}
        />
      )}
    </div>
  );
};

export default SearchPage;