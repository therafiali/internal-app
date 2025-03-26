import { useState } from 'react';
import Cookies from 'js-cookie';

interface PaymentMethod {
  type: string;
  details: string;
}

interface AssignedRedeem {
  redeemId: string;
  amount: number;
  tagType: string;
  assignedAt: string;
  paymentMethods: {
    type: string;
    username: string;
    _id: string;
  }[];
}

interface UserInfo {
  name: string;
  email: string;
  profilePic?: string;
}

interface Timestamps {
  createdAt: string;
  updatedAt: string;
  verifiedAt: string;
  assignedAt: string;
  processedAt: string;
  completedAt: string;
  cancelledAt: string | null;
}

interface ManyChatData {
  id: string;
  name: string;
  profile_pic: string;
  custom_fields: Record<string, any>;
  [key: string]: any;
}

interface TransactionDetails {
  transactionId: string;
  rechargeId: string;
  messengerId: string;
  playerName: string;
  playerProfilePic: string;
  amount: number;
  bonusAmount: number;
  currentStatus: string;
  previousStatus: string;
  creditsLoaded: number;
  gamePlatform: string;
  gameUsername: string;
  teamCode: string;
  promotion: string;
  screenshotUrl: string;
  paymentMethod: PaymentMethod;
  assignedRedeem: AssignedRedeem;
  actionBy: UserInfo;
  verifiedBy: UserInfo;
  assignedBy: UserInfo;
  processedBy: UserInfo;
  completedBy: UserInfo;
  cancelledBy: UserInfo | null;
  timestamps: Timestamps;
  remarks: string;
  manyChatData: ManyChatData;
}

const useTransactionDetails = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionDetails, setTransactionDetails] = useState<TransactionDetails | null>(null);

  const fetchTransactionDetails = async (transactionId: string) => {
    setLoading(true);
    setError(null);

    try {
      const token = Cookies.get('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}api/recharge/transactions/detailed/${transactionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch transaction details');
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setTransactionDetails(data.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setTransactionDetails(null);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    transactionDetails,
    fetchTransactionDetails,
  };
};

export default useTransactionDetails; 