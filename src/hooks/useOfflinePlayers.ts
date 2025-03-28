import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from "@/supabase/client";
import { useEffect } from 'react'

interface Player {
  id: string
  vip_code: string
  player_name: string
  profile: {
    firstName: string
    lastName: string
    profilePic: string
    fullName: string
  }
  redeem_online_status: boolean
}

interface RedeemRequest {
  id: string
  amount: number
  created_at: string
  status: string
  vip_code: string
  player_name: string
  player: Player | null
  total_requests: number
}

interface PlayerWithRequests {
  player: Player
  redeemRequests: RedeemRequest[]
}

export function useRedeemRequests() {
  const queryClient = useQueryClient()

  // Set up real-time subscriptions
  useEffect(() => {
    // Subscribe to players table changes
    const playersSubscription = supabase
      .channel('players-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
        },
        () => {
          // Invalidate and refetch when players data changes
          queryClient.invalidateQueries({ queryKey: ['redeem-requests'] })
        }
      )
      .subscribe()

    // Subscribe to redeem_requests table changes
    const requestsSubscription = supabase
      .channel('redeem-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'redeem_requests',
        },
        () => {
          // Invalidate and refetch when redeem requests change
          queryClient.invalidateQueries({ queryKey: ['redeem-requests'] })
        }
      )
      .subscribe()

    // Cleanup subscriptions when component unmounts
    return () => {
      playersSubscription.unsubscribe()
      requestsSubscription.unsubscribe()
    }
  }, [queryClient])

  return useQuery({
    queryKey: ['redeem-requests'],
    queryFn: async (): Promise<RedeemRequest[]> => {
      // First get offline players
      const { data: offlinePlayers, error: playersError } = await supabase
        .from('players')
        .select(`
          id,
          vip_code,
          player_name,
          profile,
          redeem_online_status
        `)
        .eq('redeem_online_status', false)

      if (playersError) throw playersError

      // Get VIP codes of offline players
      const offlineVipCodes = offlinePlayers.map(player => player.vip_code)

      if (offlineVipCodes.length === 0) {
        return [] // Return empty array if no offline players
      }

      // Get redeem requests for offline players
      const { data: requestsData, error: requestsError } = await supabase
        .from('redeem_requests')
        .select(`
          id,
          total_amount,
          created_at,
          status,
          vip_code,
          player_name
        `)
        .in('vip_code', offlineVipCodes)
        .in('status', ['queued', 'queued_partially_paid'])
        .lt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })

      if (requestsError) throw requestsError

      // Group requests by VIP code and get the latest request for each
      const groupedRequests = requestsData.reduce((acc, request) => {
        if (!acc[request.vip_code] || new Date(request.created_at) > new Date(acc[request.vip_code].created_at)) {
          acc[request.vip_code] = request
        }
        return acc
      }, {} as Record<string, any>)

      // Count total requests for each VIP code
      const requestCounts = requestsData.reduce((acc, request) => {
        acc[request.vip_code] = (acc[request.vip_code] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Create a map of VIP codes to player details
      const playerMap = Object.fromEntries(
        offlinePlayers.map(player => [player.vip_code, player])
      )

      // Return the latest request for each VIP code with player details
      return Object.values(groupedRequests).map(request => ({
        id: request.id,
        amount: request.total_amount,
        created_at: request.created_at,
        status: request.status,
        vip_code: request.vip_code,
        player_name: request.player_name,
        player: playerMap[request.vip_code] || null,
        total_requests: requestCounts[request.vip_code]
      }))
    }
  })
}

export function useUpdatePlayerStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (vip_code: string) => {
      const { error } = await supabase
        .from('players')
        .update({ redeem_online_status: true })
        .eq('vip_code', vip_code)
      
      if (error) throw error
      const { error : redeemError } = await supabase
      .from('redeem_requests')
      .update({ redeem_online_status: true })
      .eq('vip_code', vip_code)
    
    if (error) throw error
    if (redeemError) throw redeemError

    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['redeem-requests'] })
    }
  })
} 