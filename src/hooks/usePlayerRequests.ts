import { useState, useCallback } from 'react';
import { supabase, getAuthenticatedClient } from '@/lib/supabase';

interface Player {
  id: string;
  manychat_data: {
    custom_fields: {
      firekirin_username: string | null;
      gamevault_username: string | null;
      juwa_username: string | null;
      orionstars_username: string | null;
      team_code: string;
      entry_code: string | null;
      entry_valid: boolean | null;
      load_amount: string | null;
      load_game_platform: string | null;
    };
    first_name: string;
    last_name: string;
    name: string;
    email?: string;
    profile_pic: string;
    subscribed: string;
    last_interaction: string;
  };
  registration_status: string;
  created_at: string;
  referrer_code?: string;
  referred_by?: {
    vip_code: string;
    player_name: string;
    team: string;
    status: string;
    date_joined: string;
    profile: {
      profile_pic: string;
      full_name: string;
      first_name: string;
      last_name: string;
      gender: string;
      language: string;
      timezone: string;
    };
  };
}

export const usePlayerRequests = (initialPage: number) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlayers = useCallback(async (page: number, status: string = 'pending') => {
    setLoading(true);
    setError(null);
    try {
      const client = getAuthenticatedClient();
      
      // Calculate pagination
      const from = (page - 1) * 10;
      const to = from + 9;

      let query = client
        .from('pending_players')
        .select('*', { count: 'exact' })
        .eq('registration_status', status)
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      if (data) {
        setPlayers(data as Player[]);
        if (count) {
          setTotalPages(Math.ceil(count / 10));
        }
        setCurrentPage(page);
      }
    } catch (err) {
      console.error('Error fetching players:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch players');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAction = async (playerId: string, status: 'approved' | 'rejected') => {
    try {
      const client = getAuthenticatedClient();
      
      const { data, error } = await client
        .from('pending_players')
        .update({ registration_status: status })
        .eq('id', playerId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setPlayers(prevPlayers => prevPlayers.filter(player => player.id !== playerId));

      return data;
    } catch (err) {
      console.error(`Error ${status}ing player:`, err);
      throw err;
    }
  };

  return {
    players,
    totalPages,
    currentPage,
    loading,
    error,
    fetchPlayers,
    handleAction,
    setPlayers,
    setTotalPages
  };
}; 