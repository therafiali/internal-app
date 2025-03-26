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

interface ScreenshotSubmission {
  recharge_id: string
  screenshot_url: string
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
    const { recharge_id, screenshot_url } = await req.json()

    console.log('Received request:', { recharge_id, screenshot_url })

    // Validate required fields
    if (!recharge_id) {
      return new Response(
        JSON.stringify({
          error: 'Missing required field: recharge_id',
          details: 'The recharge_id field is required but was not provided',
          code: 'MISSING_FIELD'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    if (!screenshot_url) {
      return new Response(
        JSON.stringify({
          error: 'Missing required field: screenshot_url',
          details: 'The screenshot_url field is required but was not provided',
          code: 'MISSING_FIELD'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Check if recharge request exists
    const { data: existingRequest, error: fetchError } = await supabaseClient
      .from('recharge_requests')
      .select('*')
      .eq('recharge_id', recharge_id)
      .maybeSingle()

    console.log('Database query result:', { existingRequest, fetchError })

    if (fetchError) {
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch recharge request',
          details: fetchError.message,
          code: fetchError.code
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    if (!existingRequest) {
      return new Response(
        JSON.stringify({
          error: 'Recharge request not found',
          details: `No recharge request found with ID: ${recharge_id}`,
          code: 'NOT_FOUND'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    // Update the screenshot URL
    const { data, error } = await supabaseClient
      .from('recharge_requests')
      .update({ screenshot_url })
      .eq('recharge_id', recharge_id)
      .select()
      .single()

    console.log('Update result:', { data, error })

    if (error) {
      return new Response(
        JSON.stringify({
          error: 'Failed to update screenshot URL',
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
        message: 'Screenshot URL updated successfully',
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/submit-recharge-screenshot' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
