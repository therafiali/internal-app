import { useState, useEffect } from 'react';
import Image from 'next/image';

interface PlayerImageProps {
  id?: string;
  width?: number;
  height?: number;
}

export const PlayerImage = ({ id, width = 100, height = 100 }: PlayerImageProps) => {
  const [profilePic, setProfilePic] = useState<string>('');

  useEffect(() => {
    const fetchPlayerData = async () => {
      if (!id) {
        setProfilePic('');
        return;
      }

      try {
        const response = await fetch(
          `https://qgixcznoxktrxdcytyxo.supabase.co/rest/v1/redeem_requests?select=player_data&id=eq.${id}`,
          {
            headers: {
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
            }
          }
        );
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0 && data[0].player_data?.profile?.profilePic) {
          setProfilePic(data[0].player_data.profile.profilePic);
        } else {
          console.log("No profile picture found for ID:", id);
          setProfilePic('');
        }
      } catch (error) {
        console.error('Error fetching player data:', error);
        setProfilePic('');
      }
    };

    fetchPlayerData();
  }, [id]);

  if (!id || !profilePic) return null;
  
  return (
    <div className="relative">
      <Image
        src={profilePic}
        alt="Player profile"
        width={width}
        height={height}
        className="rounded-full object-cover"
      />
    </div>
  );
}; 