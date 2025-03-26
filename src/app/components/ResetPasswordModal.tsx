"use client"
import React, { useState } from 'react';
import { X, Key, Loader2 } from 'lucide-react';
import PlayerSearch, { Player } from './PlayerSearch';
import GameUsernameField from './GameUsernameField';
import { supabase } from '@/lib/supabase';
import { convertEntFormat } from '@/utils/entFormat';
import { EntType } from '@/supabase/types';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ResetPasswordRequest) => Promise<void>;
  user: {
    name: string;
    department: string;
    ent_access?: EntType[];
  };
}

interface ResetPasswordRequest {
  playerId: string;
  playerName: string;
  suggestedUsername: string;
  platform: string;
  newPassword: string;
  additionalMessage: string;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ isOpen, onClose, onSubmit, user }) => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [formData, setFormData] = useState<ResetPasswordRequest>({
    playerId: '',
    playerName: '',
    suggestedUsername: '',
    platform: '',
    newPassword: '',
    additionalMessage: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Add validation for ENT access
  const validateEntAccess = (player: Player | null) => {
    if (!player || !user.ent_access) return false;
    return convertEntFormat.hasEntAccess(user, player.team);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      // Create reset password request in Supabase
      const { data: resetData, error: resetError } = await supabase
        .from('reset_password_requests')
        .insert([{
          vip_code: selectedPlayer.vipCode,
          player_name: selectedPlayer.playerName,
          messenger_id: selectedPlayer.messengerId,
          team_code: selectedPlayer.team,
          game_platform: formData.platform,
          suggested_username: formData.suggestedUsername,
          status: 'pending',
          additional_message: formData.additionalMessage,
          manychat_data: selectedPlayer,
          agent_name: user.name,
          agent_department: user.department,
          init_by: 'agent'
        }])
        .select()
        .single();

      if (resetError) throw resetError;

      // Call the onSubmit callback with the data
      await onSubmit({
        playerId: selectedPlayer._id,
        playerName: selectedPlayer.playerName,
        suggestedUsername: formData.suggestedUsername,
        platform: formData.platform,
        newPassword: formData.newPassword,
        additionalMessage: formData.additionalMessage
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-lg border border-gray-800/20">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Key className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Reset Player Password</h3>
              <p className="text-sm text-gray-400">Fill in the details to reset player's password</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Player Search */}
          <PlayerSearch 
            onSelect={setSelectedPlayer} 
            selectedPlayer={selectedPlayer} 
            userEntAccess={user.ent_access}
          />

          {/* Platform */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Platform</label>
            <select
              value={formData.platform}
              onChange={(e) => {
                const platform = e.target.value;
                setFormData(prev => ({
                  ...prev,
                  platform,
                  suggestedUsername: getPlatformUsername(platform)
                }));
              }}
              className="w-full bg-[#252b3b] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              required
            >
              <option value="">Select Platform</option>
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

          {/* Suggested Username */}
          <GameUsernameField
            value={formData.suggestedUsername}
            onChange={(value) => setFormData(prev => ({ ...prev, suggestedUsername: value }))}
            platform={formData.platform}
            vipCode={selectedPlayer?.vipCode || ''}
          />

          {/* Additional Message */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Additional Message</label>
            <textarea
              value={formData.additionalMessage}
              onChange={(e) => setFormData(prev => ({ ...prev, additionalMessage: e.target.value }))}
              className="w-full bg-[#252b3b] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 min-h-[100px]"
              placeholder="Enter any additional information..."
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-500/10 p-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedPlayer || !formData.platform || !formData.suggestedUsername || !validateEntAccess(selectedPlayer)}
              className="px-4 py-2 text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                transition-all duration-200 transform hover:scale-105 active:scale-95 
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  Submit Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordModal; 