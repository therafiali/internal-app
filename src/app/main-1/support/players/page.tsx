"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { AdminHeader, SupportHeader } from "@/app/components/Headers";
import Link from "next/link";
import { Ban, ChevronRight, Search } from "lucide-react";
import Image from "next/image";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import usePlayerStatus from "@/hooks/usePlayerStatus";
import AlertModal from "@/app/components/AlertModal";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { supabase } from "@/lib/supabase";
import { convertEntFormat } from "@/utils/entFormat";
import { EntType } from "@/supabase/types";
import EntFilterTabs from "@/app/components/EntFilterTabs";

// Update User interface to match the required type
interface User {
  id?: string;
  name: string;
  email: string;
  department: string;
  role: string;
  status: "active" | "inactive";
  ent_access?: EntType[];
  joinedDate?: string;
  agentId?: string;
  lastActive?: string;
  performanceRating?: number;
  handledCases?: number;
}

// Update ActivityLogPayload interface to include actionType
interface ActivityLogPayload {
  actionType: string;
  actionDescription: string;
  targetResource: string;
  targetResourceId?: string;
  status: "pending" | "success" | "failed";
  additionalDetails?: Record<string, any>;
}

interface PaymentMethod {
  type: string;
  details: {
    accountNumber?: string;
    accountName?: string;
    bankName?: string;
    // Add other relevant payment details
  };
}

interface RedeemRecord {
  amount: number;
  date: string;
  status: string;
  transactionId: string;
}

interface Player {
  _id: string;
  vipCode: string;
  playerName: string;
  team: string;
  status: string;
  messengerId: string;
  totalRedeemed: number;
  totalDeposits: number;
  holdingPercentage: number;
  dateJoined: string;
  paymentMethods: PaymentMethod[];
  redeemHistory: RedeemRecord[];
  lastSeen: string;
  createdAt: string;
  updatedAt: string;
  profile?: {
    profilePic?: string;
  };
  referrer_code?: string;
  referredByDetails?: {
    referrer_code: string;
  };
  referredBy?: Player;
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
  return "Just now";
};

const SupportPlayersPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const { players, loading, error, fetchPlayers, setPlayers } =
    useGetPlayers(user);
  const { updatePlayerStatus, loading: statusLoading } = usePlayerStatus();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchQuery, setActiveSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "banned">(
    "all"
  );
  const [selectedEnt, setSelectedEnt] = useState<string>("All ENT");
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "warning";
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "success",
  });
  const { logActivity } = useActivityLogger();

  // Helper function to show alert modal
  const showAlert = (
    title: string,
    message: string,
    type: "success" | "error" | "warning"
  ) => {
    setAlertModal({
      isOpen: true,
      title,
      message,
      type,
    });
  };

  // Helper function to close alert modal
  const closeAlert = () => {
    setAlertModal((prev) => ({ ...prev, isOpen: false }));
  };

  // Effect for initial data load and auth check
  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      const userData = localStorage.getItem("user");
      if (!userData) {
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

        // Log user details for debugging
        console.log(
          "User loaded with ENT access:",
          convertEntFormat.formatUserDetails(parsedUser)
        );

        // Initial data fetch will happen through the useGetPlayers hook
      } catch (error) {
        console.error("Error parsing user data:", error);
        router.push("/login");
      }
    };

    checkAuthAndLoadData();
  }, [router]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    console.log(
      "Setting up real-time subscription with ENT access:",
      convertEntFormat.formatUserDetails(user)
    );

    // Subscribe to changes in the players table
    const playersSubscription = supabase
      .channel("players_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
        },
        async (payload: any) => {
          console.log("Change received!", payload);
          if (!payload.new?.id) return;

          // Get user's ENT access with hyphens for filtering
          const entAccessWithHyphens = convertEntFormat.getUserEntAccess(user);

          // Only update if the player belongs to user's ENT
          if (!entAccessWithHyphens.includes(payload.new.team)) {
            console.log("Player update ignored - not in user ENT access");
            return;
          }

          // Instead of calling fetchPlayers, update the players state directly
          const { data: updatedPlayer } = await supabase
            .from("players")
            .select(
              `
              *,
              referredBy:referred_by(
                id,
                vip_code,
                player_name,
                profile
              )
            `
            )
            .eq("id", payload.new.id)
            .single();

          if (updatedPlayer) {
            setPlayers((prevPlayers) => {
              const index = prevPlayers.findIndex(
                (p) => p._id === updatedPlayer.id
              );
              if (index === -1) {
                return [...prevPlayers, transformPlayer(updatedPlayer)];
              }
              const newPlayers = [...prevPlayers];
              newPlayers[index] = transformPlayer(updatedPlayer);
              return newPlayers;
            });
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      playersSubscription.unsubscribe();
    };
  }, [user]); // Only depend on user

  // Helper function to transform player data
  const transformPlayer = (player: any) => ({
    _id: player.id,
    vipCode: player.vip_code,
    playerName: player.player_name,
    team: player.team,
    status: player.status,
    messengerId: player.messenger_id,
    totalRedeemed: player.total_redeemed,
    totalDeposits: player.total_deposits,
    holdingPercentage: player.holding_percentage,
    dateJoined: player.created_at,
    paymentMethods: player.payment_methods || [],
    redeemHistory: player.redeem_history || [],
    lastSeen: player.last_seen,
    createdAt: player.created_at,
    updatedAt: player.updated_at,
    profile: player.profile,
    referrer_code: player.referrer_code,
    referredByDetails: player.referredBy
      ? {
          referrer_code: player.referredBy.vip_code,
        }
      : undefined,
    referredBy: player.referredBy
      ? {
          _id: player.referredBy.id,
          vipCode: player.referredBy.vip_code,
          playerName: player.referredBy.player_name,
          profile: player.referredBy.profile,
        }
      : undefined,
  });

  const handleLogout = () => {
    try {
      Cookies.remove("token");
      localStorage.removeItem("user");
      router.push("/login");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const handleStatusChange = async (vipCode: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "banned" ? "active" : "banned";

      // Log start of status change

      await updatePlayerStatus(vipCode, newStatus);

      // Log successful status change

      showAlert(
        "Success",
        `Player ${
          newStatus === "banned" ? "banned" : "activated"
        } successfully`,
        "success"
      );
    } catch (error: any) {
      // Log failed status change

      console.error("Error updating player status:", error);
      showAlert(
        "Error",
        error.message || "Failed to update player status",
        "error"
      );
    }
  };

  // Get user's ENT access
  const userEntAccess = user?.ent_access
    ? convertEntFormat.getUserEntAccess(user)
    : [];

  // Effect to set initial ENT selection
  useEffect(() => {
    if (userEntAccess.length > 0 && selectedEnt === "All ENT") {
      setSelectedEnt("All ENT"); // Set default to "All ENT"
    }
  }, [userEntAccess]);

  // Filter players based on ENT selection
  const filteredPlayers = players.filter((player) => {
    const searchLower = activeSearchQuery.toLowerCase();
    const matchesSearch =
      player.playerName?.toLowerCase().includes(searchLower) ||
      player.vipCode.toLowerCase().includes(searchLower) ||
      player.team.toLowerCase().includes(searchLower);

    const matchesStatus =
      statusFilter === "all" || player.status === statusFilter;
    const matchesEnt = selectedEnt === "All ENT" || player.team === selectedEnt;

    return matchesSearch && matchesStatus && matchesEnt;
  });

  const handleFilterChange = async (type: string, value: string) => {
    try {
      if (type === "status") {
        setStatusFilter(value as "all" | "active" | "banned");
      } else if (type === "search") {
        setActiveSearchQuery(value);
      }

      // Log successful filter application
    } catch (error) {
      // Log failed filter application
    }
  };

  if (!user) return null;
  // if (loading) return <div>Loading...</div>;

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      {user.department === "Support" ? (
        <SupportHeader user={user} />
      ) : (
        <AdminHeader user={user} />
      )}
      <div className="flex-1 pl-64">
        <main className="p-8">
          {/* Header with Search, Filter and Refresh */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-white">Players List</h1>
            <div className="flex items-center gap-4">
              {/* Search Input */}
              <div className="relative flex items-center">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search players..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleFilterChange("search", searchQuery);
                    }
                  }}
                  className="pl-10 pr-4 py-2 bg-[#242424] text-white rounded-l-lg border border-r-0 border-gray-800 focus:outline-none focus:border-blue-500 w-64"
                />
                <button
                  onClick={() => handleFilterChange("search", searchQuery)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 transition-colors border border-blue-500"
                >
                  Search
                </button>
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="px-4 py-2 bg-[#242424] text-white rounded-lg border border-gray-800 focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="banned">Banned</option>
              </select>

              {/* Refresh Button */}
              <button
                onClick={fetchPlayers}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 disabled:opacity-50 transition-all"
              >
                {loading ? (
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
          </div>

          {/* Status summary */}
          <div className="mb-6 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-400">
                Active:{" "}
                {filteredPlayers.filter((p) => p.status === "active").length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm text-gray-400">
                Banned:{" "}
                {filteredPlayers.filter((p) => p.status === "banned").length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-500"></div>
              <span className="text-sm text-gray-400">
                Total: {filteredPlayers.length}
              </span>
            </div>
          </div>

          {/* ENT Tabs */}
          <EntFilterTabs
            userEntAccess={userEntAccess}
            selectedEnt={selectedEnt}
            onEntChange={setSelectedEnt}
          />

          {/* Players Table */}
          <div className="bg-[#1a1a1a] rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="text-center p-8 text-gray-400">
                Loading players...
              </div>
            ) : error ? (
              <div className="text-center p-8 text-red-500">{error}</div>
            ) : filteredPlayers.length === 0 ? (
              <div className="text-center p-8 text-gray-400">
                No players found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#252525]">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Player Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        VIP Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Referred By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Team
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Total Deposits
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Total Redeemed
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Last Interacted
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Date Joined
                      </th>

                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filteredPlayers.map((player) => (
                      <tr key={player._id} className="hover:bg-[#252b3b]">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/main/support/players/${player.vipCode}`}
                            >
                              <Image
                                src={
                                  player.profile?.profilePic ||
                                  `https://ui-avatars.com/api/?name=${player.playerName}`
                                }
                                alt={player.playerName || "Player"}
                                width={40}
                                height={40}
                                className="rounded-full"
                              />
                            </Link>
                            <span className="ml-2 text-sm text-gray-300">
                              {player.playerName || "Unknown"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          <span className="px-2 py-1 rounded-full bg-purple-500/10 text-purple-500">
                            {player.vipCode}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {player.referredBy ? (
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 overflow-hidden">
                                {player.referredBy.profile?.profilePic ? (
                                  <Image
                                    src={player.referredBy.profile.profilePic}
                                    alt={player.referredBy.playerName}
                                    width={32}
                                    height={32}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span>
                                    {player.referredBy.playerName.charAt(0)}
                                  </span>
                                )}
                              </div>
                              <span className="ml-2 text-sm text-gray-300">
                                {player.referredBy.playerName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">
                              No Referrer
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {player.team}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {player.totalDeposits
                            ? "$" + player.totalDeposits.toLocaleString()
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {player.totalRedeemed
                            ? "$" + player.totalRedeemed.toLocaleString()
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              (player.status || "").toLowerCase() === "active"
                                ? "bg-green-500/10 text-green-500"
                                : (player.status || "").toLowerCase() ===
                                  "banned"
                                ? "bg-red-500/10 text-red-500"
                                : "bg-yellow-500/10 text-yellow-500"
                            }`}
                          >
                            {(player.status || "Unknown").toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex flex-col">
                            <span className="text-gray-300">
                              {getTimeElapsed(player.lastSeen)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(player.lastSeen).toLocaleString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {new Date(player.dateJoined).toLocaleDateString()}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap flex items-center gap-2">
                          {player.status === "banned" ? (
                            <button
                              onClick={() =>
                                handleStatusChange(
                                  player.vipCode,
                                  player.status
                                )
                              }
                              className="inline-flex items-center gap-2 px-2 py-2 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-all text-sm"
                              disabled={statusLoading}
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
                          ) : (
                            <button
                              onClick={() =>
                                handleStatusChange(
                                  player.vipCode,
                                  player.status
                                )
                              }
                              className="inline-flex items-center gap-2 px-2 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all text-sm"
                              disabled={statusLoading}
                            >
                              <Ban size={16} />
                            </button>
                          )}
                          <Link
                            href={{
                              pathname: `/main/support/players/${player.vipCode}`,
                              // query: { data: JSON.stringify(player) }
                            }}
                            className="inline-flex items-center gap-2 px-2 py-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-all text-sm"
                          >
                            <ChevronRight size={18} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
};

export default SupportPlayersPage;
