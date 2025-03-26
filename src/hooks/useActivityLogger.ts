import { useState } from 'react';
import Cookies from 'js-cookie';
import { supabase } from '@/lib/supabase';

export type ActivityType = 
  | 'RECHARGE_SUBMIT'
  | 'FIXED_PROMO_RECHARGE_SUBMIT'
  | 'RECHARGE_SCREENSHOT_SUBMIT'
  | 'RECHARGE_VERIFY'
  | 'REDEEM_OTP_VERIFY'
  | 'REDEEM_SUBMIT'
  | 'REDEEM_VERIFY'
  | 'REDEEM_PROCESS'
  | 'REDEEM_REJECT'
  | 'REDEEM_APPROVE'
  | 'PLAYER_APPROVE'
  | 'PLAYER_REJECT';

export interface ActivityLogPayload {
  action_type: string;
  action_description: string;
  action_source: string;
  action_status: 'STARTED' | 'SUCCESS' | 'ERROR';
}

export const useActivityLogger = () => {
  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logActivity = async (payload: ActivityLogPayload) => {
    setIsLogging(true);
    setError(null);

    console.log('payload', payload);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error('No active session');
      }

      const { error } = await supabase
        .from('activity_logs')
        .insert({
          ...payload,
          user_id: session.session.user.id,
          created_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to log activity';
      setError(errorMessage);
      console.error('Error logging activity:', err);
    } finally {
      setIsLogging(false);
    }
  };

  return {
    logActivity,
    isLogging,
    error,
  };
}; 