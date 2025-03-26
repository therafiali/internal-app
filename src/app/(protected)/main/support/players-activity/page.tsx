"use client";
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
import { convertEntFormat } from "@/utils/entFormat";
import { EntType } from "@/supabase/types";
import { toast } from "react-hot-toast";
import Image from "next/image";
import ChimeIcon from "@/assets/icons/chime.svg";
import VenmoIcon from "@/assets/icons/venmo.svg";
import CashAppIcon from "@/assets/icons/cashapp.svg";
import { PlayerImage } from "@/app/components/recharge/PlayerImage";

// Types for our data
interface User {
  name: string;
  email: string;
  department: string;
  role: string;
  ent_access: EntType[];
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
  transaction?: {
    status: string;
    created_at: string;
    transaction_type: string;
  };
}

interface ProcessedBy {
  name: string;
  email: string;
}

interface SupabaseTransaction {
  id: string;
  recharge_id: string | null;
  init_by: string;
  redeem_id: string | null;
  messenger_id: string;
  deposit_status: string | null;
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
      fullName?: string;
    };
  };
  vip_code: string | null;
  assigned_ct?: {
    c_id: string;
    type: string;
    amount: number;
    cashtag: string;
    assigned_at: string;
    assigned_by: string;
    company_tag: string;
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
  deposit_status?: string;
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
  vip_code: string | null;
  screenshot_url?: string | null;
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
  init_by: "agent" | "player";
  from_platform: string;
  from_username: string;
  to_platform: string;
  to_username: string;
  amount: number;
  status: "pending" | "completed" | "rejected";
  processed_by: string | null;
  processed_at: string | null;
  agent_name: string;
  agent_department: string;
  notes: string;
  manychat_data: any;
  processing_state: {
    status: "idle" | "in_progress";
    processed_by: string | null;
    modal_type:
      | "process_modal"
      | "reject_modal"
      | "approve_modal"
      | "verify_modal"
      | "payment_modal"
      | "none";
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
  deposit_status?: string;
  screenshotUrl?: string;
  teamCode: string;
  promotion: string | null;
  createdAt: string;
  profile_pic?: string;
  processedBy: ProcessedBy | null;
  processedAt: string;
  paymentMethod?: PaymentMethod;
  assignedRedeem: AssignedRedeem | null;
  vip_code: string | null;
  assigned_ct?: {
    c_id: string;
    type: string;
    amount: number;
    cashtag: string;
    assigned_at: string;
    assigned_by: string;
    company_tag: string;
  };
}

const isPaymentMethodDetails = (
  details: any
): details is PaymentMethodDetails => {
  return typeof details === "object" && "type" in details && "code" in details;
};

const getTimeElapsed = (date: string) => {
  try {
    const now = new Date();
    const lastSeen = new Date(date);

    // Check if the date is invalid
    if (isNaN(lastSeen.getTime())) {
      return "Invalid date";
    }

    // If the date is in the future, return "Scheduled"
    if (lastSeen > now) {
      return "Scheduled";
    }

    const diff = now.getTime() - lastSeen.getTime();

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d `;

    // Format time with h-m-s
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s `;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s `;
    }
    if (seconds > 0) {
      return `${seconds}s `;
    }
    return "Just now";
  } catch (error) {
    console.error("Error calculating time elapsed:", error);
    return "Invalid date";
  }
};

const TransactionPage = () => {
  // Create a memoized time display component inside the main component
  const TimeDisplay = React.memo(({ date }: { date: string }) => {
    const [, forceUpdate] = useState(0);

    useEffect(() => {
      const timer = setInterval(() => {
        forceUpdate((prev) => prev + 1);
      }, 1000);

      return () => clearInterval(timer);
    }, []);

    return <span className="text-gray-300">{getTimeElapsed(date)}</span>;
  });

  const getEntColor = (ent: string) => {
    const colors: { [key: string]: string } = {
      "ENT-1": "bg-orange-500/10 text-orange-500",
      "ENT-2": "bg-blue-500/10 text-blue-500",
      "ENT-3": "bg-emerald-500/10 text-emerald-500",
    };
    return colors[ent] || "bg-gray-500/10 text-gray-500"; // Default color if ENT not found
  };

  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedInitiator, setSelectedInitiator] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredRechargeRequests, setFilteredRechargeRequests] = useState<
    RechargeRequest[]
  >([]);
  const [activeSection, setActiveSection] = useState<
    "transactions" | "reset-password" | "redeem" | "transfer"
  >("transactions");
  const [resetRequests, setResetRequests] = useState<ResetPasswordRequest[]>(
    []
  );
  const [transferRequests, setTransferRequests] = useState<TransferRequest[]>(
    []
  );
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const { logActivity } = useActivityLogger();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rechargeRequests, setRechargeRequests] = useState<RechargeRequest[]>(
    []
  );
  const [pagination, setPagination] = useState<{
    total: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  } | null>(null);

  const [selectedRechargeRequest, setSelectedRechargeRequest] =
    useState<RechargeRequest | null>(null);
  const [redeemRequests, setRedeemRequests] = useState<RedeemRequest[]>([]);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemPagination, setRedeemPagination] = useState<RedeemPagination>();
  const [selectedRedeemRequest, setSelectedRedeemRequest] =
    useState<RedeemRequest | null>(null);
  const [selectedEnt, setSelectedEnt] = useState<string | null>(null);

  // Add this state for filtered redeem requests
  const [filteredRedeemRequests, setFilteredRedeemRequests] = useState<
    RedeemRequest[]
  >([]);

  // Get user's ENT access with proper type conversion
  const userEntAccess = user?.ent_access
    ? convertEntFormat.getUserEntAccess(user)
    : [];

  // Effect to set initial ENT selection
  useEffect(() => {
    if (!selectedEnt) {
      setSelectedEnt("ALL");
    }
  }, [userEntAccess]);

  // Update the useEffect for ENT filtering to handle both recharge and redeem requests
  useEffect(() => {
    if (rechargeRequests.length > 0) {
      const filtered = rechargeRequests.filter((request) => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
          !searchQuery ||
          request.rechargeId.toLowerCase().includes(searchLower) ||
          request.playerName.toLowerCase().includes(searchLower) ||
          request.gamePlatform.toLowerCase().includes(searchLower) ||
          (request.promotion &&
            request.promotion.toLowerCase().includes(searchLower)) ||
          (request.assignedRedeem?.redeemId &&
            request.assignedRedeem.redeemId
              .toLowerCase()
              .includes(searchLower)) ||
          (request.assignedRedeem?.playerDetails?.username &&
            request.assignedRedeem.playerDetails.username
              .toLowerCase()
              .includes(searchLower)) ||
          (request.teamCode &&
            request.teamCode.toLowerCase().includes(searchLower));

        const matchesEnt =
          selectedEnt === "ALL" ||
          !selectedEnt ||
          request.teamCode === selectedEnt;

        return matchesSearch && matchesEnt;
      });
      setFilteredRechargeRequests(filtered);
    }

    // Add filtering for redeem requests
    if (redeemRequests.length > 0) {
      const filteredRedeem = redeemRequests.filter((request) => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
          !searchQuery ||
          request.redeemId.toLowerCase().includes(searchLower) ||
          request.username.toLowerCase().includes(searchLower) ||
          request.gamePlatform.toLowerCase().includes(searchLower) ||
          (request.team_code &&
            request.team_code.toLowerCase().includes(searchLower));

        const matchesEnt =
          selectedEnt === "ALL" ||
          !selectedEnt ||
          request.team_code === selectedEnt;

        return matchesSearch && matchesEnt;
      });
      setFilteredRedeemRequests(filteredRedeem);

      // Update pagination for filtered results
      if (redeemPagination) {
        setRedeemPagination({
          ...redeemPagination,
          total: filteredRedeem.length,
          totalPages: Math.ceil(filteredRedeem.length / 10),
        });
      }
    }
  }, [searchQuery, rechargeRequests, redeemRequests, selectedEnt]);

  // Update the validateEntAccess function to use convertEntFormat
  const validateEntAccess = (teamCode: string | undefined) => {
    if (!teamCode || !user?.ent_access) return false;
    return convertEntFormat.hasEntAccess(user, teamCode);
  };

  const fetchRechargeRequests = async () => {
    try {
      setLoading(true);
      const token = Cookies.get("token");

      // Fetch from Supabase
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      if (!transactions) {
        throw new Error("No transactions data received");
      }

      console.log("Raw transactions:", transactions);
      console.log("Current user ENT access:", user);

      // Transform and separate recharge and redeem transactions
      const transformedRequests: RechargeRequest[] = transactions
        .filter((transaction) => {
          // Filter by ENT access first
          const hasEntAccess = validateEntAccess(transaction.team_code);
          console.log(
            "Transaction team_code:",
            transaction.team_code,
            "Has access:",
            hasEntAccess
          );
          const isRecharge = transaction.recharge_id && !transaction.redeem_id;
          return hasEntAccess && isRecharge;
        })
        .map((transaction: SupabaseTransaction) => {
          // Handle payment_method which can be either array or object
          let transformedPaymentMethod;
          if (Array.isArray(transaction.payment_method)) {
            transformedPaymentMethod = transaction.payment_method[0] || null;
          } else if (typeof transaction.payment_method === "string") {
            try {
              const parsed = JSON.parse(transaction.payment_method);
              transformedPaymentMethod = Array.isArray(parsed)
                ? parsed[0]
                : parsed;
            } catch (e) {
              transformedPaymentMethod = null;
            }
          } else if (
            transaction.payment_method &&
            typeof transaction.payment_method === "object"
          ) {
            transformedPaymentMethod = transaction.payment_method;
          } else {
            transformedPaymentMethod = null;
          }

          return {
            rechargeId: transaction.id,
            recharge_id: transaction.recharge_id || transaction.id,
            playerName:
              transaction.manychat_data?.profile?.fullName ||
              transaction.game_username,
            manyChatName: transaction.game_username,
            messengerId: transaction.messenger_id,
            vipCode: transaction.vip_code,
            initBy: transaction.init_by || "player",
            gamePlatform: transaction.game_platform,
            gameUsername: transaction.game_username,
            amount: transaction.amount,
            bonusAmount: transaction.bonus_amount || 0,
            status: transaction.current_status,
            deposit_status: transaction.deposit_status || undefined,
            screenshotUrl: transaction.screenshot_url || undefined,
            teamCode: transaction.team_code,
            promotion: transaction.promotion,
            createdAt: transaction.created_at,
            profile_pic:
              transaction.manychat_data?.profile?.profilePic ||
              transaction.manychat_data?.profile?.profile_pic,
            processedBy: transaction.processed_by
              ? {
                  name: "Unknown",
                  email: "unknown@example.com",
                }
              : null,
            processedAt: transaction.updated_at,
            paymentMethod: transformedPaymentMethod,
            assignedRedeem: transaction.assigned_redeem
              ? typeof transaction.assigned_redeem === "string"
                ? JSON.parse(transaction.assigned_redeem)
                : {
                    ...transaction.assigned_redeem,
                    playerDetails: transaction.assigned_redeem?.redeem_player
                      ? {
                          username:
                            transaction.assigned_redeem.redeem_player.name,
                          profile_pic:
                            transaction.assigned_redeem.redeem_player.image,
                          totalAmount: 0,
                          amountPaid: 0,
                          amountHold: 0,
                          amountAvailable: 0,
                        }
                      : undefined,
                  }
              : null,
            vip_code: transaction.vip_code,
            assigned_ct: transaction.assigned_ct,
          };
        });

      console.log("Transformed recharge requests:", transformedRequests);

      // Transform redeem transactions with ENT access check
      const transformedRedeemRequests: RedeemRequest[] = transactions
        .filter((transaction) => {
          // Filter by ENT access first
          const hasEntAccess = validateEntAccess(transaction.team_code);
          const isRedeem = transaction.redeem_id && !transaction.recharge_id;
          return hasEntAccess && isRedeem;
        })
        .map((transaction: SupabaseTransaction) => {
          // Handle payment_method which can be either array or object
          let paymentMethods = [];
          if (Array.isArray(transaction.payment_method)) {
            paymentMethods = transaction.payment_method;
          } else if (typeof transaction.payment_method === "string") {
            try {
              const parsed = JSON.parse(transaction.payment_method);
              paymentMethods = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
              paymentMethods = [];
            }
          } else if (transaction.payment_method) {
            paymentMethods = [transaction.payment_method];
          }

          return {
            entryCode: transaction.id,
            initBy: transaction.init_by || "player",
            username: transaction.game_username,
            gamePlatform: transaction.game_platform,
            totalAmount: transaction.amount,
            amountPaid: transaction.credits_loaded || 0,
            amountHold: 0,
            paymentMethods: paymentMethods,
            status: transaction.current_status,
            deposit_status: transaction.deposit_status || undefined,
            redeemId: transaction.redeem_id || transaction.id,
            requestedAt: transaction.created_at,
            amountAvailable: transaction.amount,
            assignments: [],
            createdAt: transaction.created_at,
            updatedAt: transaction.updated_at,
            processedAt: transaction.updated_at,
            processedBy: transaction.processed_by
              ? {
                  _id: transaction.processed_by,
                  email: "unknown@example.com",
                  name: "Unknown",
                }
              : undefined,
            team_code: transaction.team_code,
            vip_code: transaction.vip_code,
            screenshot_url: transaction.screenshot_url,
          };
        });

      console.log("Transformed redeem requests:", transformedRedeemRequests);

      setRechargeRequests(transformedRequests);
      setRedeemRequests(transformedRedeemRequests);
      setFilteredRechargeRequests(transformedRequests);
      setPagination({
        total: transformedRequests.length,
        totalPages: Math.ceil(transformedRequests.length / 10),
        currentPage: currentPage,
        limit: 10,
      });
      setRedeemPagination({
        total: transformedRedeemRequests.length,
        totalPages: Math.ceil(transformedRedeemRequests.length / 10),
        currentPage: currentPage,
      });
    } catch (err) {
      console.error("Error fetching requests:", err);
      setError(
        typeof err === "string"
          ? err
          : err instanceof Error
          ? err.message
          : "An error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRechargeRequests();
    }
  }, [user]);

  useEffect(() => {
    const token = Cookies.get("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (
        parsedUser.department !== "Support" &&
        parsedUser.department !== "Admin"
      ) {
        router.push("/login");
        return;
      }
      setUser(parsedUser);
    } catch (error) {
      console.error("Error parsing user data:", error);
      router.push("/login");
    }
  }, [router]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
  };

  const handleViewDetails = async (rechargeId: string) => {
    if (!user) return;
    const request = rechargeRequests.find((r) => r.rechargeId === rechargeId);
    if (request) {
      // Validate ENT access before showing details
      if (!validateEntAccess(request.teamCode)) {
        toast.error("You do not have access to view details for this ENT");
        return;
      }
      setSelectedRechargeRequest(request);
      setIsModalOpen(true);
    }
  };

  const handleViewRedeemDetails = async (redeemId: string) => {
    if (!user) return;
    const request = redeemRequests.find((r) => r.redeemId === redeemId);
    if (request) {
      // Validate ENT access before showing details
      if (!validateEntAccess(request.team_code)) {
        toast.error("You do not have access to view details for this ENT");
        return;
      }
      setSelectedRedeemRequest(request);
      setIsRedeemModalOpen(true);
    }
  };

  console.log("transactions", rechargeRequests);

  // Fetch reset password requests
  const fetchResetRequests = async () => {
    try {
      setResetPasswordLoading(true);

      const { data: resetPasswordRequests, error } = await supabase
        .from("reset_password_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      if (!resetPasswordRequests) {
        throw new Error("No reset password requests data received");
      }

      // Filter reset password requests by ENT access
      const filteredResetRequests = resetPasswordRequests.filter((request) =>
        validateEntAccess(request.team_code)
      );

      setResetRequests(filteredResetRequests);
    } catch (error) {
      console.error("Error fetching reset password requests:", error);
    } finally {
      setResetPasswordLoading(false);
    }
  };

  // Fetch transfer requests
  const fetchTransferRequests = async () => {
    try {
      setTransferLoading(true);

      const { data: transferData, error } = await supabase
        .from("transfer_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      if (!transferData) {
        throw new Error("No transfer requests data received");
      }

      // Filter transfer requests by ENT access
      const filteredTransferRequests = transferData.filter((request) =>
        validateEntAccess(request.team_code)
      );

      setTransferRequests(filteredTransferRequests);
    } catch (error) {
      console.error("Error fetching transfer requests:", error);
    } finally {
      setTransferLoading(false);
    }
  };

  // Fetch redeem requests
  const fetchRedeemRequests = async () => {
    try {
      setRedeemLoading(true);

      const { data: redeemData, error } = await supabase
        .from("redeem_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      if (!redeemData) {
        throw new Error("No redeem requests data received");
      }

      // Filter redeem requests by ENT access
      const filteredRedeemRequests = redeemData.filter((request) =>
        validateEntAccess(request.team_code)
      );

      setRedeemRequests(filteredRedeemRequests);
    } catch (error) {
      console.error("Error fetching redeem requests:", error);
      setRedeemError(
        typeof error === "string"
          ? error
          : error instanceof Error
          ? error.message
          : "An error occurred"
      );
    } finally {
      setRedeemLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection === "reset-password") {
      fetchResetRequests();
    } else if (activeSection === "transfer") {
      fetchTransferRequests();
    }
  }, [activeSection]);

  // Update the getPaymentMethodIcon function to return StaticImageData
  const getPaymentMethodIcon = (type: string): typeof ChimeIcon | null => {
    const icons: { [key: string]: typeof ChimeIcon } = {
      chime: ChimeIcon,
      venmo: VenmoIcon,
      cashapp: CashAppIcon,
    };
    return icons[type.toLowerCase()] || null;
  };

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      {/* {user.department === "Support" ? (
        <SupportHeader user={user} />
      ) : (
        <AdminHeader user={user} />
      )} */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1 pl-64"
      >
        <main className="p-6">
          <div className="space-y-6">
            {/* Title Section */}
            <div className="flex items-center justify-between">
              <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                Player Activity
              </h1>
              <button
                onClick={() => {
                  if (activeSection === "transactions") fetchRechargeRequests();
                  else if (activeSection === "reset-password")
                    fetchResetRequests();
                  else if (activeSection === "redeem") fetchRedeemRequests();
                  else if (activeSection === "transfer")
                    fetchTransferRequests();
                }}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <RefreshCw className="w-5 h-5 text-emerald-500" />
              </button>
            </div>

            {/* Stats Section */}
            {/* <div className="mb-6 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-400">
                  Completed: {filteredRechargeRequests.filter(r => r.status === 'completed').length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-sm text-gray-400">
                  Pending: {filteredRechargeRequests.filter(r => r.status === 'pending').length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                <span className="text-sm text-gray-400">
                  Total: {filteredRechargeRequests.length}
                </span>
              </div>
            </div> */}

            {/* Toggle Switch */}
            <div>
              <div className="bg-[#1a1a1a] p-0.5 rounded flex items-center relative w-[560px]">
                <motion.div
                  className="absolute h-full rounded bg-[#00B074] z-0"
                  initial={false}
                  animate={{
                    width: "25%",
                    x:
                      activeSection === "transactions"
                        ? "0"
                        : activeSection === "redeem"
                        ? "140px"
                        : activeSection === "reset-password"
                        ? "280px"
                        : "420px",
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
                <button
                  onClick={() => setActiveSection("transactions")}
                  className={`relative py-2.5 text-sm font-medium z-10 flex-1 transition-colors ${
                    activeSection === "transactions"
                      ? "text-white"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  Recharge
                </button>
                <button
                  onClick={() => setActiveSection("redeem")}
                  className={`relative py-2.5 text-sm font-medium z-10 flex-1 transition-colors ${
                    activeSection === "redeem"
                      ? "text-white"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  Redeem
                </button>
                <button
                  onClick={() => setActiveSection("reset-password")}
                  className={`relative py-2.5 text-sm font-medium z-10 flex-1 transition-colors flex items-center justify-center gap-2 ${
                    activeSection === "reset-password"
                      ? "text-white"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  Reset Password
                  {resetRequests.filter(
                    (r) => r.status.toLowerCase() === "pending"
                  ).length > 0 && (
                    <span className="bg-red-500 text-white px-1.5 py-0.5 rounded-full text-xs min-w-[20px]">
                      {
                        resetRequests.filter(
                          (r) => r.status.toLowerCase() === "pending"
                        ).length
                      }
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveSection("transfer")}
                  className={`relative py-2.5 text-sm font-medium z-10 flex-1 transition-colors flex items-center justify-center gap-2 ${
                    activeSection === "transfer"
                      ? "text-white"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  Transfer
                  {transferRequests.filter((r) => r.status === "pending")
                    .length > 0 && (
                    <span className="bg-red-500 text-white px-1.5 py-0.5 rounded-full text-xs min-w-[20px]">
                      {
                        transferRequests.filter((r) => r.status === "pending")
                          .length
                      }
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Search Bar */}
            {activeSection === "transactions" && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearch}
                  placeholder="Search by recharge ID, player name, VIP code, platform..."
                  className="w-full bg-[#1a1a1a] text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/50 placeholder-gray-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* ENT Tabs */}
            {userEntAccess.length > 0 && (
              <div className="mb-6">
                <div className="border-b border-gray-800">
                  <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                      onClick={() => setSelectedEnt("ALL")}
                      className={`
                        whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                        ${
                          selectedEnt === "ALL"
                            ? "border-emerald-500 text-emerald-500"
                            : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
                        }
                      `}
                    >
                      ALL
                    </button>
                    {userEntAccess.map((ent) => (
                      <button
                        key={ent}
                        onClick={() => setSelectedEnt(ent)}
                        className={`
                          whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                          ${
                            selectedEnt === ent
                              ? "border-blue-500 text-blue-500"
                              : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
                          }
                        `}
                      >
                        {ent}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            )}

            {/* Table */}
            {activeSection === "transactions" && (
              <div className="bg-[#1a1a1a] rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5 bg-black/20 text-xs text-gray-400">
                        <th className="text-center px-4 py-3 font-medium uppercase">
                          Init By
                        </th>
                        <th className="text-center px-4 py-3 font-medium uppercase">
                          Team
                        </th>
                        <th className="text-center px-4 py-3 font-medium uppercase">
                          Depositor
                        </th>
                        <th className="text-center px-4 py-3 font-medium uppercase">
                          Recharge ID
                        </th>
                        <th className="text-center px-4 py-3 font-medium uppercase">
                          Platform
                        </th>
                        <th className="text-center px-4 py-3 font-medium uppercase">
                          Amount
                        </th>
                        <th className="text-center px-4 py-3 font-medium uppercase">
                          Promo
                        </th>
                        <th className="text-center px-4 py-3 font-medium uppercase">
                          Tag Type
                        </th>
                        <th className="text-center px-4 py-3 font-medium uppercase">
                          Target
                        </th>
                        <th className="text-center px-4 py-3 font-medium uppercase">
                          Target ID
                        </th>
                        <th className="text-center px-4 py-3 font-medium uppercase">
                          Duration
                        </th>
                        <th className="text-center px-4 py-3 font-medium uppercase">
                          Deposit Status
                        </th>
                        <th className="text-center px-4 py-3 font-medium uppercase">
                          Load Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {loading ? (
                        <tr>
                          <td
                            colSpan={15}
                            className="text-center py-8 text-gray-500"
                          >
                            Loading recharge requests...
                          </td>
                        </tr>
                      ) : error ? (
                        <tr>
                          <td
                            colSpan={15}
                            className="text-center py-8 text-red-500"
                          >
                            {error}
                          </td>
                        </tr>
                      ) : filteredRechargeRequests.length === 0 ? (
                        <tr>
                          <td
                            colSpan={15}
                            className="text-center py-8 text-gray-500"
                          >
                            {searchQuery
                              ? "No matching results found"
                              : "No recharge requests found"}
                          </td>
                        </tr>
                      ) : (
                        filteredRechargeRequests.map((request) => (
                          <tr
                            key={request.rechargeId}
                            onClick={() =>
                              handleViewDetails(request.rechargeId)
                            }
                            className="hover:bg-white/5 transition-colors cursor-pointer"
                          >
                            <td className="px-4 py-3 text-sm text-gray-300 capitalize text-center">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  request.initBy === "player"
                                    ? "bg-blue-500/10 text-blue-500"
                                    : "bg-purple-500/10 text-purple-500"
                                }`}
                              >
                                {request.initBy}
                              </span>
                            </td>
                            <td className="px-2 py-3 text-center">
                              <span
                                className={`${getEntColor(
                                  request.teamCode
                                )} px-2 py-1 rounded text-xs`}
                              >
                                {request.teamCode}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-300">
                              <div className="flex flex-1 items-center gap-2">
                                {request.profile_pic && (
                                  <img
                                    src={request.profile_pic}
                                    alt={request.playerName}
                                    width={24}
                                    height={24}
                                    className="w-9 h-9 rounded-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.src =
                                        "/default-avatar.png"; // Fallback image
                                    }}
                                  />
                                )}
                                <div className="flex flex-1 flex-col gap-1">
                                  <span className="text-sm text-gray-300">
                                    {request.playerName}
                                  </span>
                                  <span className="text-xs text-gray-300">
                                    {request.vip_code}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-300 text-center">
                              {request.recharge_id}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-300 flex flex-col items-center justify-center gap-1">
                              <span className="text-sm">
                                {request.gameUsername}
                              </span>
                              <span className="text-xs uppercase">
                                {request.gamePlatform}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-300 text-center">
                              ${request.amount}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-300 text-center">
                              ${request.bonusAmount}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-300 text-center">
                              {request.status === "pending" ? (
                                <span className="bg-gray-500/10 text-gray-500 px-2 py-1 rounded text-xs">
                                  -
                                </span>
                              ) : request.assigned_ct ? (
                                <span className="bg-emerald-400/10 text-emerald-300 px-2 py-1 rounded text-xs font-medium">
                                  CT
                                </span>
                              ) : request.assignedRedeem ? (
                                <span className="bg-blue-500/10 text-blue-500 px-2 py-1 rounded text-xs font-medium">
                                  PT
                                </span>
                              ) : (
                                <span className="bg-gray-500/10 text-gray-500 px-2 py-1 rounded text-xs">
                                  -
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-300 text-center">
                              {request.status === "pending" ? (
                                "-"
                              ) : request.assigned_ct ? (
                                <div className="flex items-center justify-center gap-2">
                                  <span className="text-gray-300">
                                    {request.assigned_ct.company_tag}
                                  </span>
                                </div>
                              ) : request.assignedRedeem ? (
                                <div className="flex items-center justify-center gap-2">
                                  {request.assignedRedeem.redeem_player
                                    ?.image && (
                                    <PlayerImage
                                      id={request.assignedRedeem.redeem_id}
                                      width={35}
                                      height={35}
                                    />
                                  )}
                                  <div className="flex flex-col items-center">
                                    <span className="text-gray-300">
                                      {
                                        request.assignedRedeem.redeem_player
                                          ?.name
                                      }
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-300  ">
                              <div className="flex items-center justify-center gap-2 h-full">
                                {request.assignedRedeem ? (
                                  <div className="flex items-center justify-center gap-2 h-full">
                                    {request.assignedRedeem.redeem_player
                                      ?.payment_method?.platform && (
                                      <div className="flex items-center">
                                        {getPaymentMethodIcon(
                                          request.assignedRedeem.redeem_player
                                            .payment_method.platform
                                        ) ? (
                                          <Image
                                            src={getPaymentMethodIcon(
                                              request.assignedRedeem
                                                .redeem_player.payment_method
                                                .platform
                                            )}
                                            alt={
                                              request.assignedRedeem
                                                .redeem_player.payment_method
                                                .platform
                                            }
                                            width={30}
                                            height={30}
                                            className="rounded"
                                          />
                                        ) : (
                                          <span className="capitalize text-xs"></span>
                                        )}
                                        {request.assignedRedeem.redeem_player
                                          .payment_method.username && (
                                          <span className="text-gray-500 text-xs ml-1"></span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  (request.paymentMethod && (
                                    <div className="flex items-center gap-2">
                                      {getPaymentMethodIcon(
                                        request.paymentMethod.type
                                      ) ? (
                                        <Image
                                          src={getPaymentMethodIcon(
                                            request.paymentMethod.type
                                          )}
                                          alt={request.paymentMethod.type}
                                          width={30}
                                          height={30}
                                          className="rounded"
                                        />
                                      ) : (
                                        <span className="capitalize text-xs"></span>
                                      )}
                                      {request.paymentMethod.username && (
                                        <span className="text-gray-500 text-xs"></span>
                                      )}
                                    </div>
                                  )) ||
                                  "-"
                                )}
                                {request.status === "pending"
                                  ? "-"
                                  : request.assigned_ct
                                  ? request.assigned_ct.cashtag
                                  : request.assignedRedeem
                                  ? request.assignedRedeem.redeem_player
                                      ?.payment_method?.username || "-"
                                  : "-"}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              <TimeDisplay date={request.createdAt} />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                                  request.deposit_status === "completed"
                                    ? "bg-green-500/10 text-green-500"
                                    : request.deposit_status === "pending"
                                    ? "bg-yellow-500/10 text-yellow-500"
                                    : request.deposit_status === "disputed"
                                    ? "bg-red-500/10 text-red-500"
                                    : "bg-gray-500/10 text-gray-500"
                                }`}
                              >
                                {request.deposit_status || "-"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium uppercase ${
                                  request.status === "completed"
                                    ? "bg-green-500/10 text-green-500"
                                    : request.status === "pending"
                                    ? "bg-yellow-500/10 text-yellow-500"
                                    : request.status === "assigned"
                                    ? "bg-blue-500/10 text-blue-500"
                                    : request.status === "assigned_and_hold"
                                    ? "bg-emerald-500/10 text-emerald-500"
                                    : request.status === "cancelled"
                                    ? "bg-red-500/10 text-red-500"
                                    : request.status === "return"
                                    ? "bg-teal-500/10 text-teal-500"
                                    : "bg-gray-500/10 text-gray-500"
                                }`}
                              >
                                {request.status === "assigned_and_hold"
                                  ? "Screenshot Submitted"
                                  : request.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Reset Password Section */}
            {activeSection === "reset-password" && (
              <div className="bg-[#1a1a1a] rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-white/5 bg-black/20">
                        <TableHead className="text-left">Player Name</TableHead>
                        <TableHead className="text-left">Team</TableHead>
                        <TableHead className="text-left">Platform</TableHead>
                        <TableHead className="text-left">Username</TableHead>
                        <TableHead className="text-left">Status</TableHead>
                        <TableHead className="text-left">
                          Processed By
                        </TableHead>
                        <TableHead className="text-left">Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resetPasswordLoading ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center py-8 text-gray-500"
                          >
                            Loading reset password requests...
                          </TableCell>
                        </TableRow>
                      ) : resetRequests.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center py-8 text-gray-500"
                          >
                            No reset password requests found
                          </TableCell>
                        </TableRow>
                      ) : (
                        resetRequests.map((request) => (
                          <TableRow
                            key={request.id}
                            className="hover:bg-white/5"
                          >
                            <TableCell className="text-sm text-gray-300">
                              <div className="flex items-center gap-2">
                                {request.manychat_data?.profile?.profilePic && (
                                  <img
                                    src={
                                      request.manychat_data.profile.profilePic
                                    }
                                    alt={request.player_name}
                                    className="w-6 h-6 rounded-full object-cover"
                                  />
                                )}
                                {request.player_name}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              <Badge
                                variant="outline"
                                className={`${getEntColor(
                                  request.team_code
                                )} border-0`}
                              >
                                {request.team_code}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-300">
                              {request.game_platform}
                            </TableCell>
                            <TableCell className="text-sm text-gray-300">
                              {request.suggested_username}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={`${
                                  request.status.toLowerCase() === "completed"
                                    ? "bg-green-500/10 text-green-500"
                                    : request.status.toLowerCase() === "pending"
                                    ? "bg-yellow-500/10 text-yellow-500"
                                    : "bg-red-500/10 text-red-500"
                                }`}
                              >
                                {request.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-300">
                              {request.processed_by || "-"}
                            </TableCell>
                            <TableCell className="text-sm text-gray-300">
                              <TimeDisplay date={request.created_at} />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Transfer Section */}
            {activeSection === "transfer" && (
              <div className="bg-[#1a1a1a] rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-white/5 bg-black/20">
                        <TableHead className="text-left">Player Name</TableHead>
                        <TableHead className="text-left">Team</TableHead>
                        <TableHead className="text-left">
                          From Platform
                        </TableHead>
                        <TableHead className="text-left">To Platform</TableHead>
                        <TableHead className="text-left">Amount</TableHead>
                        <TableHead className="text-left">Status</TableHead>
                        <TableHead className="text-left">
                          Processed By
                        </TableHead>
                        <TableHead className="text-left">Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transferLoading ? (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="text-center py-8 text-gray-500"
                          >
                            Loading transfer requests...
                          </TableCell>
                        </TableRow>
                      ) : transferRequests.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="text-center py-8 text-gray-500"
                          >
                            No transfer requests found
                          </TableCell>
                        </TableRow>
                      ) : (
                        transferRequests.map((request) => (
                          <TableRow
                            key={request.id}
                            className="hover:bg-white/5"
                          >
                            <TableCell className="text-sm text-gray-300">
                              <div className="flex items-center gap-2">
                                {request.player_image && (
                                  <img
                                    src={request.player_image}
                                    alt={request.player_name}
                                    className="w-6 h-6 rounded-full object-cover"
                                  />
                                )}
                                {request.player_name}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              <Badge
                                variant="outline"
                                className={`${getEntColor(
                                  request.team_code
                                )} border-0`}
                              >
                                {request.team_code}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-300">
                              <div className="flex items-center gap-1">
                                <span>{request.from_platform}</span>
                                <span className="text-gray-500">
                                  ({request.from_username})
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-300">
                              <div className="flex items-center gap-1">
                                <span>{request.to_platform}</span>
                                <span className="text-gray-500">
                                  ({request.to_username})
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-emerald-500">
                              ${request.amount}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={`${
                                  request.status === "completed"
                                    ? "bg-green-500/10 text-green-500"
                                    : request.status === "pending"
                                    ? "bg-yellow-500/10 text-yellow-500"
                                    : "bg-red-500/10 text-red-500"
                                }`}
                              >
                                {request.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-300">
                              {request.processed_by || "-"}
                            </TableCell>
                            <TableCell className="text-sm text-gray-300">
                              <TimeDisplay date={request.created_at} />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Redeem Section */}
            {activeSection === "redeem" && (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearch}
                    placeholder="Search by redeem ID, player name, or platform..."
                    className="w-full bg-[#1a1a1a] text-white pl-10 pr-4 py-3 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500/50 placeholder-gray-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="bg-[#1a1a1a] rounded overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/5 bg-black/20 text-xs text-gray-400">
                          <th className="text-center px-4 py-2.5 font-medium">
                            Player
                          </th>
                          <th className="text-center px-4 py-2.5 font-medium">
                            Team
                          </th>
                          <th className="text-center px-4 py-2.5 font-medium">
                            Redeem ID
                          </th>
                          <th className="text-center px-4 py-2.5 font-medium">
                            Init By
                          </th>
                          <th className="text-center px-4 py-2.5 font-medium">
                            Platform
                          </th>
                          <th className="text-center px-4 py-2.5 font-medium">
                            Total
                          </th>
                          <th className="text-center px-4 py-2.5 font-medium">
                            Paid
                          </th>
                          <th className="text-center px-4 py-2.5 font-medium">
                            Remaining
                          </th>
                          <th className="text-center px-4 py-2.5 font-medium">
                            Status
                          </th>
                          <th className="text-center px-4 py-2.5 font-medium">
                            Mode
                          </th>
                          <th className="text-center px-4 py-2.5 font-medium">
                            Processed By
                          </th>
                          <th className="text-center px-4 py-2.5 font-medium">
                            Duration
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {redeemLoading ? (
                          <tr>
                            <td
                              colSpan={12}
                              className="text-center py-8 text-gray-500"
                            >
                              Loading redeem requests...
                            </td>
                          </tr>
                        ) : redeemError ? (
                          <tr>
                            <td
                              colSpan={12}
                              className="text-center py-8 text-red-500"
                            >
                              {redeemError}
                            </td>
                          </tr>
                        ) : filteredRedeemRequests.length === 0 ? (
                          <tr>
                            <td
                              colSpan={12}
                              className="text-center py-8 text-gray-500"
                            >
                              No redeem requests found
                            </td>
                          </tr>
                        ) : (
                          filteredRedeemRequests.map((request) => (
                            <tr
                              key={`${request.redeemId}-${request.entryCode}`}
                              onClick={() =>
                                handleViewRedeemDetails(request.redeemId)
                              }
                              className="hover:bg-white/5 transition-colors cursor-pointer"
                            >
                              <td className="px-4 py-3 text-sm text-gray-300">
                                <div className="flex flex-1 items-center gap-2 justify-center">
                                  {request.screenshot_url && (
                                    <img
                                      src={request.screenshot_url}
                                      alt={request.username}
                                      width={24}
                                      height={24}
                                      className="w-9 h-9 rounded-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.src =
                                          "/default-avatar.png";
                                      }}
                                    />
                                  )}
                                  <div className="flex flex-1 flex-col gap-1">
                                    <span className="text-sm text-gray-300">
                                      {request.username}
                                    </span>
                                    <span className="text-xs text-gray-300">
                                      {request.vip_code}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 py-3 text-center">
                                <span
                                  className={`${getEntColor(
                                    request.team_code
                                  )} px-2 py-1 rounded text-xs`}
                                >
                                  {request.team_code}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="text-white-500 text-xs">
                                  {request.redeemId}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-300 capitalize text-center">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    request.initBy === "agent"
                                      ? "bg-blue-500/10 text-blue-500"
                                      : "bg-purple-500/10 text-purple-500"
                                  }`}
                                >
                                  {request.initBy}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex flex-col items-center justify-center gap-1">
                                  <span className="text-sm">
                                    {request.username}
                                  </span>
                                  <span className="text-xs uppercase">
                                    {request.gamePlatform}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-white-500 text-center">
                                ${request.totalAmount}
                              </td>
                              <td className="px-4 py-3 text-sm text-white-500 text-center">
                                ${request.amountPaid}
                              </td>
                              <td className="px-4 py-3 text-sm text-white-500 text-center">
                                ${request.amountAvailable}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    request.status === "completed"
                                      ? "bg-green-500/10 text-green-500"
                                      : request.status === "queued"
                                      ? "bg-yellow-500/10 text-yellow-500"
                                      : request.status === "rejected"
                                      ? "bg-red-500/10 text-red-500"
                                      : request.status === "verification_failed"
                                      ? "bg-red-500/10 text-red-500"
                                      : request.status === "initiated"
                                      ? "bg-gray-500/10 text-gray-400"
                                      : "bg-gray-500/10 text-gray-500"
                                  }`}
                                >
                                  {request.status === "verification_failed"
                                    ? "VERIFICATION FAILED"
                                    : request.status
                                        .toUpperCase()
                                        .replace(/_/g, " ")}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex flex-col items-center gap-0.5">
                                  {Array.isArray(request.paymentMethods) &&
                                    request.paymentMethods.map(
                                      (method, index) => (
                                        <div
                                          key={`${method?._id || index}-${
                                            request.redeemId
                                          }`}
                                          className="flex items-center gap-1"
                                        >
                                          {getPaymentMethodIcon(
                                            method?.type || ""
                                          ) && (
                                            <Image
                                              src={getPaymentMethodIcon(
                                                method?.type || ""
                                              )}
                                              alt={method?.type || ""}
                                              width={30}
                                              height={30}
                                              className="rounded"
                                            />
                                          )}
                                          <span className="text-gray-400 text-xs">
                                            {method?.username || "-"}
                                          </span>
                                        </div>
                                      )
                                    )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-center">
                                {request.processedBy ? (
                                  <div className="flex flex-col items-center">
                                    <span className="text-gray-300">
                                      {request.processedBy.name}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {request.processedBy.email}
                                    </span>
                                  </div>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-center">
                                <TimeDisplay date={request.createdAt} />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {redeemPagination && (
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-sm text-gray-400">
                      Showing {filteredRedeemRequests.length} of{" "}
                      {redeemPagination.total} entries
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`px-3 py-1 rounded text-sm ${
                          currentPage === 1
                            ? "bg-gray-800/50 text-gray-600 cursor-not-allowed"
                            : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                        }`}
                      >
                        Previous
                      </button>
                      <button className="px-3 py-1 bg-emerald-600 text-white rounded text-sm">
                        {currentPage}
                      </button>
                      <button
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === redeemPagination.totalPages}
                        className={`px-3 py-1 rounded text-sm ${
                          currentPage === redeemPagination.totalPages
                            ? "bg-gray-800/50 text-gray-600 cursor-not-allowed"
                            : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Transactions Pagination */}
            {activeSection === "transactions" && pagination && (
              <div className="flex justify-between items-center mt-4">
                <span className="text-sm text-gray-400">
                  Showing {filteredRechargeRequests.length} of{" "}
                  {pagination.total} entries
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded text-sm ${
                      currentPage === 1
                        ? "bg-gray-800/50 text-gray-600 cursor-not-allowed"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    Previous
                  </button>
                  <button className="px-3 py-1 bg-emerald-600 text-white rounded text-sm">
                    {currentPage}
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === pagination.totalPages}
                    className={`px-3 py-1 rounded text-sm ${
                      currentPage === pagination.totalPages
                        ? "bg-gray-800/50 text-gray-600 cursor-not-allowed"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </motion.div>

      {/* Redeem Details Modal */}
      {isRedeemModalOpen && selectedRedeemRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#1a1a1a] rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">
                Redeem Details
              </h2>
              <button
                onClick={() => setIsRedeemModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-white  text-sm">Redeem ID</p>
                  <p className="text-white ">{selectedRedeemRequest.redeemId}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Entry Code</p>
                  <p className="text-white">{selectedRedeemRequest.vip_code}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Username</p>
                  <p className="text-white">{selectedRedeemRequest.username}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Platform</p>
                  <p className="text-white">
                    {selectedRedeemRequest.gamePlatform}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total</p>
                  <p className="text-emerald-500">
                    ${selectedRedeemRequest.totalAmount}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Paid</p>
                  <p className="text-emerald-500">
                    ${selectedRedeemRequest.amountPaid}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Amount Hold</p>
                  <p className="text-yellow-500">
                    ${selectedRedeemRequest.amountHold}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Available Amount</p>
                  <p className="text-emerald-500">
                    ${selectedRedeemRequest.amountAvailable}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-gray-400 text-sm mb-2">Payment Methods</p>
                <div className="space-y-2">
                  {Array.isArray(selectedRedeemRequest?.paymentMethods) &&
                    selectedRedeemRequest.paymentMethods.map(
                      (method, index) => (
                        <div
                          key={`${method?._id || index}-${
                            selectedRedeemRequest.redeemId
                          }`}
                          className="bg-black/20 p-3 rounded"
                        >
                          <p className="text-white capitalize">
                            {method?.type || "-"}
                          </p>
                          <p className="text-gray-400 text-sm">
                            {method?.username || "-"}
                          </p>
                        </div>
                      )
                    )}
                </div>
              </div>

              <div>
                <p className="text-gray-400 text-sm">Status</p>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    selectedRedeemRequest.status === "completed"
                      ? "bg-green-500/10 text-green-500"
                      : selectedRedeemRequest.status === "queued"
                      ? "bg-yellow-500/10 text-yellow-500"
                      : selectedRedeemRequest.status === "rejected"
                      ? "bg-red-500/10 text-red-500"
                      : "bg-gray-500/10 text-gray-500"
                  }`}
                >
                  {selectedRedeemRequest.status === "verification_failed"
                    ? "VERIFICATION FAILED"
                    : selectedRedeemRequest.status
                        .toUpperCase()
                        .replace(/_/g, " ")}
                </span>
              </div>

              {selectedRedeemRequest.processedBy && (
                <div>
                  <p className="text-gray-400 text-sm">Processed By</p>
                  <p className="text-white">
                    {selectedRedeemRequest.processedBy.name}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {selectedRedeemRequest.processedBy.email}
                  </p>
                </div>
              )}

              {selectedRedeemRequest.remarks && (
                <div>
                  <p className="text-gray-400 text-sm">Remarks</p>
                  <p className="text-white">{selectedRedeemRequest.remarks}</p>
                </div>
              )}

              {selectedRedeemRequest.verificationRemarks && (
                <div>
                  <p className="text-gray-400 text-sm">Verification Remarks</p>
                  <p className="text-white">
                    {selectedRedeemRequest.verificationRemarks}
                  </p>
                </div>
              )}

              <div>
                <p className="text-gray-400 text-sm">Timestamps</p>
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="text-gray-400">Created: </span>
                    <span className="text-white">
                      {new Date(
                        selectedRedeemRequest.createdAt
                      ).toLocaleString()}
                    </span>
                  </p>
                  {selectedRedeemRequest.processedAt && (
                    <p className="text-sm">
                      <span className="text-gray-400">Processed: </span>
                      <span className="text-white">
                        {new Date(
                          selectedRedeemRequest.processedAt
                        ).toLocaleString()}
                      </span>
                    </p>
                  )}
                  {selectedRedeemRequest.verifiedAt && (
                    <p className="text-sm">
                      <span className="text-gray-400">Verified: </span>
                      <span className="text-white">
                        {new Date(
                          selectedRedeemRequest.verifiedAt
                        ).toLocaleString()}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Existing TransactionDetailsModal */}
      <TransactionDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        rechargeRequest={selectedRechargeRequest}
        onStatusUpdate={fetchRechargeRequests}
      />
    </div>
  );
};

export default TransactionPage;
