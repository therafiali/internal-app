"use client"

import React, { useState, useEffect, useCallback } from "react";
import { X, Search, Plus } from "lucide-react";
import Cookies from "js-cookie";
import Image from 'next/image'
import { supabase } from "@/lib/supabase";
import { debounce } from "lodash";

interface Promotion {
  id: string;
  code: string;
  name?: string;
  description?: string;
  type: "PERCENTAGE" | "FIXED" | "percentage" | "fixed";
  amount?: number | null;
  percentage?: number | null;
  value?: number;
  max_discount?: number;
  min_recharge_amount?: number;
  max_recharge_amount?: number;
  current_usage?: number;
  max_usage_per_user?: number;
  total_usage_limit?: number;
  usageLimit?: number;
  is_referral_promo?: boolean;
  referral_balance?: number;
  owner_vip_code?: string;
  applicable_games?: string[];
  applicable_teams?: string[];
  team?: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
  status?: "active" | "inactive";
  assigned_promo?: string[];
  participants?: any[];
}

interface AssignmentDetails {
  vip_code: string;
  profile_pic: string | null;
  player_name: string;
  team_code: string;
  assignedAt: string;
  assignedBy: {
    userId: string;
    name: string;
    email: string;
    role: string;
  };
  status: string;
  promotion_code: string;
}

interface Player {
  id: string;
  vip_code: string;
  messenger_id: string;
  player_name: string;
  referred_by: string | null;
  referred_by_vip_code: string | null;
  referral_count: number;
  referral_bonus_balance: number;
  profile: {
    gender: string | null;
    fullName: string | null;
    language: string | null;
    lastName: string | null;
    timezone: string | null;
    firstName: string | null;
    profilePic: string | null;
  };
  game_usernames: {
    fireKirin: string | null;
    gameVault: string | null;
    orionStars: string | null;
  };
  payment_methods: any[];
  game_limits: Record<string, any>;
  daily_redeem_limit: {
    limit: number;
    redeemed: number;
    remaining: number;
    lastUpdated: string;
  };
  created_at: string;
  updated_at: string;
  team: string;
  status: string;
  total_deposits: number;
  total_redeemed: number;
  holding_percentage: number;
  last_seen: string;
  referredBy: string | null;
  assigned_promo?: (AssignmentDetails | string)[];
}

interface AssignedPlayer extends Player {
  assigned_at: string;
}

interface ClaimedPlayer extends AssignedPlayer {
  claimed_at: string;
  bonus_amount: number;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  usedAt: string;
  bonusAmount: number;
}

interface ParticipantsModalProps {
  promotion: Promotion;
  onClose: () => void;
}

