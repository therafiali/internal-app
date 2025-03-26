import React, { useState } from "react";
import { X } from 'lucide-react';
import Image from "next/image";

interface ProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  redeemId: string;
  init_by: string;
  playerName: string;
  gameUsername: string;
  platform: string;
  amount: number;
  bonus?: number;
  promotion?: string;
  identifier?: string;
  playerData: {
    profile: {
      profilePic: string;
    };
  };
  onProcess: (amount: string, notes: string) => void;
  isProcessing: boolean;
  remarks: string;
}

const ProcessModal = ({
  isOpen,
  onClose,
  redeemId,
  init_by,
  playerName,
  gameUsername,
  platform,
  amount,
  playerData,
  bonus = 0,
  promotion = '',
  identifier = '',
  onProcess,
  isProcessing,
  remarks
}: ProcessModalProps) => {
  const [step, setStep] = useState(1);
  const [processAmount, setProcessAmount] = useState(amount.toString());
  const [notes, setNotes] = useState('');
  const [processText, setProcessText] = useState('');

  if (!isOpen) return null;

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setProcessText('');
    } else {
      onClose();
    }
  };

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    }
  };

  const handleProcess = () => {
    if (processText.toLowerCase() === 'process') {
      onProcess(processAmount, notes);
    }
  };

  const isProcessValid = processText.toLowerCase() === 'process';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] rounded-2xl p-6 w-[600px] border border-gray-800/20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-white">Process Redeem</h3>
            <p className="text-sm text-gray-400 mt-1">Review and process redeem request</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {step === 1 ? (
          <>
            {/* Review Details */}
            <div className="space-y-6 mb-6">
              <div className="bg-[#0a0a0a] rounded-xl p-4">
                <h4 className="text-lg font-medium text-white mb-4 mx-auto text-center w-full">Request Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400">Redeem ID</label>
                    <div className="text-sm text-white">{redeemId}</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Player Name</label>

                    <div className="text-sm text-white flex items-center gap-2 py-1">
                      <Image className="rounded-full" src={playerData?.profile?.profilePic || `https://ui-avatars.com/api/?name=${playerName}`} alt={playerName} width={32} height={32} />
                      {playerName}</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Game Username</label>
                    <div className="text-sm text-white">{gameUsername}</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Platform</label>
                    <div className="text-sm text-white">{platform}</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Amount</label>
                    <div className="text-sm text-white">${amount.toLocaleString()}</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Initiated By</label>
                    <div className="text-sm text-white capitalize">{init_by}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
              {/* <div>
                    <label className="text-xs text-gray-400">VR Remarks</label>
                    <div className="text-sm text-white">{remarks}</div>
                  </div> */}
                {/* <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={processAmount}
                    onChange={(e) => setProcessAmount(e.target.value)}
                    className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter amount"
                  />
                </div> */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Add any notes..."
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3">
              <button
                onClick={handleBack}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleNext}
                disabled={!processAmount}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Confirm Process */}
            <div className="space-y-6 mb-6">
              {/* Review Summary */}
              <div className="bg-[#0a0a0a] rounded-xl p-4">
                <h4 className="text-lg font-medium text-white mb-4">Review Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Player:</span>
                    <span className="text-white ml-2">{playerName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Username:</span>
                    <span className="text-white ml-2">{gameUsername}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Platform:</span>
                    <span className="text-white ml-2">{platform}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Process Amount:</span>
                    <span className="text-white-500 ml-2">{processAmount}</span>
                  </div>
                  {notes && (
                    <div className="col-span-2">
                      <span className="text-gray-400">Notes:</span>
                      <span className="text-white ml-2">{notes}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Type "process" to confirm
                </label>
                <input
                  type="text"
                  value={processText}
                  onPaste={(e) => e.preventDefault()}
                  onChange={(e) => setProcessText(e.target.value)}
                  className={`w-full px-4 py-2 bg-[#0a0a0a] border rounded-lg text-white focus:outline-none focus:ring-2 ${
                    processText && !isProcessValid
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-800 focus:ring-emerald-500"
                  }`}
                  placeholder='Type "process"'
                />
                {processText && !isProcessValid && (
                  <p className="mt-1 text-xs text-red-500">
                    Please type exactly "process" to enable confirmation
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3">
              <button
                onClick={handleBack}
                disabled={isProcessing}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleProcess}
                disabled={!isProcessValid || isProcessing}
                className="px-6 py-2 rounded-lg text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Confirm Process</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProcessModal;
