import { supabase } from "@/lib/supabase";

// Function to update hold details while preserving existing data
export const updateHoldDetails = async (
    redeemId: string,
    newHoldData: {
      hold_amount: number;
      player_name: string;
      player_image: string;
      hold_at: string;
      recharge_id: string;
    }
  ) => {
    try {
      // First, fetch existing hold details
      const { data: existingData, error: fetchError } = await supabase
        .from("redeem_requests")
        .select('hold_details')
        .eq('id', redeemId)
        .single();
  
      if (fetchError) throw fetchError;
  
      // Get existing hold details or initialize empty array
      const existingHolds = existingData?.hold_details?.holds || [];
      const currentTotalHold = existingData?.hold_details?.total_hold || 0;
  
      // Create updated hold details object
      const updatedHoldDetails = {
        holds: [
          ...existingHolds,
          newHoldData
        ],
        total_hold: currentTotalHold + newHoldData.hold_amount
      };
  
      // Update the redeem request with new hold details
      const { error: updateError } = await supabase
        .from("redeem_requests")
        .update({
          hold_details: updatedHoldDetails
        })
        .eq("id", redeemId);
  
      if (updateError) throw updateError;
  
      return { success: true };
    } catch (error) {
      console.error("Error updating hold details:", error);
      throw error;
    }
  };