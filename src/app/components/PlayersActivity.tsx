import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminHeader, SupportHeader } from "@/app/components/Headers";
import React from "react";
import Cookies from "js-cookie";
import useTransactions from "@/hooks/useTransactions";
import useTransactionDetails from "@/hooks/useTransactionDetails";
import { useFinanceRedeem } from "@/hooks/useFinanceRedeem";
import TransactionDetailsModal from "@/app/components/TransactionDetailsModal";
import {
  Eye,
  Search,
  RefreshCw,
  Key,
  Clock,
  DollarSign,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { convertEntFormat } from '@/utils/entFormat';
import { EntType } from '@/supabase/types';
import { toast } from "react-hot-toast";

// Types for our data
interface User {
  name: string;
  email: string;
  department: string;
  role: string;
  ent_access: string[];
  user_profile_pic?: string; // Made optional since it's required by headers
}

interface PaymentMethodDetails {
  type: string;
  code: string;
}

interface PaymentMethod {
  type: string;
  username?: string;
  details?: string;
  notes?: string;
  amount?: number;
  cashtag?: string;
  reference?: string;
  timestamp?: string;
  identifier?: string;
  _id?: string;
}

interface AssignedRedeem {
  redeemId?: string;
  redeem_id?: string;
  amount: number;
  tagType: string;
  assignedAt: string;
  paymentMethods: {
    type: string;
    username: string;
    _id: string;
  }[];
  playerDetails?: {
    username: string;
    totalAmount: number;
    amountPaid: number;
    amountHold: number;
    amountAvailable: number;
    profile_pic?: string;
  };
}

interface ProcessedBy {
  name: string;
  email: string;
}

interface SupabaseTransaction {
  id: string;
  recharge_id: string | null;
  redeem_id: string | null;
  messenger_id: string;
  current_status: string;
  previous_status: string | null;
  payment_status: string;
  amount: number;
  bonus_amount: number | null;
  credits_loaded: number | null;
  game_platform: string;
  game_username: string;
  team_code: string;
  screenshot_url: string | null;
  payment_method: any;
  assigned_redeem: {
    type: string;
    amount: number;
    redeem_id: string;
    assigned_at: string;
    recharge_id: string;
    transaction: {
      status: string;
      created_at: string;
      transaction_type: string;
    };
    redeem_player?: {
      name: string;
      image: string;
      payment_method?: {
        platform: string;
        username: string;
      };
    };
    recharge_player?: {
      name: string;
      image: string;
    };
  } | null;
  action_by: string;
  created_at: string;
  updated_at: string;
  page_id: string | null;
  promotion: string | null;
  processed_by: string | null;
  manychat_data?: {
    profile?: {
      profilePic?: string;
      profile_pic?: string;
    };
  };
}

interface ResetPasswordRequest {
  id: string;
  vip_code: string;
  player_name: string;
  messenger_id: string;
  team_code: string;
  game_platform: string;
  suggested_username: string;
  new_password: string;
  status: string;
  additional_message: string;
  manychat_data: {
    profile: {
      profilePic: string;
    };
  };
  agent_name: string | null;
  agent_department: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ProcessedByRedeem {
  _id: string;
  email: string;
  name: string;
}

interface RedeemRequest {
  entryCode: string;
  initBy: string;
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
  assignments: any[];
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
  processedBy?: ProcessedByRedeem;
  remarks?: string;
  verificationRemarks?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  team_code: string;
}

interface RedeemPagination {
  total: number;
  totalPages: number;
  currentPage: number;
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

interface RechargeRequest {
  rechargeId: string;
  recharge_id: string;
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
  promotion: string | null;
  createdAt: string;
  profile_pic?: string;
  processedBy: ProcessedBy | null;
  processedAt: string;
  paymentMethod?: PaymentMethod;
  assignedRedeem: AssignedRedeem | null;
}

interface PlayersActivityProps {
  showHeader?: boolean;
  defaultActiveSection?: "transactions" | "reset-password" | "redeem" | "transfer";
  onDataUpdate?: () => void;
}

const isPaymentMethodDetails = (details: any): details is PaymentMethodDetails => {
  return typeof details === 'object' && 'type' in details && 'code' in details;
};

const getTimeElapsed = (date: string) => {
  try {
    const now = new Date();
    const lastSeen = new Date(date);

    if (isNaN(lastSeen.getTime())) {
      return "Invalid date";
    }

    if (lastSeen > now) {
      return "Scheduled";
    }

    const diff = now.getTime() - lastSeen.getTime();

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    if (seconds > 0) return `${seconds}s ago`;
    return "Just now";
  } catch (error) {
    console.error("Error calculating time elapsed:", error);
    return "Invalid date";
  }
};

const PlayersActivity: React.FC<PlayersActivityProps> = ({
  showHeader = true,
  defaultActiveSection = "transactions",
  onDataUpdate
}) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedInitiator, setSelectedInitiator] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredRechargeRequests, setFilteredRechargeRequests] = useState<RechargeRequest[]>([]);
  const [activeSection, setActiveSection] = useState<"transactions" | "reset-password" | "redeem" | "transfer">(defaultActiveSection);
  const [resetRequests, setResetRequests] = useState<ResetPasswordRequest[]>([]);
  const [transferRequests, setTransferRequests] = useState<TransferRequest[]>([]);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const { logActivity } = useActivityLogger();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rechargeRequests, setRechargeRequests] = useState<RechargeRequest[]>([]);
  const [pagination, setPagination] = useState<{
    total: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  } | null>(null);

  const [selectedRechargeRequest, setSelectedRechargeRequest] = useState<RechargeRequest | null>(null);
  const [redeemRequests, setRedeemRequests] = useState<RedeemRequest[]>([]);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemPagination, setRedeemPagination] = useState<RedeemPagination>();
  const [selectedRedeemRequest, setSelectedRedeemRequest] = useState<RedeemRequest | null>(null);

  // Rest of the component code remains the same, just copy from the page.tsx file
  // ... (copy all the functions and JSX from the original file)

  // Add this at the end of the component:
  if (!user) return null;

  return (
    <div className={showHeader ? "flex min-h-screen bg-[#0a0a0a]" : ""}>
      {showHeader && (
        user.department === "Support" ? (
          <SupportHeader user={user} />
        ) : (
          <AdminHeader user={user} />
        )
      )}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={showHeader ? "flex-1 pl-64" : "flex-1"}
      >
        {/* Rest of the JSX remains the same */}
        {/* ... copy the rest of the JSX from the original file ... */}
      </motion.div>
    </div>
  );
};

export default PlayersActivity; 