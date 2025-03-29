"use client";
import React, { useState, useEffect } from "react";
import { X, Loader2, Upload, Plus, Key } from "lucide-react";
import { AdminHeader, SupportHeader } from "./Headers";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import RechargeModal from "./RechargeModal";
import RedeemModal from "./RedeemModal";
import ResetPasswordModal from "./ResetPasswordModal";
import TransferModal from "./TransferModal";
import { supabase } from "@/lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";
import { convertEntFormat } from "@/utils/entFormat";
import { EntType } from "@/supabase/types";
import Image from "next/image";
import TimeElapsed from "@/app/components/TimeElapsed";
import { AgentImage } from "./recharge/AgentImage";

interface User {
  name: string;
  department: string;
  ent_access?: EntType[];
  email: string;
  role: string;
  id: string;
}

interface PaymentMethod {
  type: string;
  username: string;
  _id: string;
}

interface manyChatData {
  key: string;
  id: string;
  page_id: string;
  user_refs: any[];
  status: string;
  first_name: string;
  last_name: string;
  name: string;
  gender: string;
  profile_pic: string;
}

interface Request {
  _id: string;
  manyChatData?: manyChatData;
  entryCode: string;
  initBy: string;
  init_id: string;
  agentName: string;
  agentDepartment: string;
  username: string;
  gamePlatform: string;
  totalAmount: number;
  amountPaid: number;
  amountHold: number;
  paymentMethods: PaymentMethod[];
  status: string;
  redeemId: string;
  requestedAt: string;
  remarks: string;
  amountAvailable: number;
  createdAt: string;
  updatedAt: string;
  team_code?: string;
}

interface RechargeRequest {
  rechargeId: string;
  playerName: string;
  messengerId: string;
  gamePlatform: string;
  gameUsername: string;
  amount: number;
  bonusAmount: number;
  creditsLoaded: number;
  status: string;
  teamCode: string;
  promoCode: string | null;
  promoType: string | null;
  paymentMethod: Record<string, any> | null;
  screenshotUrl: string | null;
  notes: string;
  manyChatData: {
    _id: string;
    team: string;
    status: string;
    profile: {
      gender: string;
      fullName: string;
      language: string;
      lastName: string;
      timezone: string;
      firstName: string;
      profilePic: string;
    };
    vipCode: string;
    platforms: {
      firekirin_username: string | null;
      orionstars_username: string | null;
    };
    playerName: string;
    messengerId: string;
    profile_pic?: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    custom_fields?: {
      team_code: string;
    };
  };
  agentName: string;
  agentDepartment: string;
  processedBy: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
  profile_pic?: string;
  team_code?: string;
  init_id: string;
}

interface RechargeSubmitData {
  initBy: string;
  vipCode: string;
  platform_username: string;
  platform: string;
  amount?: number;
  agentName: string;
  agentDepartment: string;
  notes: string;
  promo_code?: string;
  promo_type?: string;
}

interface ScreenshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (screenshotUrl: string, file: File | null) => Promise<void>;
  rechargeId: string;
}

interface Promotion {
  _id: string;
  code: string;
  description?: string;
  status: string;
  type: string; // 'FIXED' | 'PERCENTAGE'
  percentage?: number;
  amount?: number;
  isActive: boolean;
  applicableTeams: string[];
}

interface ResetPasswordRequest {
  playerId: string;
  playerName: string;
  suggestedUsername: string;
  platform: string;
  newPassword: string;
  additionalMessage: string;
}

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ResetPasswordRequest) => Promise<void>;
  user: any;
}

// Mock data - Replace this with actual API call
const requests: Request[] = [
  // Add your actual data fetching logic here
];

