// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

console.log("Hello from Functions!")

// deno-lint-ignore-file
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RechargeRequest {
  vip_code: string
  player_name: string
  messenger_id: string
  team_code: string
  game_platform: string
  game_username: string
  amount: number
  status: string
  promo_code: string | null
  promo_type: string | null
  payment_method: string | null
  screenshot_url: string | null
  manychat_data: any
  init_by: string
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
    const manychatData = await req.json()

    // Extract required fields from ManyChat data
    const rechargeRequest: RechargeRequest = {
      vip_code: manychatData.custom_fields?.entry_code,
      player_name: manychatData.name,
      messenger_id: manychatData.id,
      team_code: manychatData.custom_fields?.team_code,
      game_platform: manychatData.custom_fields?.load_game_platform,
      game_username: manychatData.custom_fields?.load_username,
      amount: parseFloat(manychatData.custom_fields?.load_amount || '0'),
      status: 'pending',
      promo_code: manychatData.custom_fields?.load_promo_code || null,
      promo_type: manychatData.custom_fields?.load_promo_freeplay || null,
      payment_method: null,
      screenshot_url: manychatData.custom_fields?.load_screenshot || null,
      manychat_data: manychatData,
      init_by: 'player'
    }

    // Validate required fields
    const requiredFields = ['vip_code', 'player_name', 'messenger_id', 'team_code', 'game_platform', 'game_username', 'amount']
    for (const field of requiredFields) {
      if (!rechargeRequest[field as keyof RechargeRequest]) {
        return new Response(
          JSON.stringify({
            error: `Missing required field: ${field}`,
            details: `The field ${field} is required but was not provided or was empty`,
            code: 'MISSING_FIELD'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        )
      }
    }

    // Validate amount is a positive number
    if (isNaN(rechargeRequest.amount) || rechargeRequest.amount <= 0) {
      return new Response(
        JSON.stringify({
          error: 'Invalid amount',
          details: 'Amount must be a positive number',
          code: 'INVALID_AMOUNT'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Insert recharge request into database
    const { data, error } = await supabaseClient
      .from('recharge_requests')
      .insert([rechargeRequest])
      .select()
      .single()

    if (error) {
      return new Response(
        JSON.stringify({
          error: 'Failed to submit recharge request',
          details: error.message,
          code: error.code
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    return new Response(
      JSON.stringify({
        message: 'Recharge request submitted successfully',
        data
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
        code: 'INTERNAL_ERROR'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/submit-recharge-request' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
