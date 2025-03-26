"use client";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { AdminHeader, VerificationHeader } from "@/app/components/Headers";
import { Check, X } from "lucide-react";
import RefreshButton from "@/app/components/RefreshButton";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { useUserName } from "@/hooks/useUserName";
import Image from "next/image";
import cashappIcon from "@/assets/icons/cashapp.svg";
import venmoIcon from "@/assets/icons/venmo.svg";
import chimeIcon from "@/assets/icons/chime.svg";
import { useVerificationRedeem } from "@/hooks/useVerificationRedeem";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import { fetchRejectedRequests } from "@/redux/features/rejectRequestsSlice";
import { supabase } from "@/supabase/client";
import { RedeemRequest, ManyChatData, PaymentMethod } from "@/types/requests";
import { sendManyChatMessage, MANYCHAT_TEMPLATES } from "@/utils/manychat";
import TimeElapsed from "@/app/components/TimeElapsed";
import { AgentImage } from "@/app/components/recharge/AgentImage";

interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
}

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
}

interface ApproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (process: string) => void;
  loading: boolean;
  request: RedeemRequest | null;
}

interface PlayerDetails {
  profile: {
    firstName: string;
    lastName: string;
    fullName: string;
    gender: string;
    profilePic: string;
    language: string;
    timezone: string;
  };
  dailyRedeemLimit: {
    lastUpdated: string;
    limit: number;
    redeemed: number;
    remaining: number;
  };
  vipCode: string;
  playerName: string;
  team: string;
  status: string;
  totalRedeemed: number;
  gameLimits: Array<{
    amount: number;
    game_name: string;
    timestamp: string;
    status?: "completed" | "pending" | "failed";
    remaining?: number;
    game_limit?: number;
  }>;
}

interface RequestActionResult {
  success: boolean;
  error?: string;
  data?: RedeemRequest;
}

