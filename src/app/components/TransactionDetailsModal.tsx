import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { Clock, User, GamepadIcon, DollarSign, CheckCircle2, CreditCard, UserCheck, Link, ImageIcon, AlertTriangle } from 'lucide-react';
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rechargeRequest: {
    rechargeId: string;
    recharge_id: string;
    playerName: string;
    manyChatName: string;
    messengerId: string;
    vipCode: string | null;
    initBy: string;
    gamePlatform: string;
    gameUsername: string;
    amount: number;
    credits_loaded: number;
    bonusAmount: number;
    status: string;
    deposit_status?: string;
    screenshotUrl?: string;
    teamCode: string;
    promotion: string | null;
    createdAt: string;
    profile_pic?: string;
    processedBy: {
      name: string;
      email: string;
    } | null;
    processedAt: string;
    paymentMethod?: {
      type: string;
      username?: string;
      details?: string;
      notes?: string;
      amount?: number;
      cashtag?: string;
      reference?: string;
      timestamp?: string;
      identifier?: string;
      _id?: string;
    };
    assignedRedeem: {
      redeemId?: string;
      amount: number;
      tagType: string;
      assignedAt: string;
      paymentMethods: {
        type: string;
        username: string;
        _id: string;
      }[];
      playerDetails?: {
        username: string;
        totalAmount: number;
        amountPaid: number;
        amountHold: number;
        amountAvailable: number;
        profile_pic?: string;
      };
    } | null;
    assign_ct?: {
      tagType: string;
    } | null;
  } | null;
  onStatusUpdate: () => void;
}

