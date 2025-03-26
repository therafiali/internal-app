// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RedeemRequest {
  vip_code: string;
  player_name: string;
  messenger_id: string;
  team_code: string;
  game_platform: string;
  game_username: string;
  total_amount: number;
  amount_paid: number;
  status: string;
  created_at?: string;
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

    // Fetch redeem requests for the given vip_code
    const { data: redeemRequests, error: fetchError } = await supabaseClient
      .from('redeem_requests')
      .select('*')
      .eq('vip_code', vip_code)
      .order('created_at', { ascending: false })

    if (fetchError) {
      throw new Error(`Failed to fetch redeem requests: ${fetchError.message}`)
    }

    if (!redeemRequests || redeemRequests.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No redeem requests found for this VIP code',
          requests: [],
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Calculate summary statistics
    const summary = {
      total_requests: redeemRequests.length,
      total_amount_requested: redeemRequests.reduce((sum, req) => sum + (req.total_amount || 0), 0),
      total_amount_paid: redeemRequests.reduce((sum, req) => sum + (req.amount_paid || 0), 0),
      status_breakdown: redeemRequests.reduce((acc: Record<string, number>, req) => {
        acc[req.status] = (acc[req.status] || 0) + 1;
        return acc;
      }, {})
    }

    const response = {
      message: "Redeem requests retrieved successfully",
      summary,
      requests: redeemRequests
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