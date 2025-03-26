import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface RedeemPlayer {
  name: string;
  image?: string;
  payment_methods: Array<{
    type: string;
    details: string;
  }>;
}

interface AssignedRedeem {
  redeem_id: string;
  amount: number;
  type: string;
  assigned_at: string;
  redeem_player: RedeemPlayer;
  payment_method: {
    type: string;
    details: string;
  };
}

export const useRedeemAssignment = () => {
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignRedeemRequest = async (
    rechargeId: string,
    redeemId: string,
    amount: number,
    matchType: string,
    redeemPlayerDetails: RedeemPlayer,
    paymentMethod: { type: string; details: string }
  ) => {
    setIsAssigning(true);
    setError(null);

    console.log('Starting assignRedeemRequest with params:', {
      rechargeId,
      redeemId,
      amount,
      matchType,
      redeemPlayerDetails,
      paymentMethod
    });

    try {
      // First, check if the recharge request is still available
      console.log('Checking recharge request availability for ID:', rechargeId);
      console.log('Query params:', {
        table: 'recharge_requests',
        columns: 'status, processing_state',
        filter: { field: 'id', value: rechargeId }
      });

      const { data: rechargeData, error: rechargeError } = await supabase
        .from('recharge_requests')
        .select('status, processing_state')
        .filter('id', 'eq', rechargeId);

      console.log('Recharge request check result:', {
        data: rechargeData,
        error: rechargeError
      });

      if (rechargeError) {
        console.error('Error checking recharge request:', rechargeError);
        throw rechargeError;
      }

      if (!rechargeData || rechargeData.length === 0) {
        console.error('No recharge request found with ID:', rechargeId);
        throw new Error('Recharge request not found');
      }

      const recharge = rechargeData[0];

      if (recharge.status !== 'pending') {
        console.error('Invalid recharge status:', {
          expected: 'pending',
          actual: recharge.status
        });
        throw new Error('Recharge request is no longer available for assignment');
      }

      if (recharge.processing_state?.status === 'in_progress' && 
          recharge.processing_state?.processed_by !== 'current_user') {
        console.error('Processing state conflict:', recharge.processing_state);
        throw new Error('Recharge request is being processed by another user');
      }

      // Create the assigned_redeem object
      console.log('Creating assigned_redeem object');
      const assignedRedeem: AssignedRedeem = {
        redeem_id: redeemId,
        amount: amount,
        type: matchType,
        assigned_at: new Date().toISOString(),
        redeem_player: redeemPlayerDetails,
        payment_method: paymentMethod
      };
      console.log('Created assigned_redeem:', assignedRedeem);

      // Update recharge request status and assigned_redeem
      console.log('Updating recharge request with assignment');
      console.log('Update params:', {
        table: 'recharge_requests',
        filter: { field: 'id', value: rechargeId },
        updateData: {
          status: 'assigned',
          assigned_redeem: assignedRedeem,
          assigned_ct: null
        }
      });

      const { error: updateRechargeError } = await supabase
        .from('recharge_requests')
        .update({
          status: 'assigned',
          assigned_redeem: assignedRedeem,
          assigned_ct: null,
          updated_at: new Date().toISOString(),
          processing_state: {
            status: 'idle',
            processed_by: null,
            modal_type: null
          }
        })
        .filter('id', 'eq', rechargeId)
        .is('assigned_ct', null);

      if (updateRechargeError) {
        console.error('Error updating recharge request:', updateRechargeError);
        throw updateRechargeError;
      }

      // Get current redeem request data
      console.log('Fetching redeem request data for ID:', redeemId);
      const { data: redeemData, error: redeemError } = await supabase
        .from('redeem_requests')
        .select('amount_hold, total_amount')
        .filter('id', 'eq', redeemId)
        .single();

      console.log('Redeem request data result:', {
        data: redeemData,
        error: redeemError
      });

      if (redeemError) {
        console.error('Error fetching redeem request:', redeemError);
        throw redeemError;
      }

      const newHoldAmount = (redeemData?.amount_hold || 0) + amount;
      console.log('Calculated new hold amount:', {
        currentHold: redeemData?.amount_hold,
        addAmount: amount,
        newTotal: newHoldAmount,
        totalAmount: redeemData.total_amount
      });
      
      // Ensure we don't exceed total amount
      if (newHoldAmount > redeemData.total_amount) {
        console.error('Hold amount would exceed total:', {
          newHold: newHoldAmount,
          total: redeemData.total_amount
        });
        throw new Error('Cannot exceed total withdrawal amount');
      }

      // Update redeem request amount_hold
      console.log('Updating redeem request hold amount');
      console.log('Update params:', {
        table: 'redeem_requests',
        filter: { field: 'id', value: redeemId },
        updateData: {
          amount_hold: newHoldAmount,
          status: newHoldAmount === redeemData.total_amount ? 'queued_fully_assigned' : 'queued_partially_assigned'
        }
      });

      const { error: updateRedeemError } = await supabase
        .from('redeem_requests')
        .update({
          amount_hold: newHoldAmount,
          status: newHoldAmount === redeemData.total_amount ? 'queued_fully_assigned' : 'queued_partially_assigned',
          updated_at: new Date().toISOString()
        })
        .filter('id', 'eq', redeemId);

      if (updateRedeemError) {
        console.error('Error updating redeem request:', updateRedeemError);
        throw updateRedeemError;
      }

      console.log('Assignment completed successfully');
      return { success: true, rechargeId, redeemId, amount };
    } catch (err) {
      console.error('Assignment failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign redeem request';
      setError(errorMessage);
      throw err;
    } finally {
      setIsAssigning(false);
    }
  };

  return {
    assignRedeemRequest,
    isAssigning,
    error
  };
}; 