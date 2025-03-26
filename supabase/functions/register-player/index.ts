// @ts-nocheck is required for Deno imports
// deno-lint-ignore-file
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ManyChatData {
  key: string;
  id: string;
  page_id: string;
  user_refs: string[];
  status: string;
  first_name: string;
  last_name: string;
  name: string;
  gender: string;
  profile_pic: string;
  locale: string;
  language: string;
  timezone: string;
  live_chat_url: string;
  last_input_text: string;
  optin_phone: boolean;
  phone: string | null;
  optin_email: boolean;
  email: string | null;
  subscribed: string;
  last_interaction: string;
  ig_last_interaction: string | null;
  last_seen: string | null;
  ig_last_seen: string | null;
  is_followup_enabled: boolean;
  ig_username: string | null;
  ig_id: string | null;
  whatsapp_phone: string | null;
  optin_whatsapp: boolean;
  phone_country_code: string | null;
  last_growth_tool: string | null;
  custom_fields: {
    account_valid: string | null;
    approval_status: string | null;
    deposit_successful_answer: string | null;
    entry_code: string | null;
    entry_valid: boolean | null;
    example: string | null;
    feedback_category: string | null;
    feedback_rating: string | null;
    feedback_text: string | null;
    firekirin_username: string | null;
    first_time_login: string | null;
    gamevault_username: string | null;
    juwa_username: string | null;
    load_amount: string | null;
    load_cashtag_fetched: string | null;
    load_duplicate_try: string | null;
    load_game_platform: string | null;
    load_promo_amount: string | null;
    load_promo_code: string | null;
    load_promo_freeplay: string | null;
    load_promo_valid: string | null;
    load_reason: string | null;
    load_receipt_status: string | null;
    load_received_amount: string | null;
    load_request_pending: string | null;
    load_request_state: string | null;
    load_retry_attempt: string | null;
    load_screenshot: string | null;
    load_username: string | null;
    load_web_receipt: string | null;
    load_wrong_tag_try: string | null;
    load_wrong_tag_try_count: string | null;
    moolah_username: string | null;
    orionstars_username: string | null;
    pandamaster_username: string | null;
    pw_reset_game: string | null;
    redeem_amount: string | null;
    redeem_cashtag: string | null;
    redeem_cashtag_image_url: string | null;
    redeem_game_platform: string | null;
    referral_code: string | null;
    referrer_code: string | null;
    referrer_code_valid: string | null;
    request_time: string | null;
    team_code: string;
    ultrapanda_username: string | null;
    vblink_username: string | null;
    vegassweeps_username: string | null;
    yolo_username: string | null;
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key
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

    // Get the request body
    const data: ManyChatData = await req.json()

    // Validate required fields
    if (!data || !data.id || !data.name || !data.custom_fields?.team_code) {
      throw new Error('Missing required fields: id, name, or team_code')
    }

    // Extract team_code and referrer_code from custom_fields
    const { team_code, referrer_code } = data.custom_fields

    // Insert the new pending player with parsed data
    const { data: insertedData, error } = await supabaseClient
      .from('pending_players')
      .insert([
        {
          manychat_data: data,
          team_code: team_code,
          referrer_code: referrer_code || null,
          registration_status: 'pending',
          messenger_id: data.id,
        },
      ])
      .select()
      .single()

    if (error) throw error

    // Return the created player
    return new Response(
      JSON.stringify({ data: insertedData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 