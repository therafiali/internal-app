'use client'
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface GameUsernameFieldProps {
  value: string;
  onChange: (value: string) => void;
  platform: string;
  vipCode: string;
  className?: string;
}

const GameUsernameField: React.FC<GameUsernameFieldProps> = ({
  value,
  onChange,
  platform,
  vipCode,
  className = ''
}) => {
  const [suggestedUsername, setSuggestedUsername] = useState('');
  const [hasHistory, setHasHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchSuggestedUsername = async () => {
      if (!platform || !vipCode) return;

      setIsLoading(true);
      try {
        // Get the player's data from Supabase
        const { data: playerData, error } = await supabase
          .from('players')
          .select('game_usernames')
          .eq('vip_code', vipCode)
          .single();

        if (error) throw error;

        // Map platform names to game_usernames keys
        const platformToKey: { [key: string]: keyof typeof playerData.game_usernames } = {
          'Fire Kirin': 'fireKirin',
          'Game Vault': 'gameVault',
          'Orion Stars': 'orionStars',
          'Juwa': 'juwa',
          'Moolah': 'moolah',
          'Panda Master': 'pandaMaster',
          'Yolo': 'yolo',
          'VBlink': 'vblink',
          'Vegas Sweeps': 'vegasSweeps',
          'Ultra Panda': 'ultraPanda'
          // Add more mappings as needed
        };

        const key = platformToKey[platform];
        if (key && playerData.game_usernames) {
          const username = playerData.game_usernames[key];
          if (username) {
            setSuggestedUsername(username);
            setHasHistory(true);
            
            // If there's a suggested username and the current value is empty, auto-fill it
            if (!value) {
              onChange(username);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching suggested username:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestedUsername();
  }, [platform, vipCode, value, onChange]);

  return (
    <div className="space-y-2">
      <label className="text-sm text-gray-400">Game Username</label>
      <div className="relative">
        <input
          type="text"
          className={`w-full bg-[#252b3b] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 ${className}`}
          placeholder={isLoading ? "Loading suggestions..." : "Enter game username..."}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>
      {hasHistory && suggestedUsername && !value && (
        <p className="text-xs text-blue-500">
          Suggested username based on history: {suggestedUsername}
        </p>
      )}
    </div>
  );
};

export default GameUsernameField; 