// Add mock data
const MOCK_PLAYERS: Player[] = [
  {
    id: "1",
    vip_code: "VIP700013",
    messenger_id: "2011643420",
    player_name: "Ibrahim Pirzada",
    referred_by: null,
    referred_by_vip_code: null,
    referral_count: 0,
    referral_bonus_balance: 0,
    profile: {
      gender: "male",
      fullName: "Ibrahim Pirzada",
      language: "English",
      lastName: "Pirzada",
      timezone: "UTC-06",
      firstName: "Ibrahim",
      profilePic: "https://ui-avatars.com/api/?name=Ibrahim+Pirzada"
    },
    game_usernames: {
      fireKirin: null,
      gameVault: null,
      orionStars: null
    },
    payment_methods: [],
    game_limits: {},
    daily_redeem_limit: {
      limit: 2000,
      redeemed: 0,
      remaining: 2000,
      lastUpdated: "2025-02-20T00:10:56.329999+00:00"
    },
    created_at: "2025-02-20T00:10:56.329999+00:00",
    updated_at: "2025-02-20T00:10:56.329999+00:00",
    team: "ENT-1",
    status: "active",
    total_deposits: 0,
    total_redeemed: 0,
    holding_percentage: 0,
    last_seen: "2025-02-20T00:10:56.329999+00:00",
    referredBy: null,
    assigned_promo: []
  },
  {
    id: "2",
    vip_code: "VIP700014",
    messenger_id: "2011643421",
    player_name: "John Smith",
    referred_by: null,
    referred_by_vip_code: null,
    referral_count: 0,
    referral_bonus_balance: 0,
    profile: {
      gender: "male",
      fullName: "John Smith",
      language: "English",
      lastName: "Smith",
      timezone: "UTC-05",
      firstName: "John",
      profilePic: "https://ui-avatars.com/api/?name=John+Smith"
    },
    game_usernames: {
      fireKirin: null,
      gameVault: null,
      orionStars: null
    },
    payment_methods: [],
    game_limits: {},
    daily_redeem_limit: {
      limit: 2000,
      redeemed: 0,
      remaining: 2000,
      lastUpdated: "2025-02-20T00:10:56.329999+00:00"
    },
    created_at: "2025-02-20T00:10:56.329999+00:00",
    updated_at: "2025-02-20T00:10:56.329999+00:00",
    team: "ENT-1",
    status: "active",
    total_deposits: 0,
    total_redeemed: 0,
    holding_percentage: 0,
    last_seen: "2025-02-20T00:10:56.329999+00:00",
    referredBy: null,
    assigned_promo: []
  },
  {
    id: "3",
    vip_code: "VIP700015",
    messenger_id: "2011643422",
    player_name: "Sarah Johnson",
    referred_by: null,
    referred_by_vip_code: null,
    referral_count: 0,
    referral_bonus_balance: 0,
    profile: {
      gender: "female",
      fullName: "Sarah Johnson",
      language: "English",
      lastName: "Johnson",
      timezone: "UTC-05",
      firstName: "Sarah",
      profilePic: "https://ui-avatars.com/api/?name=Sarah+Johnson"
    },
    game_usernames: {
      fireKirin: null,
      gameVault: null,
      orionStars: null
    },
    payment_methods: [],
    game_limits: {},
    daily_redeem_limit: {
      limit: 2000,
      redeemed: 0,
      remaining: 2000,
      lastUpdated: "2025-02-20T00:10:56.329999+00:00"
    },
    created_at: "2025-02-20T00:10:56.329999+00:00",
    updated_at: "2025-02-20T00:10:56.329999+00:00",
    team: "ENT-1",
    status: "active",
    total_deposits: 0,
    total_redeemed: 0,
    holding_percentage: 0,
    last_seen: "2025-02-20T00:10:56.329999+00:00",
    referredBy: null,
    assigned_promo: ["PROMO123"]
  }
];

const MOCK_CLAIMED_PLAYERS: ClaimedPlayer[] = [
  {
    ...MOCK_PLAYERS[2],
    assigned_at: "2025-02-20T00:10:56.329999+00:00",
    claimed_at: "2025-02-20T00:15:56.329999+00:00",
    bonus_amount: 100
  }
];

