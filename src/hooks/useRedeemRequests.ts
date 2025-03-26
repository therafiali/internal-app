import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';

interface ProcessedBy {
  _id: string;
  email: string;
  name: string;
}

interface PaymentMethod {
  type: string;
  username: string;
  _id: string;
}

interface Assignment {
  rechargeId: string;
  amount: number;
  status: string;
  assignedAt: string;
  assignedBy: string;
  screenshotVerified: boolean;
  paymentMethods: PaymentMethod[];
  _id: string;
}

interface ManyChatData {
  name: string;
  profile_pic?: string;
  custom_fields: {
    team_code: string;
    vip_code?: string;
  };
}

export interface RedeemRequest {
  _id: string;
  manyChatData: ManyChatData;
  entryCode: string;
  username: string;
  gamePlatform: string;
  totalAmount: number;
  amountPaid: number;
  amountHold: number;
  paymentMethods: PaymentMethod[];
  status: string;
  redeemId: string;
  requestedAt: string;
  amountAvailable: number;
  assignments: Assignment[];
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
  processedBy?: ProcessedBy;
  remarks?: string;
  verificationRemarks?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  initBy: string;
}

interface PaginationData {
  total: number;
  totalPages: number;
  currentPage: number;
}

interface PaginatedResponse {
  redeemRequests: RedeemRequest[];
  totalPages: number;
  currentPage: number;
  total: number;
}

interface Stats {
  pending: number;
  verification_failed: number;
  rejected: number;
  under_processing: number;
}

type TeamCode = 'ALL' | 'ENT-1' | 'ENT-2' | 'ENT-3';
type Status = 'Pending' | 'VerificationFailed' | 'Rejected';

interface UseRedeemRequestsProps {
  activeTab: Status;
  activeTeamCode: TeamCode;
  limit: number;
}

export const useRedeemRequests = ({ activeTab, activeTeamCode, limit }: UseRedeemRequestsProps) => {
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
    under_processing: 0
  });

  const socketRef = useRef<Socket | null>(null);
  const isSubscribed = useRef(true);
  const allRequestsRef = useRef<RedeemRequest[]>([]);

  // Function to calculate stats from requests
  const calculateStats = useCallback((requests: RedeemRequest[]) => {
    const filteredRequests = requests.filter(req => 
      activeTeamCode === 'ALL' || req.manyChatData?.custom_fields?.team_code === activeTeamCode
    );

    return {
      pending: filteredRequests.filter(req => req.status === 'pending').length,
      verification_failed: filteredRequests.filter(req => req.status === 'verification_failed').length,
      rejected: filteredRequests.filter(req => req.status === 'rejected').length,
      under_processing: filteredRequests.filter(req => req.status === 'under_processing').length
    };
  }, [activeTeamCode]);

  // Initial stats fetch
  const fetchInitialStats = useCallback(async () => {
    try {
      const token = Cookies.get('token');
      if (!token || !isSubscribed.current) return;

      const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}api/players/redeem-requests`);
      if (activeTeamCode !== 'ALL') url.searchParams.append('teamCode', activeTeamCode);
      url.searchParams.append('limit', '1000');

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch stats');

      const data = await response.json();
      
      if (!isSubscribed.current) return;

      allRequestsRef.current = data.redeemRequests;
      setStatsData(calculateStats(data.redeemRequests));
    } catch (error) {
      console.error('Error fetching initial stats:', error);
    }
  }, [activeTeamCode, calculateStats]);

  const handleSocketUpdate = useCallback((request: RedeemRequest, currentStatus: string) => {
    if (!isSubscribed.current) return;

    const statusMatch = request.status.toLowerCase() === currentStatus.toLowerCase();
    const teamMatch = activeTeamCode === 'ALL' || request.manyChatData?.custom_fields?.team_code === activeTeamCode;

    // Update redeemRequests for the table
    setRedeemRequests(prev => {
      if (statusMatch && teamMatch) {
        const index = prev.findIndex(r => r.redeemId === request.redeemId);
        if (index !== -1) {
          const newRequests = [...prev];
          newRequests[index] = request;
          return newRequests;
        }
        return [request, ...prev];
      }
      return prev.filter(r => r.redeemId !== request.redeemId);
    });
    
    // Update allRequests and recalculate stats
    allRequestsRef.current = allRequestsRef.current.map(req => 
      req.redeemId === request.redeemId ? request : req
    );
    if (!allRequestsRef.current.find(req => req.redeemId === request.redeemId)) {
      allRequestsRef.current.push(request);
    }
    
    setStatsData(calculateStats(allRequestsRef.current));
  }, [activeTeamCode, calculateStats]);

  const handleSocketInitialLoad = useCallback((data: PaginatedResponse, currentStatus: string) => {
    if (!isSubscribed.current) return;

    const filteredRequests = data.redeemRequests.filter(request => 
      request.status.toLowerCase() === currentStatus.toLowerCase() &&
      (activeTeamCode === 'ALL' || request.manyChatData?.custom_fields?.team_code === activeTeamCode)
    );
    
    setRedeemRequests(filteredRequests);
    setTotalPages(Math.ceil(filteredRequests.length / limit));
    setCurrentPage(1);
    setTotalRecords(filteredRequests.length);
    setIsLoading(false);

    // Update allRequests and recalculate stats
    allRequestsRef.current = data.redeemRequests;
    setStatsData(calculateStats(data.redeemRequests));
  }, [activeTeamCode, limit, calculateStats]);

  useEffect(() => {
    isSubscribed.current = true;
    const statusMap = {
      'Pending': 'pending',
      'VerificationFailed': 'verification_failed',
      'Rejected': 'rejected'
    };
    const currentStatus = statusMap[activeTab];
    const token = Cookies.get('token');

    if (!token) return;

    let socket: Socket | null = null;

    try {
      socket = io(process.env.NEXT_PUBLIC_API_URL || '', {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        autoConnect: false
      });

      socketRef.current = socket;

      const handleConnect = () => {
        if (!isSubscribed.current || !socket) return;
        socket.emit('initializeRedeemRequests', {
          token,
          status: currentStatus,
          teamCode: activeTeamCode
        });
      };

      socket.on('connect', handleConnect);
      socket.on('initialLoad', (data: PaginatedResponse) => 
        handleSocketInitialLoad(data, currentStatus));
      socket.on('redeemRequestUpdate', (request: RedeemRequest) => 
        handleSocketUpdate(request, currentStatus));
      socket.on('error', (error: any) => {
        console.error('Socket error:', error);
        if (isSubscribed.current) {
          setIsLoading(false);
        }
      });

      socket.connect();

      // Fetch initial stats
      fetchInitialStats();

      return () => {
        isSubscribed.current = false;
        if (socket) {
          socket.off('connect');
          socket.off('initialLoad');
          socket.off('redeemRequestUpdate');
          socket.off('error');
          socket.emit('leaveRedeemRequests');
          socket.disconnect();
        }
      };
    } catch (error) {
      console.error('Socket initialization error:', error);
      setIsLoading(false);
      return () => {
        isSubscribed.current = false;
      };
    }
  }, [activeTab, activeTeamCode, handleSocketInitialLoad, handleSocketUpdate, fetchInitialStats]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (socketRef.current?.connected) {
        const token = Cookies.get('token');
        socketRef.current.emit('initializeRedeemRequests', {
          token,
          status: activeTab.toLowerCase(),
          teamCode: activeTeamCode
        });
      }
      await fetchInitialStats();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [activeTab, activeTeamCode, fetchInitialStats]);

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
};

export default useRedeemRequests; 