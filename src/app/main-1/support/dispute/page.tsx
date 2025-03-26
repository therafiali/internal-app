"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import {
  AdminHeader,
  OperationsHeader,
  SupportHeader,
} from "@/app/components/Headers";
import RefreshButton from "@/app/components/RefreshButton";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { convertEntFormat } from "@/utils/entFormat";
import { EntType } from "@/supabase/types";
import { RealtimeChannel } from "@supabase/supabase-js";
import TimeElapsed from "../../../../app/components/TimeElapsed";
import { AgentImage } from "@/app/components/recharge/AgentImage";

interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  profile_pic?: string;
  ent_access: EntType[];
}

interface Stats {
  pending: number;
  resolved: number;
  rejected: number;
}

interface ProcessingState {
  status: string;
  processed_by: string | null;
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
  messengerId: string;
}

interface RechargeRequest {
  id: string;
  vip_code: string;
  player_name: string;
  messenger_id: string;
  team_code: string;
  game_platform: string;
  game_username: string;
  amount: number;
  bonus_amount: number | null;
  credits_loaded: number;
  status: string;
  processing_state: ProcessingState;
  promo_code: string | null;
  promo_type: string | null;
  payment_method: string | null;
  screenshot_url: string | null;
  notes: string;
  manychat_data: ManyChatData;
  agent_name: string;
  agent_department: string;
  processed_by: string;
  processed_at: string;
  created_at: string;
  updated_at: string;
  assigned_redeem: string | null;
  assigned_ct: string | null;
  identifier: string | null;
  recharge_id: string;
  assigned_recharge: string | null;
  teamCode?: string;
  deposit_status: string;
  diputed_by: {
    id: string;
    name: string;
    role: string;
    department: string;
    employee_code: string;
  };
}

interface ViewModalProps {
  request: RechargeRequest | null;
  isOpen: boolean;
  onClose: () => void;
}

interface ResolveModalProps {
  request: RechargeRequest | null;
  isOpen: boolean;
  onClose: () => void;
}

interface RejectModalProps {
  request: RechargeRequest | null;
  isOpen: boolean;
  onClose: () => void;
}

