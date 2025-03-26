import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import { useWithdrawal } from '@/hooks/useWithdrawal';

interface WithdrawModalProps {
    currentBalance: number;
    tagId: string;
    userEmail: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function WithdrawModal({ currentBalance, tagId, userEmail, onClose, onSuccess }: WithdrawModalProps) {
    const [amount, setAmount] = useState<string>('');
    const [method, setMethod] = useState<string>('dc');
    const [remarks, setRemarks] = useState<string>('');
    const [fees, setFees] = useState<string>('');
    const [totalAmount, setTotalAmount] = useState<number>(0);
    const { submitWithdrawal, isLoading, error: submitError } = useWithdrawal();
    const [error, setError] = useState<string | null>(null);

    // Calculate total amount when amount or fees change
    useEffect(() => {
        const amountNum = parseFloat(amount) || 0;
        const feesNum = parseFloat(fees) || 0;
        setTotalAmount(amountNum + feesNum);
    }, [amount, fees]);

    const handleWithdraw = async () => {
        const amountNum = parseFloat(amount);
        const feesNum = parseFloat(fees) || 0;

        if (!amount || amountNum <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        // Check if withdrawal amount exceeds balance
        if (amountNum > currentBalance) {
            setError('Withdrawal amount exceeds available balance');
            return;
        }

        // Check if total amount (with fees) exceeds balance
        if (amountNum + feesNum > currentBalance) {
            setError('Total amount (including fees) exceeds available balance');
            return;
        }

        try {
            await submitWithdrawal({
                cashtag_id: tagId,
                amount: amountNum,
                method,
                remarks: remarks.trim(),
                fees: feesNum,
                initiated_by: userEmail
            });
            onSuccess();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to process withdrawal');
        }
    };

    // Use submitError from hook if available, otherwise use local error
    const displayError = submitError || error;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#151C2F] rounded-2xl p-6 w-full max-w-md border border-gray-800/50"
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                        Withdraw Funds
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-gray-800/50 transition-colors"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Current Balance Display */}
                    <div className="bg-[#0B1120] p-4 rounded-lg border border-gray-800/50">
                        <p className="text-sm text-gray-400 mb-1">Current Balance</p>
                        <p className="text-2xl font-bold text-blue-400">
                            ${currentBalance.toLocaleString()}
                        </p>
                    </div>

                    {/* Amount Input */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">
                            Withdrawal Amount
                        </label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => {
                                setAmount(e.target.value);
                                if (error?.includes('exceeds')) setError(null);
                            }}
                            placeholder="Enter amount"
                            className="w-full bg-[#0B1120] border border-gray-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                        />
                        {parseFloat(amount) > currentBalance && (
                            <p className="mt-1 text-red-400 text-sm">Amount exceeds available balance</p>
                        )}
                    </div>

                    {/* Method Selection */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">
                            Withdrawal Method
                        </label>
                        <select
                            value={method}
                            onChange={(e) => setMethod(e.target.value)}
                            className="w-full bg-[#0B1120] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50"
                        >
                            <option value="dc">Direct Cash (DC)</option>
                            <option value="bank">Bank Transfer</option>
                            <option value="card">Card</option>
                        </select>
                    </div>

                    {/* Fees Input */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">
                            Fees (Optional)
                        </label>
                        <input
                            type="number"
                            value={fees}
                            onChange={(e) => setFees(e.target.value)}
                            placeholder="Enter fees amount (if any)"
                            className="w-full bg-[#0B1120] border border-gray-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                        />
                    </div>

                    {/* Remarks Field */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">
                            Remarks (Optional)
                        </label>
                        <textarea
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="Enter withdrawal remarks (optional)"
                            rows={3}
                            className="w-full bg-[#0B1120] border border-gray-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-none"
                        />
                    </div>

                    {/* Amount Breakdown */}
                    <div className="bg-[#0B1120] p-4 rounded-lg border border-gray-800/50 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Amount:</span>
                            <span className="text-white">${parseFloat(amount || '0').toLocaleString()}</span>
                        </div>
                        {fees && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Fees:</span>
                                <span className="text-amber-400">${parseFloat(fees || '0').toLocaleString()}</span>
                            </div>
                        )}
                        <div className="border-t border-gray-800 my-2"></div>
                        <div className="flex justify-between text-sm font-medium">
                            <span className="text-gray-400">Total Amount:</span>
                            <span className={`${totalAmount > currentBalance ? 'text-red-400' : 'text-blue-400'}`}>
                                ${totalAmount.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Error Message */}
                    {displayError && (
                        <p className="text-red-400 text-sm">{displayError}</p>
                    )}

                    {/* Submit Button */}
                    <button
                        onClick={handleWithdraw}
                        disabled={isLoading || parseFloat(amount) > currentBalance || totalAmount > currentBalance}
                        className={`w-full py-3 rounded-lg font-medium ${
                            isLoading || parseFloat(amount) > currentBalance || totalAmount > currentBalance
                                ? 'bg-blue-500/50 cursor-not-allowed'
                                : 'bg-blue-500 hover:bg-blue-600'
                        } transition-colors`}
                    >
                        {isLoading ? 'Processing...' : 'Withdraw Funds'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
} 