// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Hello from Functions!")

interface FeedbackData {
  messenger_id: string
  page_id: string
  player_name: string
  category: string
  rating: number
  text: string
  manychat_data?: any
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
    const requestData = await req.json()
    console.log('Received request data:', JSON.stringify(requestData, null, 2))

    // Convert page_id to string if it's a number
    if (typeof requestData.page_id === 'number') {
      requestData.page_id = requestData.page_id.toString()
    }

    // Handle empty or unresolved ManyChat variables
    if (requestData.category?.includes('{{') || requestData.category?.includes('}}')) {
      requestData.category = 'Unknown'
    }
    if (requestData.text?.includes('{{') || requestData.text?.includes('}}')) {
      requestData.text = 'No feedback text provided'
    }

    // Validate required fields
    const requiredFields: (keyof FeedbackData)[] = [
      'messenger_id',
      'page_id',
      'player_name',
      'category',
      'rating',
      'text',
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

    // Validate rating is between 1 and 5
    if (
      typeof requestData.rating !== 'number' ||
      requestData.rating < 1 ||
      requestData.rating > 5
    ) {
      console.error('Invalid rating:', requestData.rating)
      return new Response(
        JSON.stringify({ error: 'Rating must be a number between 1 and 5' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
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

    // Insert feedback into the database
    const { data, error } = await supabaseClient
      .from('feedback')
      .insert([
        {
          messenger_id: requestData.messenger_id,
          page_id: requestData.page_id,
          player_name: requestData.player_name,
          category: requestData.category,
          rating: requestData.rating,
          text: requestData.text,
          manychat_data: requestData.manychat_data || null,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to submit feedback',
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
        message: 'Feedback submitted successfully',
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/submit-feedback' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