const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({
  isOpen,
  onClose,
  rechargeRequest,
  onStatusUpdate
}) => {
  const [isDisputing, setIsDisputing] = useState(false);

  console.log("rechargeRequest>?>?>", rechargeRequest);
  if (!rechargeRequest) return null;

  const safeFormatDate = (dateString: string | undefined | null, formatStr: string = 'MMM d, yyyy HH:mm'): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return '-';
      }
      return format(date, formatStr);
    } catch (error) {
      console.error('Error formatting date:', error);
      return '-';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'assigned':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'disputed':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const handleDispute = async () => {
    try {
      setIsDisputing(true);
      console.log("Attempting to dispute transaction:", rechargeRequest);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Update the transaction status in Supabase
      const { data, error } = await supabase
        .from('recharge_requests')
        .update({ 
          deposit_status: 'disputed',
          disputed_by : {
            id: user.id,
            name: user.user_metadata.name,
            role: user.user_metadata.role,
            department: user.user_metadata.department,
            employee_code: user.user_metadata.employee_code,
          }
        })
        .eq('recharge_id', rechargeRequest.recharge_id)
        .select();

      console.log("Update response:", { data, error });

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('No record was updated. Please check if the transaction exists.');
      }

      toast.success('Transaction marked as disputed');
      if (onStatusUpdate) {
        onStatusUpdate();
      }
      onClose();
    } catch (error) {
      console.error('Error disputing transaction:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to dispute transaction');
    } finally {
      setIsDisputing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1a1a] text-white border border-gray-800 max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b border-gray-800 px-6 py-4 bg-gradient-to-r from-[#1a1a1a] to-[#2a2a2a]">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              Recharge Request Details
            </DialogTitle>
            <div className="flex items-center gap-4">
              <Badge className={`${getStatusColor(rechargeRequest.status)} px-3 py-1 text-sm font-medium border`}>
                {rechargeRequest.status.toUpperCase()}
              </Badge>
              {rechargeRequest.deposit_status !== 'disputed' && 
               rechargeRequest.assignedRedeem &&
               (!rechargeRequest.assign_ct?.tagType || rechargeRequest.assign_ct.tagType !== 'CT') && (
                <button
                  onClick={handleDispute}
                  disabled={isDisputing}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <AlertTriangle size={16} />
                  {isDisputing ? 'Disputing...' : 'Dispute'}
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto px-6 py-4">
          {/* Top Summary */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-[#2a2a2a] to-[#1a1a1a] border border-gray-800">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-500">
                <DollarSign size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Amount (With Promo)</p>
                <p className="text-2xl font-bold">${rechargeRequest.credits_loaded}</p>
              </div>
            </div>
            <div className="h-12 w-px bg-gray-800"></div>
            <div>
              <p className="text-sm text-gray-400">Recharge ID</p>
              <p className="text-lg font-mono text-blue-400">{rechargeRequest.recharge_id}</p>
            </div>
            <div className="h-12 w-px bg-gray-800"></div>
            <div>
              <p className="text-sm text-gray-400">Created</p>
              <p className="text-lg">{safeFormatDate(rechargeRequest.createdAt)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4 p-4 rounded-xl bg-[#222] border border-gray-800">
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-300">
                <User size={20} className="text-blue-400" />
                <h3>Depositor Information</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="text-gray-400">Player Name</span>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{rechargeRequest.playerName}</span>
                    {rechargeRequest.profile_pic && (
                      <img 
                        src={rechargeRequest.profile_pic} 
                        alt={rechargeRequest.playerName}
                        className="w-8 h-8 rounded-full object-cover border border-gray-700"
                      />
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="text-gray-400">VIP Code</span>
                  <span className="font-medium">{rechargeRequest.vipCode || '-'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="text-gray-400">Team Code</span>
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                    {rechargeRequest.teamCode}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Game Details */}
            <div className="space-y-4 p-4 rounded-xl bg-[#222] border border-gray-800">
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-300">
                <GamepadIcon size={20} className="text-purple-400" />
                <h3>Game Details</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="text-gray-400">Platform</span>
                  <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                    {rechargeRequest.gamePlatform}
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="text-gray-400">Username</span>
                  <span className="font-medium">{rechargeRequest.gameUsername}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="text-gray-400">Bonus Amount</span>
                  <span className="text-emerald-400">${rechargeRequest.bonusAmount}</span>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            {rechargeRequest.paymentMethod && (
              <div className="space-y-4 p-4 rounded-xl bg-[#222] border border-gray-800">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-300">
                  <CreditCard size={20} className="text-emerald-400" />
                  <h3>Payment Details</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-800">
                    <span className="text-gray-400">Payment Type</span>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      {rechargeRequest.paymentMethod.type}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-800">
                    <span className="text-gray-400">Details</span>
                    <span className="font-medium">{rechargeRequest.paymentMethod.details}</span>
                  </div>
                  {rechargeRequest.promotion && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-800">
                      <span className="text-gray-400">Promotion</span>
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                        {rechargeRequest.promotion}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Processing Details */}
            {rechargeRequest.processedBy && (
              <div className="space-y-4 p-4 rounded-xl bg-[#222] border border-gray-800">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-300">
                  <UserCheck size={20} className="text-blue-400" />
                  <h3>Processing Details</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-800">
                    <span className="text-gray-400">Processed By</span>
                    <span className="font-medium">{rechargeRequest.processedBy.name}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-800">
                    <span className="text-gray-400">Email</span>
                    <span className="text-blue-400">{rechargeRequest.processedBy.email}</span>
                  </div>
                  {rechargeRequest.processedAt && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-800">
                      <span className="text-gray-400">Processed At</span>
                      <span className="font-medium">
                        {safeFormatDate(rechargeRequest.processedAt)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Assigned Redeem */}
          {rechargeRequest.assignedRedeem && (
            <div className="space-y-4 p-4 rounded-xl bg-[#222] border border-gray-800">
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-300">
                <User size={20} className="text-purple-400" />
                <h3>Receiver Details</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="text-gray-400">Tag Type</span>
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                    {rechargeRequest.assignedRedeem.tagType}
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="text-gray-400">Assigned At</span>
                  <span className="font-medium">
                    {safeFormatDate(rechargeRequest.assignedRedeem.assignedAt)}
                  </span>
                </div>
                {rechargeRequest.assignedRedeem.playerDetails && (
                  <>
                    <div className="flex justify-between items-center py-2 border-b border-gray-800">
                      <span className="text-gray-400">Username</span>
                      <span className="font-medium">
                        {rechargeRequest.assignedRedeem.playerDetails.username}
                      </span>
                    </div>
                    {rechargeRequest.assignedRedeem.playerDetails.profile_pic && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-800">
                        <span className="text-gray-400">Profile Picture</span>
                        <img 
                          src={rechargeRequest.assignedRedeem.playerDetails.profile_pic}
                          alt={rechargeRequest.assignedRedeem.playerDetails.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Screenshot */}
          {rechargeRequest.screenshotUrl && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-300">
                <h3 className='flex items-center gap-2 '> <span> <ImageIcon color='yellow'/> </span> Payment Screenshot</h3>
              </div>
              <div className="relative group">
                <img 
                  src={rechargeRequest.screenshotUrl} 
                  alt="Payment Screenshot" 
                  className="w-full rounded-xl border border-gray-800 transition-transform duration-200 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl" />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionDetailsModal;