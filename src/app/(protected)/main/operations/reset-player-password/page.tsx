"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { AdminHeader, OperationsHeader } from "@/app/components/Headers";
import RefreshButton from "@/app/components/RefreshButton";
import Loader from "@/app/components/Loader";
import Image from "next/image";
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { supabase } from "@/supabase/client";

interface User {
  name: string;
  email: string;
  department: string;
  role: string;
  agentId: string;
}

interface ResetPlayerPasswordRequest {
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

interface ApiResponse {
  success: boolean;
  data: {
    resetRequests: ResetPlayerPasswordRequest[];
    pagination: {
      total: number;
      totalPages: number;
      currentPage: number;
      limit: number;
    };
  };
}

const getTimeElapsed = (date: string) => {
  const now = new Date();
  const lastSeen = new Date(date);
  const diff = now.getTime() - lastSeen.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  if (seconds > 0) return `${seconds}s ago`;
  return 'Just now';
};

const OperationsResetPlayerPasswordPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<
    "Pending" | "Rejected" | "Completed"
  >("Pending");
  const [activeTeamCode, setActiveTeamCode] = useState<
    "ALL" | "ENT-1" | "ENT-2" | "ENT-3"
  >("ALL");
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ResetPlayerPasswordRequest[]>([]);
  const [showResetModal, setShowResetModal] = useState(true);
  const [selectedRequest, setSelectedRequest] =
    useState<ResetPlayerPasswordRequest | null>(null);
  const [isProcessingReset, setIsProcessingReset] = useState(false);
  const [isProcessingReject, setIsProcessingReject] = useState(false);
  const [resetPasswordCount, setResetPasswordCount] = useState(0);
  const { logActivity } = useActivityLogger();

  console.log("active tab", activeTab);

  const stats = {
    pending: requests.filter((r) => r.status.toLowerCase() === "pending")
      .length,
    completed: requests.filter((r) => r.status.toLowerCase() === "completed")
      .length,
    rejected: requests.filter((r) => r.status.toLowerCase() === "rejected")
      .length,
    total: requests.length,
  };

  // Add state for all request counts
  const [requestCounts, setRequestCounts] = useState({
    recharge: 0,
    redeem: 0,
    resetPassword: 0,
  });

  // Add function to fetch all request counts
  const fetchAllRequestCounts = () => {
    // Calculate reset password count from current requests
    const resetPasswordCount = requests.filter(
      (r) => r.status.toLowerCase() === "pending"
    ).length;

    // For now, we'll use the same count for redeem requests as an example
    // Replace this with actual redeem requests data when available
    const redeemCount = resetPasswordCount; // Using same count as example

    // Set the counts
    setRequestCounts({
      recharge: 0, // Set to 0 until recharge data is available
      redeem: redeemCount,
      resetPassword: resetPasswordCount,
    });
  };

  // Update useEffect to call fetchAllRequestCounts when requests change
  useEffect(() => {
    fetchAllRequestCounts();
  }, [requests]);

