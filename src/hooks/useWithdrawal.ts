import { useState } from 'react';
import { supabase } from '@/supabase/client';
import { useCTActivityLogger } from './useCTActivityLogger';

interface WithdrawalData {
    cashtag_id: string;
    amount: number;
    method: string;
    remarks?: string;
    fees?: number;
    initiated_by: string;
}

interface UseWithdrawalReturn {
    submitWithdrawal: (data: WithdrawalData) => Promise<void>;
    isLoading: boolean;
    error: string | null;
}

export function useWithdrawal(): UseWithdrawalReturn {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { logCTActivity } = useCTActivityLogger();

    const submitWithdrawal = async (data: WithdrawalData) => {
        setIsLoading(true);
        setError(null);

        try {
            // Get current balance and total withdrawn
            const { data: tagData, error: fetchError } = await supabase
                .from('company_tags')
                .select('id, balance, total_withdrawn, cashtag')
                .eq('c_id', data.cashtag_id)
                .single();

            if (fetchError) throw new Error('Failed to fetch current balance');
            if (!tagData) throw new Error('Tag not found');

            const currentBalance = tagData.balance;
            const currentTotalWithdrawn = tagData.total_withdrawn || 0;

            // Calculate total amount including optional fees
            const totalAmount = data.amount + (data.fees || 0);

            // Verify sufficient balance
            if (totalAmount > currentBalance) {
                throw new Error('Insufficient balance for withdrawal');
            }

            // Calculate new balance and total withdrawn
            const newBalance = currentBalance - totalAmount;
            const newTotalWithdrawn = currentTotalWithdrawn + totalAmount;

            // Start transaction
            const { error: withdrawalError } = await supabase.from('withdrawals').insert({
                cashtag_id: data.cashtag_id,
                cashtag: tagData.cashtag,
                amount: data.amount,
                method: data.method,
                remarks: data.remarks || '',
                fees: data.fees || 0,
                status: 'pending',
                initiated_by: data.initiated_by,
                total_amount: totalAmount
            });

            if (withdrawalError) throw withdrawalError;

            // Update balance
            const { error: updateError } = await supabase
                .from('company_tags')
                .update({
                    balance: newBalance,
                    total_withdrawn: newTotalWithdrawn
                })
                .eq('c_id', data.cashtag_id);

            if (updateError) throw updateError;

            // Get user info from local storage
            const userStr = localStorage.getItem('user');
            if (!userStr) throw new Error('User information not found');
            const user = JSON.parse(userStr);

            // Log the withdrawal activity
            await logCTActivity({
                ct_id: tagData.id,
                cashtag: tagData.cashtag,
                action_type: 'CT_WITHDRAW',
                action_description: `Withdrawal of $${data.amount} via ${data.method}${data.fees ? ` with $${data.fees} fees` : ''}`,
                status: 'success',
                user_id: user.id,
                user_name: user.name,
                user_department: user.department,
                user_role: user.role,
                amount: -totalAmount,
                balance_before: currentBalance,
                balance_after: newBalance,
                additional_details: {
                    method: data.method,
                    fees: data.fees || 0,
                    remarks: data.remarks || '',
                    withdrawal_status: 'pending'
                }
            });

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to process withdrawal');
            console.error('Withdrawal error:', err);

            // Log failed withdrawal if we have the tag data
            try {
                const userStr = localStorage.getItem('user');
                if (!userStr) throw new Error('User information not found');
                const user = JSON.parse(userStr);

                const { data: tagData } = await supabase
                    .from('company_tags')
                    .select('id, cashtag')
                    .eq('c_id', data.cashtag_id)
                    .single();

                if (tagData) {
                    await logCTActivity({
                        ct_id: tagData.id,
                        cashtag: tagData.cashtag,
                        action_type: 'CT_WITHDRAW',
                        action_description: `Failed withdrawal attempt of $${data.amount} via ${data.method}`,
                        status: 'failed',
                        user_id: user.id,
                        user_name: user.name,
                        user_department: user.department,
                        user_role: user.role,
                        amount: data.amount + (data.fees || 0),
                        additional_details: {
                            error: err instanceof Error ? err.message : 'Unknown error',
                            method: data.method,
                            fees: data.fees || 0,
                            remarks: data.remarks || ''
                        }
                    });
                }
            } catch (logError) {
                console.error('Error logging failed withdrawal:', logError);
            }

            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        submitWithdrawal,
        isLoading,
        error
    };
} 