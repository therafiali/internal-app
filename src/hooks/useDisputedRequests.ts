import { useEffect, useState } from "react";
import { supabase } from "@/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface DisputedRequest {
  id: string;
  recharge_id: string;
  init_by: string;
  player_name: string;
  messenger_id: string | null;
  team_code: string;
  game_platform: string;
  game_username: string;
  amount: number;
  status: string;
  notes: string | null;
  agent_name: string;
  agent_department: string;
  credits_loaded: number;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  player_data?: {
    profile: {
      profilePic: string;
    };
  };
  manychat_data?: {
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
  deposit_status: string;
  vip_code?: string;
  redeem_id?: string;
}

interface Stats {
  disputed: number;
}

interface UseDisputedRequestsProps {
  activeTeamCode: "ALL" | "ENT-1" | "ENT-2" | "ENT-3";
  limit: number;
}

export function useDisputedRequests({
  activeTeamCode,
  limit,
}: UseDisputedRequestsProps) {
  const [disputedRequests, setDisputedRequests] = useState<DisputedRequest[]>(
    []
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statsData, setStatsData] = useState<Stats>({
    disputed: 0,
  });
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // Function to fetch stats
  const fetchStats = async () => {
    try {
      const { data: statsData, error: statsError } = await supabase
        .from("recharge_requests")
        .select("deposit_status", { count: "exact" })
        .eq("deposit_status", "disputed")
        .not("status", "eq", "return");

      if (statsError) throw statsError;

      setStatsData({
        disputed: statsData.length,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // Function to fetch disputed requests
  const fetchDisputedRequests = async () => {
    try {
      setIsLoading(true);
      const start = (currentPage - 1) * limit;
      const end = start + limit - 1;

      let query = supabase
        .from("recharge_requests")
        .select("*", { count: "exact" })
        .eq("deposit_status", "disputed")
        .not("status", "eq", "return")
        .range(start, end)
        .order("created_at", { ascending: false });

      // Add team code filter if not 'ALL'
      if (activeTeamCode !== "ALL") {
        query = query.eq("team_code", activeTeamCode);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setDisputedRequests(data || []);
      setTotalRecords(count || 0);
      setTotalPages(Math.ceil((count || 0) / limit));
    } catch (error) {
      console.error("Error fetching disputed requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle real-time updates
  const setupRealtimeSubscription = () => {
    if (channel) {
      channel.unsubscribe();
    }

    const newChannel = supabase
      .channel("disputed-requests-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "recharge_requests",
          filter: "deposit_status=eq.disputed",
        },
        (payload) => {
          console.log("Change received!", payload);
          // Refresh data when changes occur
          fetchDisputedRequests();
          fetchStats();
        }
      )
      .subscribe();

    setChannel(newChannel);
  };

  // Effect for initial load and when filters change
  useEffect(() => {
    fetchDisputedRequests();
    fetchStats();
  }, [activeTeamCode, currentPage, limit]);

  // Effect for real-time subscription
  useEffect(() => {
    setupRealtimeSubscription();
    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, []);

  // Function to manually refresh data
  const refresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchDisputedRequests(), fetchStats()]);
    setIsRefreshing(false);
  };

  return {
    disputedRequests,
    currentPage,
    totalPages,
    totalRecords,
    isLoading,
    isRefreshing,
    statsData,
    refresh,
    setCurrentPage,
  };
}
