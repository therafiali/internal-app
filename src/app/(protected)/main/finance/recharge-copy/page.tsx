"use client";
import { useState, useEffect } from "react";
import { FinanceHeader } from "@/app/components/Headers";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import Loader from "@/app/components/Loader";
// import Image from "next/image";
// import Link from "next/link";

interface User {
  name: string;
  email: string;
  department: string;
  role: string;
}

interface RechargeRequest {
  recharge: {
    rechargeId: string;
    playerName: string;
    messengerId: string;
    gamePlatform: string;
    gameUsername: string;
    amount: number;
    bonusAmount: number;
    status: string;
    screenshotUrl: string;
    teamCode: string;
    promotion: string;
    createdAt: string;
    processedBy: string | null;
  };
  assignedRedeem: number | null;
}

interface ApiResponse {
  status: string;
  data: {
    assignedRecharges: RechargeRequest[];
    pagination: {
      total: number;
      totalPages: number;
      currentPage: number;
      limit: number;
    };
  };
}

const FinanceRechargePage = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<
    "Pending" | "Processed" | "Rejected"
  >("Pending");
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<RechargeRequest | null>(null);
  const [creditsLoaded, setCreditsLoaded] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectNotes, setRejectNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [rechargeRequests, setRechargeRequests] = useState<RechargeRequest[]>(
    []
  );

  // if (loading) {
  //   return <Loader text="Recharge Requests" />;
  // }

  useEffect(() => {
    const token = Cookies.get("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.department !== "Finance") {
        router.push("/login");
        return;
      }
      setUser(parsedUser);
      fetchRechargeRequests();
    } catch (error) {
      console.error("Error parsing user data:", error);
      router.push("/login");
    }
  }, [router]);

  const fetchRechargeRequests = async () => {
    try {
      setLoading(true);
      const token = Cookies.get("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}api/recharge/get-assigned-recharges`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("response", response);
      if (response.ok) {
        const data: ApiResponse = await response.json();
        setRechargeRequests(data.data.assignedRecharges);
      } else {
        console.error("Failed to fetch recharge requests");
      }
    } catch (error) {
      console.error("Error fetching recharge requests:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter requests based on active tab
  const filteredRequests = rechargeRequests.filter((request) => {
    const status = request.recharge.status.toLowerCase();
    switch (activeTab) {
      case "Pending":
        return status.includes("pending") || status.includes("assigned");
      case "Rejected":
        return status.includes("rejected");
      case "Processed":
        return status.includes("processed");
      default:
        return true;
    }
  });

  console.log("rechargeRequests", filteredRequests);
  // Stats
  const stats = {
    pending: rechargeRequests.filter(
      (r) =>
        r.recharge.status.toLowerCase().includes("pending") ||
        r.recharge.status.toLowerCase().includes("assigned")
    ).length,
    processed: rechargeRequests.filter((r) =>
      r.recharge.status.toLowerCase().includes("processed")
    ).length,
    rejected: rechargeRequests.filter((r) =>
      r.recharge.status.toLowerCase().includes("rejected")
    ).length,
  };



  const handleProcess = (request: RechargeRequest) => {
    setSelectedRequest(request);
    setShowProcessModal(true);
  };

  const handleReject = (request: RechargeRequest) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
  };

  // const renderTable = () => {
  //   switch (activeTab) {
  //     case "Pending":
  //       return (
  //         <table className="w-full">
  //           <thead>
  //             <tr className="border-b border-gray-800">
  //               <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
  //                 CREATED
  //               </th>
  //               <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
  //                 TEAM CODE
  //               </th>
  //               <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
  //                 RECHARGE ID
  //               </th>
  //               <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
  //                 PLAYER NAME
  //               </th>
  //               <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
  //                 GAME USERNAME
  //               </th>
  //               <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
  //                 PLATFORM
  //               </th>
  //               <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
  //                 AMOUNT
  //               </th>

  //               {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
  //                 SCREENSHOT
  //               </th> */}

  //               <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
  //                 STATUS
  //               </th>
  //               <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
  //                 ACTIONS
  //               </th>
  //             </tr>
  //           </thead>
  //           <tbody className="divide-y divide-gray-800">
  //             {rechargeRequests.map((request, index) => (
  //               <tr key={index} className="hover:bg-[#252b3b]">
  //                 <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
  //                   {new Date(request.recharge.createdAt).toLocaleString()}
  //                 </td>
  //                 <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
  //                   {request.recharge.teamCode}
  //                 </td>
  //                 <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
  //                   {request.recharge.rechargeId}
  //                 </td>
  //                 <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
  //                   {request.recharge.playerName}
  //                 </td>
  //                 <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
  //                   {request.recharge.gameUsername}
  //                 </td>
  //                 <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
  //                   {request.recharge.gamePlatform}
  //                 </td>
  //                 <td className="px-4 py-3 whitespace-nowrap text-sm text-yellow-500">
  //                   ${request.recharge.amount.toFixed(2)}
  //                 </td>
  //                 {/* <td className="px-4 py-3 whitespace-nowrap">
  //                   <button className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">
  //                     View
  //                   </button>
  //                 </td> */}
  //                 <td className="px-4 py-3 whitespace-nowrap">
  //                   <span className="px-2 py-1 text-xs rounded-full bg-blue-500/10 text-blue-500">
  //                     {request.recharge.status}
  //                   </span>
  //                 </td>
  //                 <td className="px-4 py-3 whitespace-nowrap">
  //                   <div className="flex gap-2">
  //                     <button
  //                       onClick={() => {
  //                         setSelectedRequest(request);
  //                         setShowProcessModal(true);
  //                       }}
  //                       className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
  //                     >
  //                       <svg
  //                         className="w-4 h-4"
  //                         fill="none"
  //                         stroke="currentColor"
  //                         viewBox="0 0 24 24"
  //                       >
  //                         <path
  //                           strokeLinecap="round"
  //                           strokeLinejoin="round"
  //                           strokeWidth="2"
  //                           d="M5 13l4 4L19 7"
  //                         />
  //                       </svg>
  //                     </button>
  //                     <button
  //                       onClick={() => handleReject(request)}
  //                       className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20"
  //                     >
  //                       <svg
  //                         className="w-4 h-4"
  //                         fill="none"
  //                         stroke="currentColor"
  //                         viewBox="0 0 24 24"
  //                       >
  //                         <path
  //                           strokeLinecap="round"
  //                           strokeLinejoin="round"
  //                           strokeWidth="2"
  //                           d="M6 18L18 6M6 6l12 12"
  //                         />
  //                       </svg>
  //                     </button>
  //                   </div>
  //                 </td>
  //               </tr>
  //             ))}
  //           </tbody>
  //         </table>
  //       );

  //     case "Processed":
  //       return (
  //         <table className="w-full">
  //           <thead>
  //             <tr className="border-b border-gray-800">
  //               <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
  //                 CREATED
  //               </th>
  //               <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
  //                 TEAM CODE
  //               </th>
  //               <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
  //                 RECHARGE ID
  //               </th>
  //               <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
  //                 PLAYER NAME
  //               </th>
  //               <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
  //                 GAME PLATFORM
  //               </th>
  //               <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
  //                 AMOUNT
  //               </th>
  //               {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
  //                 SCREENSHOT
  //               </th> */}
  //               <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
  //                 STATUS
  //               </th>
  //               <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
  //                 ACTIONS
  //               </th>
  //             </tr>
  //           </thead>
  //           <tbody className="divide-y divide-gray-800">
  //             {filteredRequests.map((request, index) => (
  //               <tr key={index} className="hover:bg-[#252b3b]">
  //                 <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
  //                   {new Date(request.recharge.createdAt).toLocaleString()}
  //                 </td>
  //                 <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
  //                   {request.recharge.teamCode}
  //                 </td>
  //                 <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
  //                   {request.recharge.rechargeId}
  //                 </td>
  //                 <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
  //                   {request.recharge.playerName}
  //                 </td>
  //                 <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
  //                   {request.recharge.gamePlatform}
  //                 </td>
  //                 <td className="px-4 py-3 whitespace-nowrap text-sm text-yellow-500">
  //                   ${request.recharge.amount.toFixed(2)}
  //                 </td>
  //                 {/* <td className="px-4 py-3 whitespace-nowrap">
  //                   <button className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">
  //                     View
  //                   </button>
  //                 </td> */}
  //                 <td className="px-4 py-3 whitespace-nowrap">
  //                   <span className="px-2 py-1 text-xs rounded-full bg-blue-500/10 text-blue-500">
  //                     {request.recharge.status}
  //                   </span>
  //                 </td>
  //                 <td className="px-4 py-3 whitespace-nowrap">
  //                   <div className="flex gap-2">
  //                     <button
  //                       onClick={() => {
  //                         setSelectedRequest(request);
  //                         setShowProcessModal(true);
  //                       }}
  //                       className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
  //                     >
  //                       <svg
  //                         className="w-4 h-4"
  //                         fill="none"
  //                         stroke="currentColor"
  //                         viewBox="0 0 24 24"
  //                       >
  //                         <path
  //                           strokeLinecap="round"
  //                           strokeLinejoin="round"
  //                           strokeWidth="2"
  //                           d="M5 13l4 4L19 7"
  //                         />
  //                       </svg>
  //                     </button>
  //                     <button
  //                       onClick={() => handleReject(request)}
  //                       className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20"
  //                     >
  //                       <svg
  //                         className="w-4 h-4"
  //                         fill="none"
  //                         stroke="currentColor"
  //                         viewBox="0 0 24 24"
  //                       >
  //                         <path
  //                           strokeLinecap="round"
  //                           strokeLinejoin="round"
  //                           strokeWidth="2"
  //                           d="M6 18L18 6M6 6l12 12"
  //                         />
  //                       </svg>
  //                     </button>
  //                   </div>
  //                 </td>
  //               </tr>
  //             ))}
  //           </tbody>
  //         </table>
  //       );

  //     case "Rejected":
  //       return (
  //         <table className="w-full">
  //           <thead>
  //             <tr className="border-b border-gray-800">
  //               <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
  //                 CREATED
  //               </th>
  //               <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
  //                 TEAM CODE
  //               </th>
  //               <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
  //                 RECHARGE ID
  //               </th>
  //               <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
  //                 PLAYER NAME
  //               </th>
  //               <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
  //                 GAME PLATFORM
  //               </th>
  //               <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
  //                 AMOUNT
  //               </th>
  //               {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
  //                 SCREENSHOT
  //               </th> */}
  //               <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
  //                 STATUS
  //               </th>
  //               <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
  //                 ACTIONS
  //               </th>
  //             </tr>
  //           </thead>
  //           <tbody className="divide-y divide-gray-800">
  //             {filteredRequests.map((request, index) => (
  //               <tr key={index} className="hover:bg-[#252b3b]">
  //                 <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
  //                   {new Date(request.recharge.createdAt).toLocaleString()}
  //                 </td>
  //                 <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
  //                   {request.recharge.teamCode}
  //                 </td>
  //                 <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
  //                   {request.recharge.rechargeId}
  //                 </td>
  //                 <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
  //                   {request.recharge.playerName}
  //                 </td>
  //                 <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
  //                   {request.recharge.gamePlatform}
  //                 </td>
  //                 <td className="px-4 py-3 whitespace-nowrap text-sm text-yellow-500">
  //                   ${request.recharge.amount.toFixed(2)}
  //                 </td>
  //                 <td className="px-4 py-3 whitespace-nowrap">
  //                   <button className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">
  //                     View
  //                   </button>
  //                 </td>
  //                 <td className="px-4 py-3 whitespace-nowrap">
  //                   <span className="px-2 py-1 text-xs rounded-full bg-blue-500/10 text-blue-500">
  //                     {request.recharge.status}
  //                   </span>
  //                 </td>
  //                 <td className="px-4 py-3 whitespace-nowrap">
  //                   <div className="flex gap-2">
  //                     <button
  //                       onClick={() => {
  //                         setSelectedRequest(request);
  //                         setShowProcessModal(true);
  //                       }}
  //                       className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
  //                     >
  //                       <svg
  //                         className="w-4 h-4"
  //                         fill="none"
  //                         stroke="currentColor"
  //                         viewBox="0 0 24 24"
  //                       >
  //                         <path
  //                           strokeLinecap="round"
  //                           strokeLinejoin="round"
  //                           strokeWidth="2"
  //                           d="M5 13l4 4L19 7"
  //                         />
  //                       </svg>
  //                     </button>
  //                     <button
  //                       onClick={() => handleReject(request)}
  //                       className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20"
  //                     >
  //                       <svg
  //                         className="w-4 h-4"
  //                         fill="none"
  //                         stroke="currentColor"
  //                         viewBox="0 0 24 24"
  //                       >
  //                         <path
  //                           strokeLinecap="round"
  //                           strokeLinejoin="round"
  //                           strokeWidth="2"
  //                           d="M6 18L18 6M6 6l12 12"
  //                         />
  //                       </svg>
  //                     </button>
  //                   </div>
  //                 </td>
  //               </tr>
  //             ))}
  //           </tbody>
  //         </table>
  //       );
  //   }
  // };

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <FinanceHeader user={user}  />
      <div className="flex-1 pl-64">
        <main className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-white">Recharge</h1>
              <span className="text-3xl font-bold text-gray-500">Requests</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-4 mb-8 bg-[#1a1a1a] p-4 rounded-2xl border border-gray-800/20">
            <button
              onClick={() => setActiveTab("Pending")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === "Pending"
                  ? "bg-amber-500/10 text-amber-500"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Pending ({stats.pending})
            </button>
            <button
              onClick={() => setActiveTab("Processed")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === "Processed"
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Processed ({stats.processed})
            </button>
            <button
              onClick={() => setActiveTab("Rejected")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === "Rejected"
                  ? "bg-red-500/10 text-red-500"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Rejected ({stats.rejected})
            </button>
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
                        CREATED
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        TEAM CODE
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        RECHARGE ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        PLAYER NAME
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        GAME USERNAME
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        PLATFORM
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        AMOUNT
                      </th>
                      {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        SCREENSHOT
                      </th> */}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        STATUS
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filteredRequests.map((request, index) => (
                      <tr key={index} className="hover:bg-[#252b3b]">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                          {new Date(
                            request.recharge.createdAt
                          ).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                          {request.recharge.teamCode}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                          {request.recharge.rechargeId}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                          {request.recharge.playerName}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                          {request.recharge.gameUsername}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                          {request.recharge.gamePlatform}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-yellow-500">
                          ${request.recharge.amount.toFixed(2)}
                        </td>
                        {/* <td className="px-4 py-3 whitespace-nowrap">
                          <Link
                            href={`${request.recharge.screenshotUrl}`}
                            target="_blank"
                          >
                            <button className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">
                              View
                            </button>
                          </Link>
                        </td> */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-500/10 text-blue-500">
                            {request.recharge.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleProcess(request)}
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
                            <button
                              onClick={() => handleReject(request)}
                              className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20"
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
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Process Modal */}
      {showProcessModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-[#1a1a1a] rounded-2xl p-6 w-[600px]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Process Request</h2>
              <button
                onClick={() => setShowProcessModal(false)}
                className="text-gray-400 hover:text-white"
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

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">
                  Request Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Recharge ID:</p>
                    <p className="text-sm text-white">
                      {selectedRequest.recharge.rechargeId}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Player Name:</p>
                    <p className="text-sm text-white">
                      {selectedRequest.recharge.playerName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Game Username:</p>
                    <p className="text-sm text-white">
                      {selectedRequest.recharge.gameUsername}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Platform:</p>
                    <p className="text-sm text-white">
                      {selectedRequest.recharge.gamePlatform}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Amount:</p>
                    <p className="text-sm text-yellow-500">
                      ${selectedRequest.recharge.amount.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Credits Loaded
                </label>
                <input
                  type="text"
                  value={creditsLoaded}
                  onChange={(e) => setCreditsLoaded(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white"
                  placeholder="Enter credits loaded..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Notes
                </label>
                <textarea
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white h-24"
                  placeholder="Enter any processing notes..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setShowProcessModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600">
                Process
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-[#1a1a1a] rounded-2xl p-6 w-[600px]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Reject Request</h2>
              <button
                onClick={() => setShowRejectModal(false)}
                className="text-gray-400 hover:text-white"
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

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Rejection Reason
                </label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white"
                >
                  <option value="">Select a reason...</option>
                  <option value="duplicate">Duplicate Request</option>
                  <option value="invalid">Invalid Information</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white h-24"
                  placeholder="Enter any additional notes..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600">
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceRechargePage;
