import { useState } from 'react';
import { supabase } from '@/supabase/client';

export type CTActivityType = 
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'ENABLE'
  | 'DISABLE'
  | 'PAUSE'
  | 'TRANSFER'
  | 'SENT'
  | 'RECEIVED'
  | 'FAILED'
  | 'WITHDRAW';

export interface CTActivityLogPayload {
  ct_id: string;
  tag: string;
  tag_name: string;
  action_type: CTActivityType;
  action_description: string;
  status: 'success' | 'failed' | 'pending';
  user_id: string;
  user_name: string;
  user_department: string;
  user_role: string;
  amount?: number;
  balance_before?: number;
  balance_after?: number;
  additional_details?: Record<string, any>;
}

export const useCTActivityLogger = () => {
  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logCTActivity = async (payload: CTActivityLogPayload) => {
    setIsLogging(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('ct_activity_logs')
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
          ip_address: window.location.hostname,
          browser: navigator.userAgent,
          operating_system: navigator.platform
        });

      if (insertError) {
        throw insertError;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to log CT activity';
      setError(errorMessage);
      console.error('Error logging CT activity:', err);
      throw err;
    } finally {
      setIsLogging(false);
    }
  };

  return {
    logCTActivity,
    isLogging,
    error,
  };
}; 