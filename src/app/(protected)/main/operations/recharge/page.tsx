"use client";
import { useState, useEffect, Suspense, useMemo, useCallback } from "react";
import { AdminHeader, FinanceHeader } from "@/app/components/Headers";
import { useRouter } from "next/navigation";
import RefreshButton from "@/app/components/RefreshButton";
import { useFinanceRecharge } from "@/hooks/useFinanceRecharge";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { RedeemIdDisplay } from "@/app/components/recharge/RedeemIdDisplay";
import { PlayerImage } from "@/app/components/recharge/PlayerImage";
import TimeElapsed from "@/app/components/TimeElapsed";

import type {
  User,
  ExtendedPendingDeposit,
  ExtendedPendingWithdrawal,
  ExtendedCompanyTag,
  AvailableTags,
  CompanyTag,
  PaymentMethod,
} from "@/app/types/finance";
import { updateHoldDetails } from "./updateHoldDetails";
import { AgentInfo } from "@/app/components/AgentInfo";
import useAuth from "@/hooks/useAuth";
import { supabase } from "@/supabase/client";



const QueueDashboard = () => {
  const router = useRouter();
  const { user: authUser, isLoading: authLoading, isAuthenticated } = useAuth();

  // Replace the existing user state with auth user
  const [user, setUser] = useState<User | null>(authUser);
  
  // Add auth effect
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (authUser) {
      setUser(authUser);
    }
  }, [authUser, authLoading, isAuthenticated, router]);

  // Add session check effect
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
       
        return;
      }
    };

    checkSession();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showUnassignModal, setShowUnassignModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<ExtendedPendingDeposit | null>(null);
  const [selectedWithdrawal, setSelectedWithdrawal] =
    useState<ExtendedPendingWithdrawal | null>(null);
  const [activeAssignTab, setActiveAssignTab] = useState<
    "deposits" | "withdrawals"
  >("deposits");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [activeTab, setActiveTab] = useState<
    "All" | "Pending" | "Assigned" | "Completed" | "Rejected"
  >("Pending");
  const [loadingActions, setLoadingActions] = useState<{
    [key: string]: boolean;
  }>({});
  const [isAssignModalLoading, setIsAssignModalLoading] = useState(false);
  const [loadingWithdrawalButtons, setLoadingWithdrawalButtons] = useState<{
    [key: string]: boolean;
  }>({});
  const [loadingTagButtons, setLoadingTagButtons] = useState<{
    [key: string]: boolean;
  }>({});
  const [isWithdrawalsLoading, setIsWithdrawalsLoading] = useState(false);
  const [isTagsLoading, setIsTagsLoading] = useState(false);
  const [deposits, setDeposits] = useState<ExtendedPendingDeposit[]>([]);
  const [availableTags, setAvailableTags] = useState<AvailableTags>({
    companyTags: [],
    rechargeAmount: 0,
  });

  // Add new state for company tags with proper typing
  const [companyTags, setCompanyTags] = useState<CompanyTag[]>([]);
  const [loadingCompanyTags, setLoadingCompanyTags] = useState(false);
  const [companyTagsError, setCompanyTagsError] = useState<string | null>(null);

  const {
    deposits: hookDeposits,
    pendingWithdrawals,
    loading,
    fetchDeposits,
    fetchPendingWithdrawals,
    fetchAvailableTags,
    handleP2PAssign,
    checkWithdrawalAvailability,
    processRechargeRequest,
  } = useFinanceRecharge();

  // Add state for process modal
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [processingDeposit, setProcessingDeposit] =
    useState<ExtendedPendingDeposit | null>(null);
  const [processNotes, setProcessNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Move getPaymentType to the top level of the component
  const getPaymentType = (
    payment_method: PaymentMethod | PaymentMethod[] | null | undefined
  ) => {
    if (!payment_method) return null;
    if (Array.isArray(payment_method) && payment_method.length > 0) {
      return payment_method[0].type;
    }
    if (!Array.isArray(payment_method)) {
      return payment_method.type;
    }
    return null;
  };

  const filteredDeposits = useMemo(() => {
    return deposits.filter((deposit) =>
      activeTab === "Pending"
        ? deposit.status === "pending"
        : ["assigned", "assigned_and_hold"].includes(deposit.status)
    );
  }, [deposits, activeTab]);

  // Move transformRechargeRequest function declaration before its usage
  const transformRechargeRequest = useCallback(
    (data: any): ExtendedPendingDeposit => ({
      rechargeId: data.id || data.rechargeId,
      recharge_id: data.recharge_id,
      init_id: data.init_id,
      initiated_by: {
        name: data.initiated_by?.name,
        employee_code: data.initiated_by?.employee_code,
        profile_pic: data.initiated_by?.profile_pic
      },
      player_name: data.player_name,
      game_platform: data.game_platform,
      game_username: data.game_username,
      amount: data.amount,
      bonus_amount: data.bonus_amount || 0,
      vip_code: data.vip_code || "",
      messenger_id: data.messenger_id || "",
      status: data.status,
      teamCode: data.team_code || "",
      created_at: data.created_at,
      updated_at: data.updated_at || data.created_at,
      profile_pic: data.profile_pic,
      manychat_data: data.manychat_data,
      assignedRedeem: data.assigned_redeem,
      player_details: data.player_details || {},
      processing_state: data.processing_state,
      processed_at: data.processed_at || null,
      processed_by: data.processed_by || null,
      payment_method: data.payment_method || null,
      promotion: data.promotion || null,
      screenshot_url: data.screenshot_url || "",
      credits_loaded: data.credits_loaded,
      promo_code: data.promo_code,
      promo_type: data.promo_type,
      notes: data.notes,
      reject_reason: data.reject_reason,
      reject_notes: data.reject_notes,
      rejected_at: data.rejected_at,
      rejected_by: data.rejected_by,
      agent_name: data.agent_name,
      agent_department: data.agent_department,
      platform_usernames: data.platform_usernames || [],
      assigned_ct: data.assigned_ct
        ? {
            c_id: data.assigned_ct.c_id || "",
            type: data.assigned_ct.type || "",
            amount: data.assigned_ct.amount || 0,
            cashtag: data.assigned_ct.cashtag || "",
            assigned_at: data.assigned_ct.assigned_at || "",
            assigned_by: data.assigned_ct.assigned_by || "",
            company_tag: data.assigned_ct.company_tag || "",
          }
        : undefined,
    }),
    []
  );

  // Update the useEffect that sets deposits
  useEffect(() => {
    if (hookDeposits) {
      const transformedDeposits = hookDeposits.map((deposit) =>
        transformRechargeRequest(deposit)
      );
      setDeposits(transformedDeposits);
    }
  }, [hookDeposits, transformRechargeRequest]);

  // Initial fetch
  useEffect(() => {
    fetchDeposits();
  }, [fetchDeposits]);

  useEffect(() => {}, [deposits, filteredDeposits]);

  useEffect(() => {
 
    const userData = localStorage.getItem("user");

    if (!userData) {
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
    } catch (error) {
      console.error("Error parsing user data:", error);
      router.push("/login");
    }
  }, [router]);

  // Fetch withdrawals when assign modal opens
  useEffect(() => {
    if (showAssignModal) {
      fetchPendingWithdrawals();
      if (selectedRequest) {
        fetchAvailableTags(selectedRequest.rechargeId);
      }
    }
  }, [
    showAssignModal,
    selectedRequest,
    fetchPendingWithdrawals,
    fetchAvailableTags,
  ]);

  // Add this effect to handle data loading when modal opens
  useEffect(() => {
    if (showAssignModal && selectedRequest) {
      const loadModalData = async () => {
        setIsAssignModalLoading(true);
        try {
          // Set loading states for both tabs
          setIsWithdrawalsLoading(true);
          setIsTagsLoading(true);

          // Load data for both tabs in parallel
          await Promise.all([
            fetchPendingWithdrawals(),
            fetchAvailableTags(selectedRequest.rechargeId),
          ]);
        } catch (error) {
          console.error("Error loading modal data:", error);
          setErrorMessage("Failed to load assignment options");
          setShowErrorModal(true);
          setShowAssignModal(false);
        } finally {
          setIsAssignModalLoading(false);
          setIsWithdrawalsLoading(false);
          setIsTagsLoading(false);
        }
      };
      loadModalData();
    }
  }, [
    showAssignModal,
    selectedRequest,
    fetchPendingWithdrawals,
    fetchAvailableTags,
  ]);

  // Update the fetchCompanyTags function
  const fetchCompanyTags = async () => {
    try {
      setLoadingCompanyTags(true);
      const { data, error } = await supabase
        .from("company_tags")
        .select("*")
        .eq("status", "active");

      if (error) {
        throw error;
      }

      if (data) {
        const mappedTags: ExtendedCompanyTag[] = data.map((tag) => ({
          ...tag,
          cId: tag.c_id,
          ctType: tag.ct_type,
        }));

        setCompanyTags(data);
        setAvailableTags({
          companyTags: mappedTags,
          rechargeAmount: 0,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Error fetching company tags:", errorMessage);
      setCompanyTagsError(errorMessage);
    } finally {
      setLoadingCompanyTags(false);
    }
  };

  // Update the realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("finance-recharge-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "recharge_requests",
        },
        (payload: any) => {
          switch (payload.eventType) {
            case "INSERT":
              if (payload.new.status === "pending") {
                setDeposits((prev) => [
                  transformRechargeRequest(payload.new),
                  ...prev,
                ]);
              }
              break;

            case "UPDATE":
              // Handle action_status changes
              if (payload.old && payload.new) {
                const oldStatus = payload.old.action_status;
                const newStatus = payload.new.action_status;
              }

              // Update the deposits list with the new data
              setDeposits((prev) =>
                prev.map((request) => {
                  if (request.rechargeId === payload.new.id) {
                    const transformedRequest = transformRechargeRequest(
                      payload.new
                    );

                    return transformedRequest;
                  }
                  return request;
                })
              );

              // Update selected request if it's the one being modified
              if (selectedRequest?.rechargeId === payload.new.id) {
                const transformedRequest = transformRechargeRequest(
                  payload.new
                );

                setSelectedRequest(transformedRequest);

                // Close modal if status changes from pending
                if (payload.new.status !== "pending" && showAssignModal) {
                  setShowAssignModal(false);
                }
              }
              break;

            case "DELETE":
              setDeposits((prev) =>
                prev.filter((request) => request.rechargeId !== payload.old.id)
              );

              if (selectedRequest?.rechargeId === payload.old.id) {
                setShowAssignModal(false);
                setSelectedRequest(null);
              }
              break;
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "redeem_requests" },
        (payload) => {
          fetchPendingWithdrawals();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "company_tags" },
        (payload) => {
          fetchCompanyTags();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [
    user,
    selectedRequest,
    showAssignModal,
    transformRechargeRequest,
    fetchPendingWithdrawals,
    fetchCompanyTags,
  ]);

  // Add a useEffect to log deposits changes
  // useEffect(() => {
  //   console.log("Deposits updated:", deposits);
  // }, [deposits]);

  // Remove the old MongoDB fetch effect
  useEffect(() => {
    if (showAssignModal && selectedRequest) {
      fetchCompanyTags();
    }
  }, [showAssignModal, selectedRequest]);

  // Add auto-open modal effect
  useEffect(() => {
    const handleAutoOpenModal = async () => {
      if (!user?.id) return;

      // Find any request that's in progress and assigned to current user
      const inProgressRequest = deposits.find(
        (deposit) =>
          deposit.processing_state?.status === "in_progress" &&
          deposit.processing_state?.processed_by === user.id
      );

      if (inProgressRequest) {
        setSelectedRequest(inProgressRequest);

        // Open appropriate modal based on modal_type
        switch (inProgressRequest.processing_state?.modal_type) {
          case "process_modal":
            setShowAssignModal(true);
            break;
          default:
            // If modal_type is none or unknown, release the lock
            await supabase.rpc("release_request_processing", {
              request_id: inProgressRequest.rechargeId,
              user_id: user.id,
            });
            break;
        }
      }
    };

    if (user?.id && deposits.length > 0) {
      handleAutoOpenModal();
    }
  }, [deposits, user?.id]);

  // Add useEffect to fetch processor name when a request's processing state changes
  // useEffect(() => {
  //   const fetchProcessorName = async () => {
  //     const processingRequests = deposits.filter(
  //       (request) => request.processing_state?.status === "in_progress"
  //     );

  //     for (const request of processingRequests) {
  //       if (request.processing_state?.processed_by) {
  //         await getUserName(request.processing_state.processed_by);
  //       }
  //     }
  //   };

  //   fetchProcessorName();
  // }, [deposits, getUserName]);

  const handleAssign = async (
    rechargeId: string,
    recharge_id: string,
    redeemId: string,
    amount: number,
    matchType: string
  ) => {
    if (!user) {
      setErrorMessage("User not authenticated");
      setShowErrorModal(true);
      return;
    }

    setIsAssignModalLoading(true);
    setLoadingWithdrawalButtons((prev) => ({ ...prev, [redeemId]: true }));

    try {
      // Check if player is banned
      const { data: rechargeData, error: rechargeError } = await supabase
        .from("recharge_requests")
        .select("*")
        .eq("id", rechargeId)
        .single();

      if (rechargeError) throw rechargeError;

      // Check player banned status
      const { data: playerStatus, error: statusError } = await supabase
        .from("players")
        .select("status")
        .eq("vip_code", rechargeData.vip_code)
        .single();

      if (statusError) {
        throw new Error(`Error checking player status: ${statusError.message}`);
      }

      if (playerStatus?.status === "banned") {
        throw new Error("This player is banned. Cannot process any requests.");
      }

      // Get both recharge and redeem request details to check payment methods
      const [rechargeResponse, redeemResponse] = await Promise.all([
        supabase
          .from("recharge_requests")
          .select("*")
          .eq("id", rechargeId)
          .single(),
        supabase
          .from("redeem_requests")
          .select("*")
          .eq("id", redeemId)
          .single(),
      ]);

      if (rechargeResponse.error) throw rechargeResponse.error;
      if (redeemResponse.error) throw redeemResponse.error;

      // Handle array payment method structure
      const rechargePaymentType = Array.isArray(
        rechargeResponse.data.payment_method
      )
        ? rechargeResponse.data.payment_method[0]?.type
        : rechargeResponse.data.payment_method?.type;

      const redeemPaymentTypes =
        redeemResponse.data.payment_methods?.map(
          (pm: { type: string }) => pm.type
        ) || [];

      // Log detailed payment method information

      if (
        !rechargePaymentType ||
        !redeemPaymentTypes.includes(rechargePaymentType)
      ) {
        console.error("Payment Method Mismatch:", {
          rechargePaymentType: rechargePaymentType || "unknown",
          redeemPaymentTypes,
          hasMatch: rechargePaymentType
            ? redeemPaymentTypes.includes(rechargePaymentType)
            : false,
        });
        throw new Error(
          `Payment method mismatch. Recharge request uses ${
            rechargePaymentType || "unknown"
          } but redeem request accepts ${redeemPaymentTypes.join(", ")}`
        );
      }

      await supabase
        .from("recharge_requests")
        .update({
          processing_state: {
            status: "in_progress",
            processed_by: user.id,
            modal_type: "assign_modal",
          },
        })
        .eq("id", rechargeId);

      await handleP2PAssign(rechargeId, redeemId, amount, matchType);

      await supabase
        .from("recharge_requests")
        .update({
          assigned_id: user.id,
          finance_by: {
            name: user.name,
            employee_code: user.employee_code,
            profile_pic: user.user_profile_pic
          },
          assigned_redeem: {
            redeem_id: redeemId,
            amount: amount,
            type: matchType,
            assigned_at: new Date().toISOString(),
            team_code: rechargeData.team_code,
            vipcode: rechargeData.vip_code,
            player_image: rechargeData.profile_pic,
            player_payment_method: rechargePaymentType,
            transaction: {
              status: "active",
              created_at: new Date().toISOString(),
              transaction_type: "p2p_assignment",
            },
            redeem_player: {
              name: rechargeData.player_name,
              image: rechargeData.profile_pic,
              payment_method: {
                platform: rechargePaymentType,
                username: rechargeData.payment_method[0]?.username,
              },
            },
            recharge_player: {
              name: "Rafi Ali",
              image:
                "https://app.manychat.com/ava/568686842996533/300681319/772d149998a534791fdb7db9f1d06dc4",
            },
          },
          processing_state: {
            status: "idle",
            processed_by: null,
            modal_type: "none",
          },
        })
        .eq("id", rechargeId);

      await updateHoldDetails(redeemId, {
        hold_amount: amount,
        player_name: rechargeData.player_name,
        player_image: rechargeData.manychat_data.profile.profilePic,
        hold_at: new Date().toISOString(),
        recharge_id: recharge_id || rechargeId
      });

      setShowAssignModal(false);
      setSuccessMessage("Successfully assigned withdrawal request");
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error in handleAssign:", error);

      try {
        await supabase
          .from("recharge_requests")
          .update({
           
            
            processing_state: {
              status: "idle",
              processed_by: null,
              modal_type: "none",
            },
          })
          .eq("id", rechargeId);
      } catch (resetError) {
        console.error("Error in error recovery:", resetError);
      }

      setErrorMessage(
        error instanceof Error ? error.message : "Failed to assign request"
      );
      setShowErrorModal(true);
    } finally {
      setLoadingWithdrawalButtons((prev) => ({ ...prev, [redeemId]: false }));
      setIsAssignModalLoading(false);
    }
  };

  // Update the handleCTAssignment function
  const handleCTAssignment = async (tag: ExtendedCompanyTag) => {
    if (!selectedRequest) {
      return;
    }

    const requestPaymentType = getPaymentType(selectedRequest.payment_method);

    try {
      setLoadingTagButtons((prev) => ({ ...prev, [tag.id]: true }));

      // Check if player is banned
      const { data: playerStatus, error: statusError } = await supabase
        .from("players")
        .select("status")
        .eq("vip_code", selectedRequest.vip_code)
        .single();

      if (statusError) {
        throw new Error(`Error checking player status: ${statusError.message}`);
      }

      if (playerStatus?.status === "banned") {
        throw new Error("This player is banned. Cannot process any requests.");
      }

      if (requestPaymentType !== tag.payment_method) {
        throw new Error(
          `Payment method mismatch. Request payment: ${requestPaymentType}, Tag payment: ${tag.payment_method}`
        );
      }

      if (tag.limit < selectedRequest.amount) {
        throw new Error(
          `Insufficient limit. Available: $${tag.limit}, Required: $${selectedRequest.amount}`
        );
      }

      // First, get the recharge request to check its current state
      const { data: rechargeData, error: rechargeError } = await supabase
        .from("recharge_requests")
        .select("*")
        .eq("id", selectedRequest.rechargeId)
        .single();

      if (rechargeError) {
        throw new Error(
          `Failed to fetch recharge request: ${rechargeError.message}`
        );
      }

      if (!rechargeData) {
        throw new Error("Recharge request not found");
      }

      if (rechargeData.status !== "pending") {
        throw new Error(
          `Recharge request is not in pending state. Current status: ${rechargeData.status}`
        );
      }

      // Call the assign_company_tag RPC
      const { data: updatedTag, error: assignError } = await supabase.rpc(
        "assign_company_tag",
        {
          p_tag_id: tag.c_id,
          p_amount: selectedRequest.amount,
          p_recharge_id: selectedRequest.rechargeId,
          p_user_email: user?.email || "",
          p_cashtag: tag.cashtag,
          p_ct_type: tag.ct_type,
          p_company_tag: tag.name,
        }
      );

      if (assignError) throw assignError;

      // Reset processing state
      const { error: resetError } = await supabase
        .from("recharge_requests")
        .update({
          processing_state: {
            status: "idle",
            processed_by: null,
            modal_type: "none",
          },
          assigned_id: user?.id,
          finance_by: {
            name: user?.name,
            employee_code: user?.employee_code,
            profile_pic: user?.user_profile_pic
          },
        })
        .eq("id", selectedRequest.rechargeId);

      if (resetError) {
        console.error("Error resetting processing state:", resetError);
      }

      // Close modals and show success message
      setShowAssignModal(false);
      setSelectedRequest(null);
      setSuccessMessage("Successfully assigned company tag");
      setShowSuccessModal(true);

      // Refresh data
      fetchCompanyTags();
      fetchDeposits();
    } catch (error) {
      console.error("Error in handleCTAssignment:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to assign company tag"
      );
      setShowErrorModal(true);
    } finally {
      setLoadingTagButtons((prev) => ({ ...prev, [tag.id]: false }));
    }
  };

  const filteredWithdrawals = useMemo(() => {
    if (!selectedRequest || !pendingWithdrawals) {
      return [];
    }

    // Get the recharge request's payment method
    // Handle both array and object payment method structures
    const rechargePaymentType = Array.isArray(selectedRequest.payment_method)
      ? selectedRequest.payment_method[0]?.type
      : selectedRequest.payment_method?.type;

    const rechargeAmount = selectedRequest.amount;

    const filtered = pendingWithdrawals.filter((withdrawal) => {
      // Check if withdrawal has matching payment method
      const withdrawalPaymentTypes =
        withdrawal.paymentMethods?.map((pm: { type: string }) => pm.type) || [];
      const hasMatchingPaymentMethod =
        rechargePaymentType &&
        withdrawalPaymentTypes.includes(rechargePaymentType);

      // Check if withdrawal has sufficient available amount
      const hasEnoughAmount = checkWithdrawalAvailability(
        withdrawal,
        rechargeAmount
      );

      return hasMatchingPaymentMethod && hasEnoughAmount;
    });

    return filtered;
  }, [selectedRequest, pendingWithdrawals, checkWithdrawalAvailability]);

  // Add a useEffect to log whenever the selected request changes
  useEffect(() => {
    if (selectedRequest) {
    }
  }, [selectedRequest]);

  const renderWithdrawalsTable = () => {
    return filteredWithdrawals.length === 0 ? (
      <tr>
        <td colSpan={6} className="px-6 py-8">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M20 12H4M8 16l-4-4 4-4"
                />
              </svg>
            </div>
            <p className="text-sm text-gray-400">
              {selectedRequest
                ? "No matching withdrawals available for this payment method and amount"
                : "No pending withdrawals available"}
            </p>
          </div>
        </td>
      </tr>
    ) : (
      filteredWithdrawals.map((withdrawal, index) => {
        const isLoading = loadingWithdrawalButtons[withdrawal.redeemId];
        const isAvailable = checkWithdrawalAvailability(
          withdrawal,
          selectedRequest?.amount || 0
        );

        return (
          <tr
            key={`${withdrawal.redeemId}-${index}`}
            className="hoverrr:bg-[#242424] transition-colors"
          >
            <td className="px-6 py-4 text-sm">
              <div className="flex items-center gap-2">
                {/* <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <span className="text-blue-500 font-medium">
                    {withdrawal.redeemId?.slice(0, 2)}
                  </span>
                </div> */}
                <span className="text-gray-300">{withdrawal.redeem_id}</span>
              </div>
            </td>
            <td className="px-6 py-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full overflow-hidden">
                  <PlayerImage id={withdrawal.redeemId} />
                </div>
                <span className="text-gray-300">
                  {(withdrawal as unknown as ExtendedPendingWithdrawal).name}
                </span>
              </div>
            </td>
            <td className="px-6 py-4 text-sm">
              <span className="text-yellow-500 font-medium">
                ${withdrawal.totalAmount.toFixed(2)}
              </span>
            </td>
            <td className="px-6 py-4 text-sm text-gray-300">
              ${withdrawal.amountHold.toFixed(2)}
            </td>
            <td className="px-6 py-4 text-sm">
              <span className="text-green-400 font-medium">
                ${withdrawal.amountAvailable.toFixed(2)}
              </span>
            </td>
            <td className="px-6 py-4 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${withdrawal.online_status ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                <span className={`${withdrawal.online_status ? 'text-green-400' : 'text-gray-400'}`}>
                  {withdrawal.online_status ? 'Online' : 'Offline'}
                </span>
              </div>
            </td>
            <td className="px-6 py-4 text-sm">
              <TimeElapsed
                date={withdrawal.created_at}
                className="flex flex-col items-start"
                elapsedClassName="text-sm font-medium text-gray-300"
                fullDateClassName="text-xs text-gray-400"
              />
            </td>
            <td className="px-6 py-4">
              <div className="flex gap-2">
                {withdrawal.paymentMethods[0].type}
              </div>
            </td>
            <td className="px-6 py-4">
              {(() => {
                const isAvailable = checkWithdrawalAvailability(
                  withdrawal,
                  selectedRequest?.amount || 0
                );
                return (
                  <button
                    onClick={() =>
                      handleAssign(
                        selectedRequest?.rechargeId || "",
                        selectedRequest?.recharge_id || "",
                        withdrawal.redeemId,
                        selectedRequest?.amount || 0,
                        "PT"
                      )
                    }
                    disabled={!isAvailable || isLoading || isAssignModalLoading}
                    className={`px-4 py-2 text-sm font-medium rounded-lg
                      bg-gradient-to-r from-blue-500 to-blue-600
                      text-white shadow-lg
                      hoverrr:from-blue-600 hoverrr:to-blue-700
                      active:from-blue-700 active:to-blue-800
                      transition-all duration-200 transform hoverrr:scale-105 active:scale-95
                      disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                      flex items-center gap-2
                      ${!isAvailable ? "opacity-50 cursor-not-allowed" : ""}
                    `}
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : !isAvailable ? (
                      <span>Insufficient Amount</span>
                    ) : (
                      <>
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
                        <span>Assign</span>
                      </>
                    )}
                  </button>
                );
              })()}
            </td>
          </tr>
        );
      })
    );
  };

  const renderTagsTable = () => {
    const requestPaymentType = getPaymentType(selectedRequest?.payment_method);

    // Add debugging for available tags

    // Filter tags to only show ones with matching payment methods
    const filteredTags = availableTags.companyTags.filter((tag) => {
      const matches = tag.payment_method === requestPaymentType;

      return matches;
    });

    if (filteredTags.length === 0) {
      return (
        <tr>
          <td colSpan={6} className="px-6 py-8">
            <div className="flex flex-col items-center justify-center space-y-3">
              {loadingCompanyTags ? (
                <>
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm text-gray-400">
                    Loading company tags...
                  </p>
                </>
              ) : companyTagsError ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
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
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-red-400">{companyTagsError}</p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M20 12H4M8 16l-4-4 4-4"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-400">
                    {requestPaymentType
                      ? `No available tags found for ${requestPaymentType} payment method`
                      : "No available tags found"}
                  </p>
                </>
              )}
            </div>
          </td>
        </tr>
      );
    }

    return filteredTags.map((tag: ExtendedCompanyTag) => (
      <tr key={tag.id} className="hoverrr:bg-[#242424] transition-colors">
        <td className="px-6 py-4 text-sm">
          <div className="flex items-center gap-2">
            <div className=" rounded-lg bg-purple-500/10 flex items-center justify-center">
              <span className="text-purple-500 font-medium py-1 px-2">
                {tag.cashtag}
              </span>
            </div>
            {/* <span className="text-gray-300">{tag.cId}</span> */}
          </div>
        </td>
        <td className="px-6 py-4 text-sm text-gray-300">{tag.name}</td>
        <td className="px-6 py-4">
          <span className="px-2 py-1 text-xs rounded-full bg-blue-500/10 text-blue-400 uppercase">
            {tag.ctType}
          </span>
        </td>
        <td className="px-6 py-4">
          <span className="text-green-400 font-medium">${tag.balance}</span>
        </td>
        <td className="px-6 py-4">
          <span className="text-yellow-500 font-medium">${tag.limit}</span>
        </td>
        <td className="px-6 py-4">
          <button
            onClick={() => handleCTAssignment(tag)}
            disabled={loadingTagButtons[tag.id]}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-purple-500 text-white hoverrr:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingTagButtons[tag.id] ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "Assign"
            )}
          </button>
        </td>
      </tr>
    ));
  };

  const AssignModal = () => {
    const handleModalClose = async () => {
      try {
        // Reset processing state if there's a selected request
        if (selectedRequest) {
          const { error: resetError } = await supabase
            .from("recharge_requests")
            .update({
              processing_state: {
                status: "idle",
                processed_by: null,
                modal_type: "none",
              },
              assigned_id: user?.id,
              finance_by: {
                name: user?.name,
                employee_code: user?.employee_code,
                profile_pic: user?.user_profile_pic
              },
            })
            .eq("id", selectedRequest.rechargeId);

          if (resetError) {
            console.error("Error resetting processing state:", resetError);
          }
        }

        // Close the modal
        setSelectedRequest(null);
        setShowAssignModal(false);

        // Refresh the page
        window.location.reload();
      } catch (error) {
        console.error("Error during modal closing:", error);
        // Ensure modal closes even if there's an error
        setSelectedRequest(null);
        setShowAssignModal(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-[#1a1a1a] rounded-xl w-[1100px] border border-gray-800 shadow-2xl transform transition-all">
          {/* Modal Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <svg
                  className="w-6 h-6 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Assign Deposit Request
                </h2>
                <p className="text-sm text-gray-400">
                  Select a withdrawal request or company tag to assign
                </p>
              </div>
            </div>
            <button
              onClick={handleModalClose}
              className={`text-gray-400 hoverrr:text-gray-300 transition-colors ${
                isAssignModalLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={isAssignModalLoading}
            >
              <svg
                className="w-6 h-6"
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
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6">
            {/* Request Details Card */}
            <div className="bg-[#242424] rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-1">
                    Deposit Request Details
                  </h3>
                  <div className="grid grid-cols-4 gap-6">
                    <div>
                      <p className="text-xs text-gray-400">Recharge ID</p>
                      <p className="text-sm text-white font-medium">
                        {selectedRequest?.recharge_id}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Amount</p>
                      <p className="text-sm text-green-400 font-medium">
                        ${selectedRequest?.amount}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Status</p>
                      <p className="text-sm text-blue-400 font-medium capitalize">
                        {selectedRequest?.status}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Created At</p>
                      <p className="text-sm text-gray-300 font-medium">
                        {new Date(
                          selectedRequest?.created_at || ""
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-blue-500"
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
            </div>

            {/* Assignment Type Tabs */}
            <div className="mb-6">
              <div className="flex gap-2 p-1 bg-[#242424] rounded-lg w-fit">
                <button
                  onClick={() => setActiveAssignTab("deposits")}
                  disabled={isAssignModalLoading || isWithdrawalsLoading}
                  className={`px-4 py-2 text-sm rounded-md transition-all duration-200
                    ${
                      activeAssignTab === "deposits"
                        ? "bg-blue-500 text-white shadow-lg"
                        : "text-gray-400 hoverrr:text-white"
                    }
                    ${
                      isAssignModalLoading || isWithdrawalsLoading
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <span>Pending Withdrawals</span>
                    {isWithdrawalsLoading && (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                </button>
                <button
                  onClick={() => setActiveAssignTab("withdrawals")}
                  disabled={isAssignModalLoading || isTagsLoading}
                  className={`px-4 py-2 text-sm rounded-md transition-all duration-200
                    ${
                      activeAssignTab === "withdrawals"
                        ? "bg-blue-500 text-white shadow-lg"
                        : "text-gray-400 hoverrr:text-white"
                    }
                    ${
                      isAssignModalLoading || isTagsLoading
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <span>Active Cashtags</span>
                    {isTagsLoading && (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Loading State */}
            {isAssignModalLoading && (
              <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-400">Loading assignment options...</p>
              </div>
            )}

            {/* Table Section */}
            {!isAssignModalLoading && (
              <div className="overflow-x-auto rounded-lg border border-gray-800">
                <table className="min-w-full">
                  {activeAssignTab === "deposits" ? (
                    <>
                      <thead>
                        <tr className="bg-[#242424]">
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Redeem ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Player Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Hold Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Available
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Created
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Payment Methods
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800 bg-[#1a1a1a]">
                        {isWithdrawalsLoading ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-8">
                              <div className="flex flex-col items-center justify-center space-y-3">
                                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-sm text-gray-400">
                                  Loading withdrawals...
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          renderWithdrawalsTable()
                        )}
                      </tbody>
                    </>
                  ) : (
                    <>
                      <thead>
                        <tr className="bg-[#242424]">
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            CASHTAG
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Balance
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Available
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800 bg-[#1a1a1a]">
                        {isTagsLoading ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-8">
                              <div className="flex flex-col items-center justify-center space-y-3">
                                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-sm text-gray-400">
                                  Loading cashtags...
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          renderTagsTable()
                        )}
                      </tbody>
                    </>
                  )}
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const WithdrawalDetailsModal = () => {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[#1a1a1a] rounded-lg w-[600px] border border-gray-800">
          {/* Modal Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-800">
            <h2 className="text-xl font-semibold text-white">
              Withdrawal Request Details
            </h2>
            <button
              onClick={() => setShowViewModal(false)}
              className="text-gray-400 hoverrr:text-gray-300"
            >
              <svg
                className="w-6 h-6"
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
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-2">
                  Request Information:
                </h3>
                <div className="space-y-2">
                  <p className="text-sm text-gray-400">
                    Redeem ID: {selectedWithdrawal?.redeemId}
                  </p>
                  <p className="text-sm text-gray-400">
                    Balance: ${selectedWithdrawal?.amount}
                  </p>
                  <p className="text-sm text-gray-400">
                    Status: {selectedWithdrawal?.status}
                  </p>
                  <p className="text-sm text-gray-400">
                    Created At: {selectedWithdrawal?.createdAt}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-2">
                  Payment Methods:
                </h3>
                <div className="space-y-1">
                  <p className="text-sm text-gray-400">
                    cashapp: {selectedWithdrawal?.cashapp || "none"}
                  </p>
                  <p className="text-sm text-gray-400">
                    venmo: {selectedWithdrawal?.venmo || "none"}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-2">
                  Assigned Deposits:
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-[#242424] border-b border-gray-800">
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                          PENDING SINCE
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                          Type
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                          Recharge ID
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                          Player Name
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                          Team Code
                        </th>

                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                          Platform
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                          Game Username
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {filteredDeposits
                        .filter(
                          (deposit) =>
                            deposit.status === "assigned" ||
                            deposit.status === "assigned_and_hold"
                        )
                        .map((deposit, index) => {
                          // Calculate time elapsed for color coding
                          const timeElapsed =
                            new Date().getTime() -
                            new Date(deposit.created_at).getTime();
                          const hoursElapsed = timeElapsed / (1000 * 60 * 60);

                          // Define color based on time elapsed
                          let timeColor = "text-green-400"; // Less than 1 hour
                          if (hoursElapsed > 24) {
                            timeColor = "text-red-400"; // More than 24 hours
                          } else if (hoursElapsed > 12) {
                            timeColor = "text-orange-400"; // More than 12 hours
                          } else if (hoursElapsed > 6) {
                            timeColor = "text-yellow-400"; // More than 6 hours
                          }

                          return (
                            <tr
                              key={`${deposit.rechargeId}-assigned-${index}`}
                              className="hoverrr:bg-[#242424] transition-colors"
                            >
                              <td className="px-4 py-2 whitespace-nowrap">
                                {deposit.updated_at && (
                                  <TimeElapsed
                                    date={deposit.updated_at}
                                    className="flex flex-col items-center"
                                    elapsedClassName="text-sm font-medium text-gray-300"
                                    fullDateClassName="text-xs text-gray-400"
                                  />
                                )}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                <span
                                  className={`px-2 py-1 text-xs rounded-full ${
                                    deposit.assignedRedeem?.tagType === "PT"
                                      ? "bg-purple-500/10 text-purple-400"
                                      : "bg-emerald-500/10 text-emerald-400"
                                  }`}
                                >
                                  {deposit.assignedRedeem?.tagType || "CT"}
                                </span>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">
                                {deposit.recharge_id}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full overflow-hidden">
                                    <img
                                      src={
                                        deposit.profile_pic ||
                                        `https://ui-avatars.com/api/?name=${deposit.player_name}`
                                      }
                                      alt={deposit.player_name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <span className="text-sm text-gray-300">
                                    {deposit.player_name}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                <span className="px-2 py-1 text-xs rounded-full bg-blue-500/10 text-blue-400">
                                  {deposit.teamCode}
                                </span>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">
                                {deposit.game_username}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">
                                {deposit.game_platform}
                              </td>

                              <td className="px-4 py-2 whitespace-nowrap text-sm text-yellow-500">
                                ${(deposit.amount || 0).toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const UnassignWarningModal = () => {
    const handleUnassign = () => {
      // Add your unassign logic here

      setShowUnassignModal(false);
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-[400px]">
          {/* Modal Header */}
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              Confirm Unassign
            </h2>
            <button
              onClick={() => setShowUnassignModal(false)}
              className="text-gray-400 hoverrr:text-gray-500"
            >
              <svg
                className="w-6 h-6"
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
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-600"
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
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Unassign Deposit
                </h3>
                <p className="text-sm text-gray-500">
                  Are you sure you want to unassign this deposit?
                </p>
              </div>
            </div>

            <div className="mt-4 bg-gray-50 p-4 rounded-lg">
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Recharge ID:</span>{" "}
                  {selectedRequest?.recharge_id}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Amount:</span> $
                  {(selectedRequest?.amount || 0).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Assigned To:</span>{" "}
                  {selectedRequest?.assignedTo}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowUnassignModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hoverrr:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleUnassign}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hoverrr:bg-red-700"
              >
                Confirm Unassign
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Add Error Modal Component
  const ErrorModal = () => {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[#1a1a1a] rounded-lg w-[400px] border border-gray-800">
          <div className="flex justify-between items-center p-4 border-b border-gray-800">
            <h2 className="text-xl font-semibold text-white">Error</h2>
            <button
              onClick={() => setShowErrorModal(false)}
              className="text-gray-400 hoverrr:text-gray-300"
            >
              <svg
                className="w-6 h-6"
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
            </button>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
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
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="text-white">{errorMessage}</div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowErrorModal(false)}
                className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hoverrr:bg-red-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Add Success Modal Component
  const SuccessModal = () => {
    const handleModalClose = async () => {
      try {
        // Reset processing state if there's a selected request
        if (selectedRequest) {
          const { error: resetError } = await supabase
            .from("recharge_requests")
            .update({
              processing_state: {
                status: "idle",
                processed_by: null,
                modal_type: "none",
              },
              assigned_id: user?.id,
              finance_by: {
                name: user?.name,
                employee_code: user?.employee_code,
                profile_pic: user?.user_profile_pic
              },
            })
            .eq("id", selectedRequest.rechargeId);

          if (resetError) {
            console.error("Error resetting processing state:", resetError);
          }
        }

        // Close the modal
        setSelectedRequest(null);
        setShowAssignModal(false);
        setShowSuccessModal(false);
        router.refresh();
        // Refresh the page
        window.location.reload();
      } catch (error) {
        console.error("Error during modal closing:", error);
        // Ensure modal closes even if there's an error
        setSelectedRequest(null);
        setShowAssignModal(false);
      }
    };
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[#1a1a1a] rounded-lg w-[400px] border border-gray-800">
          <div className="flex justify-between items-center p-4 border-b border-gray-800">
            <h2 className="text-xl font-semibold text-white">Success</h2>
            <button
              onClick={handleModalClose}
              className="text-gray-400 hoverrr:text-gray-300"
            >
              <svg
                className="w-6 h-6"
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
            </button>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-500"
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
              <div className="text-white">{successMessage}</div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="px-4 py-2 bg-green-500 text-white text-sm rounded-lg hoverrr:bg-green-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Add ProcessModal component
  const ProcessModal = () => {
    const handleProcess = async (status: "completed" | "rejected") => {
      if (!processingDeposit || !user) return;

      try {
        setIsProcessing(true);
        await processRechargeRequest(
          processingDeposit.rechargeId,
          status,
          user.id,
          processNotes
        );

        setShowProcessModal(false);
        setSuccessMessage(`Request ${status} successfully`);
        setShowSuccessModal(true);
        fetchDeposits();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to process request"
        );
        setShowErrorModal(true);
      } finally {
        setIsProcessing(false);
        setProcessNotes("");
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-[#1a1a1a] rounded-xl w-[500px] border border-gray-800 shadow-2xl">
          <div className="flex justify-between items-center p-6 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <svg
                  className="w-6 h-6 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Process Recharge Request
                </h2>
                <p className="text-sm text-gray-400">
                  Complete or reject the recharge request
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowProcessModal(false)}
              className="text-gray-400 hoverrr:text-gray-300"
              disabled={isProcessing}
            >
              <svg
                className="w-6 h-6"
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
            </button>
          </div>

          <div className="p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Notes
              </label>
              <textarea
                value={processNotes}
                onChange={(e) => setProcessNotes(e.target.value)}
                className="w-full px-3 py-2 bg-[#242424] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                rows={4}
                placeholder="Enter processing notes..."
                disabled={isProcessing}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => handleProcess("rejected")}
                disabled={isProcessing}
                className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hoverrr:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? "Processing..." : "Reject"}
              </button>
              <button
                onClick={() => handleProcess("completed")}
                disabled={isProcessing}
                className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hoverrr:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? "Processing..." : "Complete"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  function ErrorComponent() {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] text-red-500 bg-black ">
        <p>Something went wrong. Please try again later.</p>
      </div>
    );
  }

  if (authLoading) return <LoadingSpinner />;
  if (!user) return null;
  return (
    <ErrorBoundary fallback={<ErrorComponent />}>
      <Suspense fallback={<LoadingSpinner />}>
        <div className="flex min-h-screen bg-[#0a0a0a]">
          {user.department === "Finance" ? (
            <FinanceHeader user={user} />
          ) : (
            <AdminHeader user={user} />
          )}
          <div className="flex-1 pl-64">
            <div className="p-8">
              {/* Header section */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold text-white">
                    Recharge Queue
                  </h1>
                </div>
                <div className="flex items-center gap-4">
                  <RefreshButton onClick={fetchDeposits} isLoading={loading} />
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex gap-4 mb-8 bg-[#1a1a1a] p-1.5 rounded-xl w-fit">
                <button
                  onClick={() => setActiveTab("Pending")}
                  className={`px-6 py-2.5 rounded-lg flex items-center gap-3 transition-all duration-200 ${
                    activeTab === "Pending"
                      ? "bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-500 shadow-lg shadow-blue-500/10"
                      : "text-gray-400 hoverrr:text-white hoverrr:bg-[#242424]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Pending</span>
                    <div
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        activeTab === "Pending"
                          ? "bg-blue-500/10 text-blue-500"
                          : "bg-[#242424] text-gray-400"
                      }`}
                    >
                      {deposits.filter((d) => d.status === "pending").length}
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("Assigned")}
                  className={`px-6 py-2.5 rounded-lg flex items-center gap-3 transition-all duration-200 ${
                    activeTab === "Assigned"
                      ? "bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-500 shadow-lg shadow-blue-500/10"
                      : "text-gray-400 hoverrr:text-white hoverrr:bg-[#242424]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Assigned</span>
                    <div
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        activeTab === "Assigned"
                          ? "bg-blue-500/10 text-blue-500"
                          : "bg-[#242424] text-gray-400"
                      }`}
                    >
                      {
                        deposits.filter(
                          (d) =>
                            d.status === "assigned" ||
                            d.status === "assigned_and_hold"
                        ).length
                      }
                    </div>
                  </div>
                </button>
              </div>

              {/* Conditional Table Rendering */}
              <div className="bg-[#1a1a1a] rounded-lg overflow-hidden mb-8">
                {loading ? (
                  <div className="flex flex-col items-center justify-center p-12 space-y-4">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-400">Loading queue data...</p>
                  </div>
                ) : (
                  <>
                    {activeTab === "Pending" && (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-800">
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              INIT BY
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              PENDING SINCE
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Recharge ID
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Player Name
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Team Code
                            </th>
                            {/* <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Game Username
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Platform
                            </th> */}
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {filteredDeposits.map((deposit, index) => (
                            <tr
                              key={`${deposit.recharge_id}-${index}`}
                              className="hoverrr:bg-[#242424] transition-colors"
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <AgentInfo
                                  agentName={deposit?.initiated_by?.name}
                                  employeeCode={deposit?.initiated_by?.employee_code}
                                  agentImage={deposit?.initiated_by?.profile_pic}
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-start ">
                                {deposit.created_at && (
                                  <TimeElapsed
                                    date={deposit.created_at}
                                    className="flex flex-col items-start"
                                    elapsedClassName="text-sm font-medium text-gray-300"
                                    fullDateClassName="text-xs text-gray-400"
                                  />
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                {deposit.recharge_id}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full overflow-hidden">
                                    <img
                                      src={
                                        deposit.profile_pic ||
                                        `https://ui-avatars.com/api/?name=${deposit.player_name}`
                                      }
                                      alt={deposit.player_name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <span className="text-sm text-gray-300">
                                    {deposit.player_name}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 py-1 text-xs rounded-full bg-blue-500/10 text-blue-400">
                                  {deposit.manychat_data?.team}
                                </span>
                              </td>
                              {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                {deposit.game_username}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                {deposit.game_platform}
                              </td> */}
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-500">
                                ${(deposit.amount || 0).toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex gap-2">
                                  <button
                                    onClick={async () => {
                                      if (!user) {
                                        setErrorMessage(
                                          "User not authenticated"
                                        );
                                        setShowErrorModal(true);
                                        return;
                                      }

                                      const buttonId = `assign-${deposit.rechargeId}`;
                                      setLoadingActions((prev) => ({
                                        ...prev,
                                        [buttonId]: true,
                                      }));

                                      try {
                                        if (
                                          deposit.processing_state?.status ===
                                          "in_progress"
                                        ) {
                                          setSelectedRequest(deposit);
                                          setShowAssignModal(true);
                                          return;
                                        }

                                        const {
                                          data: checkData,
                                          error: checkError,
                                        } = await supabase
                                          .from("recharge_requests")
                                          .select("processing_state")
                                          .eq("id", deposit.rechargeId)
                                          .single();

                                        if (checkError) {
                                          throw checkError;
                                        }

                                        if (
                                          checkData?.processing_state
                                            ?.status === "in_progress"
                                        ) {
                                          setSelectedRequest(deposit);
                                          setShowAssignModal(true);
                                          return;
                                        }

                                        await supabase
                                          .from("recharge_requests")
                                          .update({
                                            assigned_id: user.id,
                                            finance_by: {
                                              name: user.name,
                                              employee_code: user.employee_code,
                                              profile_pic: user.user_profile_pic
                                            },
                                            processing_state: {
                                              status: "in_progress",
                                              processed_by: user.id,
                                              modal_type: "process_modal",
                                            },
                                          })
                                          .eq("id", deposit.rechargeId);

                                        setSelectedRequest(deposit);
                                        setShowAssignModal(true);
                                      } catch (error) {
                                        console.error(
                                          "Error updating processing state:",
                                          error
                                        );
                                        setErrorMessage(
                                          "Failed to start assignment process"
                                        );
                                        setShowErrorModal(true);
                                      } finally {
                                        setLoadingActions((prev) => ({
                                          ...prev,
                                          [buttonId]: false,
                                        }));
                                      }
                                    }}
                                    disabled={
                                      deposit.processing_state?.status ===
                                        "in_progress" ||
                                      loadingActions[
                                        `assign-${deposit.rechargeId}`
                                      ]
                                    }
                                    className={`
                                      min-w-[90px]
                                      px-4 py-2 
                                      rounded-lg
                                      text-sm font-medium
                                      flex items-center justify-center gap-2
                                      transition-all duration-200
                                      ${
                                        deposit.processing_state?.status ===
                                          "in_progress" ||
                                        loadingActions[
                                          `assign-${deposit.rechargeId}`
                                        ]
                                          ? "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700"
                                          : "bg-blue-500 text-white hoverrr:bg-blue-600 active:bg-blue-700 transform hoverrr:scale-105 active:scale-95"
                                      }
                                      ${
                                        loadingActions[
                                          `assign-${deposit.rechargeId}`
                                        ] ||
                                        deposit.processing_state?.status ===
                                          "in_progress"
                                          ? "opacity-90"
                                          : "shadow-lg shadow-blue-500/20"
                                      }
                                    `}
                                  >
                                    {deposit.processing_state?.status ===
                                    "in_progress" ? (
                                      <>
                                        <div className="w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin mr-2" />
                                        <span>
                                          Being processed by {"another user"}
                                        </span>
                                      </>
                                    ) : loadingActions[
                                        `assign-${deposit.rechargeId}`
                                      ] ? (
                                      <>
                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                        <span>Loading</span>
                                      </>
                                    ) : (
                                      <>
                                        <svg
                                          className="h-4 w-4"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M12 4v16m8-8H4"
                                          />
                                        </svg>
                                        <span>Assign</span>
                                      </>
                                    )}
                                  </button>

                                  {/* Add Process button */}
                                  {/* <button
                                    onClick={() => {
                                      setProcessingDeposit(deposit);
                                      setShowProcessModal(true);
                                    }}
                                    disabled={deposit.status !== 'assigned' && deposit.status !== 'assigned_and_hold'}
                                    className={`px-4 py-1 text-sm rounded transition-all duration-200 transform hoverrr:scale-105 active:scale-95
                                      ${deposit.status !== 'assigned' && deposit.status !== 'assigned_and_hold'
                                        ? 'bg-gray-500/10 text-gray-500 cursor-not-allowed'
                                        : 'bg-green-500 text-white hoverrr:bg-green-600 active:bg-green-700'
                                      }`}
                                  >
                                    Process
                                  </button> */}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {activeTab === "Assigned" && (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-800">
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">
                              PENDING SINCE
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">
                              Type
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">
                              Recharge ID
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">
                              DEPOSITOR NAME
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">
                              TARGET ID
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">
                              TARGET NAME
                            </th>

                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {filteredDeposits
                            .filter(
                              (deposit) =>
                                deposit.status === "assigned" ||
                                deposit.status === "assigned_and_hold"
                            )
                            .map((deposit, index) => {
                              // Calculate time elapsed for color coding
                              const timeElapsed =
                                new Date().getTime() -
                                new Date(deposit.updated_at).getTime();
                              const hoursElapsed =
                                timeElapsed / (1000 * 60 * 60);

                              // Define color based on time elapsed
                              let timeColor = "text-green-400"; // Less than 1 hour
                              if (hoursElapsed > 24) {
                                timeColor = "text-red-400"; // More than 24 hours
                              } else if (hoursElapsed > 12) {
                                timeColor = "text-orange-400"; // More than 12 hours
                              } else if (hoursElapsed > 6) {
                                timeColor = "text-yellow-400"; // More than 6 hours
                              }

                              return (
                                <tr
                                  key={`${deposit.rechargeId}-assigned-${index}`}
                                  className="hoverrr:bg-[#242424] transition-colors"
                                >
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    {deposit.updated_at && (
                                      <TimeElapsed
                                        date={deposit.updated_at}
                                        className="flex flex-col items-center"
                                        elapsedClassName="text-sm font-medium text-gray-300"
                                        fullDateClassName="text-xs text-gray-400"
                                      />
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span
                                      className={`px-2 py-1 text-xs rounded-full ${
                                        deposit.assignedRedeem?.type === "PT"
                                          ? "bg-purple-500/10 text-purple-400"
                                          : "bg-emerald-500/10 text-emerald-400"
                                      }`}
                                    >
                                      {deposit.assignedRedeem?.type || "CT"}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                    {deposit.recharge_id}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-full overflow-hidden">
                                        <img
                                          src={
                                            deposit.profile_pic ||
                                            `https://ui-avatars.com/api/?name=${deposit.player_name}`
                                          }
                                          alt={deposit.player_name}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                      <div>
                                        <span className="text-sm text-gray-300">
                                          {deposit.player_name}
                                        </span>
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs text-gray-300">
                                            {deposit.manychat_data?.team}
                                          </span>
                                          <span className="text-xs text-gray-300">
                                            •
                                          </span>
                                          <span className="text-xs text-gray-300">
                                            {deposit.vip_code}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                    {deposit.assignedRedeem ? (
                                      <RedeemIdDisplay
                                        id={deposit.assignedRedeem.redeem_id}
                                      />
                                    ) : (
                                      deposit?.assigned_ct?.cashtag
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    {deposit.assignedRedeem && (
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full overflow-hidden">
                                          <PlayerImage
                                            id={
                                              deposit.assignedRedeem?.redeem_id
                                            }
                                            width={150}
                                            height={150}
                                          />
                                        </div>
                                        <span className="text-sm text-gray-300">
                                          {
                                            deposit.assignedRedeem
                                              ?.redeem_player?.name
                                          }
                                          <div className="flex items-center gap-1">
                                            <span className="text-xs text-gray-300">
                                              {deposit.assignedRedeem
                                                ?.team_code || ""}
                                            </span>
                                            <span className="text-xs text-gray-300">
                                              •
                                            </span>
                                            <span className="text-xs text-gray-300">
                                              {deposit.assignedRedeem
                                                ?.vipcode || ""}
                                            </span>
                                          </div>
                                        </span>
                                      </div>
                                    )}
                                    {deposit.assigned_ct && (
                                      <div>
                                        {deposit.assigned_ct?.company_tag}
                                      </div>
                                    )}
                                  </td>

                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-500">
                                    ${(deposit.amount || 0).toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    )}
                  </>
                )}
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center mt-4 text-gray-400">
                <div>Showing {filteredDeposits.length} entries</div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-[#1a1a1a] rounded hoverrr:bg-[#242424]">
                    Previous
                  </button>
                  <button className="px-3 py-1 bg-blue-500 text-white rounded">
                    1
                  </button>
                  <button className="px-3 py-1 bg-[#1a1a1a] rounded hoverrr:bg-[#242424]">
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        {showViewModal && <WithdrawalDetailsModal />}
        {showAssignModal && <AssignModal />}
        {showUnassignModal && <UnassignWarningModal />}
        {showErrorModal && <ErrorModal />}
        {showSuccessModal && <SuccessModal />}
        {showProcessModal && <ProcessModal />}
      </Suspense>
    </ErrorBoundary>
  );
};

export default QueueDashboard;