  useEffect(() => {
    if (isProcessingReset) {
      setShowResetModal(false);
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }, [isProcessingReset]);

  // Setup real-time subscription
  useEffect(() => {
    const channel = supabase.channel('custom-all-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reset_password_requests' },
        (payload: {
          new: ResetPlayerPasswordRequest;
          old: ResetPlayerPasswordRequest;
          eventType: 'INSERT' | 'UPDATE' | 'DELETE';
        }) => {
          console.log('Change received!', payload);
          // Refresh data when changes occur
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reset_password_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setRequests(data as ResetPlayerPasswordRequest[]);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userData = localStorage.getItem("user");

    if (!userData) {
      router.push("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.department !== "Operations" && parsedUser.department !== "Admin") {
        router.push("/login");
        return;
      }
      setUser(parsedUser);
      fetchRequests();
    } catch (error) {
      console.error("Error parsing user data:", error);
      router.push("/login");
    }
  }, [router]);

  if (!user) return null;

  // Update the filtering logic to include team code filtering
  const filteredRequests = requests.filter((request) => {
    const matchesStatus = (() => {
      switch (activeTab) {
        case "Pending":
          return request.status.toLowerCase() === "pending";
        case "Rejected":
          return request.status.toLowerCase() === "rejected";
        case "Completed":
          return request.status.toLowerCase() === "completed";
        default:
          return true;
      }
    })();

    const matchesTeamCode =
      activeTeamCode === "ALL" || request.team_code === activeTeamCode;
    return matchesStatus && matchesTeamCode;
  });

  // Add click handlers for navigation
  // const handleStatsCardClick = (tab: 'Pending' | 'Completed' | 'Rejected') => {
  //   setActiveTab(tab);
  //   // Scroll to table section
  //   const tableElement = document.querySelector('.table-section');
  //   if (tableElement) {
  //     tableElement.scrollIntoView({ behavior: 'smooth' });
  //   }
  // };

  // Add this new component for the reset modal
  const ResetPasswordModal = () => {
    const [password, setPassword] = useState("");
    const [remarks, setRemarks] = useState("");
    const [error, setError] = useState("");

    const handleReset = async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setIsProcessingReset(true);

      try {
        if (!selectedRequest || !user) throw new Error("Missing request or user data");

        const { data, error } = await supabase
          .from('reset_password_requests')
          .update({
            status: 'completed',
            new_password: password,
            additional_message: remarks,
            processed_by: user.id,
            processed_at: new Date().toISOString(),
            agent_name: user.name,
            agent_department: user.department
          })
          .eq('id', selectedRequest.id)
          .select();

        if (error) throw error;

        // Log the successful password reset


        setShowResetModal(false);
        setSelectedRequest(null);
        setPassword("");
        setRemarks("");
        await fetchRequests();

      } catch (error) {
        console.error("Error processing reset:", error);
        setError("Failed to process password reset. Please try again.");
        
       
      
      } finally {
        setIsProcessingReset(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <form
          onSubmit={handleReset}
          className="bg-[#1a1a1a] rounded-lg w-[500px] border border-gray-800"
        >
          <div className="flex justify-between items-center p-4 border-b border-gray-800">
            <h2 className="text-xl font-semibold text-white">Reset Password</h2>
            <button
              type="button"
              onClick={() => setShowResetModal(false)}
              className="text-gray-400 hover:text-gray-300"
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
              Close
            </button>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  New Password
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Remarks
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter remarks"
                  required
                  rows={3}
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              {error && <div className="text-red-500 text-sm">{error}</div>}
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white"
                disabled={isProcessingReset}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isProcessingReset}
              >
                {isProcessingReset ? "Processing..." : "Reset Password"}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  };

  const handleReject = async (request: ResetPlayerPasswordRequest) => {
    setIsProcessingReject(true);
    try {
      if (!user) throw new Error("User data missing");

      const { data, error } = await supabase
        .from('reset_password_requests')
        .update({
          status: 'rejected',
          additional_message: 'Rejected by operations',
          processed_by: user.id,
          processed_at: new Date().toISOString(),
          agent_name: user.name,
          agent_department: user.department
        })
        .eq('id', request.id)
        .select();

      if (error) throw error;

      // Log the successful rejection
     

      await fetchRequests();

    } catch (error) {
      console.error("Error rejecting request:", error);
      
      // Log the failed rejection
     
      
    } finally {
      setIsProcessingReject(false);
    }
  };

  // if (loading) {
  //   return <Loader text="Reset Password Requests" />;
  // }

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
     {user.department === 'Operations' ? (
        <OperationsHeader user={user}  />
      ) : (
        <AdminHeader user={user} />
      )}
      <div className="flex-1 pl-64">
        <main className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
              Reset Password Requests
            </h1>
            <div className="flex items-center gap-4">
              <RefreshButton onClick={fetchRequests} isLoading={loading} />
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {/* Pending Card */}
            <div
              onClick={() => setActiveTab("Pending")}
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

            {/* Rejected Card */}
            <div
              onClick={() => setActiveTab("Rejected")}
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
            </div>

            {/* Completed Card */}
            <div
              onClick={() => setActiveTab("Completed")}
              className={`relative bg-[#1a1a1a] rounded-2xl p-6 cursor-pointer transform transition-all duration-200 hover:scale-105 ${
                activeTab === "Completed" ? "scale-105 before:opacity-100" : ""
              } before:absolute before:inset-0 before:bg-gradient-to-b before:from-emerald-500/20 before:to-transparent before:rounded-2xl before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 group`}
            >
              <div
                className={`absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent ${
                  activeTab === "Completed" ? "opacity-100" : ""
                }`}
              ></div>
              <div
                className={`absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent ${
                  activeTab === "Completed" ? "opacity-100" : ""
                }`}
              ></div>
              <div
                className={`absolute inset-y-0 -left-px w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent transition-opacity duration-500 ${
                  activeTab === "Completed"
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                }`}
              ></div>
              <div
                className={`absolute inset-y-0 -right-px w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent transition-opacity duration-500 ${
                  activeTab === "Completed"
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                }`}
              ></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xl text-emerald-500 font-medium tracking-wider">
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
                  className={`text-3xl font-bold text-white mb-1 transition-transform duration-300 ${
                    activeTab === "Completed"
                      ? "scale-105"
                      : "group-hover:scale-105"
                  }`}
                >
                  {stats.completed}
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

          {/* Tabs */}
          {/* <div className="flex space-x-4 mb-8 bg-[#1a1a1a] p-4 rounded-2xl border border-gray-800/20">
            <button
              onClick={() => setActiveTab('Pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'Pending'
                  ? 'bg-amber-500/10 text-amber-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Pending ({stats.pending})
            </button>
            <button
              onClick={() => setActiveTab('Rejected')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'Rejected'
                  ? 'bg-red-500/10 text-red-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Rejected ({stats.rejected})
            </button>
            <button
              onClick={() => setActiveTab('Completed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'Completed'
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Completed ({stats.completed})
            </button>
          </div> */}

          {/* Table */}
          <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-gray-800/20">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                      CREATED
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                      TEAM CODE
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                      REQUEST ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                      PLAYER

                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                      PLATFORM

                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                      USERNAME
                    </th>
                    {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">AMOUNT</th> */}
                    {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">PAYMENT METHOD</th> */}
                    {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">STATUS</th> */}
                    {activeTab === "Pending" && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        ACTIONS
                      </th>
                    )}
                    {/* {activeTab === "Rejected" && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        ACTIONS
                      </th>
                    )} */}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredRequests.map((request, index) => (
                    <tr key={index} className="hover:bg-[#252b3b]">
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex flex-col">
                          <span className="text-gray-300">{getTimeElapsed(request.created_at)}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(request.created_at).toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="bg-blue-500/10 text-blue-500 px-2 py-1 rounded-lg text-xs">
                          {request.team_code}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                        {request.id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 overflow-hidden">
                            {request.player_name ? (
                              <Image
                                src={request.manychat_data.profile?.profilePic || request?.player_data?.profile_pic || `https://ui-avatars.com/api/?name=${request.player_name}`}
                                alt={request.player_name}
                                width={32}
                                height={32}
                                className="w-full h-full object-cover"

                              />
                            ) : (
                              <span>{request.player_name?.charAt(0) || "?"}</span>
                            )}
                          </div>
                          <span className="ml-3 text-sm text-gray-300">
                            {request.player_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                        {request.game_platform}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                        {request.suggested_username}
                      </td>
                      {/* <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{request.messenger_id}</td> */}
                      {/* <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-lg text-xs ${
                          request.status.toLowerCase() === 'pending' ? 'bg-amber-500/10 text-amber-500' : 
                          request.status.toLowerCase() === 'rejected' ? 'bg-red-500/10 text-red-500' : 
                          'bg-emerald-500/10 text-emerald-500'
                        }`}>
                          {request.status}
                        </span>
                      </td> */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-2 items-center w-full mx-auto ">
                          {request.status.toLowerCase() === "pending" && (
                            <button
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowResetModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                            >
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
                            </button>
                          )}
                          {request.status.toLowerCase() === "pending" && (
                            <button
                              onClick={() => handleReject(request)}
                              disabled={isProcessingReject}
                              className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isProcessingReject ? (
                                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
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
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-800 bg-[#1a1a1a]">
              <div className="flex items-center justify-between text-sm text-gray-400">
                <div>Showing {filteredRequests.length} entries</div>
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
      {showResetModal && selectedRequest && <ResetPasswordModal />}
    </div>
  );
};

export default OperationsResetPlayerPasswordPage;
