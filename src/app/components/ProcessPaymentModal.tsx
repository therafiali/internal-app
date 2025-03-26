import React, { useState, useEffect } from "react";
import { RedeemRequest as FinanceRedeemRequest } from '@/hooks/useFinanceRedeem';
import Cookies from "js-cookie";
import AlertModal from './AlertModal';
import { supabase } from '@/supabase/client';
import type { CompanyTag } from '@/hooks/useCashtags';

interface ProcessPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: FinanceRedeemRequest;
  activeCashtags: CompanyTag[];
  onProcess: (amount: number, paymentMethods: string, reference: string, notes: string, identifier: string) => Promise<void>;
}

const ProcessPaymentModal = ({
  isOpen,
  onClose,
  request,
  activeCashtags,
  onProcess,
}: ProcessPaymentModalProps) => {
  console.log("[ProcessPaymentModal] Rendering with props:", {
    isOpen,
    request,
    hasOnClose: !!onClose,
    hasOnProcess: !!onProcess
  });

  const [stage, setStage] = useState(1);
  const [totalAmount, setTotalAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [processText, setProcessText] = useState("");
  const [cashtags, setCashtags] = useState<CompanyTag[]>([]);
  const [selectedCashtag, setSelectedCashtag] = useState<string>("");
  const [isHoldLoading, setIsHoldLoading] = useState(false);
  const [isRemoveHoldLoading, setIsRemoveHoldLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ isOpen: false, type: 'success', message: '' });

  console.log("request",request.amount_available);
  console.log("totalAmount",totalAmount);
  useEffect(() => {
    console.log("[ProcessPaymentModal] isOpen changed:", isOpen);
    if (!isOpen) return;

    const fetchCashtags = async () => {
      try {
        console.log("[ProcessPaymentModal] Fetching cashtags...");
        const token = Cookies.get("token");
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}api/companytag/get-all-company-tags`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        const data = await response.json();
        if (data.success) {
          console.log("[ProcessPaymentModal] Cashtags fetched:", data.data.companyTags);
          setCashtags(data.data.companyTags);
        }
      } catch (error) {
        console.error("[ProcessPaymentModal] Error fetching cashtags:", error);
      }
    };

    fetchCashtags();
  }, [isOpen]);

  useEffect(() => {
    // Set default payment method from request
    if (request.paymentMethods && request.paymentMethods.length > 0) {
      console.log("[Init] Setting default payment method:", request.paymentMethods[0].type);
      setPaymentMethod(request.paymentMethods[0].type);
    }
  }, [request.paymentMethods]);

  // Log state changes
  useEffect(() => {
    console.log("[ProcessPaymentModal] State updated:", {
      stage,
      totalAmount,
      paymentMethod,
      selectedCashtag,
      showConfirmation,
      isHoldLoading,
      isProcessing
    });
  }, [stage, totalAmount, paymentMethod, selectedCashtag, showConfirmation, isHoldLoading, isProcessing]);

  if (!isOpen) {
    console.log("[ProcessPaymentModal] Not rendering - modal is closed");
    return null;
  }

  console.log("request.paymentMethods",request.paymentMethods);
  console.log("paymentMethod",paymentMethod);


  const handleStage1Next = () => {
    console.log("[handleStage1Next] Checking conditions:", {
      totalAmount,
      available: request.amount_available,
      conditions: {
        isPositive: totalAmount > 0,
        withinLimit: totalAmount <= request.amount_available
      }
    });

    if (totalAmount > 0 && totalAmount <= request.amount_available) {
      // First, add the hold
      handleHoldToPayClick();
    } else {
      console.log("[handleStage1Next] Invalid amount");
      setAlertModal({
        isOpen: true,
        type: 'error',
        message: 'Please enter a valid amount'
      });
    }
  };

  const handleStage2Next = () => {
    console.log("[Stage2Next] Validating:", { selectedCashtag, paymentMethod, identifier });
    
    if (!selectedCashtag) {
      setAlertModal({
        isOpen: true,
        type: 'error',
        message: 'Please select a cashtag'
      });
      return;
    }

    if (!identifier) {
      setAlertModal({
        isOpen: true,
        type: 'error',
        message: 'Please enter an identifier'
      });
      return;
    }

    setShowConfirmation(true);
  };

  console.log("selectedCashtag",request.redeemId,selectedCashtag,totalAmount );
  const handleProcessPayment = async () => {
    console.log("[handleProcessPayment] Starting process payment", {
      redeemId: request.redeemId,
      totalAmount,
      currentHold: request.amount_hold,
      currentPaid: request.amount_paid,
      processing_state: request.processing_state,
      identifier,
      selectedCashtag
    });

    if (!selectedCashtag || !totalAmount || !identifier) {
      setAlertModal({
        isOpen: true,
        type: 'error',
        message: 'Please fill in all required fields'
      });
      return;
    }

    try {
      setIsProcessing(true);

      // Double check the current status in the database
      const { data: checkData, error: checkError } = await supabase
        .from('redeem_requests')
        .select('processing_state, amount_paid, amount_hold, total_amount, payment_methods')
        .eq('id', request.redeemId)
        .single();

      if (checkError) {
        console.error("[handleProcessPayment] Error checking status:", checkError);
        setAlertModal({
          isOpen: true,
          type: 'error',
          message: 'Failed to check request status'
        });
        return;
      }

      // Calculate new amounts
      const newAmountPaid = (checkData.amount_paid || 0) + totalAmount;
      const newAmountHold = (checkData.amount_hold || 0) - totalAmount;

      // Validate hold amount
      if (newAmountHold < 0) {
        console.error("[handleProcessPayment] Invalid hold amount:", {
          currentHold: checkData.amount_hold,
          attemptedDeduction: totalAmount,
          newAmountHold
        });
        setAlertModal({
          isOpen: true,
          type: 'error',
          message: `Cannot process more than the held amount. Current hold: $${checkData.amount_hold}`
        });
        return;
      }

      // Call the onProcess callback with the payment details
      await onProcess(totalAmount, selectedCashtag, reference, notes, identifier);
      
      setAlertModal({
        isOpen: true,
        type: 'success',
        message: 'Payment processed successfully'
      });

    } catch (error) {
      console.error("[handleProcessPayment] Error:", error);
      // Reset processing state on error
      await supabase
        .from('redeem_requests')
        .update({
          processing_state: {
            status: 'idle',
            processed_by: null,
            modal_type: 'none'
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', request.redeemId);

      setAlertModal({
        isOpen: true,
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to process payment'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHoldToPayClick = async () => {
    console.log("[handleHoldToPayClick] Starting hold process", {
      redeemId: request.redeemId,
      totalAmount,
      currentHold: request.amount_hold,
      available: request.amount_available,
      processing_state: request.processing_state
    });
    
    try {
      setIsHoldLoading(true);

      // First check the current status
      const { data: checkData, error: checkError } = await supabase
        .from('redeem_requests')
        .select('processing_state, amount_hold, amount_available')
        .eq('id', request.redeemId)
        .single();

      if (checkError) {
        console.error("[handleHoldToPayClick] Error checking status:", checkError);
        setAlertModal({
          isOpen: true,
          type: 'error',
          message: 'Failed to check request status'
        });
        return;
      }

      // Verify the amount is still available
      if (checkData.amount_available < totalAmount) {
        setAlertModal({
          isOpen: true,
          type: 'error',
          message: 'Amount no longer available'
        });
        return;
      }
      
      // Update the redeem request with hold amount
      console.log("[handleHoldToPayClick] Updating redeem request with hold amount");
      const { data, error } = await supabase
        .from('redeem_requests')
        .update({
          amount_hold: totalAmount,
          processing_state: {
            status: 'in_progress',
            processed_by: null,
            modal_type: 'payment_modal'
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', request.redeemId)
        .select('*');

      if (error) {
        console.error("[handleHoldToPayClick] Supabase error:", error);
        setAlertModal({
          isOpen: true,
          type: 'error',
          message: error.message || 'Failed to add hold'
        });
        return;
      }

      if (!data || data.length === 0) {
        console.error("[handleHoldToPayClick] No data returned from update");
        setAlertModal({
          isOpen: true,
          type: 'error',
          message: 'Failed to update request. Please try again.'
        });
        return;
      }

      console.log("[handleHoldToPayClick] Hold added successfully", data);
      console.log("[handleHoldToPayClick] Moving to next stage");
      
      // If successful, move to next stage
      setStage(2);
    } catch (error) {
      console.error("[handleHoldToPayClick] Unexpected error:", error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        message: 'Failed to add hold. Please try again.'
      });
    } finally {
      setIsHoldLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      setIsRemoveHoldLoading(true);
      
      // Update processing state and remove hold if in stage 2
      const updateData: any = {
        processing_state: {
          status: 'idle',
          processed_by: null,
          modal_type: 'none'
        },
        updated_at: new Date().toISOString()
      };

      if (stage === 2) {
        updateData.amount_hold = 0;
        updateData.status = request.amount_paid > 0 ? 'queued_partially_paid' : 'queued';
      }

      const { error } = await supabase
        .from('redeem_requests')
        .update(updateData)
        .eq('id', request.redeemId);

      if (error) {
        console.error("[handleCancel] Error updating request:", error);
        setAlertModal({
          isOpen: true,
          type: 'error',
          message: error.message || 'Failed to cancel process'
        });
        return;
      }

      onClose();
    } catch (error) {
      console.error("[handleCancel] Unexpected error:", error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        message: 'Failed to cancel process. Please try again.'
      });
    } finally {
      setIsRemoveHoldLoading(false);
    }
  };

  if (showConfirmation) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-lg border border-gray-800/20">
          <div className="flex items-center justify-between p-6 border-b border-gray-800">
            <h3 className="text-xl font-semibold text-white">
              Confirm Process
            </h3>
            <button
              onClick={handleCancel}
              disabled={isProcessing}
              className="text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-400">
                Review Details
              </h4>
              <div className="bg-[#252b3b] rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Amount:</span>
                  <span className="text-sm text-white">${totalAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Payment Method:</span>
                  <span className="text-sm text-white">{selectedCashtag}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Identifier:</span>
                  <span className="text-sm text-white">{identifier}</span>
                </div>
                {reference && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Reference:</span>
                    <span className="text-sm text-white">{reference}</span>
                  </div>
                )}
                {notes && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Notes:</span>
                    <span className="text-sm text-white">{notes}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">
                Type &quot;process&quot; to confirm
              </label>
              <input
                onPaste={(e) => e.preventDefault()}
                type="text"
                className={`w-full bg-[#252b3b] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none ${
                  processText && processText.toLowerCase() !== "process"
                    ? "border-red-500 focus:border-red-500"
                    : "focus:border-blue-500"
                }`}
                value={processText}
                onChange={(e) => setProcessText(e.target.value)}
                placeholder='Type "process" to enable confirmation...'
              />
              {processText && processText.toLowerCase() !== "process" && (
                <p className="text-xs text-red-500">
                  Please type exactly &quot;process&quot; to confirm
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 p-6 border-t border-gray-800">
            {/* <button
              onClick={() => setShowConfirmation(false)}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button> */}
            <button
              onClick={handleProcessPayment}
              disabled={processText.toLowerCase() !== "process" || isProcessing}
              className="px-4 py-2 text-sm font-medium bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[120px]"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Process"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-lg border border-gray-800/20">
          <div className="flex items-center justify-between p-6 border-b border-gray-800">
            <h3 className="text-xl font-semibold text-white">
              {stage === 1 ? "Enter Amount" : "Payment Details"}
            </h3>
            <button
              onClick={handleCancel}
              disabled={isHoldLoading || isRemoveHoldLoading}
              className="text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="p-6 space-y-4">
            {stage === 1 ? (
              <>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-400">
                    Amount Details
                  </h4>
                  <div className="bg-[#252b3b] rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Total Amount:</span>
                      <span className="text-sm text-white">
                        ${request.total_amount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Paid Amount:</span>
                      <span className="text-sm text-white">
                        ${request.amount_paid || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Hold Amount:</span>
                      <span className="text-sm text-white">
                        ${request.amount_hold || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">
                        Available Amount:
                      </span>
                      <span className="text-sm text-white">
                        ${request.amount_available}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-400">
                    Enter Amount to Hold
                  </label>
                  <input
                    type="number"
                    className={`w-full bg-[#252b3b] border ${
                      totalAmount > request.amount_hold || totalAmount <= 0
                        ? "border-red-500 focus:border-red-500"
                        : "border-gray-800 focus:border-blue-500"
                    } rounded-lg px-4 py-2 text-white focus:outline-none`}
                    value={totalAmount || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      const numValue = value === '' ? 0 : Number(value);
                      console.log("[Amount Input] Changed:", {
                        value,
                        numValue,
                        hold: request.amount_hold
                      });
                      setTotalAmount(numValue);
                    }}
                    min={0}
                    max={request.amount_hold}
                    step="0.01"
                    placeholder="Enter amount to process"
                  />
                  {  request.amount_hold < totalAmount && (
                    <p className="text-xs text-red-500">
                      Amount cannot exceed the held amount of ${request.amount_available}
                    </p>
                  )}
                  {totalAmount <= 0 && (
                    <p className="text-xs text-red-500">
                      Amount cannot be less than $1 
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">
                    User Payment Method
                  </label>
                  <p>{request.paymentMethods[0].username}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Select Cashtag
                  </label>
                  <select
                    value={selectedCashtag}
                    onChange={(e) => {
                      console.log("Selected cashtag:", e.target.value);
                      setSelectedCashtag(e.target.value);
                    }}
                    className="w-full bg-[#242424] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select a cashtag</option>
                    {activeCashtags
                      .filter(tag => 
                        tag.status === 'active' && 
                        // Only show cashtags that match the payment method
                        tag.payment_method === request.paymentMethods[0].type
                      )
                      .map((tag) => (
                        <option key={tag.id} value={tag.cashtag}>
                          {tag.cashtag} - Balance: ${tag.balance}
                        </option>
                      ))
                    }
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Identifier</label>
                  <input
                    type="text"
                    className="w-full bg-[#252b3b] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter payment identifier..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Notes</label>
                  <textarea
                    className="w-full bg-[#252b3b] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter any additional notes..."
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end  gap-3 p-4 border-t border-gray-800 ">
            <button
              onClick={handleCancel}
              disabled={isHoldLoading || isRemoveHoldLoading}
              className="px-4 py- w-full text-start text-sm font-medium text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isRemoveHoldLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  Removing Hold...
                </>
              ) : (
                "Back"
              )}
            </button>
            {/* {stage === 2 && (
              <button
                onClick={() => setStage(1)}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Back
              </button>
            )} */}

            <button
              onClick={(e) => {
                console.log("[Button Click] Stage:", stage);
                console.log("[Button Click] Current state:", {
                  totalAmount,
                  isHoldLoading,
                  stage,
                  isButtonDisabled: stage === 1 ? (
                    !totalAmount || totalAmount <= 0 || totalAmount > request.amount_available
                  ) : (
                    !selectedCashtag
                  )
                });
                if (stage === 1) {
                  handleHoldToPayClick();
                } else {
                  handleStage2Next();
                }
              }}
              disabled={
                stage === 1 ? (
                  !totalAmount || totalAmount <= 0 || totalAmount > request.amount_available || isHoldLoading
                ) : (
                  !selectedCashtag || isHoldLoading
                )
              }
              className="px-4 py-2 w-full text-sm font-medium bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {stage === 1 ? (
                isHoldLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Hold to Pay"
                )
              ) : (
                "Next"
              )}
            </button>
          </div>
        </div>
      </div>
      
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => {
          setAlertModal(prev => ({ ...prev, isOpen: false }));
          if (alertModal.type === 'success') {
            onClose();
          }
        }}
        type={alertModal.type}
        message={alertModal.message}
      />
    </>
  );
};

export default ProcessPaymentModal;
