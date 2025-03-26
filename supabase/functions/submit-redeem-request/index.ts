// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentMethod {
  type: string;
  username: string;
  amount?: number;
  cashtag?: string;
  reference?: string;
  notes?: string;
  timestamp?: string;
  identifier?: string;
}

interface RedeemRequest {
  vip_code: string;
  player_name: string;
  messenger_id: string;
  team_code: string;
  game_platform: string;
  game_username: string;
  total_amount: number;
  status: string;
  payment_methods: PaymentMethod[];
  manychat_data: Record<string, any>;
  player_data: Record<string, any>;
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

    // Parse ManyChat webhook data
    const manychatData = await req.json()

    // Validate required fields
    if (!manychatData.id || !manychatData.name || !manychatData.custom_fields) {
      throw new Error('Missing required ManyChat data')
    }

    const customFields = manychatData.custom_fields

    // Validate required custom fields
    if (!customFields.entry_code || !customFields.team_code || 
        !customFields.redeem_game_platform || !customFields.redeem_username || 
        !customFields.redeem_amount) {
      throw new Error('Missing required custom fields')
    }

    // Format payment methods array
    const paymentMethods: PaymentMethod[] = []
    if (customFields.pm_chime) {
      paymentMethods.push({
        type: 'chime',
        username: customFields.pm_chime
      })
    }
    if (customFields.pm_cashapp) {
      paymentMethods.push({
        type: 'cashapp',
        username: customFields.pm_cashapp
      })
    }
    if (customFields.pm_venmo) {
      paymentMethods.push({
        type: 'venmo',
        username: customFields.pm_venmo
      })
    }

    // Create redeem request object
    const redeemRequest: RedeemRequest = {
      vip_code: customFields.entry_code,
      player_name: manychatData.name,
      messenger_id: manychatData.id,
      team_code: customFields.team_code,
      game_platform: customFields.redeem_game_platform,
      game_username: customFields.redeem_username,
      total_amount: Number(customFields.redeem_amount),
      status: 'pending',
      payment_methods: paymentMethods,
      manychat_data: manychatData,
      init_by:"player",
      player_data: manychatData
    }

    // Validate amount
    if (isNaN(redeemRequest.total_amount) || redeemRequest.total_amount <= 0) {
      throw new Error('Invalid redeem amount')
    }

    // Insert redeem request into database
    const { data: insertedRequest, error: insertError } = await supabaseClient
      .from('redeem_requests')
      .insert([redeemRequest])
      .select()
      .single()

    if (insertError) {
      throw new Error(`Failed to create redeem request: ${insertError.message}`)
    }

    return new Response(
      JSON.stringify({
        message: 'Redeem request submitted successfully',
        data: insertedRequest
      }),
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