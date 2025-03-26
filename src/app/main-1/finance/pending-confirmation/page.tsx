"use client";
import { useState, useEffect } from "react";
import { AdminHeader, FinanceHeader } from "@/app/components/Headers";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import {
  useFinancePendingConfirmation,
  RechargeRequest,
} from "@/hooks/useFinancePendingConfirmation";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { toast } from "react-hot-toast";

interface User {
  name: string;
  email: string;
  department: string;
  role: string;
}

const getTimeElapsed = (date: string) => {
  const now = new Date();
  const lastSeen = new Date(date);
  const diff = now.getTime() - lastSeen.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return { text: `${days}d ago`, color: "text-red-500" };
  if (hours > 0) return { text: `${hours}h ago`, color: "text-orange-500" };
  if (minutes > 0) return { text: `${minutes}m ago`, color: "text-yellow-500" };
  if (seconds > 0) return { text: `${seconds}s ago`, color: "text-green-500" };
  return { text: "Just now", color: "text-blue-500" };
};

const FinanceRechargePage = () => {
  const router = useRouter();
  const { logActivity } = useActivityLogger();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<
    "pending" | "failed"  | "disputed"
  >("pending");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<RechargeRequest | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<
    "Received" | "Failed" | "Not Received" | ""
  >("");
  const [reviewNotes, setReviewNotes] = useState("");

  // Map activeTab to Supabase status
  const getStatusFromTab = (tab: string) => {
    switch (tab) {
      case "pending":
        return "paid";
      case "failed":
        return "failed";
      case "completed":
        return "verified";
      case "disputed":
        return "disputed";
      default:
        return "pending";
    }
  };

  const { requests, stats, loading, error, updateRequestStatus } =
    useFinancePendingConfirmation(
      getStatusFromTab(activeTab),
      currentPage,
      itemsPerPage
    );

  console.log("requests", requests, "stats", stats);

  // Initial load
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
    } catch (error) {
      console.error("Error parsing user data:", error);
      router.push("/login");
    }
  }, [router]);

  const handleStatusSubmit = async () => {
    if (!selectedStatus || !selectedRequest) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const statusMapping = {
        Received: "verified",
        Failed: "failed",
        "Not Received": "disputed",
      };

      const success = await updateRequestStatus(
        selectedRequest.id,
        selectedRequest.recharge_id,
        statusMapping[selectedStatus],
        reviewNotes
      );

      if (success) {
        toast.success("Status updated successfully");
      }

      setShowReviewModal(false);
      setSelectedStatus("");
      setReviewNotes("");
      setSelectedRequest(null);
    } catch (error) {
      console.error("Error updating status:", error);
      setSubmitError(
        error instanceof Error ? error.message : "Failed to update status"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">

      <div className="flex-1 pl-64">
        <main className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
              Pending Confirmation Requests
            </h1>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {/* Pending Card */}
            <div
              onClick={() => setActiveTab("pending")}
              className={`relative bg-[#1a1a1a] rounded-2xl p-6 cursor-pointer transform transition-all duration-200 hover:scale-105 ${
                activeTab === "pending" ? "scale-105 before:opacity-100" : ""
              } before:absolute before:inset-0 before:bg-gradient-to-b before:from-amber-500/20 before:to-transparent before:rounded-2xl before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 group`}
            >
              <div
                className={`absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent ${
                  activeTab === "pending" ? "opacity-100" : ""
                }`}
              ></div>
              <div
                className={`absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-amber-500/10 to-transparent ${
                  activeTab === "pending" ? "opacity-100" : ""
                }`}
              ></div>
              <div
                className={`absolute inset-y-0 -left-px w-px bg-gradient-to-b from-transparent via-amber-500/50 to-transparent transition-opacity duration-500 ${
                  activeTab === "pending"
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                }`}
              ></div>
              <div
                className={`absolute inset-y-0 -right-px w-px bg-gradient-to-b from-transparent via-amber-500/50 to-transparent transition-opacity duration-500 ${
                  activeTab === "pending"
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
                    activeTab === "pending"
                      ? "scale-105"
                      : "group-hover:scale-105"
                  }`}
                >
                  {stats.pending}
                </div>
                <div className="text-sm text-gray-400 mb-4">Requests</div>
              </div>
            </div>

            {/* Failed Card */}
            <div
              onClick={() => setActiveTab("failed")}
              className={`relative bg-[#1a1a1a] rounded-2xl p-6 cursor-pointer transform transition-all duration-200 hover:scale-105 ${
                activeTab === "failed" ? "scale-105 before:opacity-100" : ""
              } before:absolute before:inset-0 before:bg-gradient-to-b before:from-red-500/20 before:to-transparent before:rounded-2xl before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 group`}
            >
              <div
                className={`absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent ${
                  activeTab === "failed" ? "opacity-100" : ""
                }`}
              ></div>
              <div
                className={`absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-red-500/10 to-transparent ${
                  activeTab === "failed" ? "opacity-100" : ""
                }`}
              ></div>
              <div
                className={`absolute inset-y-0 -left-px w-px bg-gradient-to-b from-transparent via-red-500/50 to-transparent transition-opacity duration-500 ${
                  activeTab === "failed"
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                }`}
              ></div>
              <div
                className={`absolute inset-y-0 -right-px w-px bg-gradient-to-b from-transparent via-red-500/50 to-transparent transition-opacity duration-500 ${
                  activeTab === "failed"
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                }`}
              ></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xl text-red-500 font-medium tracking-wider">
                    FAILED
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
                    activeTab === "failed"
                      ? "scale-105"
                      : "group-hover:scale-105"
                  }`}
                >
                  {stats.failed}
                </div>
                <div className="text-sm text-gray-400 mb-4">Requests</div>
              </div>
            </div>

            {/* Disputed Card */}
            <div
              onClick={() => setActiveTab("disputed")}
              className={`relative bg-[#1a1a1a] rounded-2xl p-6 cursor-pointer transform transition-all duration-200 hover:scale-105 ${
                activeTab === "disputed" ? "scale-105 before:opacity-100" : ""
              } before:absolute before:inset-0 before:bg-gradient-to-b before:from-orange-500/20 before:to-transparent before:rounded-2xl before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 group`}
            >
              <div
                className={`absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent ${
                  activeTab === "disputed" ? "opacity-100" : ""
                }`}
              ></div>
              <div
                className={`absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-orange-500/10 to-transparent ${
                  activeTab === "disputed" ? "opacity-100" : ""
                }`}
              ></div>
              <div
                className={`absolute inset-y-0 -left-px w-px bg-gradient-to-b from-transparent via-orange-500/50 to-transparent transition-opacity duration-500 ${
                  activeTab === "disputed"
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                }`}
              ></div>
              <div
                className={`absolute inset-y-0 -right-px w-px bg-gradient-to-b from-transparent via-orange-500/50 to-transparent transition-opacity duration-500 ${
                  activeTab === "disputed"
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                }`}
              ></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xl text-orange-500 font-medium tracking-wider">
                    DISPUTED
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
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                </div>
                <div
                  className={`text-3xl font-bold text-white mb-1 transition-transform duration-300 ${
                    activeTab === "disputed"
                      ? "scale-105"
                      : "group-hover:scale-105"
                  }`}
                >
                  {stats.disputed}
                </div>
                <div className="text-sm text-gray-400 mb-4">Requests</div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-gray-800/20">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex justify-center items-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        PENDING SINCE
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        RECHARGE ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        AMOUNT
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        ASSIGN CT
                      </th>
                      {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        VERIFIED BY
                      </th> */}
                      {activeTab === "pending" && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                          ACTIONS
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {requests.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-gray-400"
                        >
                          No pending requests available
                        </td>
                      </tr>
                    ) : (
                      requests.map((request) => (
                        <tr key={request.id} className="hover:bg-[#252b3b]">
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <div className="flex flex-col">
                              <span className="text-gray-300">
                                {new Date(request.created_at).toLocaleString()}
                              </span>
                              <span
                                className={`text-xs ${
                                  getTimeElapsed(request.created_at).color
                                }`}
                              >
                                {getTimeElapsed(request.created_at).text}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                            {request.recharge_id}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-yellow-500">
                            ${request.amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                            {request.assigned_ct?.cashtag || "-"}
                          </td>
                          {/* <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                            {request.processed_by || '-'}
                        </td> */}
                          {activeTab === "pending" && (
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setShowReviewModal(true);
                                  }}
                                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                  Review
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 shadow-lg shadow-black/50">
          <div className="bg-[#1a1a1a] rounded-2xl p-6 w-[900px]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">
                Review Transaction
              </h2>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-gray-400 hover:text-white"
                disabled={isSubmitting}
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

            <div className="space-y-6">
              {/* Transaction Details and Screenshot Side by Side */}
              <div className="grid grid-cols-2 gap-6">
                {/* Transaction Details */}
                <div className="space-y-4 p-4 bg-[#111111] rounded-xl border border-gray-800/20">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Recharge ID</p>
                      <p className="text-sm font-medium text-white">
                        {selectedRequest.recharge_id}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Amount</p>
                      <p className="text-sm font-medium text-white-500">
                        ${selectedRequest.amount.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Created At</p>
                      <p className="text-sm font-medium text-white">
                        {new Date(selectedRequest.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Player Name</p>
                      <div className="flex items-center gap-2">
                        <img
                          src={selectedRequest.manychat_data.profile.profilePic}
                          alt="Player Avatar"
                          width={20}
                          height={20}
                        />
                    
                      <p className="text-sm font-medium text-white">
                        {selectedRequest.player_name || "N/A"}
                      </p>
                      </div>
                    </div>
                    {/* <div>
                      <p className="text-sm text-gray-400 mb-1">Current Status</p>
                      <p className="text-sm font-medium">
                        <span className="px-2 py-1 text-xs uppercase font-bold rounded-full bg-blue-500/10 text-blue-500">
                          {selectedRequest.status}
                        </span>
                      </p>
                    </div> */}
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Identifier</p>
                      <p className="text-sm font-medium text-white">
                        {selectedRequest.identifier || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Screenshot */}
                <div className="p-4 bg-[#111111] rounded-xl border border-gray-800/20">
                  <p className="text-sm text-gray-400 mb-2">Screenshot</p>
                  <div className="h-[400px] bg-black/50 rounded-lg flex items-center justify-center overflow-hidden">
                    {selectedRequest.screenshot_url ? (
                      <img
                        src={selectedRequest.screenshot_url}
                        alt="Transaction Screenshot"
                        className="w-full h-full object-contain rounded-lg cursor-zoom-in hover:scale-105 transition-transform duration-200"
                        onClick={() => setIsImageZoomed(true)}
                      />
                    ) : (
                      <p className="text-gray-500">No screenshot available</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Image Zoom Modal */}
              {isImageZoomed && selectedRequest.screenshot_url && (
                <div
                  className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center cursor-zoom-out"
                  onClick={() => setIsImageZoomed(false)}
                >
                  <div className="relative w-full h-full p-4">
                    <button
                      onClick={() => setIsImageZoomed(false)}
                      className="absolute top-4 right-4 text-white/80 hover:text-white z-50"
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
                    <div className="w-full h-full flex items-center justify-center">
                      <img
                        src={selectedRequest.screenshot_url}
                        alt="Transaction Screenshot"
                        className="max-w-[90%] max-h-[90vh] object-contain"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Status Selection */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-400 text-center">
                  Confirmation Payment Status
                </label>
                <div className="flex gap-4 justify-center">
                  <button
                    type="button"
                    onClick={() => setSelectedStatus("Received")}
                    className={`min-w-[120px] px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      selectedStatus === "Received"
                        ? "bg-emerald-500 text-white transform scale-105 shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-[#1a1a1a]"
                        : "bg-transparent border border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10"
                    }`}
                  >
                    Received
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStatus("Failed")}
                    className={`min-w-[120px] px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      selectedStatus === "Failed"
                        ? "bg-orange-500 text-white transform scale-105 shadow-lg shadow-orange-500/25 ring-2 ring-orange-500/50 ring-offset-2 ring-offset-[#1a1a1a]"
                        : "bg-transparent border border-orange-500/50 text-orange-500 hover:bg-orange-500/10"
                    }`}
                  >
                    Failed
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStatus("Not Received")}
                    className={`min-w-[120px] px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      selectedStatus === "Not Received"
                        ? "bg-red-500 text-white transform scale-105 shadow-lg shadow-red-500/25 ring-2 ring-red-500/50 ring-offset-2 ring-offset-[#1a1a1a]"
                        : "bg-transparent border border-red-500/50 text-red-500 hover:bg-red-500/10"
                    }`}
                  >
                    Not Received
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Notes
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full bg-[#111111] border border-gray-800/20 rounded-xl px-4 py-3 text-white h-24 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500 transition-all duration-200"
                  placeholder="Enter any additional notes..."
                />
              </div>
            </div>

            {/* Error Message */}
            {submitError && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-500">{submitError}</p>
              </div>
            )}

            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleStatusSubmit}
                disabled={!selectedStatus || isSubmitting}
                className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                  !selectedStatus || isSubmitting
                    ? "bg-gray-500 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceRechargePage;