const ParticipantsModal = ({ promotion, onClose }: ParticipantsModalProps) => {
  const [activeTab, setActiveTab] = useState<"assigned" | "claimed" | "unassigned">("assigned");
  const [assignedPlayers, setAssignedPlayers] = useState<AssignedPlayer[]>([]);
  const [unassignedPlayers, setUnassignedPlayers] = useState<Player[]>([]);
  const [claimedPlayers, setClaimedPlayers] = useState<ClaimedPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [assigningPlayer, setAssigningPlayer] = useState<string | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [assigningAll, setAssigningAll] = useState(false);

  // Helper functions moved outside of render to prevent recreation
  const getTeam = useCallback(() => {
    if (promotion.applicable_teams && promotion.applicable_teams.length > 0) {
      return promotion.applicable_teams[0];
    }
    return promotion.team || '';
  }, [promotion.applicable_teams, promotion.team]);

  const getStatus = useCallback(() => {
    if (typeof promotion.is_active === 'boolean') {
      return promotion.is_active;
    }
    return promotion.status === 'active';
  }, [promotion.is_active, promotion.status]);

  const getValue = useCallback(() => {
    if (promotion.type === 'PERCENTAGE' || promotion.type === 'percentage') {
      return promotion.percentage || promotion.value || 0;
    }
    return promotion.amount || promotion.value || 0;
  }, [promotion.type, promotion.percentage, promotion.value, promotion.amount]);

  const getUsageLimit = useCallback(() => {
    return promotion.total_usage_limit || promotion.usageLimit || 0;
  }, [promotion.total_usage_limit, promotion.usageLimit]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Update players list based on current filters
  const updatePlayerLists = useCallback((players: Player[], assignedVipCodes: string[]) => {
    const filteredPlayers = debouncedSearchQuery 
      ? players.filter(player =>
          player.player_name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
          player.vip_code.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
        )
      : players;

    if (activeTab === 'assigned') {
      const assigned = filteredPlayers.filter(player => 
        assignedVipCodes.includes(player.vip_code)
      );
      setAssignedPlayers(assigned.map(player => ({
        ...player,
        assigned_at: (player.assigned_promo && typeof player.assigned_promo[0] === 'object' && 'assignedAt' in player.assigned_promo[0]) 
          ? player.assigned_promo[0].assignedAt 
          : new Date().toISOString()
      })));
    } else if (activeTab === 'unassigned') {
      const unassigned = filteredPlayers.filter(player => 
        !assignedVipCodes.includes(player.vip_code)
      );
      setUnassignedPlayers(unassigned);
    } else if (activeTab === 'claimed') {
      setClaimedPlayers(MOCK_CLAIMED_PLAYERS);
    }
  }, [activeTab, debouncedSearchQuery]);

  // Handle manual search
  const handleSearch = () => {
    setDebouncedSearchQuery(searchQuery);
  };

  // Handle key press for search
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Fetch players
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current user from Supabase
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('Error fetching user:', userError);
          throw userError;
        }

        if (!user) {
          throw new Error('No user found');
        }

        // Get assigned players from promotion_assignments table
        const { data: assignments, error: assignmentsError } = await supabase
          .from('promotion_assignments')
          .select('*')
          .eq('promotion_id', promotion.id)
          .eq('status', 'assigned');

        if (assignmentsError) {
          console.error('Error fetching assignments:', assignmentsError);
          throw assignmentsError;
        }

        console.log('Current assignments:', assignments);

        // Get the VIP codes of assigned players
        const assignedVipCodes = assignments.map(assignment => assignment.vip_code);

        // Query players from Supabase
        const { data: players, error } = await supabase
          .from('players')
          .select('*')
          .eq('team', getTeam())
          .eq('status', 'active');

        if (error) {
          throw error;
        }

        if (players) {
          // Filter players based on assignments
          const assignedPlayers = players
            .filter(player => assignedVipCodes.includes(player.vip_code))
            .map(player => {
              const assignment = assignments.find(a => a.vip_code === player.vip_code);
              return {
                ...player,
                assigned_at: assignment?.assigned_at || new Date().toISOString()
              };
            });

          const unassignedPlayers = players.filter(player => 
            !assignedVipCodes.includes(player.vip_code)
          );

          console.log('Assigned players:', assignedPlayers);
          console.log('Unassigned players:', unassignedPlayers);

          if (activeTab === 'assigned') {
            setAssignedPlayers(assignedPlayers);
          } else if (activeTab === 'unassigned') {
            setUnassignedPlayers(unassignedPlayers);
          }
        }
      } catch (error) {
        console.error('Error fetching players:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch players');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, [getTeam, activeTab, promotion.id]);

  // Handle tab change
  const handleTabChange = (tab: "assigned" | "claimed" | "unassigned") => {
    setActiveTab(tab);
    setSearchQuery(""); // Reset search when changing tabs
  };

  const handleUnassignPlayer = async (playerId: string) => {
    try {
      setLoading(true);
      const playerToUnassign = assignedPlayers.find((p) => p.id === playerId);
      if (!playerToUnassign) return;

      // Get current user from Supabase
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error fetching user:', userError);
        throw userError;
      }

      if (!user) {
        throw new Error('No user found');
      }

      // Update assignment status and add unassignment details
      const { error: updateError } = await supabase
        .from('promotion_assignments')
        .update({
          status: 'unassigned',
          unassigned_at: new Date().toISOString(),
          unassigned_by: user.id
        })
        .eq('promotion_id', promotion.id)
        .eq('vip_code', playerToUnassign.vip_code)
        .eq('status', 'assigned');

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Update local state
      setAssignedPlayers(assignedPlayers.filter((p) => p.id !== playerId));
      setUnassignedPlayers([...unassignedPlayers, playerToUnassign]);
    } catch (error) {
      console.error('Error unassigning player:', error);
      setError(error instanceof Error ? error.message : 'Failed to unassign player');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPlayer = async (player: Player) => {
    try {
      setAssigningPlayer(player.vip_code);
      console.log('Starting assignment for player:', player);

      // Get current user from Supabase
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error fetching user:', userError);
        throw userError;
      }

      if (!user) {
        throw new Error('No user found');
      }

      // Check if player is already assigned
      const { data: existingAssignments, error: checkError } = await supabase
        .from('promotion_assignments')
        .select('*')
        .eq('promotion_id', promotion.id)
        .eq('vip_code', player.vip_code)
        .eq('status', 'assigned');

      if (checkError) {
        console.error('Error checking existing assignment:', checkError);
        throw checkError;
      }

      if (existingAssignments && existingAssignments.length > 0) {
        throw new Error('Player already has this promotion assigned');
      }

      // Insert new assignment
      const { error: insertError } = await supabase
        .from('promotion_assignments')
        .insert({
          promotion_id: promotion.id,
          vip_code: player.vip_code,
          player_name: player.player_name,
          team: player.team,
          assigned_by: user.id,
          promo_code: promotion.code,
          promo_type: promotion.type,
          status: 'assigned'
        });

      if (insertError) {
        console.error('Error creating assignment:', insertError);
        throw insertError;
      }

      console.log('Successfully created assignment');

      // Update local state
      setUnassignedPlayers(unassignedPlayers.filter(p => p.vip_code !== player.vip_code));
      setAssignedPlayers([...assignedPlayers, { 
        ...player, 
        assigned_at: new Date().toISOString()
      } as AssignedPlayer]);

      console.log('Local state updated successfully');
    } catch (error) {
      console.error('Error in handleAssignPlayer:', error);
      setError(error instanceof Error ? error.message : 'Failed to assign player');
    } finally {
      setAssigningPlayer(null);
    }
  };

  const handleAssignAllPlayers = async () => {
    try {
      setAssigningAll(true);
      console.log('Starting bulk assignment for players:', unassignedPlayers);

      // Get current user from Supabase
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error fetching user:', userError);
        throw userError;
      }

      if (!user) {
        throw new Error('No user found');
      }

      // Create assignments for all players
      const assignments = unassignedPlayers.map(player => ({
        promotion_id: promotion.id,
        vip_code: player.vip_code,
        player_name: player.player_name,
        team: player.team,
        assigned_by: user.id,
        status: 'assigned'
      }));

      // Insert all assignments
      const { error: insertError } = await supabase
        .from('promotion_assignments')
        .insert(assignments);

      if (insertError) {
        console.error('Error creating assignments:', insertError);
        throw insertError;
      }

      console.log('Successfully created assignments');

      // Update local state
      const newAssignedPlayers = unassignedPlayers.map(player => ({
        ...player,
        assigned_at: new Date().toISOString()
      } as AssignedPlayer));

      setAssignedPlayers([...assignedPlayers, ...newAssignedPlayers]);
      setUnassignedPlayers([]);

      console.log('Local state updated successfully');
    } catch (error) {
      console.error('Error in handleAssignAllPlayers:', error);
      setError(error instanceof Error ? error.message : 'Failed to assign players');
    } finally {
      setAssigningAll(false);
      setSelectedPlayers([]);
    }
  };

  console.log('promotion', promotion);
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] rounded-xl w-[800px] max-h-[85vh] border border-gray-800 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-800">
          <div>
            <h2 className="text-xl font-semibold text-white mb-1">
              Promotion Participants
            </h2>
            <p className="text-sm text-gray-400">
              Manage players for promotion code:{" "}
              <span className="text-blue-400 font-mono">{promotion.code}</span>
              <span className="ml-2 text-gray-400">
                (Team: <span className="text-emerald-400">{getTeam()}</span>)
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 hover:bg-white/5 p-2 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Promotion Details Preview */}
        <div className="px-6 py-4 border-b border-gray-800 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-gray-400">Type</p>
              <p className="text-sm font-medium text-white">
                {promotion.type.toLowerCase() === "percentage" ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400">
                    Percentage ({getValue()}%)
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400">
                    Fixed (${getValue()})
                  </span>
                )}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-400">Name</p>
              <p className="text-sm font-medium text-white">{promotion.description || promotion.name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-400">Status</p>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    getStatus()
                      ? "bg-emerald-500"
                      : "bg-yellow-500"
                  }`}
                />
                <p className="text-sm font-medium text-white capitalize">
                  {getStatus() ? "active" : "inactive"}
                </p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-400">Claimed</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{
                      width: `${Math.min(
                        (assignedPlayers.length / getUsageLimit()) *
                          100,
                        100
                      )}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-gray-400">
                  {assignedPlayers.length}/{getUsageLimit() || "∞"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b border-gray-800">
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search by name, VIP code, or team..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full pl-10 pr-4 py-2.5 bg-[#242424] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-gray-500 transition-colors"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <Search size={18} />
              Search
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-6 pt-4 border-b border-gray-800">
          <button
            onClick={() => handleTabChange("claimed")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "claimed"
                ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Claimed ({claimedPlayers.length})
          </button>
          <button
            onClick={() => handleTabChange("assigned")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "assigned"
                ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Assigned ({assignedPlayers.length})
          </button>
          <button
            onClick={() => handleTabChange("unassigned")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "unassigned"
                ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Unassigned ({unassignedPlayers.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-380px)] custom-scrollbar">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : activeTab === "assigned" ? (
            <div className="space-y-4">
              {assignedPlayers.length === 0 ? (
                <p className="text-center text-gray-400 py-8">
                  {searchQuery
                    ? "No matching players found"
                    : "No players assigned to this promotion yet"}
                </p>
              ) : (
                <div className="grid gap-4">
                  {assignedPlayers.map((player) => (
                    <div
                      key={`${player.id}-${player.assigned_at}`}
                      className="flex items-center justify-between bg-[#242424] p-4 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                          <Image 
                              src={player.profile.profilePic || `https://ui-avatars.com/api/?name=${player.player_name || 'Unknown'}`}
                              alt={player.player_name || 'Unknown Player'}
                              width={32}
                              height={32}
                              className="rounded-full"
                          />
                        </div>
                        <div>
                          <h3 className="text-white font-medium">
                            {player.player_name}
                          </h3>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-400">
                              {player.vip_code}
                            </span>
                            <span className="text-gray-600">•</span>
                            <span className="text-gray-400">{player.team}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm text-gray-400">
                            Assigned on
                          </div>
                          <div className="text-white">
                            {new Date(player.assigned_at).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={() => player.id && handleUnassignPlayer(player.id)}
                          className="px-4 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors ml-4"
                        >
                          Unassign
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === "claimed" ? (
            <div className="space-y-4">
              {claimedPlayers.length === 0 ? (
                <p className="text-center text-gray-400 py-8">
                  {searchQuery
                    ? "No matching players found"
                    : "No players have claimed this promotion yet"}
                </p>
              ) : (
                <div className="grid gap-4">
                  {claimedPlayers.map((player) => (
                    <div
                      key={`${player.id}-${player.claimed_at}`}
                      className="flex items-center justify-between bg-[#242424] p-4 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                          <Image 
                              src={player.profile.profilePic || `https://ui-avatars.com/api/?name=${player.player_name || 'Unknown'}`}
                              alt={player.player_name || 'Unknown Player'}
                              width={32}
                              height={32}
                              className="rounded-full"
                          />
                        </div>
                        <div>
                          <h3 className="text-white font-medium">
                            {player.player_name}
                          </h3>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-400">
                              {player.vip_code}
                            </span>
                            <span className="text-gray-600">•</span>
                            <span className="text-gray-400">{player.team}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm text-gray-400">
                            Claimed on
                          </div>
                          <div className="text-white">
                            {new Date(player.claimed_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-400">
                            Bonus Amount
                          </div>
                          <div className="text-emerald-500">
                            ${player.bonus_amount}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {unassignedPlayers.length > 0 && (
                <div className="flex justify-end mb-4">
                  <button
                    onClick={handleAssignAllPlayers}
                    disabled={assigningAll}
                    className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2
                      ${assigningAll 
                        ? "bg-blue-500/5 text-blue-400 cursor-not-allowed" 
                        : "bg-blue-500 text-white hover:bg-blue-600"}`}
                  >
                    {assigningAll ? (
                      <>
                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        Assigning All...
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        Assign All Players
                      </>
                    )}
                  </button>
                </div>
              )}
              {unassignedPlayers.length === 0 ? (
                <p className="text-center text-gray-400 py-8">
                  {searchQuery
                    ? "No matching unassigned players found"
                    : `No unassigned players available for team ${getTeam()}`}
                </p>
              ) : (
                <div className="grid gap-4">
                  {unassignedPlayers.map((player) => (
                    <div
                      key={player.vip_code}
                      className="flex items-center justify-between bg-[#242424] p-4 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                          <Image 
                              src={player.profile.profilePic || `https://ui-avatars.com/api/?name=${player.player_name || 'Unknown'}`}
                              alt={player.player_name || 'Unknown Player'}
                              width={32}
                              height={32}
                              className="rounded-full"
                          />
                        </div>
                        <div>
                          <h3 className="text-white font-medium">
                            {player.player_name}
                          </h3>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-400">
                              {player.vip_code}
                            </span>
                            <span className="text-gray-600">•</span>
                            <span className="text-gray-400">{player.team}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleAssignPlayer(player)}
                          disabled={assigningPlayer === player.vip_code}
                          className={`px-4 py-2 rounded-lg transition-colors ${
                            assigningPlayer === player.vip_code
                              ? "bg-blue-500/5 text-blue-400 cursor-not-allowed"
                              : "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
                          }`}
                        >
                          {assigningPlayer === player.vip_code ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                              Assigning...
                            </div>
                          ) : (
                            "Assign"
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add custom scrollbar styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: #242424;
          border-radius: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #374151;
          border-radius: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4b5563;
        }
      `}</style>
    </div>
  );
};

export default ParticipantsModal; 
