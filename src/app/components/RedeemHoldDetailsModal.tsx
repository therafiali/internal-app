import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";
import TimeElapsed from "@/app/components/TimeElapsed";
import { AgentImage } from "@/app/components/recharge/AgentImage";
import type { RedeemRequest } from "@/hooks/useFinanceRedeem";
import { supabase } from "@/lib/supabase";

interface HoldDetail {
  hold_at: string;
  hold_amount: number;
  player_name: string;
  recharge_id: string;
  player_image: string;
}

interface HoldResponse {
  holds: HoldDetail[];
  total_hold: number;
}

interface RedeemHoldDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: RedeemRequest | null;
}

const RedeemHoldDetailsModal = ({ isOpen, onClose, request }: RedeemHoldDetailsModalProps) => {
  const [holdDetails, setHoldDetails] = useState<HoldResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHoldDetails = async () => {
      if (!request?.redeem_id) return;

      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('redeem_requests')
          .select('hold_details')
          .eq('redeem_id', request.redeem_id)
          .single();

        if (error) throw error;

        setHoldDetails(data.hold_details as HoldResponse);
      } catch (err) {
        console.error('Error fetching hold details:', err);
        setError('Failed to load hold details');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && request) {
      fetchHoldDetails();
    }
  }, [isOpen, request]);

  if (!request) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1a1a] text-white border-gray-800 max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Hold Details - Redeem ID: {request.redeem_id}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          {/* Player Info */}
          <div className="bg-[#252b3b] p-4 rounded-lg">
            <div className="flex items-center gap-4">
              <Image
                src={request.player_data?.profile?.profilePic || `https://ui-avatars.com/api/?name=${request.player_name}`}
                alt={request.player_name}
                width={64}
                height={64}
                className="rounded-full"
              />
              <div>
                <div className="text-xl font-medium">{request.player_name}</div>
                <div className="text-gray-400">VIP Code: {request.vip_code}</div>
              </div>
            </div>
          </div>

          {/* Hold Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#252b3b] p-4 rounded-lg">
              <div className="text-sm text-gray-400">Total Amount</div>
              <div className="text-xl font-medium">${(request.total_amount || 0).toFixed(2)}</div>
            </div>
            <div className="bg-[#252b3b] p-4 rounded-lg">
              <div className="text-sm text-gray-400">Total Hold Amount</div>
              <div className="text-xl font-medium">${(holdDetails?.total_hold || 0).toFixed(2)}</div>
            </div>
            <div className="bg-[#252b3b] p-4 rounded-lg">
              <div className="text-sm text-gray-400">Available to Hold</div>
              <div className="text-xl font-medium">
                ${(request.amount_available || 0).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Hold Details Table */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-4">{error}</div>
          ) : (
            <div className="bg-[#252b3b] rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#1a1a1a]">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Recharge ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Player</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Hold Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Hold Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {holdDetails?.holds.map((hold, index) => (
                    <tr key={index} className="hover:bg-[#1a1a1a]/50">
                      <td className="px-4 py-3 text-sm">{hold.recharge_id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Image
                            src={hold.player_image || `https://ui-avatars.com/api/?name=${hold.player_name}`}
                            alt={hold.player_name}
                            width={32}
                            height={32}
                            className="rounded-full object-cover"
                          />
                          <span className="text-sm">{hold.player_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">${hold.hold_amount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm">
                        <TimeElapsed
                          date={hold.hold_at}
                          elapsedClassName="text-gray-300"
                          fullDateClassName="text-gray-400"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RedeemHoldDetailsModal;