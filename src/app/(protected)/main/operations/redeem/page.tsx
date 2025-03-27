"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { AdminHeader, OperationsHeader } from "@/app/components/Headers";
import ProcessModal from "@/app/components/ProcessModal";
import RejectModal from "@/app/components/RejectModal";
import RefreshButton from "@/app/components/RefreshButton";
import Image from "next/image";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { useUserName } from "@/hooks/useUserName";
import "@/app/styles/loading-animations.css";
import { useSupabaseRedeemRequests } from "@/hooks/useSupabaseRedeemRequests";
import { useDisputedRequests } from "@/hooks/useDisputedRequests";
import { supabase } from "@/supabase/client";
import { sendManyChatMessage, MANYCHAT_TEMPLATES } from "@/utils/manychat";
import { DisputedRequest } from "@/hooks/useDisputedRequests";
import TimeElapsed from "@/app/components/TimeElapsed";
import { AgentInfo } from "@/app/components/AgentInfo";



interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  profile_pic?: string;
}

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
}

interface BaseRequest {
  id: string;
  init_by: string;
  init_id: string;
  player_name: string;
  messenger_id: string | null;
  team_code: string;
  game_platform: string;
  game_username: string;
  total_amount: number;
  status: string;
  notes: string | null;
  agent_name: string;
  agent_department: string;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  users: {
    name: string;
    employee_code: string;
    user_profile_pic: string;
  };
  player_data?: {
    profile: {
      profilePic: string;
    };
  };
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

interface RedeemRequest extends BaseRequest {
  redeem_id: string;
  vip_code: string;
  payment_methods: PaymentMethod[];
  manychat_data: ManyChatData;
  verified_by: string | null;
  verified_at: string | null;
  verification_remarks: string | null;
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
  disputed: number;
}

// Add type definition at the top with other interfaces
type RequestType = RedeemRequest | DisputedRequest;

const OperationsRedeemPage = () => {
  const router = useRouter();
  const { logActivity } = useActivityLogger();
  const { userName, getUserName } = useUserName();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<
    "Pending" | "VerificationFailed" | "Rejected" | "Disputed"
  >("Pending");
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<
    RedeemRequest | DisputedRequest | null
  >(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTeamCode, setActiveTeamCode] = useState<
    "ALL" | "ENT-1" | "ENT-2" | "ENT-3"
  >("ALL");
  const [isRejecting, setIsRejecting] = useState(false);
  const limit = 10;
  const [loadingActions, setLoadingActions] = useState<{
    [key: string]: { process: boolean; reject: boolean };
  }>({});

  // Use both hooks
  const {
    redeemRequests,
    currentPage,
    totalPages,
    totalRecords,
    isLoading: isLoadingRedeem,
    isRefreshing: isRefreshingRedeem,
    statsData: redeemStatsData,
    refresh: handleRedeemRefresh,
    setCurrentPage,
  } = useSupabaseRedeemRequests({
    activeTab,
    activeTeamCode,
    limit,
  });

  const {
    disputedRequests,
    currentPage: disputedCurrentPage,
    totalPages: disputedTotalPages,
    totalRecords: disputedTotalRecords,
    isLoading: isLoadingDisputed,
    isRefreshing: isRefreshingDisputed,
    statsData: disputedStatsData,
    refresh: handleDisputedRefresh,
    setCurrentPage: setDisputedCurrentPage,
  } = useDisputedRequests({
    activeTeamCode,
    limit,
  });

  console.log("redeem requests", disputedRequests);

  // Update handleRefresh to refresh both hooks
  const handleRefresh = async () => {
    if (activeTab === "Disputed") {
      await handleDisputedRefresh();
    } else {
      await handleRedeemRefresh();
    }
  };

  // Update handlePageChange
  const handlePageChange = (newPage: number) => {
    if (activeTab === "Disputed") {
      if (newPage >= 1 && newPage <= disputedTotalPages) {
        setDisputedCurrentPage(newPage);
      }
    } else {
      if (newPage >= 1 && newPage <= totalPages) {
        setCurrentPage(newPage);
      }
    }
  };

  // Update the stats data to combine both sources
  const combinedStatsData = {
    ...redeemStatsData,
    disputed: disputedStatsData.disputed,
  };

  // Update initial data loading effect to only handle user authentication
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
        parsedUser.department !== "Operations" &&
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

  // Add useEffect to handle auto-opening modals based on processing_state
  useEffect(() => {
    const handleAutoOpenModal = () => {
      // Check both redeemRequests and disputedRequests
      const allRequests = [...redeemRequests, ...disputedRequests];

      // Find any request that's in progress and assigned to current user
      const inProgressRequest = allRequests.find(
        (request) =>
          request.processing_state.status === "in_progress" &&
          request.processing_state.processed_by === user?.id
      );

      if (inProgressRequest) {
        setSelectedRequest(inProgressRequest);

        // Fetch the processor's name
        if (inProgressRequest.processing_state.processed_by) {
          getUserName(inProgressRequest.processing_state.processed_by);
        }

        // Open appropriate modal based on modal_type
        if (inProgressRequest.processing_state.modal_type === "process_modal") {
          setIsProcessModalOpen(true);
          setIsRejectModalOpen(false);
        } else if (
          inProgressRequest.processing_state.modal_type === "reject_modal"
        ) {
          setIsRejectModalOpen(true);
          setIsProcessModalOpen(false);
        }
      }
    };

    // Only run if we have the user and requests data
    if (
      user?.id &&
      (redeemRequests.length > 0 || disputedRequests.length > 0)
    ) {
      handleAutoOpenModal();
    }
  }, [redeemRequests, disputedRequests, user?.id, getUserName]);

  // Add useEffect to fetch processor name when a request's processing state changes
  useEffect(() => {
    const fetchProcessorName = async () => {
      const allRequests = [...redeemRequests, ...disputedRequests];
      const processingRequests = allRequests.filter(
        (request) => request.processing_state.status === "in_progress"
      );

      for (const request of processingRequests) {
        if (request.processing_state.processed_by) {
          await getUserName(request.processing_state.processed_by);
        }
      }
    };

    fetchProcessorName();
  }, [redeemRequests, disputedRequests, getUserName]);

  // Update handleStatsCardClick to use the new structure
  const handleStatsCardClick = (
    tab: "Pending" | "VerificationFailed" | "Rejected" | "Disputed"
  ) => {
    setActiveTab(tab);
    setCurrentPage(1);

    // Scroll to table section
    const tableElement = document.querySelector(".table-section");
    if (tableElement) {
      tableElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleLogout = () => {
    Cookies.remove("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  // Update type definitions
  const isRedeemRequest = (
    request: RedeemRequest | DisputedRequest
  ): request is RedeemRequest => {
    return "redeem_id" in request && !("recharge_id" in request);
  };

  const isDisputedRequest = (
    request: RedeemRequest | DisputedRequest
  ): request is DisputedRequest => {
    return "recharge_id" in request;
  };

  const handleProcessClick = async (
    request: RedeemRequest | DisputedRequest
  ) => {
    try {
      // Check if request is already in progress
      if (request.processing_state.status === "in_progress") {
        alert("This request is currently being processed by another user11111");
        return;
      }

      setLoadingActions((prev) => ({
        ...prev,
        [request.id]: { ...prev[request.id], process: true },
      }));

      // First, check if the request is already locked
      const { data: checkData, error: checkError } = await supabase
        .from(
          isDisputedRequest(request) ? "recharge_requests" : "redeem_requests"
        )
        .select("processing_state")
        .eq("id", request.id)
        .single();

      if (checkError) {
        console.error("Error checking request state:", checkError);
        return;
      }

      if (checkData?.processing_state?.status === "in_progress") {
        alert(
          "This request is currently being processed by another user222222"
        );
        return;
      }

      // If not locked, try to acquire the lock
      const { data, error } = await supabase
        .from(
          isDisputedRequest(request) ? "recharge_requests" : "redeem_requests"
        )
        .update({
          processing_state: {
            status: "in_progress",
            processed_by: user?.id,
            modal_type: "process_modal",
          },
        })
        .eq("id", request.id)
        .select()
        .single();

      if (error) {
        console.error("Error acquiring processing state:", error);
        return;
      }

      if (!data) {
        alert(
          "Could not acquire processing state - request might be locked by another user"
        );
        return;
      }

      setSelectedRequest(request);
      setIsProcessModalOpen(true);
    } catch (error) {
      console.error("Failed to update processing state:", error);
    } finally {
      setLoadingActions((prev) => ({
        ...prev,
        [request.id]: { ...prev[request.id], process: false },
      }));
    }
  };

  const handleRejectClick = async (
    request: RedeemRequest | DisputedRequest
  ) => {
    try {
      // Check if request is already in progress
      if (request.processing_state.status === "in_progress") {
        console.log(
          "Request is already being processed by another user 555555555"
        );
        return;
      }

      setLoadingActions((prev) => ({
        ...prev,
        [request.id]: { ...prev[request.id], reject: true },
      }));

      // Acquire processing state with reject_modal type
      const { data, error } = await supabase.rpc("acquire_request_processing", {
        request_id: request.id,
        user_id: user?.id,
        p_modal_type: "reject_modal",
      });

      if (error) {
        console.error("Error acquiring processing state:", error);
        return;
      }

      if (!data) {
        console.log(
          "Could not acquire processing state - request might be locked by another user"
        );
        return;
      }

      setSelectedRequest(request);
      setIsRejectModalOpen(true);
    } catch (error) {
      console.error("Failed to update processing state:", error);
    } finally {
      setLoadingActions((prev) => ({
        ...prev,
        [request.id]: { ...prev[request.id], reject: false },
      }));
    }
  };

  const handleCloseProcessModal = async () => {
    if (selectedRequest) {
      try {
        // Release processing state for both redeem and disputed requests
        const { error } = await supabase
          .from(
            isDisputedRequest(selectedRequest)
              ? "recharge_requests"
              : "redeem_requests"
          )
          .update({
            processing_state: {
              status: "idle",
              processed_by: null,
              modal_type: "none",
            },
          })
          .eq("id", selectedRequest.id);

        if (error) {
          console.error("Error releasing processing state:", error);
        }
      } catch (error) {
        console.error("Failed to release processing state:", error);
      }
    }
    setIsProcessModalOpen(false);
    setSelectedRequest(null);
  };

  const handleCloseRejectModal = async () => {
    if (selectedRequest) {
      try {
        // Release processing state for both redeem and disputed requests
        const { error } = await supabase
          .from(
            isDisputedRequest(selectedRequest)
              ? "recharge_requests"
              : "redeem_requests"
          )
          .update({
            processing_state: {
              status: "idle",
              processed_by: null,
              modal_type: "none",
            },
          })
          .eq("id", selectedRequest.id);

        if (error) {
          console.error("Error releasing processing state:", error);
        }
      } catch (error) {
        console.error("Failed to release processing state:", error);
      }
    }
    setIsRejectModalOpen(false);
    setSelectedRequest(null);
  };

  // Update the button rendering to use processing_state
  const renderActionButtons = (request: RequestType) => {
    // Don't show action buttons in Rejected tab
    if (activeTab === "Rejected") {
      return null;
    }

    const isProcessLoading = loadingActions[request.id]?.process || false;
    const isInProgress = request.processing_state.status === "in_progress";
    const processorId = request.processing_state.processed_by;

    // For disputed requests, show only the Return Credits button
    if (isDisputedRequest(request)) {
      return (
        <div className="flex gap-2">
          <button
            onClick={() => handleProcessClick(request)}
            disabled={isProcessLoading || isInProgress}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              isProcessLoading || isInProgress
                ? "bg-gray-500/10 text-gray-500"
                : "bg-green-500/10 text-green-500 hover:bg-green-500/20"
            }`}
            title={
              isInProgress && processorId
                ? `This request is being processed by ${
                    userName || "another user"
                  }`
                : "Return Credits"
            }
          >
            {isProcessLoading ? (
              <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              "Return Credits"
            )}
          </button>
        </div>
      );
    }

    // For other requests, show both Process and Reject buttons
    return (
      <div className="flex gap-2">
        <button
          onClick={() => handleProcessClick(request)}
          disabled={isProcessLoading || isInProgress}
          className={`p-1.5 rounded-lg ${
            isProcessLoading || isInProgress
              ? "bg-gray-500/10 text-gray-500"
              : "bg-green-500/10 text-green-500 hover:bg-green-500/20"
          }`}
          title={
            isInProgress ? `This request is being processed by ${userName}` : ""
          }
        >
          {isProcessLoading ? (
            <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </button>
        <button
          onClick={() => handleRejectClick(request)}
          disabled={isProcessLoading || isInProgress}
          className={`p-1.5 rounded-lg ${
            isInProgress
              ? "bg-gray-500/10 text-gray-500"
              : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
          }`}
          title={
            isInProgress
              ? `This request is being processed by ${
                  userName || "another user"
                }`
              : ""
          }
        >
          {isProcessLoading ? (
            <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              className="w-4 h-4"
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
          )}
        </button>
      </div>
    );
  };

  // Update the handlers to refresh data after completion
  const handleProcess = async (amount: string, notes: string) => {
    setIsProcessing(true);
    try {
      if (!selectedRequest || !user?.id) {
        console.log("No request selected or user not found");
        return;
      }

      if (isDisputedRequest(selectedRequest)) {
        // Handle disputed recharge request
        const { error } = await supabase
          .from("recharge_requests")
          .update({
            status: "return",
            processed_by: user.id,
            processed_at: new Date().toISOString(),
            notes: notes.trim() || null,
            updated_at: new Date().toISOString(),
            processing_state: {
              status: "idle",
              processed_by: null,
              modal_type: "none",
            },
          })
          .eq("id", selectedRequest.id);

        if (error) {
          console.error("Error processing disputed request:", error);
          throw error;
        }
      } else {
        // Handle redeem request
        const amountToUpdate =
          selectedRequest.status === "verification_rejected"
            ? null
            : selectedRequest.total_amount;

        const { data, error } = await supabase.rpc(
          "process_redeem_request_with_player_update",
          {
            p_redeem_id: selectedRequest.id,
            p_status: "verification_pending",
            p_processed_by: user.id,
            p_notes: notes.trim() || null,
            p_amount: amountToUpdate,
            p_game_platform: selectedRequest.game_platform,
            p_vip_code: selectedRequest.vip_code,
          }
        );

        if (error) {
          console.error("Supabase error:", error);
          throw error;
        }

        if (!data.success) {
          alert(data.error);
          return;
        }

        // Send notification to player via ManyChat
        try {
          if (selectedRequest.status !== "verification_failed") {
            await sendManyChatMessage({
              subscriberId: selectedRequest.messenger_id || "",
              message: MANYCHAT_TEMPLATES.REDEEM_REQUEST_APPROVED(
                selectedRequest.total_amount,
                selectedRequest.redeem_id,
                selectedRequest.game_platform
              ),
              customFields: {
                redeem_request_id: selectedRequest.id,
                redeem_status: "verification_pending",
                redeem_amount: selectedRequest.total_amount,
                redeem_platform: selectedRequest.game_platform,
                redeem_processed_at: new Date().toISOString(),
                redeem_processed_by: user.name || "Operations",
              },
              teamCode: selectedRequest.team_code,
            });
          }
        } catch (manyChatError) {
          console.error("Error sending ManyChat notification:", manyChatError);
        }
      }

      // Reset modal states
      handleCloseProcessModal();

      // Refresh data
      handleRefresh();
    } catch (error) {
      console.error("Error processing request:", error);
      alert("An error occurred while processing the request");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      if (!selectedRequest || !user?.id) {
        console.log("No request selected or user not found");
        return;
      }

      if (isDisputedRequest(selectedRequest)) {
        // Handle disputed recharge request
        const { error } = await supabase
          .from("recharge_requests")
          .update({
            deposit_status: "rejected",
            processed_by: user.id,
            processed_at: new Date().toISOString(),
            notes: "Rejected by operations",
            updated_at: new Date().toISOString(),
            processing_state: {
              status: "idle",
              processed_by: null,
              modal_type: "none",
            },
          })
          .eq("id", selectedRequest.id);

        if (error) {
          console.error("Error rejecting disputed request:", error);
          throw error;
        }
      } else {
        // Handle redeem request
        const updateData = {
          status: "rejected",
          processed_by: user.id,
          processed_at: new Date().toISOString(),
          notes: "Rejected by operations",
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from("redeem_requests")
          .update(updateData)
          .eq("id", selectedRequest.id)
          .select();

        if (error) {
          console.error("Supabase update error:", error);
          throw error;
        }

        // Send notification to player via ManyChat
        try {
          await sendManyChatMessage({
            subscriberId: selectedRequest.messenger_id || "",
            message: MANYCHAT_TEMPLATES.REDEEM_REQUEST_REJECTED(
              selectedRequest.redeem_id
            ),
            customFields: {
              redeem_request_id: selectedRequest.id,
              redeem_status: "rejected",
              redeem_amount: selectedRequest.total_amount,
              redeem_platform: selectedRequest.game_platform,
              redeem_rejected_at: new Date().toISOString(),
              redeem_rejected_by: user.name || "Operations",
            },
            teamCode: selectedRequest.team_code,
          });
        } catch (manyChatError) {
          console.error("Error sending ManyChat notification:", manyChatError);
        }
      }

      // Reset modal states
      handleCloseRejectModal();

      // Refresh data
      handleRefresh();
    } catch (error) {
      console.error("Error rejecting request:", error);
      console.error("Error details:", {
        error,
        selectedRequest,
        user,
      });
    } finally {
      setIsRejecting(false);
    }
  };

  const getTimeElapsed = (timestamp: string) => {
    const now = new Date();
    const logTime = new Date(timestamp);
    const diff = now.getTime() - logTime.getTime();

    const hours = diff / (1000 * 60 * 60);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);

    let color = "text-green-500";
    if (hours > 6) color = "text-red-500";
    else if (hours > 3) color = "text-orange-500";
    else if (hours > 1) color = "text-yellow-500";

    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return { text: `${days}d ago`, color };
    }
    if (hours >= 1) {
      return { text: `${Math.floor(hours)}h ago`, color };
    }
    return { text: `${minutes}m ago`, color };
  };

  const renderTable = () => {
    switch (activeTab) {
      case "Pending":
        return (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 ">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                  PENDING SINCE
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                  TEAM CODE
                </th>
                {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                  ACC ID
                </th> */}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                  REDEEM ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                  PLAYER
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                  AMOUNT
                </th>
                {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                  PAYMENT METHOD
                </th> */}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                  INIT BY
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {redeemRequests.map((request, index) => (
                <tr key={index} className="hover:bg-[#252b3b]">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {request.created_at && (
                      <TimeElapsed
                        date={request.created_at}
                        className="flex flex-col items-center"
                        elapsedClassName="text-sm font-medium text-gray-300"
                        fullDateClassName="text-xs text-gray-400"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="bg-blue-500/10 text-blue-500 px-2 py-1 rounded-lg text-xs">
                      {request.team_code || "-"}
                    </span>
                  </td>
                  {/* <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                    {request.vip_code || "-"}
                  </td> */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                    {request.redeem_id || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 h-8 w-8">
                        {/* <Image
                          className="h-8 w-8 rounded-full object-cover border border-gray-700"
                          src={
                            request.player_data?.profile?.profilePic ||
                              '/default-avatar.svg'
                          }
                          alt={`${request?.player_name}'s profile`}
                          width={32}
                          height={32}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src =
                              "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y";
                          }}
                        /> */}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">
                          {request.player_name}
                        </div>
                        {request.vip_code && (
                          <div className="text-xs text-gray-400">
                            {request.vip_code}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                    $
                    {isDisputedRequest(request)
                      ? request.amount
                      : request.total_amount || 0}
                  </td>
                  {/* <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                    {request.payment_methods
                      ?.map((pm) => `${pm.type} (${pm.username})`)
                      .join(", ") || "-"}
                  </td> */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <AgentInfo
                        agentName={request.users?.name}
                        employeeCode={request.users?.employee_code}
                        agentImage={request.users?.user_profile_pic}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {renderActionButtons(request)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case "Disputed":
        return (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                  DISPUTED SINCE
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                  TEAM CODE
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                  RECHARGE ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                  PLAYER
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                  AMOUNT
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                  AGENT
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {disputedRequests.map((request: DisputedRequest, index) => (
                <tr key={index} className="hover:bg-[#252b3b]">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {request.created_at && (
                      <TimeElapsed
                        date={request.created_at}
                        className="flex flex-col items-center"
                        elapsedClassName="text-sm font-medium text-gray-300"
                        fullDateClassName="text-xs text-gray-400"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="bg-blue-500/10 text-blue-500 px-2 py-1 rounded-lg text-xs">
                      {request.team_code || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                    {request.recharge_id || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 h-8 w-8">
                        {/* <Image
                          className="h-8 w-8 rounded-full object-cover border border-gray-700"
                          src={
                            request.manychat_data?.profile?.profilePic ||
                            `https://ui-avatars.com/api/?name=${'N-A'}`
                          }
                          alt={`${request?.player_name}'s profile`}
                          width={32}
                          height={32}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src =
                              "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y";
                          }}
                        /> */}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">
                          {request.player_name}
                        </div>
                        {request.vip_code && (
                          <div className="text-xs text-gray-400">
                            {request.vip_code}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                    ${request.amount || 0}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`bg-purple-500/10 text-purple-500 px-2 py-1 rounded-lg text-xs uppercase`}
                    >
                      {request.agent_name || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {renderActionButtons(request)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case "VerificationFailed":
        return (
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
                  ACC ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                  PLAYER
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                  AMOUNT
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                  PAYMENT METHOD
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                  AGENT
                </th>

                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {redeemRequests.map((request, index) => (
                <tr key={index} className="hover:bg-[#252b3b]">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {request.created_at && (
                      <TimeElapsed
                        date={request.created_at}
                        className="flex flex-col items-center"
                        elapsedClassName="text-sm font-medium text-gray-300"
                        fullDateClassName="text-xs text-gray-400"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="bg-blue-500/10 text-blue-500 px-2 py-1 rounded-lg text-xs">
                      {request.team_code || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                    {request.vip_code || "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {/* <Image
                        src={
                          request.manychat_data.profile?.profilePic ||
                         `https://ui-avatars.com/api/?name=${'N-A'}`
                        }
                        alt={request.player_name || "User"}
                        width={32}
                        height={32}
                        className="rounded-full"
                      /> */}
                      <span className="ml-3 text-sm text-gray-300">
                        {request.player_name || "Unknown User"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                    $
                    {isDisputedRequest(request)
                      ? request.credits_loaded
                      : request.total_amount || 0}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                    {request.payment_methods
                      ?.map((pm) => `${pm.type} (${pm.username})`)
                      .join(", ") || "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`bg-purple-500/10 text-purple-500 px-2 py-1 rounded-lg text-xs uppercase`}
                    >
                      {request.agent_name || "-"}
                    </span>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    {renderActionButtons(request)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case "Rejected":
        return (
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
                  ACC ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                  PLAYER
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                  AMOUNT
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                  PAYMENT METHOD
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                  AGENT
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {redeemRequests.map((request, index) => (
                <tr key={index} className="hover:bg-[#252b3b]">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {request.created_at && (
                      <TimeElapsed
                        date={request.created_at}
                        className="flex flex-col items-center"
                        elapsedClassName="text-sm font-medium text-gray-300"
                        fullDateClassName="text-xs text-gray-400"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="bg-blue-500/10 text-blue-500 px-2 py-1 rounded-lg text-xs">
                      {request.team_code || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                    {request.vip_code || "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {/* <Image
                        src={
                          request.manychat_data.profile?.profilePic ||
                         `https://ui-avatars.com/api/?name=${'N-A'}`
                        }
                        alt={request.player_name || "User"}
                        width={32}
                        height={32}
                        className="rounded-full"
                      /> */}
                      <span className="ml-3 text-sm text-gray-300">
                        {request.player_name || "Unknown User"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                    $
                    {isDisputedRequest(request)
                      ? request.credits_loaded
                      : request.total_amount || 0}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                    {request.payment_methods
                      ?.map((pm) => `${pm.type} (${pm.username})`)
                      .join(", ") || "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`bg-purple-500/10 text-purple-500 px-2 py-1 rounded-lg text-xs uppercase`}
                    >
                      {request.agent_name || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {renderActionButtons(request)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
    }
  };

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      {user.department === "Operations" ? (
        <OperationsHeader user={user} />
      ) : (
        <AdminHeader user={user} />
      )}
      <div className="flex-1 pl-64">
        <main className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                    Redeem Requests
                  </h1>
                </div>
              </div>
            </div>
            <RefreshButton
              onClick={handleRefresh}
              isLoading={isRefreshingRedeem || isRefreshingDisputed}
            />
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            {/* Pending Card */}
            <div
              onClick={() => handleStatsCardClick("Pending")}
              className={`relative bg-[#1a1a1a] rounded-2xl p-6 cursor-pointer transform transition-all duration-200 hover:scale-105 ${
                activeTab === "Pending" ? "scale-105 before:opacity-100" : ""
              } before:absolute before:inset-0 before:bg-gradient-to-b before:from-amber-500/20 before:to-transparent before:rounded-2xl before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 group`}
            >
              <div
                className={`absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent ${
                  activeTab === "Pending" ? "opacity-100" : ""
                }`}
              ></div>
              <div
                className={`absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-amber-500/10 to-transparent ${
                  activeTab === "Pending" ? "opacity-100" : ""
                }`}
              ></div>
              <div
                className={`absolute inset-y-0 -left-px w-px bg-gradient-to-b from-transparent via-amber-500/50 to-transparent transition-opacity duration-500 ${
                  activeTab === "Pending"
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                }`}
              ></div>
              <div
                className={`absolute inset-y-0 -right-px w-px bg-gradient-to-b from-transparent via-amber-500/50 to-transparent transition-opacity duration-500 ${
                  activeTab === "Pending"
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                }`}
              ></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xl text-amber-500 font-medium tracking-wider">
                    PENDING
                  </div>
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <svg
                      className="w-6 h-6 text-amber-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <div
                  className={`text-3xl font-bold text-white mb-1 transition-transform duration-300 ${
                    activeTab === "Pending"
                      ? "scale-105"
                      : "group-hover:scale-105"
                  }`}
                >
                  {combinedStatsData.pending}
                </div>
                <div className="text-sm text-gray-400 mb-4">Requests</div>
              </div>
            </div>

            {/* Disputed Card */}
            <div
              onClick={() => handleStatsCardClick("Disputed")}
              className={`relative bg-[#1a1a1a] rounded-2xl p-6 cursor-pointer transform transition-all duration-200 hover:scale-105 ${
                activeTab === "Disputed" ? "scale-105 before:opacity-100" : ""
              } before:absolute before:inset-0 before:bg-gradient-to-b before:from-purple-500/20 before:to-transparent before:rounded-2xl before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 group`}
            >
              <div
                className={`absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent ${
                  activeTab === "Disputed" ? "opacity-100" : ""
                }`}
              ></div>
              <div
                className={`absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-purple-500/10 to-transparent ${
                  activeTab === "Disputed" ? "opacity-100" : ""
                }`}
              ></div>
              <div
                className={`absolute inset-y-0 -left-px w-px bg-gradient-to-b from-transparent via-purple-500/50 to-transparent transition-opacity duration-500 ${
                  activeTab === "Disputed"
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                }`}
              ></div>
              <div
                className={`absolute inset-y-0 -right-px w-px bg-gradient-to-b from-transparent via-purple-500/50 to-transparent transition-opacity duration-500 ${
                  activeTab === "Disputed"
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100 border- border-red-500 p-2"
                }`}
              ></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xl text-purple-500 font-medium tracking-wider">
                    DISPUTED
                  </div>
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <svg
                      className="w-6 h-6 text-purple-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                </div>
                <div
                  className={`text-3xl font-bold text-white mb-1 transition-transform duration-300 ${
                    activeTab === "Disputed"
                      ? "scale-105"
                      : "group-hover:scale-105"
                  }`}
                >
                  {combinedStatsData.disputed}
                </div>
                <div className="text-sm text-gray-400 mb-4">Requests</div>
              </div>
            </div>

            {/* Verification Failed Card */}
            <div
              onClick={() => handleStatsCardClick("VerificationFailed")}
              className={`relative bg-[#1a1a1a] rounded-2xl p-6 cursor-pointer transform transition-all duration-200 hover:scale-105 ${
                activeTab === "VerificationFailed"
                  ? "scale-105 before:opacity-100"
                  : ""
              } before:absolute before:inset-0 before:bg-gradient-to-b before:from-orange-500/20 before:to-transparent before:rounded-2xl before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 group`}
            >
              <div
                className={`absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent ${
                  activeTab === "VerificationFailed" ? "opacity-100" : ""
                }`}
              ></div>
              <div
                className={`absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-orange-500/10 to-transparent ${
                  activeTab === "VerificationFailed" ? "opacity-100" : ""
                }`}
              ></div>
              <div
                className={`absolute inset-y-0 -left-px w-px bg-gradient-to-b from-transparent via-orange-500/50 to-transparent transition-opacity duration-500 ${
                  activeTab === "VerificationFailed"
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                }`}
              ></div>
              <div
                className={`absolute inset-y-0 -right-px w-px bg-gradient-to-b from-transparent via-orange-500/50 to-transparent transition-opacity duration-500 ${
                  activeTab === "VerificationFailed"
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                }`}
              ></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xl text-orange-500 font-medium tracking-wider">
                    VERIFICATION FAILED
                  </div>
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <svg
                      className="w-6 h-6 text-orange-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
                <div
                  className={`text-3xl font-bold text-white mb-1 transition-transform duration-300 ${
                    activeTab === "VerificationFailed"
                      ? "scale-105"
                      : "group-hover:scale-105"
                  }`}
                >
                  {combinedStatsData.verification_failed}
                </div>
                <div className="text-sm text-gray-400 mb-4">Requests</div>
              </div>
            </div>

            {/* Rejected Card */}
            <div
              onClick={() => handleStatsCardClick("Rejected")}
              className={`relative bg-[#1a1a1a] rounded-2xl p-6 cursor-pointer transform transition-all duration-200 hover:scale-105 ${
                activeTab === "Rejected" ? "scale-105 before:opacity-100" : ""
              } before:absolute before:inset-0 before:bg-gradient-to-b before:from-red-500/20 before:to-transparent before:rounded-2xl before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 group`}
            >
              <div
                className={`absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent ${
                  activeTab === "Rejected" ? "opacity-100" : ""
                }`}
              ></div>
              <div
                className={`absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-red-500/10 to-transparent ${
                  activeTab === "Rejected" ? "opacity-100" : ""
                }`}
              ></div>
              <div
                className={`absolute inset-y-0 -left-px w-px bg-gradient-to-b from-transparent via-red-500/50 to-transparent transition-opacity duration-500 ${
                  activeTab === "Rejected"
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                }`}
              ></div>
              <div
                className={`absolute inset-y-0 -right-px w-px bg-gradient-to-b from-transparent via-red-500/50 to-transparent transition-opacity duration-500 ${
                  activeTab === "Rejected"
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                }`}
              ></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xl text-red-500 font-medium tracking-wider">
                    REJECTED
                  </div>
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <svg
                      className="w-6 h-6 text-red-500"
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
                  </div>
                </div>
                <div
                  className={`text-3xl font-bold text-white mb-1 transition-transform duration-300 ${
                    activeTab === "Rejected"
                      ? "scale-105"
                      : "group-hover:scale-105"
                  }`}
                >
                  {combinedStatsData.rejected}
                </div>
                <div className="text-sm text-gray-400 mb-4">Requests</div>
              </div>
            </div>
          </div>

          {/* Team Code Tabs */}
          <div className="flex space-x-4 mb-8 bg-[#1a1a1a] p-4 rounded-2xl border border-gray-800/20">
            <button
              onClick={() => setActiveTeamCode("ALL")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTeamCode === "ALL"
                  ? "bg-blue-500/10 text-blue-500"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              All Teams
            </button>
            <button
              onClick={() => setActiveTeamCode("ENT-1")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTeamCode === "ENT-1"
                  ? "bg-purple-500/10 text-purple-500"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              ENT-1
            </button>
            <button
              onClick={() => setActiveTeamCode("ENT-2")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTeamCode === "ENT-2"
                  ? "bg-pink-500/10 text-pink-500"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              ENT-2
            </button>
            <button
              onClick={() => setActiveTeamCode("ENT-3")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTeamCode === "ENT-3"
                  ? "bg-indigo-500/10 text-indigo-500"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              ENT-3
            </button>
          </div>

          {/* Table Container */}
          <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-gray-800/20">
            <div className="overflow-x-auto relative loading-container">
              {isLoadingRedeem || isLoadingDisputed ? (
                <div className="loading-overlay">
                  <div className="relative flex flex-col items-center gap-2 p-2">
                    {/* Single spinner with text */}
                    <div className="flex items-center gap-2">
                      <div className="loading-spinner spinner-blue" />
                      <p className="text-xs font-medium text-gray-400">
                        Loading...
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
              {renderTable()}
            </div>
            <div className="px-4 py-3 border-t border-gray-800 bg-[#1a1a1a]">
              <div className="flex items-center justify-between text-sm text-gray-400">
                <div>
                  {/* Showing {redeemRequests.length} of {totalRecords} entries */}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button className="px-3 py-1 rounded-lg bg-blue-500 text-white">
                    {currentPage}
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {selectedRequest && (
        <ProcessModal
          isOpen={isProcessModalOpen}
          onClose={handleCloseProcessModal}
          redeemId={
            isDisputedRequest(selectedRequest)
              ? selectedRequest.recharge_id
              : selectedRequest.redeem_id
          }
          playerName={selectedRequest.player_name}
          playerData={
            selectedRequest.player_data || { profile: { profilePic: "" } }
          }
          init_by={selectedRequest.init_by}
          gameUsername={selectedRequest.game_username}
          platform={selectedRequest.game_platform}
          amount={
            isDisputedRequest(selectedRequest)
              ? selectedRequest.credits_loaded
              : selectedRequest.total_amount
          }
          bonus={0}
          promotion=""
          identifier=""
          onProcess={handleProcess}
          isProcessing={isProcessing}
          remarks={selectedRequest.notes || ""}
        />
      )}

      <RejectModal
        isOpen={isRejectModalOpen}
        onClose={handleCloseRejectModal}
        onReject={handleReject}
        isRejecting={isRejecting}
      />
    </div>
  );
};

export default OperationsRedeemPage;
