import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

interface PaymentMethod {
  type: string;
  details: string;
}

interface AssignedRedeem {
  tagType: string;
  assignedAt: string;
  assignedBy: Record<string, any>;
}

interface VerifiedBy {
  name: string;
  email: string;
}

interface Transaction {
  transactionId: string;
  rechargeId: string;
  messengerId: string;
  amount: number;
  paymentStatus: string;
  currentStatus: string;
  paymentMethod: PaymentMethod;
  assignedRedeem: AssignedRedeem;
  verifiedBy: VerifiedBy;
  verifiedAt: string;
  createdAt: string;
  updatedAt: string;
  remarks: string;
  screenshotUrl?: string;
}

interface PaginationInfo {
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

interface ApiResponse {
  success: boolean;
  data: {
    transactions: Transaction[];
    pagination: PaginationInfo;
  };
}

interface UsePendingTransactionsProps {
  page?: number;
  limit?: number;
  paymentStatus?: string;
}

const usePendingTransactions = ({ page = 1, limit = 10, paymentStatus }: UsePendingTransactionsProps = {}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const token = Cookies.get('token');
        
        const queryParams = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          ...(paymentStatus && { paymentStatus })
        });
        
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}api/recharge/ct-pending-transactions?${queryParams}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch transactions');
        }

        const data: ApiResponse = await response.json();

        if (data.success) {
          setTransactions(data.data.transactions);
          setPagination(data.data.pagination);
        } else {
          throw new Error('Failed to fetch transactions');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [page, limit, paymentStatus]);

  const refetch = () => {
    setLoading(true);
    setError(null);
    // Re-run the effect
    const fetchTransactions = async () => {
      try {
        const token = Cookies.get('token');
        
        const queryParams = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          ...(paymentStatus && { paymentStatus })
        });
        
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}api/recharge/ct-pending-transactions?${queryParams}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch transactions');
        }

        const data: ApiResponse = await response.json();

        if (data.success) {
          setTransactions(data.data.transactions);
          setPagination(data.data.pagination);
        } else {
          throw new Error('Failed to fetch transactions');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  };

  return {
    transactions,
    pagination,
    loading,
    error,
    refetch
  };
};

export default usePendingTransactions; 