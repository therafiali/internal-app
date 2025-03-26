import { useState, useEffect } from 'react';

interface RedeemIdDisplayProps {
  id?: string;
}

export const RedeemIdDisplay = ({ id }: RedeemIdDisplayProps) => {
  const [redeemId, setRedeemId] = useState('');

  useEffect(() => {
    const fetchRedeemId = async () => {
      if (!id) {
        setRedeemId('');
        return;
      }

      try {
        console.log("Fetching redeem ID for:", id);
        const response = await fetch(
          `https://qgixcznoxktrxdcytyxo.supabase.co/rest/v1/redeem_requests?select=redeem_id&id=eq.${id}`,
          {
            headers: {
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
            }
          }
        );
        const data = await response.json();
        console.log("API Response for ID", id, ":", data);
        
        if (Array.isArray(data) && data.length > 0) {
          console.log("Found redeem_id:", data[0].redeem_id);
          setRedeemId(data[0].redeem_id);
        } else {
          console.log("No redeem_id found for ID:", id);
          setRedeemId('Not found');
        }
      } catch (error) {
        console.error('Error fetching redeem ID:', error);
        setRedeemId('Error');
      }
    };

    fetchRedeemId();
  }, [id]);

  if (!id) return null;
  
  return <span title={`ID: ${id}`}>{redeemId || 'Loading...'}</span>;
}; 