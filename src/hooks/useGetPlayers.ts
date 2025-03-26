import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Player } from '@/app/types';
import { User } from '@/app/types';
import { convertEntFormat } from '@/utils/entFormat';

export const useGetPlayers = (user: User | null) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transformPlayer = (player: any): Player => ({
    _id: player.id || '',
    vipCode: player.vip_code || '',
    playerName: player.player_name || '',
    team: player.team || '',
    status: player.status || 'active', // Provide default status
    messengerId: player.messenger_id || '',
    totalRedeemed: player.total_redeemed || 0,
    totalDeposits: player.total_deposits || 0,
    holdingPercentage: player.holding_percentage || 0,
    dateJoined: player.created_at || new Date().toISOString(),
    paymentMethods: player.payment_methods || [],
    redeemHistory: player.redeem_history || [],
    lastSeen: player.last_seen || new Date().toISOString(),
    createdAt: player.created_at || new Date().toISOString(),
    updatedAt: player.updated_at || new Date().toISOString(),
    profile: player.profile || {},
    referrer_code: player.referrer_code || undefined,
    referredByDetails: player.referredBy ? {
      referrer_code: player.referredBy.vip_code || ''
    } : undefined,
    referredBy: player.referredBy ? {
      _id: player.referredBy.id || '',
      vipCode: player.referredBy.vip_code || '',
      playerName: player.referredBy.player_name || '',
      profile: player.referredBy.profile || {}
    } : undefined
  });

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      setError(null);

      // If user has no ENT access, return empty result
      if (!user?.ent_access || user.ent_access.length === 0) {
        console.log('No ENT access, returning empty result');
        setPlayers([]);
        return;
      }

      // Get user's ENT access with hyphens for filtering
      const entAccessWithHyphens = convertEntFormat.getUserEntAccess(user);
      console.log('Fetching players with ENT access:', entAccessWithHyphens);

      const { data, error: supabaseError } = await supabase
        .from('players')
        .select(`
          *,
          referredBy:referred_by(
            id,
            vip_code,
            player_name,
            profile
          )
        `)
        .in('team', entAccessWithHyphens)
        .order('created_at', { ascending: false });

      if (supabaseError) {
        throw supabaseError;
      }

      // Transform the data to match the expected format with null checks
      const transformedPlayers = (data || []).map(transformPlayer);
      console.log('Fetched players:', transformedPlayers.length);

      setPlayers(transformedPlayers);
    } catch (err) {
      console.error('Error fetching players:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch players');
      setPlayers([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Fetch players when user changes
  useEffect(() => {
    if (user) {
      fetchPlayers();
    }
  }, [user]);

  return {
    players,
    loading,
    error,
    fetchPlayers,
    setPlayers
  };
}; 