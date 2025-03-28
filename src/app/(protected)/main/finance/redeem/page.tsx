"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { AdminHeader, FinanceHeader } from "@/app/components/Headers";
import { BadgePoundSterling, Pause, SendHorizontal } from "lucide-react";
import { User } from "@/app/types";
import ProcessPaymentModal from "@/app/components/ProcessPaymentModal";
import Image from "next/image";
import cashappIcon from "@/assets/icons/cashapp.svg";
import venmoIcon from "@/assets/icons/venmo.svg";
import chimeIcon from "@/assets/icons/chime.svg";
import { useFinanceRedeem } from "@/hooks/useFinanceRedeem";
import type { RedeemRequest } from "@/hooks/useFinanceRedeem";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { usePaymentCashtags } from "@/hooks/usePaymentCashtags";
import { supabase } from "@/lib/supabase";
import { sendManyChatMessage, MANYCHAT_TEMPLATES } from "@/utils/manychat";
import AlertModal from "@/app/components/AlertModal";
import {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import TimeElapsed from "@/app/components/TimeElapsed";
import { AgentImage } from "@/app/components/recharge/AgentImage";
import { useUserName } from "@/hooks/useUserName";
import RedeemHoldDetailsModal from "@/app/components/RedeemHoldDetailsModal";
import { AgentInfo } from "@/app/components/AgentInfo";

interface Stats {
  pending: number;
  verification_failed: number;
  rejected: number;
  under_processing: number;
  queued: number;
  processed: number;
  paused: number;
  completed: number;
  partiallyPaid: number;
}

interface RealtimePayload {
  id: string;
  action_status: "idle" | "in_progress";
  status: string;
}

const FinanceRedeemPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RedeemRequest | null>(
    null
  );
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [loadingAction, setLoadingAction] = useState<{
    id: string;
    type: "process" | "pause" | "resume";
  } | null>(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [stage, setStage] = useState(1);
  const [isHoldLoading, setIsHoldLoading] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: "success" | "error";
    message: string;
  }>({ isOpen: false, type: "success", message: "" });
  const [redeemRequests, setRedeemRequests] = useState<RedeemRequest[]>([]);
  const { userName, getUserName } = useUserName();

  const {
    redeemRequests: initialRedeemRequests,
    loading: isLoading,
    error,
    stats,
    fetchRedeemRequests,
    processPayment,
    pauseRequest,
    resumeRequest,
    activeTab,
    setActiveTab,
    fetchStats,
  } = useFinanceRedeem();

  const { logActivity } = useActivityLogger();
  const { activeCashtags, loading: cashtagsLoading } = usePaymentCashtags();

  const [showHoldDetailsModal, setShowHoldDetailsModal] = useState(false);

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
        parsedUser.department !== "Finance" &&
        parsedUser.department !== "Admin"
      ) {
        router.push("/login");
        return;
      }
      setUser(parsedUser);
      fetchStats();
      fetchRedeemRequests("queued");
    } catch (error) {
      console.error("Error parsing user data:", error);
      router.push("/login");
    }
  }, [router, fetchRedeemRequests, fetchStats]);

  useEffect(() => {
    let realtimeChannel: RealtimeChannel;

    const setupRealtimeSubscription = () => {
      realtimeChannel = supabase
        .channel("redeem_requests_changes")
        .on(
          "postgres_changes" as const,
          {
            event: "*",
            schema: "public",
            table: "redeem_requests",
          },
          async (payload: RealtimePostgresChangesPayload<any>) => {
            console.log("Realtime update received:", payload);

            if (
              payload.new &&
              typeof payload.new === "object" &&
              "id" in payload.new &&
              "action_status" in payload.new
            ) {
              setRedeemRequests((prevRequests) =>
                prevRequests.map((request) =>
                  request.redeemId === payload.new.id
                    ? { ...request, action_status: payload.new.action_status }
                    : request
                )
              );
            }

            if (
              payload.eventType === "UPDATE" ||
              payload.eventType === "INSERT"
            ) {
              await fetchStats();

              const currentStatus =
                activeTab === "All"
                  ? undefined
                  : activeTab === "Partially Paid"
                    ? ["queued_partially_paid", "paused_partially_paid"]
                    : activeTab.toLowerCase();

              const shouldRefreshList =
                activeTab === "All" ||
                (activeTab === "Partially Paid" &&
                  payload.new &&
                  typeof payload.new === "object" &&
                  "status" in payload.new &&
                  ["queued_partially_paid", "paused_partially_paid"].includes(
                    payload.new.status
                  )) ||
                (payload.new &&
                  typeof payload.new === "object" &&
                  "status" in payload.new &&
                  payload.new.status === currentStatus);

              if (shouldRefreshList) {
                await fetchRedeemRequests(currentStatus);
              }
            }
          }
        )
        .subscribe((status) => {
          console.log("Realtime subscription status:", status);
        });
    };

    setupRealtimeSubscription();

    return () => {
      if (realtimeChannel) {
        console.log("Cleaning up realtime subscription");
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [activeTab, fetchRedeemRequests, fetchStats]);

  // Set initial active tab to "Queued" and fetch data
  useEffect(() => {
    setActiveTab("Queued");
    const fetchInitialData = async () => {
      await fetchStats();
      await fetchRedeemRequests("queued");
      console.log("[Initial Data Fetch] Completed");
    };
    fetchInitialData();
  }, [fetchRedeemRequests, fetchStats]);

  // Update local state when initial requests are loaded
  useEffect(() => {
    if (initialRedeemRequests) {
      console.log(
        "[State Update] Setting redeem requests:",
        initialRedeemRequests
      );
      setRedeemRequests(initialRedeemRequests);
    }
  }, [initialRedeemRequests]);

  // Add effect to log state changes for debugging
  useEffect(() => {
    console.log("[Debug] Current state:", {
      activeTab,
      statsQueued: stats?.queued,
      redeemRequestsCount: redeemRequests.length,
      redeemRequests,
    });
  }, [activeTab, stats, redeemRequests]);

  // Add effect to monitor state changes
  useEffect(() => {
    const handleAutoOpenModal = async () => {
      console.log("[AutoModal] Starting handleAutoOpenModal", {
        userId: user?.id,
        requestsCount: redeemRequests.length,
        showProcessModal,
      });

      if (!user?.id) {
        console.log("[AutoModal] No user ID found, returning");
        return;
      }

      try {
        // Find any request that's in progress
        const inProgressRequest = redeemRequests.find(
          (request: RedeemRequest) => {
            const isInProgress =
              request.processing_state.status === "in_progress";
            const isProcessedByMe =
              request.processing_state.processed_by === user.id;
            const hasMatchingModalType =
              request.processing_state.modal_type === "payment_modal";

            console.log("[AutoModal] Checking request:", {
              requestId: request.redeemId,
              status: request.processing_state.status,
              processedBy: request.processing_state.processed_by,
              modalType: request.processing_state.modal_type,
              isInProgress,
              isProcessedByMe,
              hasMatchingModalType,
            });

            // Return true only if all conditions are met
            return isInProgress && isProcessedByMe && hasMatchingModalType;
          }
        );

        console.log(
          "[AutoModal] Found in-progress request:",
          inProgressRequest
        );

        if (inProgressRequest) {
          console.log("[AutoModal] Setting selected request and modal state");
          setSelectedRequest(inProgressRequest);
          setShowProcessModal(true);
        } else {
          console.log(
            "[AutoModal] No matching in-progress request found for current user"
          );
        }
      } catch (error) {
        console.error("[AutoModal] Error in handleAutoOpenModal:", error);
      }
    };

    if (user?.id && redeemRequests.length > 0) {
      console.log("[AutoModal] Conditions met, calling handleAutoOpenModal");
      handleAutoOpenModal();
    } else {
      console.log("[AutoModal] Conditions not met:", {
        hasUserId: !!user?.id,
        requestsCount: redeemRequests.length,
      });
    }
  }, [redeemRequests, user?.id]);

  // Add effect to fetch processor name when a request's processing state changes
  useEffect(() => {
    const fetchProcessorName = async () => {
      const processingRequests = redeemRequests.filter(
        (request) => request.processing_state.status === "in_progress"
      );

      for (const request of processingRequests) {
        if (request.processing_state.processed_by) {
          await getUserName(request.processing_state.processed_by);
        }
      }
    };

    fetchProcessorName();
  }, [redeemRequests, getUserName]);

  console.log("stats", stats);
  console.log("redeemRequests", redeemRequests);
  const handleProcessPayment = async (request: RedeemRequest) => {
    try {
      // Check if request is already in progress
      if (request.processing_state.status === "in_progress") {
        console.log("[ProcessPayment] Request is already being processed", {
          requestId: request.redeemId,

          currentStatus: request.processing_state.status,
          processedBy: request.processing_state.processed_by,
        });
        setAlertModal({
          isOpen: true,
          type: "error",
          message: "This request is already being processed by another user",
        });
        return;
      }

      // Check if player is banned
      const { data: playerStatus, error: statusError } = await supabase
        .from("players")
        .select("status")
        .eq("vip_code", request.vip_code)
        .maybeSingle();

      if (statusError) {
        console.error(
          "[ProcessPayment] Error checking player status:",
          statusError
        );
        setAlertModal({
          isOpen: true,
          type: "error",
          message: "Error checking player status",
        });
        return;
      }

      if (playerStatus?.status === "banned") {
        setAlertModal({
          isOpen: true,
          type: "error",
          message: "This player is banned. Cannot process any requests.",
        });
        return;
      }

      setLoadingAction({ id: request.redeemId, type: "process" });

      console.log("[ProcessPayment] Acquiring processing lock", {
        requestId: request.redeemId,
        userId: user?.id,
      });

      // Acquire processing state with payment_modal type
      const { data: lockData, error: lockError } = await supabase.rpc(
        "acquire_request_processing",
        {
          request_id: request.redeemId,
          user_id: user?.id,
          p_modal_type: "payment_modal",
        }
      );

      if (lockError) {
        console.error(
          "[ProcessPayment] Error acquiring processing state:",
          lockError
        );
        setAlertModal({
          isOpen: true,
          type: "error",
          message: "Failed to acquire processing state",
        });
        return;
      }

      if (!lockData) {
        console.log(
          "[ProcessPayment] Could not acquire lock - request might be locked by another user"
        );
        setAlertModal({
          isOpen: true,
          type: "error",
          message: "Request is locked by another user",
        });
        return;
      }

      console.log("[ProcessPayment] Lock acquired successfully", {
        lockData,
        requestId: request.redeemId,
      });

      // Update local state to reflect the lock
      const updatedRequest: RedeemRequest = {
        ...request,
        processing_state: {
          ...request.processing_state,
          status: "in_progress" as const,
          processed_by: user?.id || null,
          modal_type: "payment_modal",
        },
      };

      setSelectedRequest(updatedRequest);
      setShowProcessModal(true);

      // Update the redeemRequests array with the updated request
      setRedeemRequests((prevRequests) =>
        prevRequests.map((r) =>
          r.redeemId === request.redeemId ? updatedRequest : r
        )
      );
    } catch (error) {
      console.error(
        "[ProcessPayment] Failed to update processing state:",
        error
      );
      setAlertModal({
        isOpen: true,
        type: "error",
        message: "An unexpected error occurred",
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleModalClose = async () => {
    if (selectedRequest && user?.id) {
      try {
        console.log("[handleModalClose] Resetting processing state to idle");
        const { error } = await supabase.rpc("release_request_processing", {
          request_id: selectedRequest.redeemId,
          user_id: user.id,
        });

        if (error) {
          console.error("[handleModalClose] Error resetting status:", error);
        }
      } catch (error) {
        console.error("[handleModalClose] Unexpected error:", error);
      }
    }
    setShowProcessModal(false);
    setSelectedRequest(null);
    fetchRedeemRequests();
  };

  // Add effect to monitor state changes
  useEffect(() => {
    console.log("[State Change] Modal states:", {
      showProcessModal,
      selectedRequest,
      totalAmount,
      stage,
    });
  }, [showProcessModal, selectedRequest, totalAmount, stage]);

  const handleTabClick = async (
    tab: "All" | "Queued" | "Paused" | "Partially Paid" | "Completed"
  ) => {
    console.log("[handleTabClick] Changing to tab:", tab);
    setActiveTab(tab);

    let status: string | string[] | undefined;
    switch (tab) {
      case "Partially Paid":
        status = ["queued_partially_paid", "paused_partially_paid"];
        break;
      case "Queued":
        status = "queued";
        break;
      case "Paused":
        status = "paused";
        break;
      case "Completed":
        status = "completed";
        break;
    }

    try {
      await fetchRedeemRequests(status);
      console.log("[handleTabClick] Fetched requests for status:", status);
    } catch (error) {
      console.error("[handleTabClick] Error fetching requests:", error);
    }
  };

  const handlePauseRequest = async (redeemId: string) => {
    try {
      setLoadingAction({ id: redeemId, type: "pause" });

      // Check if request is already in progress
      const request = redeemRequests.find((r) => r.redeemId === redeemId);
      if (!request) {
        setAlertModal({
          isOpen: true,
          type: "error",
          message: "Request not found",
        });
        return;
      }

      if (request.processing_state.status === "in_progress") {
        setAlertModal({
          isOpen: true,
          type: "error",
          message: "This request is already being processed",
        });
        return;
      }

      // Check if player is banned
      const { data: playerStatus, error: statusError } = await supabase
        .from("players")
        .select("status")
        .eq("vip_code", request.vip_code)
        .single();

      if (statusError) {
        console.error("Error checking player status:", statusError);
        setAlertModal({
          isOpen: true,
          type: "error",
          message: "Error checking player status",
        });
        return;
      }

      if (playerStatus?.status === "banned") {
        setAlertModal({
          isOpen: true,
          type: "error",
          message: "This player is banned. Cannot process any requests.",
        });
        return;
      }

      await pauseRequest(redeemId);

      // Send ManyChat message
      await sendManyChatMessage({
        subscriberId: request.messenger_id || "",
        message: MANYCHAT_TEMPLATES.REQUEST_PAUSED(redeemId),
        teamCode: request.team_code,
      });

      fetchRedeemRequests(
        activeTab === "All" ? undefined : activeTab.toLowerCase()
      );
    } catch (error) {
      console.error("Error pausing request:", error);
      setAlertModal({
        isOpen: true,
        type: "error",
        message: "Failed to pause request",
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleResumeRequest = async (redeemId: string) => {
    try {
      setLoadingAction({ id: redeemId, type: "resume" });

      // Check if request is already in progress
      const request = redeemRequests.find((r) => r.redeemId === redeemId);
      if (!request) {
        setAlertModal({
          isOpen: true,
          type: "error",
          message: "Request not found",
        });
        return;
      }

      if (request.processing_state.status === "in_progress") {
        setAlertModal({
          isOpen: true,
          type: "error",
          message: "This request is already being processed",
        });
        return;
      }

      // Check if player is banned
      const { data: playerStatus, error: statusError } = await supabase
        .from("players")
        .select("status")
        .eq("vip_code", request.vip_code)
        .single();

      if (statusError) {
        console.error("Error checking player status:", statusError);
        setAlertModal({
          isOpen: true,
          type: "error",
          message: "Error checking player status",
        });
        return;
      }

      if (playerStatus?.status === "banned") {
        setAlertModal({
          isOpen: true,
          type: "error",
          message: "This player is banned. Cannot process any requests.",
        });
        return;
      }

      await resumeRequest(redeemId);

      // Send ManyChat message
      await sendManyChatMessage({
        subscriberId: request.messenger_id || "",
        message: MANYCHAT_TEMPLATES.REQUEST_RESUMED(redeemId),
        teamCode: request.team_code,
      });

      fetchRedeemRequests(
        activeTab === "All" ? undefined : activeTab.toLowerCase()
      );
    } catch (error) {
      console.error("Error resuming request:", error);
      setAlertModal({
        isOpen: true,
        type: "error",
        message: "Failed to resume request",
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const renderActionButtons = (request: RedeemRequest) => {
    const isProcessLoading =
      loadingAction?.id === request.redeemId &&
      loadingAction?.type === "process";
    const isPauseLoading =
      loadingAction?.id === request.redeemId && loadingAction?.type === "pause";
    const isResumeLoading =
      loadingAction?.id === request.redeemId &&
      loadingAction?.type === "resume";
    const isInProgress = request.processing_state.status === "in_progress";

    return (
      <div className="flex gap-2">
        {request.status !== "paused" &&
          request.status !== "paused_partially_paid" && (
            <>
              <button
                onClick={() => handleProcessPayment(request)}
                disabled={isProcessLoading || isInProgress}
                className={`p-1.5 rounded-lg relative group ${isProcessLoading || isInProgress
                    ? "bg-gray-500/10 text-gray-500"
                    : "bg-emerald-400 hover:bg-emerald-500"
                  }`}
                title={
                  isInProgress
                    ? `This request is being processed by ${userName || "another user"
                    }`
                    : ""
                }
              >
                {isProcessLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <SendHorizontal className="" color="black" size={16} />
                )}
                {/* {isInProgress && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-xs text-white rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                  This request is being processed by {userName || 'another user'}
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                </div>
              )} */}
              </button>
              <button
                onClick={() => handlePauseRequest(request.redeemId)}
                disabled={isPauseLoading || isInProgress}
                className={`p-1.5 rounded-lg ${isPauseLoading || isInProgress
                    ? "bg-gray-500/10 text-gray-500"
                    : "bg-yellow-400 hover:bg-yellow-500"
                  }`}
              >
                {isPauseLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Pause className="" color="black" size={16} />
                )}
              </button>
            </>
          )}
        {(request.status === "paused" ||
          request.status === "paused_partially_paid") && (
            <button
              onClick={() => handleResumeRequest(request.redeemId)}
              disabled={isResumeLoading || isInProgress}
              className={`p-1.5 rounded-lg ${isResumeLoading || isInProgress
                  ? "bg-gray-500/10 text-gray-500"
                  : "bg-yellow-400 hover:bg-yellow-500"
                }`}
            >
              {isResumeLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="black"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
            </button>
          )}
      </div>
    );
  };

  console.log("stats------------->", stats);

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      {user.department === "Finance" ? (
        <FinanceHeader user={user} />
      ) : (
        <AdminHeader user={user} />
      )}
      {showProcessModal && selectedRequest && (
        <ProcessPaymentModal
          isOpen={showProcessModal}
          onClose={handleModalClose}
          request={selectedRequest}
          activeCashtags={activeCashtags}
          onProcess={async (
            amount,
            paymentMethods,
            reference,
            notes,
            identifier
          ) => {
            try {
              setLoadingAction({
                id: selectedRequest.redeemId,
                type: "process",
              });

              await processPayment(
                selectedRequest.redeemId,
                selectedRequest.redeem_id || "",
                amount,
                paymentMethods,
                reference,
                notes,
                identifier
              );

              // Reset processing state after successful payment
              const { error: resetError } = await supabase
                .from("redeem_requests")
                .update({
                  processing_state: {
                    status: "idle",
                    processed_by: null,
                    modal_type: "none",
                  },
                })
                .eq("id", selectedRequest.redeemId);

              if (resetError) {
                console.error(
                  "[Payment] Error resetting processing state:",
                  resetError
                );
              }

              // Calculate amounts after successful payment
              const totalAmount = selectedRequest.total_amount || 0;
              const previouslyPaid = selectedRequest.amount_paid || 0;
              const currentPayment = amount;
              const totalPaid = previouslyPaid + currentPayment;
              const remainingAmount = totalAmount - totalPaid;

              console.log("[Payment] Amount calculations:", {
                totalAmount,
                previouslyPaid,
                currentPayment,
                totalPaid,
                remainingAmount,
              });

              // Send appropriate ManyChat message based on payment status
              if (remainingAmount > 0) {
                await sendManyChatMessage({
                  subscriberId: selectedRequest.messenger_id || "",
                  message: MANYCHAT_TEMPLATES.PARTIAL_PAYMENT(
                    totalAmount,
                    selectedRequest.redeem_id || "",
                    totalPaid,
                    remainingAmount
                  ),
                  teamCode: selectedRequest.team_code,
                });
              } else {
                await sendManyChatMessage({
                  subscriberId: selectedRequest.messenger_id || "",
                  message: MANYCHAT_TEMPLATES.PAYMENT_PROCESSED(
                    totalAmount,
                    selectedRequest.redeem_id || "",
                    0, // remaining amount is 0 for completed payments
                    totalPaid
                  ),
                  teamCode: selectedRequest.team_code,
                });
              }

              setShowProcessModal(false);
              setSelectedRequest(null);
              // Refresh data after processing payment
              fetchRedeemRequests(
                activeTab === "All" ? undefined : activeTab.toLowerCase()
              );
            } catch (error) {
              setShowProcessModal(false);
              setSelectedRequest(null);
              // console.error("Error processing payment:", error);
              // setAlertModal({
              //   isOpen: true,
              //   type: "error",
              //   message: "Failed to process payment",
              // });
            } finally {
              setLoadingAction(null);
            }
          }}
        />
      )}
      <div className="flex-1 pl-64 overflow-hidden">
        <main className="p-8">
          {isLoading ? (
            <div className="flex items-center justify-center h-screen">
              <div className="text-white">Loading...</div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-8">
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                  Redeem Requests
                </h1>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-4 gap-6 mb-8">
                {/* Queued Card */}
                <div
                  onClick={() => handleTabClick("Queued")}
                  className={`relative bg-[#1a1a1a] rounded-2xl p-6 cursor-pointer transform transition-all duration-200 hover:scale-105 ${activeTab === "Queued" ? "scale-105 before:opacity-100" : ""
                    } before:absolute before:inset-0 before:bg-gradient-to-b before:from-amber-500/20 before:to-transparent before:rounded-2xl before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 group`}
                >
                  <div
                    className={`absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent ${activeTab === "Queued" ? "opacity-100" : ""
                      }`}
                  ></div>
                  <div
                    className={`absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-amber-500/10 to-transparent ${activeTab === "Queued" ? "opacity-100" : ""
                      }`}
                  ></div>
                  <div
                    className={`absolute inset-y-0 -left-px w-px bg-gradient-to-b from-transparent via-amber-500/50 to-transparent transition-opacity duration-500 ${activeTab === "Queued"
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                      }`}
                  ></div>
                  <div
                    className={`absolute inset-y-0 -right-px w-px bg-gradient-to-b from-transparent via-amber-500/50 to-transparent transition-opacity duration-500 ${activeTab === "Queued"
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                      }`}
                  ></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm text-amber-500 font-medium tracking-wider">
                        QUEUED
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
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div>
                        <div
                          className={`text-2xl font-bold text-white mb-1 transition-transform duration-300 ${activeTab === "Queued"
                              ? "scale-105"
                              : "group-hover:scale-105"
                            }`}
                        >
                          {isLoading ? (
                            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <div className="flex items-center gap-2">
                              <span>{stats?.queued || 0}</span>
                              <svg
                                className="w-4 h-4 text-amber-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-400 mt-2">Requests</div>
                  </div>
                </div>

                {/* Paused Card */}
                <div
                  onClick={() => handleTabClick("Paused")}
                  className={`relative bg-[#1a1a1a] rounded-2xl p-6 cursor-pointer transform transition-all duration-200 hover:scale-105 ${activeTab === "Paused" ? "scale-105 before:opacity-100" : ""
                    } before:absolute before:inset-0 before:bg-gradient-to-b before:from-yellow-500/20 before:to-transparent before:rounded-2xl before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 group`}
                >
                  <div
                    className={`absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent ${activeTab === "Paused" ? "opacity-100" : ""
                      }`}
                  ></div>
                  <div
                    className={`absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-yellow-500/10 to-transparent ${activeTab === "Paused" ? "opacity-100" : ""
                      }`}
                  ></div>
                  <div
                    className={`absolute inset-y-0 -left-px w-px bg-gradient-to-b from-transparent via-yellow-500/50 to-transparent transition-opacity duration-500 ${activeTab === "Paused"
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                      }`}
                  ></div>
                  <div
                    className={`absolute inset-y-0 -right-px w-px bg-gradient-to-b from-transparent via-yellow-500/50 to-transparent transition-opacity duration-500 ${activeTab === "Paused"
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                      }`}
                  ></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm text-yellow-500 font-medium tracking-wider">
                        PAUSED
                      </div>
                      <div className="p-2 bg-yellow-500/10 rounded-lg">
                        <svg
                          className="w-6 h-6 text-yellow-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div
                      className={`text-3xl font-bold text-white mb-1 transition-transform duration-300 ${activeTab === "Paused"
                          ? "scale-105"
                          : "group-hover:scale-105"
                        }`}
                    >
                      {isLoading ? (
                        <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        stats?.paused || 0
                      )}
                    </div>
                    <div className="text-sm text-gray-400 mb-4">Requests</div>
                  </div>
                </div>

                {/* Partially Paid Card */}
                <div
                  onClick={() => handleTabClick("Partially Paid")}
                  className={`relative bg-[#1a1a1a] rounded-2xl p-6 cursor-pointer transform transition-all duration-200 hover:scale-105 ${activeTab === "Partially Paid"
                      ? "scale-105 before:opacity-100"
                      : ""
                    } before:absolute before:inset-0 before:bg-gradient-to-b before:from-purple-500/20 before:to-transparent before:rounded-2xl before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 group`}
                >
                  <div
                    className={`absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent ${activeTab === "Partially Paid" ? "opacity-100" : ""
                      }`}
                  ></div>
                  <div
                    className={`absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-purple-500/10 to-transparent ${activeTab === "Partially Paid" ? "opacity-100" : ""
                      }`}
                  ></div>
                  <div
                    className={`absolute inset-y-0 -left-px w-px bg-gradient-to-b from-transparent via-purple-500/50 to-transparent transition-opacity duration-500 ${activeTab === "Partially Paid"
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                      }`}
                  ></div>
                  <div
                    className={`absolute inset-y-0 -right-px w-px bg-gradient-to-b from-transparent via-purple-500/50 to-transparent transition-opacity duration-500 ${activeTab === "Partially Paid"
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                      }`}
                  ></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm text-purple-500 font-medium tracking-wider">
                        PARTIALLY PAID
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
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div
                      className={`text-3xl font-bold text-white mb-1 transition-transform duration-300 ${activeTab === "Partially Paid"
                          ? "scale-105"
                          : "group-hover:scale-105"
                        }`}
                    >
                      {isLoading ? (
                        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        stats?.partiallyPaid || 0
                      )}
                    </div>
                    <div className="text-sm text-gray-400 mb-4">Requests</div>
                  </div>
                </div>

                {/* Completed Card */}
                <div
                  onClick={() => handleTabClick("Completed")}
                  className={`relative bg-[#1a1a1a] rounded-2xl p-6 cursor-pointer transform transition-all duration-200 hover:scale-105 ${activeTab === "Completed"
                      ? "scale-105 before:opacity-100"
                      : ""
                    } before:absolute before:inset-0 before:bg-gradient-to-b before:from-emerald-500/20 before:to-transparent before:rounded-2xl before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 group`}
                >
                  <div
                    className={`absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent ${activeTab === "Completed" ? "opacity-100" : ""
                      }`}
                  ></div>
                  <div
                    className={`absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent ${activeTab === "Completed" ? "opacity-100" : ""
                      }`}
                  ></div>
                  <div
                    className={`absolute inset-y-0 -left-px w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent transition-opacity duration-500 ${activeTab === "Completed"
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                      }`}
                  ></div>
                  <div
                    className={`absolute inset-y-0 -right-px w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent transition-opacity duration-500 ${activeTab === "Completed"
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                      }`}
                  ></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm text-emerald-500 font-medium tracking-wider">
                        COMPLETED
                      </div>
                      <div className="p-2 bg-emerald-500/10 rounded-lg">
                        <svg
                          className="w-6 h-6 text-emerald-500"
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
                      className={`text-3xl font-bold text-white mb-1 transition-transform duration-300 ${activeTab === "Completed"
                          ? "scale-105"
                          : "group-hover:scale-105"
                        }`}
                    >
                      {isLoading ? (
                        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        stats?.completed || 0
                      )}
                    </div>
                    <div className="text-sm text-gray-400 mb-4">Requests</div>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-gray-800/20">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                          PROCESSED BY
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                          VERIFIED BY
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                          PENDING SINCE
                        </th>

                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                          REDEEM ID
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                          PLAYER NAME
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                          TOTAL AMOUNT
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                          PAID AMOUNT
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                          HOLD AMOUNT
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                          REMAINING AMOUNT
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                          AVAILABLE TO HOLD
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                          PAYMENT METHOD
                        </th>

                        {activeTab !== "Completed" && (
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                            ACTIONS
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {redeemRequests.map((request, index) => (
                        <tr
                          key={index}
                          className="hover:bg-[#252b3b]"
                        >
                          <td
                            className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 text-center cursor-pointer"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowHoldDetailsModal(true);
                            }}
                          >
                            <AgentInfo
                              name={request.operation_by?.name}
                              employeeCode={request.operation_by?.employee_code}

                            />
                          </td>
                          <td
                            className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 text-center cursor-pointer"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowHoldDetailsModal(true);
                            }}
                          >
                            <AgentInfo
                              name={request.verified_by?.name}
                              employeeCode={request.verified_by?.employee_code}

                            />
                          </td>
                          <td
                            className="px-4 py-3 whitespace-nowrap text-center cursor-pointer"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowHoldDetailsModal(true);
                            }}
                          >
                            {request.created_at && (
                              <TimeElapsed
                                date={request.created_at}
                                className="flex flex-col items-center"
                                elapsedClassName="text-sm font-medium text-gray-300"
                                fullDateClassName="text-xs text-gray-400"
                              />
                            )}
                          </td>

                          <td
                            className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 text-center cursor-pointer"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowHoldDetailsModal(true);
                            }}
                          >
                            {request.redeem_id}
                          </td>
                          <td
                            className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 text-center cursor-pointer"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowHoldDetailsModal(true);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <Image
                                src={
                                  request.player_data?.profile?.profilePic ||
                                  `https://ui-avatars.com/api/?name=${request.player_name}`
                                }
                                alt={request.player_name}
                                width={32}
                                height={32}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                              <div className="flex flex-col ">
                                <span className=" text-sm text-gray-300">
                                  {request.player_name}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {request.vip_code}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td
                            className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 text-center cursor-pointer"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowHoldDetailsModal(true);
                            }}
                          >
                            <span className="text-sm font-medium text-white-500">
                              ${(request.total_amount || 0).toFixed(2)}
                            </span>
                          </td>
                          <td
                            className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 text-center cursor-pointer"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowHoldDetailsModal(true);
                            }}
                          >
                            <span className="text-sm font-medium text-white-500">
                              ${(request.amount_paid || 0).toFixed(2)}
                            </span>
                          </td>
                          <td
                            className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 text-center cursor-pointer"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowHoldDetailsModal(true);
                            }}
                          >
                            <span className="text-sm font-medium text-white-500">
                              ${(request.amount_hold || 0).toFixed(2)}
                            </span>
                          </td>
                          <td
                            className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 text-center cursor-pointer"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowHoldDetailsModal(true);
                            }}
                          >
                            <span className="text-sm font-medium text-white-500">
                              $
                              {(
                                (request.total_amount || 0) -
                                (request.amount_paid || 0)
                              ).toFixed(2)}
                            </span>
                          </td>
                          <td
                            className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 text-center cursor-pointer"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowHoldDetailsModal(true);
                            }}
                          >
                            <span className="text-sm font-medium text-white-500">
                              ${(request.amount_available || 0).toFixed(2)}
                            </span>
                          </td>
                          <td
                            className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 text-center cursor-pointer"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowHoldDetailsModal(true);
                            }}
                          >
                            <div className="flex items-center gap-2   mx-auto">
                              {request.paymentMethods[0] && (
                                <div className="relative group mx-auto">
                                  <div className="w-8 h-8 rounded-lg bg-gray-800/50 cursor-pointer mx-auto">
                                    <Image
                                      src={
                                        request.paymentMethods[0].type ===
                                          "cashapp"
                                          ? cashappIcon
                                          : request.paymentMethods[0].type ===
                                            "venmo"
                                            ? venmoIcon
                                            : chimeIcon
                                      }
                                      alt={request.paymentMethods[0].type}
                                      className="w-full h-full object-contain"
                                    />
                                  </div>
                                  {/* Tooltip */}
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-xs text-white rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                                    <div>
                                      {request.paymentMethods[0].username}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                          {request.total_amount === request.amount_hold && (
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 text-center">
                              <button className="px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700">
                                HOLD
                              </button>
                            </td>
                          )}
                          {activeTab !== "Completed" &&
                            request.total_amount !== request.amount_hold && (
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 text-center">
                                {renderActionButtons(request)}
                              </td>
                            )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 border-t border-gray-800 bg-[#1a1a1a]">
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <div>Showing {redeemRequests.length} entries</div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700">
                        Previous
                      </button>
                      <button className="px-3 py-1 rounded-lg bg-blue-500 text-white">
                        1
                      </button>
                      <button className="px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700">
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
        type={alertModal.type}
        message={alertModal.message}
      />
      <RedeemHoldDetailsModal
        isOpen={showHoldDetailsModal}
        onClose={() => setShowHoldDetailsModal(false)}
        request={selectedRequest}
      />
    </div>
  );
};

export default FinanceRedeemPage;