const ScreenshotModal: React.FC<ScreenshotModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  rechargeId,
}) => {
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setScreenshotUrl("");
    }
  };

  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setScreenshotUrl(event.target.value);
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-lg border border-gray-800/20">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h3 className="text-xl font-semibold text-white">
            Submit Screenshot
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Screenshot URL</label>
            <input
              type="text"
              value={screenshotUrl}
              onChange={handleUrlChange}
              className="w-full bg-[#252b3b] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter screenshot URL..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-400">Upload Screenshot</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full bg-[#252b3b] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            />
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Preview"
                className="mt-2 max-w-full rounded-lg"
              />
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-800">
          {error && <div className="flex-1 text-red-500 text-sm">{error}</div>}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              setIsSubmitting(true);
              setError(null);
              try {
                await onSubmit(screenshotUrl, selectedFile);
                onClose();
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "Failed to submit screenshot"
                );
              } finally {
                setIsSubmitting(false);
              }
            }}
            disabled={isSubmitting || (!screenshotUrl && !selectedFile)}
            className="px-4 py-2 text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 
              transition-all duration-200 transform hover:scale-105 active:scale-95 
              disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
              flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Submit Screenshot
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const SubmitRequest = () => {
  const router = useRouter();
  const [modalType, setModalType] = useState<
    "recharge" | "redeem" | "reset-password" | "transfer" | null
  >(null);
  const [user, setUser] = useState<User | null>(null);
  const [filterType, setFilterType] = useState<"recharge" | "redeem">(
    "recharge"
  );
  const [redeemRequests, setRedeemRequests] = useState<Request[]>([]);
  const [rechargeRequests, setRechargeRequests] = useState<RechargeRequest[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [selectedRedeemId, setSelectedRedeemId] = useState<string>("");
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [screenshotModal, setScreenshotModal] = useState<{
    isOpen: boolean;
    rechargeId: string;
  }>({ isOpen: false, rechargeId: "" });
  const [showSuccessModal, setShowSuccessModal] = useState<{
    show: boolean;
    type?: "recharge" | "redeem" | "reset-password" | "transfer";
    data?: {
      id?: string;
      playerName?: string;
    };
  }>({ show: false });
  const [refreshLoading, setRefreshLoading] = useState(false);

  // Add validation for ENT access
  const validateEntAccess = (teamCode: string | undefined) => {
    if (!teamCode || !user?.ent_access) return false;
    return convertEntFormat.hasEntAccess(user, teamCode);
  };

  const fetchRechargeRequests = async () => {
    setIsLoading(true);
    try {
      // Fetch recharge requests from Supabase
      const { data: rechargeData, error: rechargeError } = await supabase
        .from("recharge_requests")
        .select("*")
        .in("status", ["pending", "assigned"])
        .order("created_at", { ascending: false });

      if (rechargeError) throw rechargeError;

      // Transform the data to match your component's expected format
      const transformedRequests = rechargeData.map((request) => ({
        rechargeId: request.id,
        recharge_id: request.recharge_id,
        init_id: request.init_id,
        vipCode: request.vip_code,
        playerName: request.player_name,
        messengerId: request.messenger_id,
        gamePlatform: request.game_platform,
        
        gameUsername: request.game_username,
        amount: request.amount,
        bonusAmount: request.bonus_amount,
        creditsLoaded: request.credits_loaded,
        status: request.status,
        teamCode: request.team_code,
        promoCode: request.promo_code,
        promoType: request.promo_type,
        paymentMethod: request.payment_method,
        screenshotUrl: request.screenshot_url,
        notes: request.notes,
        manyChatData: {
          ...request.manychat_data,
          profile_pic: request.manychat_data?.profile?.profilePic,
          name: request.manychat_data?.profile?.fullName,
          first_name: request.manychat_data?.profile?.firstName,
          last_name: request.manychat_data?.profile?.lastName,
          custom_fields: {
            team_code: request.team_code,
          },
        },
        agentName: request.agent_name,
        agentDepartment: request.agent_department,
        processedBy: request.processed_by,
        processedAt: request.processed_at,
        createdAt: request.created_at,
        updatedAt: request.updated_at,
        // Add these fields for display in the table
        profile_pic: request.manychat_data?.profile?.profilePic,
        team_code: request.team_code,
        assignedRedeem: request.assigned_redeem,
        assignedCt: request.assigned_ct,
      }));

      setRechargeRequests(transformedRequests);
    } catch (error) {
      console.error("Error fetching recharge requests:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitScreenshot = async (screenshotUrl: string, file: File | null) => {
    try {
      let finalScreenshotUrl = screenshotUrl;

      // If a file is selected, upload it to Supabase storage
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${screenshotModal.rechargeId}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        // Upload the file
        const { error: uploadError, data } = await supabase.storage
          .from('screenshots')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Failed to upload screenshot: ${uploadError.message}`);
        }

        // Get the public URL of the uploaded file
        const { data: { publicUrl } } = supabase.storage
          .from('screenshots')
          .getPublicUrl(filePath);

        finalScreenshotUrl = publicUrl;
      }

      // Update the recharge request in Supabase
      const { error: updateError } = await supabase
        .from("recharge_requests")
        .update({
          status: "sc_submitted",
          screenshot_url: finalScreenshotUrl,
          updated_at: new Date().toISOString(),
          sc_submit_id: user?.id,
        })
        .eq("id", screenshotModal.rechargeId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      await fetchRechargeRequests();
      setScreenshotModal({ isOpen: false, rechargeId: "" });
      setShowSuccessModal({
        show: true,
        type: "recharge",
        data: {
          id: screenshotModal.rechargeId,
        },
      });
    } catch (error) {
      console.error('Error submitting screenshot:', error);
      throw error;
    }
  };

  useEffect(() => {
    const fetchRedeemRequests = async () => {
      setIsLoading(true);
      try {
        // Fetch redeem requests from Supabase
        const { data: redeemData, error: redeemError } = await supabase
          .from("redeem_requests")
          .select("*")
          .order("created_at", { ascending: false });

        if (redeemError) throw redeemError;

        // Transform the data to match your component's expected format
        const transformedRequests = redeemData.map((request) => ({
          _id: request.id,
          redeem_id: request.redeem_id,
          recharge_id: request.recharge_id,
          vipCode: request.vip_code,
          manyChatData: {
            ...request.manychat_data,
            profile_pic: request.manychat_data?.profile?.profilePic,
            name: request.manychat_data?.profile?.fullName,
            first_name: request.manychat_data?.profile?.firstName,
            last_name: request.manychat_data?.profile?.lastName,
            custom_fields: {
              team_code: request.team_code,
            },
          },
          entryCode: request.vip_code,
          initBy: "agent",
          agentName: request.agent_name,
          init_id: request.init_id,
          agentDepartment: request.agent_department,
          username: request.game_username,
          gamePlatform: request.game_platform,
          totalAmount: request.total_amount,
          amountPaid: 0, // Will be updated when processed
          amountHold: 0, // Will be updated when processed
          paymentMethods: request.payment_methods || [],
          status: request.status,
          redeemId: request.id,
          requestedAt: request.created_at,
          remarks: request.notes || "",
          amountAvailable: request.total_amount,
          createdAt: request.created_at,
          updatedAt: request.updated_at,
          // Add these fields for display in the table
          playerName: request.player_name,
          profile_pic: request.manychat_data?.profile?.profilePic,
          player_data: request.player_data,
          team_code: request.team_code,
        }));

        setRedeemRequests(transformedRequests);
      } catch (error) {
        console.error("Error fetching redeem requests:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchRedeemRequests();
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

  // Add useEffect for realtime subscriptions
  useEffect(() => {
    let rechargeChannel: RealtimeChannel;
    let redeemChannel: RealtimeChannel;

    const setupRealtimeSubscriptions = () => {
      // Subscribe to recharge_requests changes
      rechargeChannel = supabase
        .channel("recharge_requests_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "recharge_requests",
          },
          async (payload) => {
            // Refresh data when changes occur
            if (
              payload.eventType === "UPDATE" ||
              payload.eventType === "INSERT" ||
              payload.eventType === "DELETE"
            ) {
              await fetchRechargeRequests();
            }
          }
        )
        .subscribe((status) => {});

      // Subscribe to redeem_requests changes
      redeemChannel = supabase
        .channel("redeem_requests_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "redeem_requests",
          },
          async (payload) => {
            // Refresh data when changes occur
            if (
              payload.eventType === "UPDATE" ||
              payload.eventType === "INSERT" ||
              payload.eventType === "DELETE"
            ) {
              try {
                const { data: redeemData, error: redeemError } = await supabase
                  .from("redeem_requests")
                  .select("*")
                  .order("created_at", { ascending: false });

                if (redeemError) throw redeemError;

                // Transform the data
                const transformedRequests = redeemData.map((request) => ({
                  _id: request.id,
                  redeem_id: request.redeem_id,
                  recharge_id: request.recharge_id,
                  manyChatData: {
                    ...request.manychat_data,
                    profile_pic: request.manychat_data?.profile?.profilePic,
                    name: request.manychat_data?.profile?.fullName,
                    first_name: request.manychat_data?.profile?.firstName,
                    last_name: request.manychat_data?.profile?.lastName,
                    custom_fields: {
                      team_code: request.team_code,
                    },
                  },
                  entryCode: request.vip_code,
                  initBy: "agent",
                  init_id: request.init_id,
                  agentName: request.agent_name,
                  agentDepartment: request.agent_department,
                  username: request.game_username,
                  gamePlatform: request.game_platform,
                  totalAmount: request.total_amount,
                  amountPaid: request.amount_paid || 0,
                  amountHold: request.amount_hold || 0,
                  paymentMethods: request.payment_methods || [],
                  status: request.status,
                  redeemId: request.id,
                  requestedAt: request.created_at,
                  remarks: request.notes || "",
                  amountAvailable: request.amount_available || 0,
                  createdAt: request.created_at,
                  updatedAt: request.updated_at,
                  playerName: request.player_name,
                  profile_pic: request.manychat_data?.profile?.profilePic,
                  team_code: request.team_code,
                }));

                setRedeemRequests(transformedRequests);
              } catch (error) {
                console.error("Error updating redeem requests:", error);
              }
            }
          }
        )
        .subscribe((status) => {});
    };

    if (user) {
      setupRealtimeSubscriptions();
    }

    // Cleanup subscriptions on unmount
    return () => {
      if (rechargeChannel) {
        supabase.removeChannel(rechargeChannel);
      }
      if (redeemChannel) {
        supabase.removeChannel(redeemChannel);
      }
    };
  }, [user]);

  if (!user) return null;

  const filteredRequests =
    filterType === "recharge"
      ? rechargeRequests
          .filter((req) => validateEntAccess(req.teamCode || req.team_code))
          .sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
      : redeemRequests
          .filter(
            (req) =>
              req.status.toLowerCase() === "pending" &&
              validateEntAccess(req.team_code)
          )
          .sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );

  const handleVerify = async (request: Request) => {
    try {
      // Validate ENT access before proceeding
      if (!validateEntAccess(request.team_code)) {
        setSubmitError(
          "You do not have access to verify requests for this ENT"
        );
        return;
      }

      setSelectedRedeemId(request.redeemId);
      setSelectedRequest({ ...request });
      setShowVerificationModal(true);

      // Add event listener for successful OTP verification
      const handleOTPSuccess = () => {
        // router.push('/main/support/transaction');
      };

      // Add the event listener to RedeemModal component
      if (showVerificationModal) {
        const redeemModal = document.getElementById("redeem-modal");
        if (redeemModal) {
          redeemModal.addEventListener("otpSuccess", handleOTPSuccess);
          return () => {
            redeemModal.removeEventListener("otpSuccess", handleOTPSuccess);
          };
        }
      }
    } catch (error) {
      console.error("Error starting OTP verification:", error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to start OTP verification"
      );
    }
  };

  console.log("filteredRequests", filteredRequests);
  const handleVerificationClose = () => {
    setShowVerificationModal(false);
    setSelectedRedeemId("");
    setSelectedRequest(null);
    setShowSuccessModal({ show: false });
    // Set filter type to redeem after closing verification modal
    setFilterType("redeem");
  };

  const handleSuccessClose = () => {
    setShowSuccessModal({ show: false });
    // Switch to appropriate tab based on the request type
    if (showSuccessModal.type === "recharge") {
      setFilterType("recharge");
    } else if (showSuccessModal.type === "redeem") {
      setFilterType("redeem");
    }
  };

  const handleRechargeSubmit = async (
    data: RechargeSubmitData & {
      promo_code?: string;
      promo_type?: string;
      rechargeId: string;
      recharge_id: string;
      playerName: string;
    }
  ) => {
    setSubmitError(null);
    try {
      console.log("data", data);

      // Show success modal with the correct data
      setShowSuccessModal({
        show: true,
        type: "recharge",
        data: {
          id: data.recharge_id,
          playerName: data.playerName,
        },
      });
      setModalType(null);

      // Set filter type to recharge after submission
      setFilterType("recharge");

      // Refresh the recharge requests list
      await fetchRechargeRequests();

      return { success: true };
    } catch (error) {
      console.error("Error submitting recharge request:", error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to submit recharge request"
      );
      throw error;
    }
  };

  const handleRefresh = async () => {
    setRefreshLoading(true);
    try {
      await Promise.all([
        fetchRechargeRequests(),
        // Add any other data fetching here
      ]);
    } finally {
      setRefreshLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (data: ResetPasswordRequest) => {
    try {
      // Show success modal with the correct data
      setShowSuccessModal({
        show: true,
        type: "reset-password",
        data: {
          playerName: data.playerName,
        },
      });
      setModalType(null);
    } catch (error) {
      console.error("Error submitting reset password request:", error);

      throw error;
    }
  };

  const handleTransferSubmit = async (data: {
    initBy: string;
    vipCode: string;
    platform_username: string;
    platform: string;
    amount?: number;
    agentName: string;
    agentDepartment: string;
    notes: string;
    transferId: string;
    playerName: string;
    targetUsername: string;
  }) => {
    setSubmitError(null);
    try {
      // Show success modal with the correct data
      setShowSuccessModal({
        show: true,
        type: "transfer",
        data: {
          id: data.transferId,
          playerName: data.playerName,
        },
      });
      setModalType(null);

      // Refresh the requests list
      await fetchRechargeRequests();

      return { success: true };
    } catch (error) {
      console.error("Error submitting transfer request:", error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to submit transfer request"
      );
      throw error;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <div className="flex-1 pl-64">
        <main className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
              Submit Request
            </h1>
            <button
              onClick={handleRefresh}
              disabled={refreshLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 disabled:opacity-50 transition-all"
            >
              {refreshLoading ? (
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              )}
              <span>Refresh</span>
            </button>
          </div>

          <div className="flex gap-6 justify-center">
            {/* Recharge Button */}
            <button
              onClick={() => setModalType("recharge")}
              className="group relative flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#252b3b] to-[#1a1a1a] 
                rounded-full min-w-[200px] hover:from-[#2a3241] hover:to-[#1f1f1f] transition-all duration-300 
                border border-blue-500/20 hover:border-blue-500/40 shadow-lg hover:shadow-blue-500/10"
            >
              <Plus className="w-5 h-5 text-blue-500  group-hover:rotate-180 transition-all duration-300" />
              <span className="text-sm font-semibold text-white tracking-wide">
                RECHARGE REQUEST
              </span>
            </button>

            {/* Redeem Button */}
            <button
              onClick={() => setModalType("redeem")}
              className="group relative flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#252b3b] to-[#1a1a1a] 
                rounded-full min-w-[200px] hover:from-[#2a3241] hover:to-[#1f1f1f] transition-all duration-300 
                border border-emerald-500/20 hover:border-emerald-500/40 shadow-lg hover:shadow-emerald-500/10"
            >
              <Plus className="w-5 h-5 text-emerald-500 group-hover:rotate-180 transition-all duration-300" />
              <span className="text-sm font-semibold text-white tracking-wide">
                REDEEM REQUEST
              </span>
            </button>

            {/* Transfer Button */}
            <button
              onClick={() => setModalType("transfer")}
              className="group relative flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#252b3b] to-[#1a1a1a] 
                rounded-full min-w-[200px] hover:from-[#2a3241] hover:to-[#1f1f1f] transition-all duration-300 
                border border-amber-500/20 hover:border-amber-500/40 shadow-lg hover:shadow-amber-500/10"
            >
              <Plus className="w-5 h-5 text-amber-500 group-hover:rotate-180 transition-all duration-300" />
              <span className="text-sm font-semibold text-white tracking-wide">
                TRANSFER REQUEST
              </span>
            </button>

            {/* Reset Password Button */}
            <button
              onClick={() => setModalType("reset-password")}
              className="group relative flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#252b3b] to-[#1a1a1a] 
                rounded-full min-w-[200px] hover:from-[#2a3241] hover:to-[#1f1f1f] transition-all duration-300 
                border border-purple-500/20 hover:border-purple-500/40 shadow-lg hover:shadow-purple-500/10"
            >
              <Plus className="w-5 h-5 text-purple-500 group-hover:rotate-180 transition-all duration-300" />
              <span className="text-sm font-semibold text-white tracking-wide">
                RESET PASSWORD
              </span>
            </button>
          </div>

          {/* Modals */}
          {modalType === "recharge" && (
            <RechargeModal
              onClose={() => setModalType(null)}
              onSubmit={handleRechargeSubmit}
              user={user}
              isOpen={true}
            />
          )}
          {modalType === "redeem" && (
            <RedeemModal
              isOpen={true}
              onClose={() => {
                setModalType(null);
                setFilterType("redeem");
                setShowSuccessModal({
                  show: true,
                  type: "redeem",
                });
              }}
              initialRedeemId=""
              user={{ ...user, id: user.id }}
            />
          )}
          {modalType === "transfer" && (
            <TransferModal
              isOpen={true}
              onClose={() => setModalType(null)}
              onSubmit={handleTransferSubmit}
              user={user}
            />
          )}
          {modalType === "reset-password" && (
            <ResetPasswordModal
              isOpen={true}
              onClose={() => setModalType(null)}
              onSubmit={handleResetPasswordSubmit}
              user={user}
            />
          )}

          {/* Separate OTP Verification Modal */}
          {showVerificationModal && selectedRequest && (
            <RedeemModal
              isOpen={true}
              onClose={handleVerificationClose}
              initialRedeemId={selectedRedeemId}
              isVerificationOnly={true}
              redeemRequest={selectedRequest}
              user={user}
            />
          )}
        </main>
        {/* Pending Requests Section */}
        <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 shadow-xl">
          <div className="p-6 border-b border-gray-800">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">
                Pending Requests
              </h2>
              <div className="flex bg-[#2a2a2a] rounded-full p-1 gap-1">
                <button
                  onClick={() => setFilterType("recharge")}
                  className={`px-4 py-1 rounded-full text-sm font-medium transition-colors ${
                    filterType === "recharge"
                      ? "bg-emerald-500 text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Recharge
                </button>
                <button
                  onClick={() => setFilterType("redeem")}
                  className={`px-4 py-1 rounded-full text-sm font-medium transition-colors ${
                    filterType === "redeem"
                      ? "bg-blue-500 text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Redeem
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#1a1a1a] border-b border-gray-800">
                <tr>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Init By
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Pending Since
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Team Code
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Request ID
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Player Info
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Platform
                  </th>
                  {/* <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Username
                  </th> */}
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>

                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Payment Method
                  </th>
                  {/* <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th> */}
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredRequests.map((request: any) => (
                  <tr
                    key={request.rechargeId || request._id}
                    className="hover:bg-[#252b3b]"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <AgentImage id={request.init_id} width={32} height={32} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {request.updatedAt && (
                        <TimeElapsed
                          date={request.updatedAt}
                          className="flex flex-col items-center"
                          elapsedClassName="text-sm font-medium text-gray-300"
                          fullDateClassName="text-xs text-gray-400"
                        />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-500/10 text-blue-500">
                        {request.teamCode || request.team_code}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {request.recharge_id || request.redeem_id || request._id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 h-8 w-8">
                          <Image
                            className="h-8 w-8 rounded-full object-cover border border-gray-700"
                            src={
                              request?.profile_pic ||
                              request.player_data?.profile?.profilePic
                            }
                            alt={`${request.playerName}'s profile`}
                            width={32}
                            height={32}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src =
                                "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y";
                            }}
                          />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">
                            {request.playerName}
                          </div>
                          {request.vipCode && (
                            <div className="text-xs text-gray-400">
                              {request.vipCode}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span
                          className={` px-2 py-1 rounded-lg text-xs uppercase text-center`}
                        >
                          {request.gameUsername || request.username}
                        </span>
                        <span
                          className={` px-2 py-1 rounded-lg text-xs uppercase text-center`}
                        >
                          {request.gamePlatform || request.game_platform}
                        </span>
                      </div>
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {request.gameUsername || request.username}
                    </td> */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 text-center">
                      $
                      {(
                        request.amount ||
                        request.totalAmount ||
                        0
                      ).toLocaleString()}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-300 ">
                      {(() => {
                        // Handle redeem request payment methods
                        if (request.paymentMethods?.length > 0) {
                          const payment = request.paymentMethods[0];

                          return `${payment.type} (${
                            payment.username || payment.details || "-"
                          })`;
                        }

                        // Handle assigned redeem payment methods for recharge requests
                        if (
                          request.assignedRedeem?.redeem_player?.payment_method
                        ) {
                          const payment =
                            request.assignedRedeem.redeem_player.payment_method;

                          return `${payment.platform} (${
                            payment.username || "-"
                          })`;
                        }

                        if (request.assignedCt) {
                          return `${request.assignedCt.cashtag || "-"}`;
                        }

                        // If no payment method found

                        return "-";
                      })()}
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        request.status === "pending"
                          ? "bg-amber-500/10 text-amber-500"
                          : "bg-emerald-500/10 text-emerald-500"
                      }`}>
                        {request.status}
                      </span>
                    </td> */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {request.rechargeId ? (
                        <div className="flex gap-2">
                          {request.status.toLowerCase() === "assigned" && (
                            <button
                              onClick={() =>
                                setScreenshotModal({
                                  isOpen: true,
                                  rechargeId: request.rechargeId,
                                })
                              }
                              className="px-3 py-1.5 text-xs font-medium bg-blue-500/10 text-blue-500 rounded-lg 
                                hover:bg-blue-500/20 transition-all duration-200 flex items-center gap-1.5"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              Submit Screenshot
                            </button>
                          )}
                          {request.status.toLowerCase() === "pending" && (
                            <span className="px-3 py-1.5 text-xs font-medium bg-amber-500/10 text-amber-500 rounded-lg">
                              Assignment Pending
                            </span>
                          )}
                          {!["completed", "rejected", "cancel"].includes(
                            request.status.toLowerCase()
                          ) && (
                            <button
                              onClick={async () => {
                                try {
                                  const { error } = await supabase
                                    .from("recharge_requests")
                                    .update({ status: "cancel" })
                                    .eq("id", request.rechargeId);

                                  if (error) throw error;
                                  await fetchRechargeRequests();
                                } catch (err) {
                                  console.error(
                                    "Error cancelling recharge request:",
                                    err
                                  );
                                }
                              }}
                              className="px-3 py-1.5 text-xs font-medium bg-red-500/10 text-red-500 rounded-lg 
                                hover:bg-red-500/20 transition-all duration-200"
                            >
                              Cancel
                            </button>
                          )}
                          {["completed", "rejected", "cancel"].includes(
                            request.status.toLowerCase()
                          ) && (
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                request.status.toLowerCase() === "completed"
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : request.status.toLowerCase() === "rejected"
                                  ? "bg-red-500/10 text-red-500"
                                  : "bg-gray-500/10 text-gray-500"
                              }`}
                            >
                              {request.status.charAt(0).toUpperCase() +
                                request.status.slice(1).toLowerCase()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVerify(request)}
                            className="px-3 py-1.5 text-xs font-medium bg-blue-500 text-white rounded-lg 
                              hover:bg-blue-600 transition-all duration-200 transform hover:scale-105 
                              active:scale-95"
                          >
                            Verify OTP
                          </button>
                          {!["completed", "rejected", "cancel"].includes(
                            request.status.toLowerCase()
                          ) && (
                            <button
                              onClick={async () => {
                                try {
                                  const { error } = await supabase
                                    .from("redeem_requests")
                                    .update({ status: "cancel" })
                                    .eq("id", request._id);

                                  if (error) throw error;
                                  const { error: transactionError } =
                                    await supabase
                                      .from("transactions")
                                      .update({ current_status: "cancel" })
                                      .eq("redeem_id", request.redeem_id);

                                  if (transactionError) throw transactionError;
                                  console.log(
                                    "request-------",
                                    request.vipCode
                                  );
                                  // Get current player data
                                  const {
                                    data: playerData,
                                    error: playerFetchError,
                                  } = await supabase
                                    .from("players")
                                    .select("game_limits, total_redeemed")
                                    .eq("vip_code", request.entryCode)
                                    .single();

                                  if (playerFetchError) throw playerFetchError;
                                  console.log("playerData", playerData);
                                  // Update game_limits by removing the matching redeem_id entry
                                  const updatedGameLimits =
                                    playerData.game_limits.filter(
                                      (limit: any) =>
                                        limit.redeem_id !== request.redeem_id
                                    );

                                  // Update players table with new game_limits and reduced total_redeemed
                                  const { error: playerError } = await supabase
                                    .from("players")
                                    .update({
                                      game_limits: updatedGameLimits,
                                      total_redeemed:
                                        playerData.total_redeemed -
                                        request.totalAmount,
                                    })
                                    .eq("vip_code", request.entryCode);

                                  if (playerError) throw playerError;

                                  // Refresh the redeem requests
                                  const {
                                    data: redeemData,
                                    error: redeemError,
                                  } = await supabase
                                    .from("redeem_requests")
                                    .select("*")
                                    .order("created_at", { ascending: false });

                                  if (redeemError) throw redeemError;

                                  const transformedRequests = redeemData.map(
                                    (req) => ({
                                      _id: req.id,
                                      redeem_id: req.redeem_id,
                                      recharge_id: req.recharge_id,
                                      init_id: req.init_id,
                                      manyChatData: {
                                        ...req.manychat_data,
                                        profile_pic:
                                          req.manychat_data?.profile
                                            ?.profilePic,
                                        name: req.manychat_data?.profile
                                          ?.fullName,
                                        first_name:
                                          req.manychat_data?.profile?.firstName,
                                        last_name:
                                          req.manychat_data?.profile?.lastName,
                                        custom_fields: {
                                          team_code: req.team_code,
                                        },
                                      },
                                      entryCode: req.vip_code,
                                      initBy: "agent",
                                      agentName: req.agent_name,
                                      agentDepartment: req.agent_department,
                                      username: req.game_username,
                                      gamePlatform: req.game_platform,
                                      totalAmount: req.total_amount,
                                      amountPaid: req.amount_paid || 0,
                                      amountHold: req.amount_hold || 0,
                                      paymentMethods: req.payment_methods || [],
                                      status: req.status,
                                      redeemId: req.id,
                                      requestedAt: req.created_at,
                                      remarks: req.notes || "",
                                      amountAvailable:
                                        req.amount_available || 0,
                                      createdAt: req.created_at,
                                      updatedAt: req.updated_at,
                                      playerName: req.player_name,
                                      profile_pic:
                                        req.manychat_data?.profile?.profilePic,
                                      team_code: req.team_code,
                                    })
                                  );

                                  setRedeemRequests(transformedRequests);
                                } catch (err) {
                                  console.error(
                                    "Error cancelling redeem request:",
                                    err
                                  );
                                }
                              }}
                              className="px-3 py-1.5 text-xs font-medium bg-red-500/10 text-red-500 rounded-lg 
                                hover:bg-red-500/20 transition-all duration-200"
                            >
                              Cancel
                            </button>
                          )}
                          {["completed", "rejected", "cancel"].includes(
                            request.status.toLowerCase()
                          ) && (
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                request.status.toLowerCase() === "completed"
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : request.status.toLowerCase() === "rejected"
                                  ? "bg-red-500/10 text-red-500"
                                  : "bg-gray-500/10 text-gray-500"
                              }`}
                            >
                              {request.status.charAt(0).toUpperCase() +
                                request.status.slice(1).toLowerCase()}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Screenshot Modal */}
      <ScreenshotModal
        isOpen={screenshotModal.isOpen}
        onClose={() => setScreenshotModal({ isOpen: false, rechargeId: "" })}
        onSubmit={handleSubmitScreenshot}
        rechargeId={screenshotModal.rechargeId}
      />

      {/* Show error message if there's an error */}
      {submitError && (
        <div className="fixed top-4 right-4 bg-red-500/10 text-red-500 px-4 py-2 rounded-lg">
          {submitError}
        </div>
      )}

      {/* {showSuccessModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-sm border border-gray-800/20 shadow-lg">
            <div className="p-6 text-center">
              <div className="mb-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">
                Success!
              </h3>
              <div className="space-y-2 mb-6">
                <p className="text-sm text-gray-400">
                  Your request has been submitted successfully.
                </p>
                {showSuccessModal.data && (
                  <div className="mt-4 p-4 bg-[#252b3b] rounded-lg">
                    {showSuccessModal.type === "redeem" && (
                      <>
                        <p className="text-sm text-gray-300">
                          <span className="text-gray-400">Redeem ID:</span>{" "}
                          <span className="font-medium text-blue-500">
                            {showSuccessModal.data.id}
                          </span>
                        </p>
                        <p className="text-sm text-gray-300">
                          <span className="text-gray-400">Player:</span>{" "}
                          <span className="font-medium text-white">
                            {showSuccessModal.data.playerName}
                          </span>
                        </p>
                      </>
                    )}
                    {showSuccessModal.type === "reset-password" && (
                      <p className="text-sm text-gray-300">
                        <span className="text-gray-400">Player:</span>{" "}
                        <span className="font-medium text-white">
                          {showSuccessModal.data.playerName}
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={handleSuccessClose}
                className="px-4 py-2 text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                  transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
};

export default SubmitRequest;
