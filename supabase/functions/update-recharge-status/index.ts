// @ts-nocheck is required for Deno imports
// deno-lint-ignore-file
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface UpdateRechargeRequest {
  request_id: string;
  status: 'sc_processed' | 'assigned' | 'pending' | 'completed' | 'rejected' | 'cancel' | 'approved' | 'sc_submitted';
  remarks?: string;
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
    const { request_id, status, remarks }: UpdateRechargeRequest = await req.json()

    // Validate required fields
    if (!request_id || !status) {
      throw new Error('Missing required fields: request_id or status')
    }

    // Validate status value
    const validStatuses = [
      'sc_processed',
      'assigned',
      'pending',
      'completed',
      'rejected',
      'cancel',
      'approved',
      'sc_submitted'
    ]
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status value. Must be one of: ${validStatuses.join(', ')}`)
    }

    // First, get the current status of the request
    const { data: currentRequest, error: fetchError } = await supabaseClient
      .from('recharge_requests')
      .select('status')
      .eq('id', request_id)
      .single()

    if (fetchError) throw fetchError

    if (!currentRequest) {
      throw new Error('Recharge request not found')
    }

    // Check if trying to cancel a completed request
    if (currentRequest.status === 'completed' && status === 'cancel') {
      throw new Error('Cannot cancel a completed request')
    }

    // Update the recharge request
    const { data: updatedData, error } = await supabaseClient
      .from('recharge_requests')
      .update({
        status: status,
        remarks: remarks,
        updated_at: new Date().toISOString()
      })
      .eq('id', request_id)
      .select()
      .single()

    if (error) throw error

    // Return the updated record
    return new Response(
      JSON.stringify({ data: updatedData }),
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