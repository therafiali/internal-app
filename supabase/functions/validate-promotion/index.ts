// @ts-nocheck is required for Deno imports
// deno-lint-ignore-file
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface PromotionValidateRequest {
  vip_code: string;
  promotion_id: string;
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
    const { vip_code, promotion_id }: PromotionValidateRequest = await req.json()

    // Validate required fields
    if (!vip_code || !promotion_id) {
      throw new Error('Missing required fields: vip_code or promotion_id')
    }

    // Check if the promotion assignment exists
    const { data: promotionAssignments, error } = await supabaseClient
      .from('promotion_assignments')
      .select('*')
      .eq('vip_code', vip_code)
      .eq('promotion_id', promotion_id)

    if (error) throw error

    // Check if we found exactly one promotion assignment
    const promotionAssignment = promotionAssignments && promotionAssignments.length === 1 
      ? promotionAssignments[0] 
      : null

    // Return the validation result
    return new Response(
      JSON.stringify({
        data: {
          is_valid: !!promotionAssignment,
          promotion_details: promotionAssignment || null,
          message: promotionAssignment 
            ? 'Promotion code is valid' 
            : 'Invalid promotion code or VIP code combination'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ 
        data: {
          is_valid: false,
          promotion_details: null,
          message: 'Invalid promotion code or VIP code combination'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Changed to 200 to maintain consistent response format
      }
    )
  }
}) 