import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

interface PaymentMethod {
  type: string;
  details: string;
}

interface ProcessedBy {
  name: string;
  email: string;
}

interface Transaction {
  rechargeId: string;
  playerName: string;
  manyChatName: string;
  messengerId: string;
  vipCode: string | null;
  initBy: string;
  gamePlatform: string;
  gameUsername: string;
  amount: number;
  bonusAmount: number;
  status: string;
  screenshotUrl?: string;
  teamCode: string;
  promotion?: string | null;
  createdAt: string;
  profile_pic: string;
  processedBy: ProcessedBy | null;
  processedAt?: string;
  paymentMethod?: PaymentMethod;
  tagType?: string;
}

interface PaginationData {
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

interface ApiResponse {
  status: string;
  data: {
    rechargeRequests: Transaction[];
    pagination: PaginationData;
  };
}

interface TransactionStats {
  totalPending: string;
  pendingCount: string;
  averageTime: string;
  successRate: string;
}

const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [stats, setStats] = useState<TransactionStats>({
    totalPending: '$0',
    pendingCount: '0',
    averageTime: '2.4h',
    successRate: '0%'
  });

  const fetchTransactions = async (page = 1, limit = 10) => {
    setLoading(true);
    setError(null);
    
    try {
      const token = Cookies.get('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}api/recharge/transactions?page=${page}&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data: ApiResponse = await response.json();
      console.log("transactions hooks player activity ", data);
      
      if (data.status === 'success') {
        setTransactions(data.data.rechargeRequests);
        setPagination(data.data.pagination);

        // Calculate stats from the data
        const pendingTransactions = data.data.rechargeRequests.filter(t => 
          t.status === 'pending' || t.status === 'assigned'
        );
        
        const totalPending = pendingTransactions.reduce((sum, t) => sum + t.amount, 0);
        const successfulTransactions = data.data.rechargeRequests.filter(t => t.status === 'completed');
        const successRate = (successfulTransactions.length / data.data.rechargeRequests.length) * 100;

        // Update stats
        setStats({
          totalPending: `$${totalPending.toLocaleString()}`,
          pendingCount: pendingTransactions.length.toString(),
          averageTime: '2.4h', // This should be calculated based on actual data
          successRate: `${successRate.toFixed(1)}%`
        });
      } else {
        throw new Error('Failed to fetch transactions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  return {
    transactions,
    loading,
    error,
    pagination,
    stats,
    fetchTransactions
  };
};

export default useTransactions;