const ViewModal: React.FC<ViewModalProps> = ({ request, isOpen, onClose }) => {
  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] rounded-2xl p-6 w-[800px] max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Request Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
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

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-400">
                {" "}
                Request Details
              </h3>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-3">
                  <Image
                    src={request.manychat_data.profile.profilePic}
                    alt={`Profile of ${request.player_name}`}
                    width={64}
                    height={64}
                    className="rounded-full"
                  />
                  <div>
                    <p className="text-white">{request.player_name}</p>
                    <p className="text-sm text-gray-400">
                      VIP: {request.vip_code}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-gray-300">
                  Team: {request.team_code}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-400">
                Game Details
              </h3>
              <div className="mt-2 space-y-2">
                <p className="text-sm text-gray-300">
                  Platform: {request.game_platform}
                </p>
                <p className="text-sm text-gray-300">
                  Username: {request.game_username}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-400">
                Request Details
              </h3>
              <div className="mt-2 space-y-2">
                <p className="text-sm text-gray-300">
                  Request ID: {request.recharge_id}
                </p>
                <p className="text-sm text-gray-300">
                  Amount: ${request.amount}
                </p>
                <p className="text-sm text-gray-300">
                  Status: {request.status}
                </p>
                <p className="text-sm text-gray-300">
                  Created At: {new Date(request.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-400">
                Agent Information
              </h3>
              <div className="mt-2 space-y-2">
                <p className="text-sm text-gray-300">
                  Agent: {request.agent_name}
                </p>
                <p className="text-sm text-gray-300">
                  Department: {request.agent_department}
                </p>
              </div>
            </div>

            {request.notes && (
              <div>
                <h3 className="text-sm font-medium text-gray-400">Notes</h3>
                <p className="mt-2 text-sm text-gray-300">{request.notes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const ResolveModal: React.FC<ResolveModalProps> = ({
  request,
  isOpen,
  onClose,
}) => {
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [showBanForm, setShowBanForm] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [remarks, setRemarks] = useState("");
  const [confirmBanText, setConfirmBanText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  // Add validation for ENT access
  const validateEntAccess = (request: RechargeRequest | null) => {
    if (!request || !user?.ent_access) return false;
    const teamCode = request.team_code || request.teamCode || "";
    if (!teamCode) return false;
    return convertEntFormat.hasEntAccess(user, teamCode);
  };

  const handleResolve = async () => {
    if (!request || !user || !screenshotUrl) return;

    // Validate ENT access before proceeding
    if (!validateEntAccess(request)) {
      setError("You do not have access to resolve requests for this ENT");
      return;
    }

    try {
      setIsSubmitting(true);

      const { error: updateError } = await supabase
        .from("recharge_requests")
        .update({
          screenshot_url: screenshotUrl,
          notes: remarks,
          status: request.assigned_redeem ? "verified" : "completed",
          processed_by: user.id,
          processed_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (updateError) throw updateError;

      onClose();
      window.location.reload();
    } catch (error) {
      console.error("Error resolving dispute:", error);
      alert("Failed to resolve dispute. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBan = async () => {
    if (!request || !user) return;

    try {
      setIsSubmitting(true);

      const { error: rechargeError } = await supabase
        .from("recharge_requests")
        .update({
          status: "rejected",
          processed_by: user.id,
          processed_at: new Date().toISOString(),
          notes: remarks,
        })
        .eq("id", request.id);

      if (rechargeError) throw rechargeError;

      const { error: playerError } = await supabase
        .from("players")
        .update({
          status: "banned",
        })
        .eq("messenger_id", request.messenger_id);

      if (playerError) throw playerError;

      onClose();
      window.location.reload();
    } catch (error) {
      console.error("Error banning player:", error);
      alert("Failed to ban player. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] rounded-2xl p-8 w-[1000px] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Dispute Details</h2>
            <p className="text-sm text-gray-400 mt-1">
              Request ID: {request.recharge_id}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
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

        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Left Column - Player Information */}
          <div className="space-y-6">
            <div className="bg-[#252525] rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Player Information
              </h3>
              <div className="flex items-center gap-4 mb-4">
                <Image
                  src={request.manychat_data.profile.profilePic}
                  alt={`Profile of ${request.player_name}`}
                  width={80}
                  height={80}
                  className="rounded-full"
                />
                <div>
                  <p className="text-lg font-medium text-white">
                    {request.player_name}
                  </p>
                  <p className="text-sm text-gray-400">
                    VIP Code: {request.vip_code}
                  </p>
                  <p className="text-sm text-gray-400">
                    Team: {request.team_code}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400">Platform</p>
                  <p className="text-sm text-white">{request.game_platform}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Username</p>
                  <p className="text-sm text-white">{request.game_username}</p>
                </div>
              </div>
            </div>

            <div className="bg-[#252525] rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Dispute Information
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-400">Disputed By</p>
                  <p className="text-sm text-white">{request.agent_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Department</p>
                  <p className="text-sm text-white">
                    {request.agent_department}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Created At</p>
                  <p className="text-sm text-white">
                    {new Date(request.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Request Details & Screenshots */}
          <div className="space-y-6">
            <div className="bg-[#252525] rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Request Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400">Amount</p>
                  <p className="text-sm text-white">${request.amount}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Status</p>
                  <span className="inline-block px-2 py-1 text-xs rounded-lg capitalize bg-amber-500/10 text-amber-500">
                    {request.status}
                  </span>
                </div>
                {request.bonus_amount && (
                  <div>
                    <p className="text-xs text-gray-400">Bonus Amount</p>
                    <p className="text-sm text-white">
                      ${request.bonus_amount}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-400">Credits Loaded</p>
                  <p className="text-sm text-white">{request.credits_loaded}</p>
                </div>
              </div>
            </div>

            {request.screenshot_url && (
              <div className="bg-[#252525] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Screenshot
                </h3>
                <div className="relative h-48 rounded-lg overflow-hidden">
                  <img
                    src={request.screenshot_url}
                    alt="Request Screenshot"
                    className="hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </div>
            )}

            {request.notes && (
              <div className="bg-[#252525] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Notes</h3>
                <p className="text-sm text-gray-300">{request.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-8">
          <button
            onClick={() => {
              setShowResolveForm(!showResolveForm);
              setShowBanForm(false);
            }}
            className="px-6 py-3 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600 transition-colors"
          >
            Resolve Request
          </button>
          <button
            onClick={() => {
              setShowBanForm(!showBanForm);
              setShowResolveForm(false);
            }}
            className="px-6 py-3 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            Ban Player
          </button>
        </div>

        {/* Resolve Form */}
        {showResolveForm && (
          <div className="mt-6 bg-[#252525] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Resolve Request
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Screenshot URL
                </label>
                <input
                  type="url"
                  value={screenshotUrl}
                  onChange={(e) => setScreenshotUrl(e.target.value)}
                  placeholder="Enter screenshot URL"
                  className="w-full px-4 py-3 bg-[#1a1a1a] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Remarks
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter remarks..."
                  className="w-full px-4 py-3 bg-[#1a1a1a] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleResolve}
                  disabled={!screenshotUrl || isSubmitting}
                  className={`px-6 py-3 rounded-lg text-sm font-medium transition-colors ${
                    !screenshotUrl || isSubmitting
                      ? "bg-green-500/50 text-white cursor-not-allowed"
                      : "bg-green-500 text-white hover:bg-green-600"
                  }`}
                >
                  {isSubmitting ? "Processing..." : "Confirm Resolution"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Ban Form */}
        {showBanForm && (
          <div className="mt-6 bg-[#252525] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Ban Player
            </h3>
            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20 mb-4">
              <p className="text-red-500">
                Warning: This action will ban the player and cannot be undone.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Remarks
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter remarks for banning the player..."
                  className="w-full px-4 py-3 bg-[#1a1a1a] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 h-32 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Type "process" to confirm
                </label>
                <input
                  type="text"
                  value={confirmBanText}
                  onChange={(e) => setConfirmBanText(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1a1a1a] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Type 'process' to confirm"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleBan}
                  disabled={confirmBanText !== "process" || isSubmitting}
                  className={`px-6 py-3 rounded-lg text-sm font-medium transition-colors ${
                    confirmBanText !== "process" || isSubmitting
                      ? "bg-red-500/50 text-white cursor-not-allowed"
                      : "bg-red-500 text-white hover:bg-red-600"
                  }`}
                >
                  {isSubmitting ? "Processing..." : "Confirm Ban"}
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-500">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const RejectModal: React.FC<RejectModalProps> = ({
  request,
  isOpen,
  onClose,
}) => {
  const [confirmText, setConfirmText] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  // Add validation for ENT access
  const validateEntAccess = (request: RechargeRequest | null) => {
    if (!request || !user?.ent_access) return false;
    const teamCode = request.team_code || request.teamCode || "";
    if (!teamCode) return false;
    return convertEntFormat.hasEntAccess(user, teamCode);
  };

  const handleSubmit = async () => {
    if (!request || !user) return;

    // Validate ENT access before proceeding
    if (!validateEntAccess(request)) {
      setError("You do not have access to reject requests for this ENT");
      return;
    }

    try {
      setIsSubmitting(true);

      // Update recharge request status to rejected
      const { error: rechargeError } = await supabase
        .from("recharge_requests")
        .update({
          status: "rejected",
          processed_by: user.id,
          processed_at: new Date().toISOString(),
          notes: remarks, // Add remarks to notes field
        })
        .eq("id", request.id);

      if (rechargeError) throw rechargeError;

      // Update player status to banned in players table
      const { error: playerError } = await supabase
        .from("players")
        .update({
          status: "banned",
        })
        .eq("messenger_id", request.messenger_id);

      if (playerError) throw playerError;

      onClose();
      window.location.reload(); // Refresh the page to update the data
    } catch (error) {
      console.error("Error rejecting dispute:", error);
      alert("Failed to reject dispute. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] rounded-2xl p-6 w-[500px]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Ban Player</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
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

        <div className="space-y-4">
          <p className="text-red-500">
            Warning: This action will ban the player and cannot be undone.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Remarks
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2 bg-[#2a2a2a] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none mb-4"
              placeholder="Enter remarks for banning the player..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Type "process" to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 bg-[#2a2a2a] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type 'process' to confirm"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={confirmText !== "process" || isSubmitting}
            className={`px-4 py-2 rounded-lg transition-colors ${
              confirmText !== "process" || isSubmitting
                ? "bg-red-500/50 text-white cursor-not-allowed"
                : "bg-red-500 text-white hover:bg-red-600"
            }`}
          >
            {isSubmitting ? "Processing..." : "Ban Player"}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-500">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

type TabType = "Pending" | "Resolved" | "Rejected";
type TicketType = "PT" | "CT";

const DisputePage = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("Pending");
  const [activeTicketType, setActiveTicketType] = useState<TicketType>("CT");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [rechargeRequests, setRechargeRequests] = useState<RechargeRequest[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    resolved: 0,
    rejected: 0,
  });
  const [selectedRequest, setSelectedRequest] =
    useState<RechargeRequest | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Setup realtime subscriptions
  useEffect(() => {
    let rechargeChannel: RealtimeChannel;

    const setupRealtimeSubscriptions = async () => {
      if (!user) return;

      // Subscribe to recharge_requests table changes
      rechargeChannel = supabase
        .channel("dispute-recharge-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "recharge_requests",
            filter: "deposit_status=eq.disputed",
          },
          async (payload) => {
            console.log("Received realtime update:", payload);

            // Handle different types of changes
            if (payload.eventType === "INSERT") {
              const newRequest = payload.new as RechargeRequest;
              // Check if user has access to this ENT
              const teamCode =
                newRequest.team_code || newRequest.teamCode || "";
              if (teamCode && convertEntFormat.hasEntAccess(user, teamCode)) {
                setRechargeRequests((prev) => [newRequest, ...prev]);
                updateStats([...rechargeRequests, newRequest]); // Update stats with new data
              }
            } else if (payload.eventType === "UPDATE") {
              const updatedRequest = payload.new as RechargeRequest;
              setRechargeRequests((prev) => {
                const updated = prev.map((req) =>
                  req.id === updatedRequest.id ? updatedRequest : req
                );
                updateStats(updated); // Update stats with modified data
                return updated;
              });
            } else if (payload.eventType === "DELETE") {
              const deletedRequest = payload.old as RechargeRequest;
              setRechargeRequests((prev) => {
                const filtered = prev.filter(
                  (req) => req.id !== deletedRequest.id
                );
                updateStats(filtered); // Update stats with filtered data
                return filtered;
              });
            }
          }
        )
        .subscribe((status) => {
          console.log("Realtime subscription status:", status);
          if (status === "SUBSCRIBED") {
            console.log("Successfully subscribed to recharge requests changes");
          }
        });
    };

    if (user) {
      setupRealtimeSubscriptions();
    }

    // Cleanup subscriptions on unmount
    return () => {
      if (rechargeChannel) {
        console.log("Cleaning up realtime subscription");
        supabase.removeChannel(rechargeChannel);
      }
    };
  }, [user]);

  // Function to update stats based on current requests
  const updateStats = (requests: RechargeRequest[]) => {
    const newStats = {
      pending: 0,
      resolved: 0,
      rejected: 0,
    };

    requests.forEach((request) => {
      if (request.deposit_status === "disputed") {
        newStats.pending++;
      } else if (
        request.deposit_status === "completed" ||
        request.deposit_status === "verified"
      ) {
        newStats.resolved++;
      } else if (request.deposit_status === "rejected") {
        newStats.rejected++;
      }
    });

    setStats(newStats);
  };

  // Fetch recharge requests
  const fetchRechargeRequests = async () => {
    try {
      setIsLoading(true);
      const { data: recharge_requests, error } = await supabase
        .from("recharge_requests")
        .select("*")
        .eq("deposit_status", "disputed")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }
      console.log("recharge_requests --->", recharge_requests);
      // Filter requests based on user's ENT access
      const filteredRequests = (recharge_requests || []).filter((request) => {
        const teamCode = request.team_code || request.teamCode;
        return convertEntFormat.hasEntAccess(user, teamCode);
      });

      setRechargeRequests(filteredRequests);
      updateStats(filteredRequests); // Update stats when fetching data
    } catch (error) {
      console.error("Error fetching recharge requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data when tab changes or on refresh
  useEffect(() => {
    fetchRechargeRequests();
  }, [activeTicketType]);

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

  const handleStatsCardClick = (tab: TabType) => {
    setActiveTab(tab);

    // Scroll to table section
    const tableElement = document.querySelector(".table-section");
    if (tableElement) {
      tableElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    } else {
      return date.toLocaleString();
    }
  };

  const handleViewRequest = (request: RechargeRequest) => {
    setSelectedRequest(request);
    setIsViewModalOpen(true);
  };

  const handleResolveRequest = (request: RechargeRequest) => {
    // Validate ENT access before opening modal
    const teamCode = request.team_code || request.teamCode || "";
    if (!teamCode || !convertEntFormat.hasEntAccess(user, teamCode)) {
      setError("You do not have access to resolve requests for this ENT");
      return;
    }
    setError(null);
    setSelectedRequest(request);
    setIsResolveModalOpen(true);
  };

  const handleRejectRequest = (request: RechargeRequest) => {
    // Validate ENT access before opening modal
    const teamCode = request.team_code || request.teamCode || "";
    if (!teamCode || !convertEntFormat.hasEntAccess(user, teamCode)) {
      setError("You do not have access to reject requests for this ENT");
      return;
    }
    setError(null);
    setSelectedRequest(request);
    setIsRejectModalOpen(true);
  };

  // Add refresh functionality
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchRechargeRequests();
    setIsRefreshing(false);
  };

  if (!user) return null;

  const renderTableContent = () => {
    if (isLoading) {
      return (
        <tr>
          <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
            Loading...
          </td>
        </tr>
      );
    }

    const filteredRequests = rechargeRequests.filter((request) => {
      if (activeTicketType === "PT") {
        return request.assigned_redeem !== null;
      } else {
        return request.assigned_redeem === null;
      }
    });

    console.log("filteredRequests --->", filteredRequests);

    // if (filteredRequests.length === 0) {
    //   console.log("filteredRequests --->",filteredRequests)
    //   return (
    //     <tr>
    //       <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
    //         {activeTicketType === "PT" ? "No disputed recharge requests found" : "No player tickets found"}
    //       </td>
    //     </tr>
    //   );
    // }

    return filteredRequests.map((request) => (
      <tr key={request.id} className="hover:bg-[#252b3b]">
        <td className="px-4 py-3 whitespace-nowrap">
          <TimeElapsed date={request.created_at} />
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <span className="bg-blue-500/10 text-blue-500 px-2 py-1 rounded-lg text-xs">
            {request.recharge_id}
          </span>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-3">
            <Image
              src={request.manychat_data.profile.profilePic}
              alt={`Profile picture of ${request.player_name}`}
              width={32}
              height={32}
              className="rounded-full"
            />
            <div>
              <span className="text-sm text-gray-300">
                {request.player_name}
              </span>
              <span className="block text-xs text-gray-400">
                {request.vip_code}
              </span>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex flex-col">
            <span className="text-sm text-gray-300">
              {request.game_platform}
            </span>
            <span className="text-xs text-gray-400">
              {request.game_username}
            </span>
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <AgentImage
              id={request?.diputed_by?.id || ""}
              width={100}
              height={100}
            />
            <span className="text-sm text-gray-300">{request.agent_name}</span>
          </div>
        </td>

        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex gap-2">
            <button
              onClick={() => handleResolveRequest(request)}
              className="bg-green-500/10 text-green-500 px-3 py-1 rounded-lg text-xs hover:bg-green-500/20"
            >
              Resolve
            </button>
          </div>
        </td>
      </tr>
    ));
  };

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      {user.department === "Support" ? (
        <SupportHeader user={user} />
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
                    Dispute Requests
                  </h1>
                </div>
              </div>
            </div>
            <RefreshButton onClick={handleRefresh} isLoading={isRefreshing} />
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
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

            {/* Resolved Card */}
            <div
              onClick={() => handleStatsCardClick("Resolved")}
              className={`relative bg-[#1a1a1a] rounded-2xl p-6 cursor-pointer transform transition-all duration-200 hover:scale-105 ${
                activeTab === "Resolved" ? "scale-105 before:opacity-100" : ""
              } before:absolute before:inset-0 before:bg-gradient-to-b before:from-green-500/20 before:to-transparent before:rounded-2xl before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 group`}
            >
              <div
                className={`absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-green-500/50 to-transparent ${
                  activeTab === "Resolved" ? "opacity-100" : ""
                }`}
              ></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xl text-green-500 font-medium tracking-wider">
                    RESOLVED
                  </div>
                  <div className="p-2 bg-green-500/10 rounded-lg">
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
                </div>
                <div
                  className={`text-3xl font-bold text-white mb-1 transition-transform duration-300 ${
                    activeTab === "Resolved"
                      ? "scale-105"
                      : "group-hover:scale-105"
                  }`}
                >
                  {stats.resolved}
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
            </div>
          </div>

          {/* Ticket Type Tabs */}
          <div className="flex space-x-4 mb-8">
            <button
              onClick={() => setActiveTicketType("CT")}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTicketType === "CT"
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                  : "bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              Company Ticket
            </button>
            <button
              onClick={() => setActiveTicketType("PT")}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTicketType === "PT"
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                  : "bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              Player Ticket
            </button>
          </div>

          {/* Table Section */}
          <div className="table-section bg-[#1a1a1a] rounded-2xl p-6">
            <table className="min-w-full divide-y divide-gray-800">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                    PENDING SINCE
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                    REQUEST ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                    USER
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                    PLATFORM
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                    DISPUTED BY
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {renderTableContent()}
              </tbody>
            </table>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-500">{error}</p>
            </div>
          )}
        </main>
        <ResolveModal
          request={selectedRequest}
          isOpen={isResolveModalOpen}
          onClose={() => {
            setIsResolveModalOpen(false);
            setSelectedRequest(null);
          }}
        />
      </div>
    </div>
  );
};

export default DisputePage;
