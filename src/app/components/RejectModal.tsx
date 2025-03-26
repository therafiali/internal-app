import React, { useState } from 'react';

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReject: () => void;
  isRejecting: boolean;
}

const RejectModal = ({ isOpen, onClose, onReject, isRejecting }: RejectModalProps) => {
  const [reason, setReason] = useState('');
  const [selectedReason, setSelectedReason] = useState('');

  if (!isOpen) return null;

  const handleReject = () => {
    const finalReason = selectedReason === 'other' ? reason : selectedReason;
    onReject();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-md border border-gray-800/20">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h3 className="text-xl font-semibold text-white">Reject Request</h3>
          <button
            onClick={onClose}
            disabled={isRejecting}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm text-gray-400">Rejection Reason</label>
            <select 
              className="mt-1 w-full bg-[#252b3b] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
            >
              <option value="">Select a reason...</option>
              <option value="player_in_game">Player in game</option>
              <option value="insufficient_funds">Insufficient Funds</option>
              <option value="invalid_details">Invalid Details</option>
              <option value="duplicate">Duplicate Request</option>
              <option value="suspicious">Suspicious Activity</option>
              <option value="other">Other</option>
            </select>
          </div>

          {selectedReason === 'other' && (
            <div>
              <label className="text-sm text-gray-400">Additional Notes</label>
              <textarea
                className="mt-1 w-full bg-[#252b3b] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
                placeholder="Enter rejection reason..."
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-800">
          <button
            onClick={onClose}
            disabled={isRejecting}
            className={`px-4 py-2 text-sm font-medium text-gray-400 
              hover:text-white transition-all duration-200
              ${isRejecting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Cancel
          </button>
          <button
            onClick={handleReject}
            disabled={isRejecting}
            className={`px-4 py-2 text-sm font-medium bg-red-500/10 text-red-500 
              rounded-lg hover:bg-red-500/20 transition-all duration-200 
              transform hover:scale-105 active:scale-95 flex items-center justify-center min-w-[100px]
              ${isRejecting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isRejecting ? (
              <>
                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin mr-2" />
                Rejecting...
              </>
            ) : (
              'Reject'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectModal; 