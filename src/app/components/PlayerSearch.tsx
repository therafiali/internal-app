"use client";
import React, { useState, useEffect } from "react";
import { Search, Loader2, X } from "lucide-react";
import Image from "next/image";
import Cookies from "js-cookie";
import { supabase } from "@/lib/supabase";
import { EntType } from "@/supabase/types";
import { convertEntFormat } from "@/utils/entFormat";

export interface Player {
  _id: string;
  vipCode: string;
  playerName: string;
  team: string;
  status: string;
  messengerId: string;
  profile?: {
    profilePic?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
  };
  gameLimits?: {
    [key: string]: {
      totalLimit: number;
      totalRedeemed: number;
      pendingAmount: number;
      remainingLimit: number;
      lastUpdated: string;
    };
  };
  platforms?: {
    firekirin_username?: string;
    juwa_username?: string;
    orionstars_username?: string;
  };
  key?: string;
  id?: string;
  page_id?: string;
  user_refs?: string[];
  first_name?: string;
  last_name?: string;
  name?: string;
  gender?: string;
  locale?: string;
  language?: string;
  timezone?: string;
  live_chat_url?: string;
  last_input_text?: string;
  optin_phone?: boolean;
  phone?: string | null;
  optin_email?: boolean;
  email?: string | null;
  subscribed?: string;
  last_interaction?: string;
  last_seen?: string | null;
  is_followup_enabled?: boolean;
}

interface PlayerSearchProps {
  onSelect: (player: Player | null) => void;
  selectedPlayer: Player | null;
  userEntAccess?: EntType[];
}

const PlayerSearch: React.FC<PlayerSearchProps> = ({
  onSelect,
  selectedPlayer,
  userEntAccess,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchPlayers = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert user's ENT access to database format for filtering
      const userEntAccessDb = userEntAccess ? convertEntFormat.arrayToDb(userEntAccess) : [];

      // Search in players table using ilike for case-insensitive search
      let supabaseQuery = supabase
        .from('players')
        .select(`
          id,
          vip_code,
          player_name,
          profile,
          game_usernames,
          team,
          status,
          messenger_id
        `)
        .or(`player_name.ilike.%${searchTerm}%,vip_code.ilike.%${searchTerm}%`);

      // Add ENT access filter if user has restricted access
      if (userEntAccess && userEntAccess.length > 0) {
        supabaseQuery = supabaseQuery.in('team', userEntAccessDb);
      }

      const { data, error: searchError } = await supabaseQuery.limit(5);

      if (searchError) throw searchError;

      // Transform the data to match the Player interface
      const transformedPlayers: Player[] = (data || []).map(player => ({
        _id: player.id,
        vipCode: player.vip_code,
        playerName: player.player_name,
        profile: player.profile,
        platforms: {
          firekirin_username: player.game_usernames?.fireKirin,
          juwa_username: player.game_usernames?.juwa,
          orionstars_username: player.game_usernames?.orionStars
        },
        team: player.team,
        status: player.status,
        messengerId: player.messenger_id
      }));

      setSearchResults(transformedPlayers);
    } catch (err) {
      console.error('Error searching players:', err);
      setError('Failed to search players');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchPlayers(searchQuery);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-400">Search Player</label>
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          size={18}
        />
        <input
          type="text"
          className="w-full bg-[#252b3b] border border-gray-800 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
          placeholder="Search by VIP code, name, or team..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={!!selectedPlayer || isLoading}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      <div className="relative">
        {/* Search Results */}
        {searchQuery && !selectedPlayer && (
          <div className="absolute z-10 left-0 right-0 mt-2 bg-[#252b3b] border border-gray-800 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="py-2">
                {searchResults.map((player) => (
                  <button
                    key={player._id}
                    onClick={() => {
                      onSelect(player);
                      setSearchQuery("");
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      {player.profile?.profilePic ? (
                        <Image
                          src={player.profile.profilePic}
                          alt={player.playerName}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                          <span className="text-blue-500 font-medium">
                            {player.playerName.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-white">
                        {player.playerName}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                        <span>{player.vipCode}</span>
                        <span>•</span>
                        <span> {player.team}</span>
                        <span>•</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs capitalize ${
                            player.status === "active"
                              ? "bg-green-500/10 text-green-500"
                              : "bg-red-500/10 text-red-500"
                          }`}
                        >
                          {player.status}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-sm text-gray-400 text-center">
                No players found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Player Card */}
      {selectedPlayer && (
        <div className="mt-2 p-4 bg-[#252b3b] rounded-lg border border-gray-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedPlayer.profile?.profilePic ? (
                <Image
                  src={selectedPlayer.profile.profilePic}
                  alt={selectedPlayer.playerName}
                  width={48}
                  height={48}
                  className="rounded-full"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <span className="text-blue-500 font-medium text-lg">
                    {selectedPlayer.playerName.charAt(0)}
                  </span>
                </div>
              )}
              <div>
                <div className="text-white font-medium">
                  {selectedPlayer.playerName}
                </div>
                <div className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                  <span>{selectedPlayer.vipCode}</span>
                  <span>•</span>
                  <span>{selectedPlayer.team}</span>
                  <span>•</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs capitalize
                       ${
                      selectedPlayer.status === "active"
                        ? "bg-green-500/10 text-green-500"
                        : "bg-red-500/10 text-red-500"
                    }`}
                  >
                    {selectedPlayer.status}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => onSelect(null)}
              className="p-2 text-gray-400 hover:text-white transition-colors hover:bg-gray-800/50 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerSearch;
