// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GameLimit {
  amount: number;
  game_name: string;
  timestamp: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Parse request body
    const { vip_code } = await req.json()

    if (!vip_code) {
      throw new Error('Missing required field: vip_code')
    }

    // Fetch player data
    const { data: players, error: fetchError } = await supabaseClient
      .from('players')
      .select('total_redeemed, game_limits')
      .eq('vip_code', vip_code)

    if (fetchError) {
      throw new Error(`Failed to fetch player data: ${fetchError.message}`)
    }

    if (!players || players.length === 0) {
      throw new Error('Player not found')
    }

    if (players.length > 1) {
      throw new Error('Multiple players found with the same VIP code')
    }

    const player = players[0]

    const DEFAULT_DAILY_LIMIT = 500
    const totalRedeemed = player.total_redeemed || 0
    const gameLimits = player.game_limits as GameLimit[] || []

    // Calculate remaining limits for each game
    const gameLimitSummary: Record<string, {
      used: number;
      remaining: number;
      total: number;
    }> = {}

    // Process existing game limits
    if (gameLimits.length > 0) {
      for (const limit of gameLimits) {
        const today = new Date().toISOString().split('T')[0]
        const limitDate = new Date(limit.timestamp).toISOString().split('T')[0]

        // Only consider today's limits
        if (today === limitDate) {
          gameLimitSummary[limit.game_name] = {
            used: limit.amount,
            remaining: DEFAULT_DAILY_LIMIT - limit.amount,
            total: DEFAULT_DAILY_LIMIT
          }
        }
      }
    }

    const response = {
      total_redeemed: totalRedeemed,
      available_redeem: (2000 - totalRedeemed),
      game_limits: gameLimitSummary,
      default_limit: DEFAULT_DAILY_LIMIT,
      message: "Daily redeem limits retrieved successfully"
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message,
        code: 'ERROR',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 