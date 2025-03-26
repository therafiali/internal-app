// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Hello from Functions!")

interface ResetPasswordRequest {
  vip_code: string
  player_name: string
  messenger_id: string
  team_code: string
  game_platform: string
  suggested_username?: string
  manychat_data: any
}

serve(async (req) => {
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      })
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // Get request body
    const manychatData = await req.json()
    console.log('Received ManyChat data:', JSON.stringify(manychatData, null, 2))

    // Extract required fields from ManyChat data
    const requestData: ResetPasswordRequest = {
      vip_code: manychatData.custom_fields?.entry_code || '',
      player_name: manychatData.name || '',
      messenger_id: manychatData.id || '',
      team_code: manychatData.custom_fields?.team_code || '',
      game_platform: manychatData.custom_fields?.pw_reset_game || '',
      suggested_username: manychatData.custom_fields?.load_username || null,
      manychat_data: manychatData
    }

    // Validate required fields
    const requiredFields: (keyof ResetPasswordRequest)[] = [
      'vip_code',
      'player_name',
      'messenger_id',
      'team_code',
      'game_platform'
    ]

    for (const field of requiredFields) {
      if (!requestData[field]) {
        console.error(`Missing required field: ${field}`)
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        )
      }
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Insert reset password request into the database
    const { data, error } = await supabaseClient
      .from('reset_password_requests')
      .insert([
        {
          vip_code: requestData.vip_code,
          player_name: requestData.player_name,
          messenger_id: requestData.messenger_id,
          team_code: requestData.team_code,
          game_platform: requestData.game_platform,
          suggested_username: requestData.suggested_username,
          status: 'pending',
          manychat_data: requestData.manychat_data,
          init_by: 'player',
          processed_by: null,
          processed_at: null
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to submit reset password request',
          details: error.message,
          code: error.code 
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // Return success response
    return new Response(
      JSON.stringify({
        message: 'Reset password request submitted successfully',
        data,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: err.message 
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/reset-password-request' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