const RejectModal = ({
  isOpen,
  onClose,
  onConfirm,
  loading,
}: RejectModalProps) => {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] rounded-2xl p-6 w-[400px] border border-gray-800/20">
        <h3 className="text-xl font-semibold text-white mb-4">
          Reject Request
        </h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Reason for Rejection
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 bg-[#0a0a0a] border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
            placeholder="Enter reason for rejection..."
          />
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading || !reason.trim()}
            className={`px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Rejecting...
              </>
            ) : (
              "Reject"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const ApproveModal = ({
  isOpen,
  onClose,
  onConfirm,
  loading,
  request,
}: ApproveModalProps) => {
  const [processText, setProcessText] = useState("");
  const [playerData, setPlayerData] = useState<PlayerDetails | null>(null);
  const [loadingPlayer, setLoadingPlayer] = useState(false);
  const [step, setStep] = useState(1);
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);

    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }

    closeTimeoutRef.current = setTimeout(async () => {
      try {
        if (request) {
          await supabase.rpc("release_request_processing", {
            request_id: request.id,
            user_id: request.processing_state.processed_by || "",
          });
          // Add delay after RPC call
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error("Error releasing processing state:", error);
      } finally {
        setPlayerData(null);
        setProcessText("");
        setStep(1);
        setError(null);
        onClose();
        setIsClosing(false);
      }
    }, 300);
  }, [isClosing, onClose, request]);

  const handleSubmit = useCallback(async () => {
    try {
      await onConfirm(processText);
      handleClose();
    } catch (error) {
      console.error("Error submitting:", error);
    }
  }, [onConfirm, processText, handleClose]);

  const handleStepChange = useCallback(
    (newStep: number) => {
      if (loadingPlayer) return;
      setStep((prev) => Math.min(Math.max(1, newStep), 2));
    },
    [loadingPlayer]
  );

  const handleProcessTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setProcessText(e.target.value);
    },
    []
  );

  const isProcessValid = processText.toLowerCase() === "process";

  const fetchPlayerData = useCallback(async () => {
    if (!request) return;

    setLoadingPlayer(true);
    setError(null);
    try {
      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select(
          `
          id,
          vip_code,
          player_name,
          team,
          status,
          total_redeemed,
          profile,
          game_limits,
          daily_redeem_limit
        `
        )
        .eq("vip_code", request.vip_code)
        .single();

      if (playerError) throw new Error(playerError.message);
      if (!playerData) throw new Error("Player not found");

      const transformedData: PlayerDetails = {
        profile: {
          firstName: playerData.profile?.firstName || "",
          lastName: playerData.profile?.lastName || "",
          fullName: playerData.profile?.fullName || playerData.player_name,
          gender: playerData.profile?.gender || "",
          profilePic: playerData.profile?.profilePic || "",
          language: playerData.profile?.language || "",
          timezone: playerData.profile?.timezone || "",
        },
        dailyRedeemLimit: playerData.daily_redeem_limit || {
          lastUpdated: new Date().toISOString(),
          limit: 0,
          redeemed: 0,
          remaining: 0,
        },
        vipCode: playerData.vip_code,
        playerName: playerData.player_name,
        team: playerData.team,
        status: playerData.status,
        totalRedeemed: playerData.total_redeemed || 0,
        gameLimits: playerData.game_limits || [],
      };

      setPlayerData(transformedData);
    } catch (error) {
      console.error("Error fetching player data:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch player data"
      );
      setPlayerData(null);
    } finally {
      setLoadingPlayer(false);
    }
  }, [request]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen && request) {
      setIsClosing(false);
      setProcessText("");
      setStep(1);
      setError(null);
      fetchPlayerData();
    }
  }, [isOpen, request, fetchPlayerData]);

  if (!isOpen || !request) return null;

  const renderPlayerProfile = () => {
    if (loadingPlayer) {
      return (
        <div className="col-span-2 flex items-center justify-center h-[400px]">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="col-span-2 flex flex-col items-center justify-center h-[400px] gap-4">
          <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
            <div className="text-red-500 text-sm">{error}</div>
          </div>
          <button
            onClick={() => {
              setError(null);
              fetchPlayerData();
            }}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-white transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    if (!playerData) {
      return null;
    }

    return (
      <>
        {/* Player Info */}
        <div className="bg-[#0a0a0a] rounded-xl p-4 border border-gray-800/20">
          <h4 className="text-lg font-medium text-white mb-4">
            Player Profile
          </h4>
          <div className="flex items-start gap-4">
            <img
              src={playerData.profile.profilePic}
              alt={playerData.profile.fullName}
              className="w-16 h-16 rounded-xl object-cover"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="text-lg font-medium text-white">
                  {playerData.profile.fullName}
                </div>
                <span className="px-2 py-0.5 bg-purple-500/10 text-purple-500 rounded-full text-xs">
                  {playerData.vipCode}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <div>
                  <span className="text-gray-400">Team:</span>
                  <span className="text-gray-300 ml-2">{playerData.team}</span>
                </div>
                <div>
                  <span className="text-gray-400">Status:</span>
                  <span className="text-emerald-500 ml-2 capitalize">
                    {playerData.status}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Total Redeemed:</span>
                  <span className="text-amber-500 ml-2">
                    ${playerData.totalRedeemed}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Language:</span>
                  <span className="text-gray-300 ml-2">
                    {playerData.profile.language}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Limits */}
        <div className="bg-[#0a0a0a] rounded-xl p-4 border border-gray-800/20">
          <h4 className="text-lg font-medium text-white mb-4">Daily Limits</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-800/30 p-3 rounded-lg">
              <div className="text-sm text-gray-400">Limit</div>
              <div className="text-lg font-semibold text-white">${2000}</div>
            </div>
            <div className="bg-gray-800/30 p-3 rounded-lg">
              <div className="text-sm text-gray-400">Redeemed</div>
              <div className="text-lg font-semibold text-amber-500">
                ${playerData.totalRedeemed}
              </div>
            </div>
            <div className="bg-gray-800/30 p-3 rounded-lg">
              <div className="text-sm text-gray-400">Remaining</div>
              <div className="text-lg font-semibold text-emerald-500">
                ${2000 - playerData.totalRedeemed}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div
      className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-all duration-1000 ${
        isClosing ? "opacity-0" : "opacity-100"
      }`}
      onClick={handleClose}
    >
      <div
        className={`bg-[#1a1a1a] rounded-2xl p-6 w-[1200px] border border-gray-800/20 transition-all duration-1000 ${
          isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"
        } relative`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-sm text-gray-300">Processing request...</div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-white">
              Approve Request
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Review and approve redeem request
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors relative group"
            disabled={loading || isClosing}
          >
            {isClosing ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg
                className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors"
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

        {/* Steps */}
        <div className="flex gap-4 mb-6">
          {[1, 2].map((stepNumber) => (
            <button
              key={stepNumber}
              onClick={() => handleStepChange(stepNumber)}
              disabled={loadingPlayer || loading}
              className={`flex-1 p-3 rounded-xl border ${
                step === stepNumber
                  ? "border-blue-500/50 bg-blue-500/5"
                  : "border-gray-800/50 hover:border-gray-700"
              } ${
                loadingPlayer || loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    step === stepNumber
                      ? "bg-blue-500 text-white"
                      : "bg-gray-800 text-gray-400"
                  }`}
                >
                  {stepNumber}
                </div>
                <div className="text-left">
                  <div
                    className={
                      step === stepNumber ? "text-white" : "text-gray-400"
                    }
                  >
                    {stepNumber === 1 ? "Request Info" : "Game Limits"}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Content based on step */}
        <div className="min-h-[400px] max-h-[500px] overflow-y-auto custom-scrollbar">
          {step === 1 ? (
            <div className="grid grid-cols-1 gap-6">
              {/* Merged Request Info & Player Profile */}
              <div className="bg-[#0a0a0a] rounded-xl p-4 border border-gray-800/20">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-medium text-white">
                    Request & Player Info
                  </h4>
                  <span className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-xs">
                    {request.redeem_id}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  {/* Request Info */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-400">
                          Username
                        </label>
                        <div className="text-sm text-white">
                          {request.game_username}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">
                          Platform
                        </label>
                        <div className="text-sm text-white">
                          {request.game_platform}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Amount</label>
                      <div className="text-lg font-semibold text-emerald-500">
                        ${request.total_amount}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">
                        Payment Methods
                      </label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {request.payment_methods &&
                        request.payment_methods.length > 0 ? (
                          request.payment_methods
                            .filter(
                              (pm: PaymentMethod) => pm.username !== "none"
                            )
                            .map((pm: PaymentMethod) => (
                              <div
                                key={`${request.id}-${pm.type}-${pm.username}`}
                                className="relative group"
                              >
                                <div className="w-8 h-8 rounded-lg bg-gray-800/50 p-1.5 cursor-help">
                                  <Image
                                    src={
                                      pm.type === "cashapp"
                                        ? cashappIcon
                                        : pm.type === "venmo"
                                        ? venmoIcon
                                        : chimeIcon
                                    }
                                    alt={pm.type}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-xs text-white rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                                  {pm.username}
                                </div>
                              </div>
                            ))
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Player Profile */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <img
                        src={playerData?.profile.profilePic}
                        alt={playerData?.profile.fullName}
                        className="w-16 h-16 rounded-xl object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="text-lg font-medium text-white">
                            {playerData?.profile.fullName}
                          </div>
                          <span className="px-2 py-0.5 bg-purple-500/10 text-purple-500 rounded-full text-xs">
                            {playerData?.vipCode}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-y-2 text-sm">
                          <div>
                            <span className="text-gray-400">Team:</span>
                            <span className="text-gray-300 ml-2">
                              {playerData?.team}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Status:</span>
                            <span className="text-emerald-500 ml-2 capitalize">
                              {playerData?.status}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">
                              Total Redeemed:
                            </span>
                            <span className="text-amber-500 ml-2">
                              ${playerData?.totalRedeemed}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Language:</span>
                            <span className="text-gray-300 ml-2">
                              {playerData?.profile.language}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {loadingPlayer ? (
                <div className="flex items-center justify-center h-[400px]">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : playerData ? (
                <>
                  {/* Daily Limits */}
                  <div className="bg-[#0a0a0a] rounded-xl p-4 border border-gray-800/20">
                    <h4 className="text-lg font-medium text-white mb-4">
                      Daily Limits
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gray-800/30 p-3 rounded-lg">
                        <div className="text-sm text-gray-400">Limit</div>
                        <div className="text-lg font-semibold text-white">
                          ${2000}
                        </div>
                      </div>
                      <div className="bg-gray-800/30 p-3 rounded-lg">
                        <div className="text-sm text-gray-400">Redeemed</div>
                        <div className="text-lg font-semibold text-amber-500">
                          ${playerData.totalRedeemed}
                        </div>
                      </div>
                      <div className="bg-gray-800/30 p-3 rounded-lg">
                        <div className="text-sm text-gray-400">Remaining</div>
                        <div className="text-lg font-semibold text-emerald-500">
                          ${2000 - playerData.totalRedeemed}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Current Game */}
                  {request.game_platform && (
                    <div className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/20">
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-medium text-emerald-500">
                          {request.game_platform}
                        </div>
                        <span className="text-xs text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          Current Game
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-xs text-gray-400">
                            Game Limit
                          </div>
                          <div className="text-sm font-medium text-white">
                            ${request.game_limit || 500}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400">
                            Current Request
                          </div>
                          <div className="text-sm font-medium text-yellow-500">
                            ${request.total_amount}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400">Remaining</div>
                          <div className="text-sm font-medium text-emerald-500">
                            $
                            {Math.max(
                              0,
                              (request.game_limit || 500) - request.total_amount
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 p-3 bg-[#0a0a0a] rounded-lg border border-gray-800/10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-sm text-gray-400">
                              Remaining Redeem Limit:
                            </span>
                          </div>
                          <div className="text-sm font-medium text-emerald-500">
                            $
                            {Math.max(
                              0,
                              (request.game_limit || 500) - request.total_amount
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Game History */}
                  <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800/20 mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-medium text-white">
                        Game History
                      </h4>
                      <div className="text-xs text-gray-400">
                        Last {playerData.gameLimits.length} transactions
                      </div>
                    </div>
                    <div className="space-y-3 h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                      {playerData.gameLimits.map((limit, index) => {
                        const gameLimit = limit.game_limit || 500;
                        const previousLimits = playerData.gameLimits.slice(
                          0,
                          index
                        );
                        const totalPreviousAmount = previousLimits.reduce(
                          (sum, prev) => sum + prev.amount,
                          0
                        );
                        const remaining = Math.max(
                          0,
                          gameLimit - (totalPreviousAmount + limit.amount)
                        );

                        return (
                          <div
                            key={index}
                            className="bg-[#0a0a0a] rounded-lg p-3 border border-gray-800/10"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <div className="text-sm font-medium text-white capitalize">
                                    {limit.game_name}
                                  </div>
                                  {/* <span className={`px-2 py-0.5 rounded-full text-xs ${
                                    limit.status === 'completed' || !limit.status
                                      ? 'bg-emerald-500/10 text-emerald-500'
                                      : limit.status === 'pending'
                                      ? 'bg-yellow-500/10 text-yellow-500'
                                      : 'bg-red-500/10 text-red-500'
                                  }`}>
                                    {limit.status || 'Completed'}
                                  </span> */}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                  {new Date(limit.timestamp).toLocaleString()}
                                </div>
                              </div>
                              <div className="flex  items-end gap-x-8">
                                <div className="text-sm font-medium text--500">
                                  <span className="text-sm text-gray-400 ">
                                    Total Redeemed: {"   "}
                                  </span>{" "}
                                  ${limit.amount}
                                </div>
                                <div className="text-sm font-medium text--500">
                                  <span className="text-sm text-gray-400 ">
                                    Total Remaining: {"   "}
                                  </span>{" "}
                                  ${500 - limit.amount}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {playerData.gameLimits.length === 0 && (
                        <div className="text-center py-6 text-gray-400">
                          No game history available
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-800/20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleStepChange(Math.max(1, step - 1))}
              disabled={step === 1 || loading || isClosing}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => handleStepChange(Math.min(2, step + 1))}
              disabled={step === 2 || loading || isClosing}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white disabled:opacity-50"
            >
              Next
            </button>
          </div>

          <div className="flex items-center gap-4">
            {step === 2 && (
              <>
                <div className="w-72">
                  <input
                    type="text"
                    value={processText}
                    onChange={handleProcessTextChange}
                    disabled={loading || isClosing}
                    onPaste={(e) => {
                      e.preventDefault();
                      return false;
                    }}
                    className={`w-full px-4 py-2 bg-[#0a0a0a] border rounded-lg text-white focus:outline-none focus:ring-2 ${
                      processText && !isProcessValid
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-800 focus:ring-emerald-500"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    placeholder='Type "process"'
                  />
                  {processText && !isProcessValid && (
                    <p className="mt-1 text-xs text-red-500">
                      Please type exactly "process" to enable approval
                    </p>
                  )}
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !isProcessValid || isClosing}
                  className={`px-6 py-2 rounded-lg text-sm font-medium bg-emerald-500 text-white transition-all duration-200 ${
                    loading || isClosing
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-emerald-600"
                  } disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
                >
                  {loading || isClosing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{isClosing ? "Closing..." : "Processing..."}</span>
                    </>
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
                      <span>Approve Request</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Fix the syntax error in getTimeElapsed function
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

const VerificationRedeemPage = () => {
  // Hooks
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { logActivity } = useActivityLogger();
  const { userName, getUserName } = useUserName();

  // State hooks
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<
    "Pending" | "Processed" | "Rejected"
  >("Pending");
  const [activeTeamCode, setActiveTeamCode] = useState<
    "ALL" | "ENT-1" | "ENT-2" | "ENT-3"
  >("ALL");
  const [actionLoading, setActionLoading] = useState<{
    id: string | null;
    type: "approve" | "reject" | null;
  }>({ id: null, type: null });
  const [rejectModal, setRejectModal] = useState<{
    isOpen: boolean;
    redeemId: string | null;
    remarks: string;
  }>({
    isOpen: false,
    redeemId: null,
    remarks: "",
  });
  const [approveModal, setApproveModal] = useState<{
    isOpen: boolean;
    request: RedeemRequest | null;
  }>({
    isOpen: false,
    request: null,
  });
  const [realtimeChannel, setRealtimeChannel] = useState<ReturnType<
    typeof supabase.channel
  > | null>(null);

  // Custom hooks
  const {
    redeemRequests,
    loading,
    error,
    approveRequest,
    rejectRequest,
    fetchRedeemRequests,
  } = useVerificationRedeem(activeTab);

  const { requests: rejectedRequests, loading: loadingRejected } =
    useAppSelector((state) => state.rejectedRequests);

  // Memoized values
  const currentStats = useMemo(() => {
    const allRejectedRequests = rejectedRequests.filter(
      (req) => activeTeamCode === "ALL" || req.team_code === activeTeamCode
    );

    const filteredRedeemRequests = redeemRequests.filter(
      (req) => activeTeamCode === "ALL" || req.team_code === activeTeamCode
    );

    return {
      pending: filteredRedeemRequests.filter(
        (r) => r.status === "verification_pending"
      ).length,
      rejected: allRejectedRequests.length,
      processed: filteredRedeemRequests.filter((r) => r.status === "queued")
        .length,
      total: filteredRedeemRequests.length + allRejectedRequests.length,
    };
  }, [redeemRequests, rejectedRequests, activeTeamCode]);

  // Memoized verification action handler
  const handleVerificationAction = useCallback(
    async (id: string, action: "approve" | "reject", remarks?: string) => {
      try {
        console.log("Verifying request:", id, action, remarks);
        setActionLoading({ id, type: action });

        const result: RequestActionResult =
          action === "approve"
            ? await approveRequest(id)
            : await rejectRequest(id, remarks || "Rejected by verification");

        if (!result.success || !result.data) {
          throw new Error(result.error || "No data returned");
        }

        // After successful action, reset modals
        setRejectModal({ isOpen: false, redeemId: null, remarks: "" });
        setApproveModal({ isOpen: false, request: null });

        // Only send ManyChat message for approve action
        if (action === "approve") {
          // Validate and format team code
          const teamCode = result.data.team_code;
          if (!teamCode || !["ENT-1", "ENT-2", "ENT-3"].includes(teamCode)) {
            console.error("Invalid team code:", teamCode);
            throw new Error(
              `Invalid team code: ${teamCode}. Expected ENT-1, ENT-2, or ENT-3`
            );
          }

          await sendManyChatMessage({
            subscriberId: result.data.messenger_id || "",
            message: MANYCHAT_TEMPLATES.VERIFICATION_APPROVED(
              result.data.total_amount || 0,
              result.data.redeem_id || "",
              result.data.game_platform || ""
            ),
            customFields: {
              redeem_request_id: result.data.id,
              redeem_status: result.data.status,
              redeem_amount: result.data.total_amount || 0,
              redeem_platform: result.data.game_platform || "",
              redeem_processed_at: new Date().toISOString(),
              redeem_processed_by: user?.name || "Operations",
            },
            teamCode: teamCode,
          });
        }
      } catch (error) {
        console.error(`Error ${action}ing request:`, error);
      } finally {
        setActionLoading({ id: null, type: null });
      }
    },
    [approveRequest, rejectRequest, user?.name]
  );

  // Effects
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
        parsedUser.department !== "Verification" &&
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

  // Add effects to fetch processor names
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

  // Update the auto-open modal effect to fetch processor name
  useEffect(() => {
    const handleAutoOpenModal = async () => {
      // Don't auto-open if any modal is already open
      if (approveModal.isOpen || rejectModal.isOpen) {
        return;
      }

      const inProgressRequest = redeemRequests.find(
        (request) =>
          request.processing_state.status === "in_progress" &&
          request.processing_state.processed_by === user?.id
      );

      if (inProgressRequest) {
        // Fetch the processor's name
        if (inProgressRequest.processing_state.processed_by) {
          getUserName(inProgressRequest.processing_state.processed_by);
        }

        switch (inProgressRequest.processing_state.modal_type) {
          case "approve_modal":
            if (!approveModal.isOpen) {
              setApproveModal({ isOpen: true, request: inProgressRequest });
            }
            break;
          case "reject_modal":
            if (!rejectModal.isOpen) {
              setRejectModal({
                isOpen: true,
                redeemId: inProgressRequest.id,
                remarks: inProgressRequest.verification_remarks || "",
              });
            }
            break;
          default:
            await supabase.rpc("release_request_processing", {
              request_id: inProgressRequest.id,
              user_id: user?.id,
            });
            await Promise.all([
              fetchRedeemRequests(),
              dispatch(fetchRejectedRequests()),
            ]);
            break;
        }
      }
    };

    if (user?.id && redeemRequests.length > 0) {
      handleAutoOpenModal();
    }
  }, [redeemRequests, user?.id, approveModal.isOpen, rejectModal.isOpen, getUserName]);

  useEffect(() => {
    const channelName = `redeem_requests_${Math.random()
      .toString(36)
      .slice(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "redeem_requests",
        },
        async (payload) => {
          console.log("Realtime update received:", payload);
          await Promise.all([
            fetchRedeemRequests(),
            dispatch(fetchRejectedRequests()),
          ]);
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
        if (status === "SUBSCRIBED") {
          Promise.all([
            fetchRedeemRequests(),
            dispatch(fetchRejectedRequests()),
          ]);
        }
      });

    setRealtimeChannel(channel);

    return () => {
      const cleanup = async () => {
        try {
          if (channel) {
            await supabase.removeChannel(channel);
            console.log("Realtime channel cleaned up successfully");
          }
        } catch (error) {
          console.error("Error cleaning up realtime channel:", error);
        }
      };
    };
  }, [dispatch, fetchRedeemRequests]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        await Promise.all([
          fetchRedeemRequests(),
          dispatch(fetchRejectedRequests()),
        ]);
      } catch (error) {
        console.error("Error fetching initial data:", error);
      }
    };
    fetchInitialData();
  }, [dispatch, fetchRedeemRequests]);

  // Event handlers
  const handleStatsCardClick = (tab: "Pending" | "Processed" | "Rejected") => {
    setActiveTab(tab);
    const tableElement = document.querySelector(".table-section");
    if (tableElement) {
      tableElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleReject = async (reason: string) => {
    if (!rejectModal.redeemId) return;
    await handleVerificationAction(rejectModal.redeemId, "reject", reason);
    setRejectModal({ isOpen: false, redeemId: null, remarks: "" });
  };

  const handleApprove = async (processText: string) => {
    if (!approveModal.request) return;
    await handleVerificationAction(
      approveModal.request.id,
      "approve",
      processText
    );
  };

  const handleOpenApproveModal = async (request: RedeemRequest) => {
    try {
      if (request.processing_state.status === "in_progress") {
        console.log("Request is already being processed by another user");
        return;
      }

      const { data, error } = await supabase.rpc("acquire_request_processing", {
        request_id: request.id,
        user_id: user?.id,
        p_modal_type: "approve_modal",
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

      setApproveModal({ isOpen: true, request });
    } catch (error) {
      console.error("Error opening approve modal:", error);
    }
  };

  const handleOpenRejectModal = async (id: string) => {
    try {
      const request = redeemRequests.find((r) => r.id === id);
      if (!request || request.processing_state.status === "in_progress") {
        console.log("Request is already being processed by another user");
        return;
      }

      const { data, error } = await supabase.rpc("acquire_request_processing", {
        request_id: id,
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

      setRejectModal({ isOpen: true, redeemId: id, remarks: "" });
    } catch (error) {
      console.error("Error opening reject modal:", error);
    }
  };

  // Update renderActionButtons
  const renderActionButtons = (request: RedeemRequest) => {
    const isInProgress = request.processing_state.status === "in_progress";

    if (request.status === "verification_pending") {
      return (
        <div className="flex gap-2">
          <button
            onClick={() => handleOpenApproveModal(request)}
            disabled={isInProgress}
            className={`p-1.5 rounded-lg ${
              isInProgress
                ? "bg-gray-500/10 text-gray-500 cursor-not-allowed"
                : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
            }`}
            title={
              isInProgress
                ? `This request is being processed by ${userName || 'another user'}`
                : "Approve request"
            }
          >
            {actionLoading.id === request.id &&
            actionLoading.type === "approve" ? (
              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => handleOpenRejectModal(request.id)}
            disabled={isInProgress}
            className={`p-1.5 rounded-lg ${
              isInProgress
                ? "bg-gray-500/10 text-gray-500 cursor-not-allowed"
                : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
            }`}
            title={
              isInProgress
                ? `This request is being processed by ${userName || 'another user'}`
                : "Reject request"
            }
          >
            {actionLoading.id === request.id &&
            actionLoading.type === "reject" ? (
              <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
          </button>
        </div>
      );
    }

    if (
      request.status === "verification_failed" &&
      request.verification_remarks
    ) {
      return (
        <div className="text-sm text-gray-400">
          Reason: {request.verification_remarks}
        </div>
      );
    }

    return null;
  };

  // Update modal close handlers
  const handleCloseApproveModal = async () => {
    if (approveModal.request) {
      console.log("request", approveModal.request);
      try {
        await supabase.rpc("release_request_processing", {
          request_id: approveModal.request.id,
          user_id: user?.id || "",
        });
        // Refetch requests to update processing state
        await Promise.all([
          fetchRedeemRequests(),
          dispatch(fetchRejectedRequests()),
        ]);
      } catch (error) {
        console.error("Error releasing processing state:", error);
      }
    }
    setApproveModal({ isOpen: false, request: null });
  };

  const handleCloseRejectModal = async () => {
    if (rejectModal.redeemId) {
      try {
        await supabase.rpc("release_request_processing", {
          request_id: rejectModal.redeemId,
          user_id: user?.id || "",
        });
        // Refetch requests to update processing state
        await Promise.all([
          fetchRedeemRequests(),
          dispatch(fetchRejectedRequests()),
        ]);
      } catch (error) {
        console.error("Error releasing processing state:", error);
      }
    }
    setRejectModal({ isOpen: false, redeemId: null, remarks: "" });
  };

  // Render helpers
  const renderPaymentMethods = (methods: PaymentMethod[]) => {
    return (
      methods
        ?.filter((pm: PaymentMethod) => pm.username !== "none")
        .map((pm: PaymentMethod) => pm.type)
        .join(", ") || "-"
    );
  };

  // Use stats from currentStats
  const stats = currentStats;

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-500">
          Error: {error}
          <button
            onClick={() => {
              Promise.all([
                fetchRedeemRequests(),
                dispatch(fetchRejectedRequests()),
              ]);
            }}
            className="ml-4 px-4 py-2 bg-blue-500 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      {user.department === "Verification" ? (
        <VerificationHeader user={user} />
      ) : (
        <AdminHeader user={user} />
      )}
      <div className="flex-1 pl-64">
        <main className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
              Redeem Requests
            </h1>
            <RefreshButton
              onClick={() => {
                Promise.all([
                  fetchRedeemRequests(),
                  dispatch(fetchRejectedRequests()),
                ]);
              }}
              isLoading={loading || loadingRejected}
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
                  {stats.pending}
                </div>
                <div className="text-sm text-gray-400 mb-4">Requests</div>
              </div>
            </div>

            {/* Processed Card */}
            {/* <div
              onClick={() => handleStatsCardClick("Processed")}
              className={`relative bg-[#1a1a1a] rounded-2xl p-6 cursor-pointer transform transition-all duration-200 hover:scale-105 ${
                activeTab === "Processed" ? "scale-105 before:opacity-100" : ""
              } before:absolute before:inset-0 before:bg-gradient-to-b before:from-yellow-500/20 before:to-transparent before:rounded-2xl before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 group`}
            >
              <div
                className={`absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent ${
                  activeTab === "Processed" ? "opacity-100" : ""
                }`}
              ></div>
              <div
                className={`absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-yellow-500/10 to-transparent ${
                  activeTab === "Processed" ? "opacity-100" : ""
                }`}
              ></div>
              <div
                className={`absolute inset-y-0 -left-px w-px bg-gradient-to-b from-transparent via-yellow-500/50 to-transparent transition-opacity duration-500 ${
                  activeTab === "Processed"
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                }`}
              ></div>
              <div
                className={`absolute inset-y-0 -right-px w-px bg-gradient-to-b from-transparent via-yellow-500/50 to-transparent transition-opacity duration-500 ${
                  activeTab === "Processed"
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                }`}
              ></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xl text-yellow-500 font-medium tracking-wider">
                    PROCESSED
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
                  className={`text-3xl font-bold text-white mb-1 transition-transform duration-300 ${
                    activeTab === "Processed"
                      ? "scale-105"
                      : "group-hover:scale-105"
                  }`}
                >
                  {redeemRequests.filter((r) => r.status === "queued").length}
                </div>
                <div className="text-sm text-gray-400 mb-4">Requests</div>
              </div>
            </div> */}

            {/* <div
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
                  {stats.rejected}
                </div>
                <div className="text-sm text-gray-400 mb-4">Requests</div>
              </div>
            </div> */}
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

          {/* Table */}
          <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-gray-800/20">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                        INIT BY
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-medium text-gray-400">
                        PLAYER
                      </th>
                      {/* <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                        ACC ID
                      </th> */}
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                        TEAM CODE
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                        REDEEM ID
                      </th>

                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                        PAYMENT METHODS
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                        PROCESSED BY
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                        PENDING SINCE
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {redeemRequests.map((request, index) => (
                      <tr key={index} className="hover:bg-[#252b3b]">
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className="flex items-center gap-2">
                                  <AgentImage
                                    id={request.init_id}
                                    width={32}
                                    height={32}
                                  />
                                 
                                </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center justify-start gap-3">
                            <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-800">
                              <Image
                                src={
                                  request.player_data?.profile?.profilePic ||
                                  "/default-avatar.png"
                                }
                                alt={
                                  request.manychat_data?.profile?.fullName ||
                                  request.player_name
                                }
                                width={32}
                                height={32}
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-sm text-gray-300">
                                {request.manychat_data?.profile?.fullName ||
                                  request.player_name}
                              </span>
                              <span className="text-xs text-gray-300">
                                {request.vip_code}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className="bg-blue-500/10 text-blue-500 px-2 py-1 rounded-lg text-xs">
                            {request.vip_code}
                          </span>
                        </td> */}

                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className="bg-blue-500/10 text-blue-500 px-2 py-1 rounded-lg text-xs">
                            {request.team_code}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 text-center">
                          {request.redeem_id}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            {request.payment_methods &&
                            request.payment_methods.length > 0 ? (
                              request.payment_methods
                                .filter(
                                  (pm: PaymentMethod) => pm.username !== "none"
                                )
                                .map((pm: PaymentMethod) => (
                                  <div
                                    key={`${request.id}-${pm.type}-${pm.username}`}
                                    className="relative group"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-gray-800/50 p-1.5 cursor-help">
                                      <Image
                                        src={
                                          pm.type === "cashapp"
                                            ? cashappIcon
                                            : pm.type === "venmo"
                                            ? venmoIcon
                                            : chimeIcon
                                        }
                                        alt={pm.type}
                                        className="w-full h-full object-contain"
                                      />
                                    </div>
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-xs text-white rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                                      {pm.username}
                                    </div>
                                  </div>
                                ))
                            ) : (
                              <span className="text-sm text-gray-500">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col items-center">
                            {request.processed_by ? (
                              <>
                                <span className="flex items-center gap-2">
                                
                                 <AgentImage id={request.processed_by} width={32} height={32} />
                                </span>
                              </>
                            ) : (
                              <span className="text-sm text-gray-500">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {request.updated_at && (
                            <TimeElapsed
                              date={request.updated_at}
                              className="flex flex-col items-center"
                              elapsedClassName="text-sm font-medium text-gray-300"
                              fullDateClassName="text-xs text-gray-400"
                            />
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex justify-center gap-2">
                            {renderActionButtons(request)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
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
        </main>
      </div>
      <RejectModal
        isOpen={rejectModal.isOpen}
        onClose={handleCloseRejectModal}
        onConfirm={handleReject}
        loading={
          actionLoading.id === rejectModal.redeemId &&
          actionLoading.type === "reject"
        }
      />
      <ApproveModal
        isOpen={approveModal.isOpen}
        onClose={handleCloseApproveModal}
        onConfirm={handleApprove}
        loading={
          actionLoading.id === approveModal.request?.id &&
          actionLoading.type === "approve"
        }
        request={approveModal.request}
      />
    </div>
  );
};

export default VerificationRedeemPage;

<style jsx global>{`
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: #1a1a1a;
    border-radius: 3px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #374151;
    border-radius: 3px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #4b5563;
  }
`}</style>;
