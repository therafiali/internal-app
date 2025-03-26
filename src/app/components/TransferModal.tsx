'use client'
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import PlayerSearch, { Player } from './PlayerSearch';
import GameUsernameField from './GameUsernameField';
import { supabase } from '@/lib/supabase';
import { convertEntFormat } from '@/utils/entFormat';
import { EntType } from '@/supabase/types';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    initBy: 'agent' | 'player';
    vipCode: string;
    platform_username: string;
    platform: string;
    amount?: number;
    agentName: string;
    agentDepartment: string;
    notes: string;
    transferId: string;
    playerName: string;
    playerImage: string;
    targetUsername: string;
    fromPlatform: string;
    fromUsername: string;
    toPlatform: string;
    toUsername: string;
  }) => Promise<any>;
  user: {
    name: string;
    department: string;
    ent_access?: EntType[];
  };
}

const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose, onSubmit, user }) => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [fromPlatform, setFromPlatform] = useState('');
  const [fromUsername, setFromUsername] = useState('');
  const [toPlatform, setToPlatform] = useState('');
  const [toUsername, setToUsername] = useState('');
  const [loadAmount, setLoadAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const platforms = [
    "Orion Stars",
    "Fire Kirin",
    "Game Vault",
    "VBlink",
    "Vegas Sweeps",
    "Ultra Panda",
    "Yolo",
    "Juwa",
    "Moolah",
    "Panda Master"
  ];

  useEffect(() => {
    if (!isOpen) {
      setSelectedPlayer(null);
      setFromPlatform('');
      setFromUsername('');
      setToPlatform('');
      setToUsername('');
      setLoadAmount('');
      setNotes('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Add validation for ENT access
  const validateEntAccess = (player: Player | null) => {
    if (!player || !user.ent_access) return false;
    return convertEntFormat.hasEntAccess(user, player.team);
  };

  const handleSubmit = async () => {
    if (!selectedPlayer) return;

    // Validate ENT access before proceeding
    if (!validateEntAccess(selectedPlayer)) {
      setError('You do not have access to submit requests for this ENT');
      return;
    }

    setIsSubmitting(true);
    setError(null);

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

      // Update player's game usernames for both from and to platforms
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

      // Get current game_usernames
      const { data: playerData, error: fetchError } = await supabase
        .from('players')
        .select('game_usernames')
        .eq('vip_code', selectedPlayer.vipCode)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found" error
        throw fetchError;
      }

      const currentUsernames = playerData?.game_usernames || {};
      const updatedUsernames = { ...currentUsernames };

      // Update usernames for both platforms
      const fromKey = platformToKey[fromPlatform];
      const toKey = platformToKey[toPlatform];

      if (fromKey) {
        updatedUsernames[fromKey] = fromUsername;
      }
      if (toKey) {
        updatedUsernames[toKey] = toUsername;
      }

      // Update game_usernames if there are changes
      if (fromKey || toKey) {
        const { error: updateError } = await supabase
          .from('players')
          .update({
            vip_code: selectedPlayer.vipCode,
            game_usernames: updatedUsernames
          })
          .eq('vip_code', selectedPlayer.vipCode);

        if (updateError) throw updateError;
      }

      // Create transfer request in Supabase
      const { data: transferData, error: transferError } = await supabase
        .from('transfer_requests')
        .insert([{
          vip_code: selectedPlayer.vipCode,
          player_name: selectedPlayer.playerName,
          player_image: selectedPlayer.profile?.profilePic,
          messenger_id: selectedPlayer.messengerId,
          team_code: selectedPlayer.team,
          init_by: 'agent',
          from_platform: fromPlatform,
          from_username: fromUsername,
          to_platform: toPlatform,
          to_username: toUsername,
          amount: parseFloat(loadAmount),
          status: 'pending',
          notes: notes || 'Agent initiated transfer request',
          manychat_data: selectedPlayer,
          agent_name: user.name,
          agent_department: user.department
        }])
        .select()
        .single();

      if (transferError) throw transferError;

      // Call the onSubmit callback with the data
      await onSubmit({
        initBy: 'agent',
        vipCode: selectedPlayer.vipCode,
        platform_username: fromUsername,
        platform: fromPlatform,
        amount: parseFloat(loadAmount),
        agentName: user.name,
        agentDepartment: user.department,
        notes: notes,
        transferId: transferData.id,
        playerName: selectedPlayer.playerName,
        playerImage: selectedPlayer.profile?.profilePic || '',
        targetUsername: toUsername,
        fromPlatform,
        fromUsername,
        toPlatform,
        toUsername
      });

      onClose();
    } catch (err) {
      console.error('Error submitting transfer:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit transfer request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPlatformUsername = (platform: string) => {
    if (!selectedPlayer?.platforms) return '';
    switch (platform.toLowerCase()) {
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
          <h3 className="text-xl font-semibold text-white">Submit Transfer Request</h3>
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

          {/* Transfer Details Section */}
          <div className="grid grid-cols-2 gap-4">
            {/* From Platform */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">From Platform</label>
              <select
                className="w-full bg-[#252b3b] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                value={fromPlatform}
                onChange={(e) => {
                  setFromPlatform(e.target.value);
                  setFromUsername(getPlatformUsername(e.target.value));
                  if (e.target.value === toPlatform) {
                    setToPlatform('');
                  }
                }}
              >
                <option value="">Select platform...</option>
                {platforms.map((platform) => (
                  <option key={platform} value={platform}>{platform}</option>
                ))}
              </select>
            </div>

            {/* From Username */}
            <div className="space-y-2">
              <GameUsernameField
                value={fromUsername}
                onChange={setFromUsername}
                platform={fromPlatform}
                vipCode={selectedPlayer?.vipCode || ""}
              />
            </div>

            {/* Divider */}
            <div className="col-span-2 my-4 border-t border-gray-800"></div>

            {/* To Platform */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">To Platform</label>
              <select
                className="w-full bg-[#252b3b] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                value={toPlatform}
                onChange={(e) => setToPlatform(e.target.value)}
              >
                <option value="">Select platform...</option>
                {platforms
                  .filter(platform => platform !== fromPlatform)
                  .map((platform) => (
                    <option key={platform} value={platform}>{platform}</option>
                ))}
              </select>
            </div>

            {/* To Username */}
            <div className="space-y-2">
              <GameUsernameField
                value={toUsername}
                onChange={setToUsername}
                platform={toPlatform}
                vipCode={selectedPlayer?.vipCode || ""}
              />
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Amount</label>
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

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Notes</label>
            <textarea
              className="w-full bg-[#252b3b] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter any additional notes..."
              rows={1}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-800">
          {error && (
            <div className="flex-1 text-red-500 text-sm">
              {error}
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
            disabled={isSubmitting || !selectedPlayer || !fromPlatform || !fromUsername || !toPlatform || !toUsername || !loadAmount || !validateEntAccess(selectedPlayer)}
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

export default TransferModal; 