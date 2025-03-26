'use client'
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import PlayerSearch, { Player } from './PlayerSearch';
import GameUsernameField from './GameUsernameField';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { convertEntFormat } from '@/utils/entFormat';
import { EntType } from '@/supabase/types';
import EntPagesDropdown from './EntPagesDropdown';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    initBy: string;
    vipCode: string;
    platform_username: string;
    platform: string;
    amount?: number;
    promo_code?: string;
    promo_type?: string;
    agentName: string;
    agentDepartment: string;
    notes: string;
    rechargeId: string;
    recharge_id: string;
    playerName: string;
    payment_methods?: Array<{ type: string; username: string; }>;
    page_name?: string;
  }) => Promise<any>;
  user: {
    name: string;
    department: string;
    ent_access?: EntType[];
    id: string;
  };
}

interface Promotion {
  id: string;
  code: string;
  description?: string;
  status: string;
  type: string;
  percentage?: number;
  amount?: number;
  is_active: boolean;
  applicable_teams: string[];
}

interface PaymentMethods {
  cashapp: boolean;
  venmo: boolean;
  chime: boolean;
}

const RechargeModal: React.FC<RechargeModalProps> = ({ isOpen, onClose, onSubmit, user }) => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [loadGamePlatform, setLoadGamePlatform] = useState('');
  const [loadUsername, setLoadUsername] = useState('');
  const [loadAmount, setLoadAmount] = useState('');
  const [loadPromoCode, setLoadPromoCode] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethods>({
    cashapp: false,
    venmo: false,
    chime: false,
  });
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoadingPromotions, setIsLoadingPromotions] = useState(false);
  const [promotionError, setPromotionError] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState('');
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPromotions = async () => {
      if (!selectedPlayer?.team) return;

      setIsLoadingPromotions(true);
      setPromotionError(null);
      try {
        // First fetch promotion assignments
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('promotion_assignments')
          .select('*')
          .or(`status.eq.assigned,and(status.eq.claimed,promo_type.eq.percentage)`)
          .eq('team', selectedPlayer.team);

        if (assignmentsError) throw assignmentsError;

        if (!assignmentsData || assignmentsData.length === 0) {
          setPromotions([]);
          return;
        }

        // Get unique promotion IDs
        const promotionIds = [...new Set(assignmentsData.map(a => a.promotion_id))];

        // Fetch promotion details
        const { data: promotionsData, error: promotionsError } = await supabase
          .from('promotions')
          .select('*')
          .in('id', promotionIds);

        if (promotionsError) throw promotionsError;

        // Map the promotions data to the required format
        const mappedPromotions = promotionsData.map(promo => ({
          id: promo.id,
          code: promo.code,
          description: promo.description,
          status: promo.is_active ? 'active' : 'inactive',
          type: promo.type,
          percentage: promo.percentage,
          amount: promo.amount,
          is_active: promo.is_active,
          applicable_teams: promo.applicable_teams
        }));

        console.log("Mapped promotions:", mappedPromotions);
        setPromotions(mappedPromotions);
      } catch (err) {
        console.error('Error fetching promotions:', err);
        setPromotionError(err instanceof Error ? err.message : 'Failed to fetch promotions');
        setPromotions([]);
      } finally {
        setIsLoadingPromotions(false);
      }
    };

    // Only fetch promotions when we have a selected player
    if (isOpen && selectedPlayer) {
      fetchPromotions();
    }
  }, [isOpen, selectedPlayer]);

  console.log(selectedPlayer);
  if (!isOpen) return null;


  const getPromoAmount = async () => {
    const { data: amount, error: promoError } = await supabase
      .from('promotions')
      .select('*')
      .eq('code', loadPromoCode);
    return amount;
  };

  console.log("getPromoAmount func", getPromoAmount());

  const handlePaymentMethodChange = (method: keyof PaymentMethods) => {
    setPaymentMethods((prev) => ({
      ...prev,
      [method]: !prev[method],
    }));
  };

  // Add validation for ENT access
  const validateEntAccess = (player: Player | null) => {
    if (!player || !user.ent_access) return false;
    return convertEntFormat.hasEntAccess(user, player.team);
  };

  // Add this function to validate page team code
  const validatePageTeamCode = async (pageName: string, playerTeamCode: string) => {
    const { data, error } = await supabase
      .from('ent_pages')
      .select('team_code')
      .eq('page_name', pageName)
      .single();

    if (error) {
      console.error('Error validating page team code:', error);
      return false;
    }

    return data.team_code === playerTeamCode;
  };

  // Modify handleSubmit to include page validation
  const handleSubmit = async () => {
    if (!selectedPlayer) return;

    // Validate ENT access before proceeding
    if (!validateEntAccess(selectedPlayer)) {
      setError('You do not have access to submit requests for this ENT');
      return;
    }

    // Validate page team code
    if (selectedPage) {
      const isValidPage = await validatePageTeamCode(selectedPage, selectedPlayer.team);
      if (!isValidPage) {
        setPageError('Selected page does not match player\'s team code');
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);
    setPageError(null);

    try {
      // Check if player is banned
      const { data: playerStatus, error: statusError } = await supabase
        .from('players')
        .select('status')
        .eq('vip_code', selectedPlayer.vipCode)
        .single();

      if (statusError) throw statusError;

      if (playerStatus?.status === 'banned') {
        setError('This player is banned. Cannot process any requests.');
        return;
      }

      const selectedPromo = promotions.find(p => p.code === loadPromoCode);
      
      // Format payment methods
      const formattedPaymentMethods = Object.entries(paymentMethods)
        .filter(([_, value]) => value)
        .map(([type]) => ({
          type,
          username: '',
        }));

      // Update player's game usernames
      const platformToKey: { [key: string]: string } = {
        'Fire Kirin': 'fireKirin',
        'Game Vault': 'gameVault',
        'Orion Stars': 'orionStars',
        'VBlink': 'vblink',
        'Vegas Sweeps': 'vegasSweeps',
        'Ultra Panda': 'ultraPanda',
        'Yolo': 'yolo',
        'Juwa': 'juwa',
        'Moolah': 'moolah',
        'Panda Master': 'pandaMaster',
        // Add more mappings as needed
      };

      const key = platformToKey[loadGamePlatform];
      if (key) {
        // Get current game_usernames
        const { data: playerData, error: fetchError } = await supabase
          .from('players')
          .select('game_usernames')
          .eq('vip_code', selectedPlayer.vipCode)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found" error
          throw fetchError;
        }

        // Update game_usernames
        const currentUsernames = playerData?.game_usernames || {};
        const { error: updateError } = await supabase
          .from('players')
          .update({
            vip_code: selectedPlayer.vipCode,
            game_usernames: {
              ...currentUsernames,
              [key]: loadUsername
            }
          })
          .eq('vip_code', selectedPlayer.vipCode);

        if (updateError) throw updateError;
      }

      // Create recharge request in Supabase
      const { data: rechargeData, error: rechargeError } = await supabase
        .from('recharge_requests')
        .insert([{
          vip_code: selectedPlayer.vipCode,
          player_name: selectedPlayer.playerName,
          messenger_id: selectedPlayer.messengerId,
          team_code: selectedPlayer.team,
          game_platform: loadGamePlatform,
          game_username: loadUsername,
          amount: parseFloat(loadAmount),
          bonus_amount: selectedPromo?.amount || selectedPromo?.percentage,
          credits_loaded: 0,
          status: 'pending',
          promo_code: selectedPromo?.code,
          promo_type: selectedPromo?.type,
          payment_method: formattedPaymentMethods,
          notes: notes || 'Agent initiated recharge request',
          manychat_data: selectedPlayer,
          init_by: 'agent',
          init_id: user.id,
          agent_name: user.name,
          agent_department: user.department,
          page_name: selectedPage || null
        }])
        .select()
        .single();

      if (rechargeError) throw rechargeError;

      // Call the onSubmit callback with the data
      await onSubmit({
        initBy: "agent",
        vipCode: selectedPlayer.vipCode,
        platform_username: loadUsername,
        platform: loadGamePlatform,
        amount: parseFloat(loadAmount),
        promo_code: selectedPromo?.code,
        promo_type: selectedPromo?.type,
        agentName: user.name,
        agentDepartment: user.department,
        notes: notes,
        rechargeId: rechargeData.id,
        recharge_id: rechargeData.recharge_id,
        playerName: selectedPlayer.playerName,
        payment_methods: formattedPaymentMethods,
        page_name: selectedPage
      });

      onClose();
    } catch (err) {
      console.error('Error submitting recharge:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit recharge request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPlatformUsername = (platform: string) => {
    if (!selectedPlayer?.platforms) return '';
    switch (platform) {
      case 'firekirin':
        return selectedPlayer.platforms.firekirin_username || '';
      case 'juwa':
        return selectedPlayer.platforms.juwa_username || '';
      case 'orionstars':
        return selectedPlayer.platforms.orionstars_username || '';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-lg border border-gray-800/20 shadow-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h3 className="text-xl font-semibold text-white">Submit Recharge Request</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <PlayerSearch 
            onSelect={setSelectedPlayer} 
            selectedPlayer={selectedPlayer} 
            userEntAccess={user.ent_access}
          />

          {/* Game Platform */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Game Platform</label>
            <select
              className="w-full bg-[#252b3b] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              value={loadGamePlatform}
              onChange={(e) => {
                setLoadGamePlatform(e.target.value);
                setLoadUsername(getPlatformUsername(e.target.value.toLowerCase()));
              }}
            >
              <option value="">Select game platform...</option>
              <option value="Orion Stars">Orion Stars</option>
              <option value="Fire Kirin">Fire Kirin</option>
              <option value="Game Vault">Game Vault</option>
              <option value="VBlink">VBlink</option>
              <option value="Vegas Sweeps">Vegas Sweeps</option>
              <option value="Ultra Panda">Ultra Panda</option>
              <option value="Yolo">Yolo</option>
              <option value="Juwa">Juwa</option>
              <option value="Moolah">Moolah</option>
              <option value="Panda Master">Panda Master</option>
            </select>
          </div>

          {/* Game Username */}
          <GameUsernameField
            value={loadUsername}
            onChange={setLoadUsername}
            platform={loadGamePlatform}
            vipCode={selectedPlayer?.vipCode || ''}
          />

          {/* Amount */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Deposit Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                className="w-full bg-[#252b3b] border border-gray-800 rounded-lg pl-8 pr-4 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="Enter amount..."
                value={loadAmount}
                onChange={(e) => setLoadAmount(e.target.value)}
              />
            </div>
          </div>

          {/* Payment Methods */}
          <div className="space-y-4">
            <label className="text-sm text-gray-400">Deposit Payment Methods</label>
            <div className="grid grid-cols-3 gap-3">
              {/* Cashapp */}
              <div>
                <button
                  onClick={() => handlePaymentMethodChange("cashapp")}
                  className={`w-full flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 
                    ${paymentMethods.cashapp
                      ? "border-green-500 bg-green-500/10"
                      : "border-gray-800 hover:border-green-500/50 hover:bg-green-500/5"
                    }`}
                >
                  <Image
                    src="/cashapp.svg"
                    alt="Cashapp"
                    width={32}
                    height={32}
                    className="mb-2"
                  />
                  <span className={`text-xs font-medium ${
                    paymentMethods.cashapp ? "text-green-500" : "text-gray-400"
                  }`}>
                    Cashapp
                  </span>
                </button>
              </div>

              {/* Venmo */}
              <div>
                <button
                  onClick={() => handlePaymentMethodChange("venmo")}
                  className={`w-full flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 
                    ${paymentMethods.venmo
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-gray-800 hover:border-blue-500/50 hover:bg-blue-500/5"
                    }`}
                >
                  <Image
                    src="/venmo.svg"
                    alt="Venmo"
                    width={32}
                    height={32}
                    className="mb-2"
                  />
                  <span className={`text-xs font-medium ${
                    paymentMethods.venmo ? "text-blue-500" : "text-gray-400"
                  }`}>
                    Venmo
                  </span>
                </button>
              </div>

              {/* Chime */}
              <div>
                <button
                  onClick={() => handlePaymentMethodChange("chime")}
                  className={`w-full flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 
                    ${paymentMethods.chime
                      ? "border-green-500 bg-green-500/10"
                      : "border-gray-800 hover:border-green-500/50 hover:bg-green-500/5"
                    }`}
                >
                  <Image
                    src="/chime.svg"
                    alt="Chime"
                    width={32}
                    height={32}
                    className="mb-2"
                  />
                  <span className={`text-xs font-medium ${
                    paymentMethods.chime ? "text-green-500" : "text-gray-400"
                  }`}>
                    Chime
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Promo Code */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Promo Code</label>
            {isLoadingPromotions ? (
              <div className="w-full bg-[#252b3b] border border-gray-800 rounded-lg px-4 py-2 text-gray-400">
                Loading promotions...
              </div>
            ) : promotionError ? (
              <div className="w-full bg-[#252b3b] border border-gray-800 rounded-lg px-4 py-2 text-red-400">
                {promotionError}
              </div>
            ) : promotions.length > 0 ? (
              <select
                className="w-full bg-[#252b3b] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                value={loadPromoCode}
                onChange={(e) => setLoadPromoCode(e.target.value)}
              >
                <option value="">Select promo code...</option>
                {promotions.map((promo) => (
                  <option key={promo.id} value={promo.code}>
                    {promo.code} {promo.type === 'PERCENTAGE' 
                      ? `- ${promo.percentage}% off` 
                      : `- $${promo.amount} off`} {promo.description ? `(${promo.description})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="w-full bg-[#252b3b] border border-gray-800 rounded-lg px-4 py-2 text-gray-400">
                No promotions available
              </div>
            )}
          </div>

          {/* Team Code */}
          {/* <div className="space-y-2">
            <label className="text-sm text-gray-400">Team Code</label>
            <select
              className="w-full bg-[#252b3b] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              value={teamCode}
              onChange={(e) => setTeamCode(e.target.value)}
            >
              <option value="">Select team code...</option>
              <option value="ENT-1">ENT-1</option>
              <option value="ENT-2">ENT-2</option>
              <option value="ENT-3">ENT-3</option>
            </select>
          </div> */}

          {/* Additional Notes */}
          {/* <div className="space-y-2">
            <label className="text-sm text-gray-400">Additional Notes</label>
            <textarea
              className="w-full bg-[#252b3b] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter any additional notes..."
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div> */}

          {/* Add ENT Pages Dropdown */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Page Name</label>
            <EntPagesDropdown
              teamCode={selectedPlayer?.team}
              value={selectedPage}
              onChange={setSelectedPage}
              disabled={!selectedPlayer}
            />
            {pageError && (
              <p className="text-sm text-red-500 mt-1">
                {pageError}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-800">
          {(error || pageError) && (
            <div className="flex-1 text-red-500 text-sm">
              {error || pageError}
            </div>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedPlayer || !loadGamePlatform || !loadUsername || !loadAmount || 
              !Object.values(paymentMethods).some(Boolean) || !validateEntAccess(selectedPlayer)}
            className="px-4 py-2 text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 
              transition-all duration-200 transform hover:scale-105 active:scale-95 
              disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
              flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin">⏳</span>
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RechargeModal; 

