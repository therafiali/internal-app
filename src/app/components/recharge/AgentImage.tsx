import { useState, useEffect } from 'react';
import Image from 'next/image';

interface AgentImageProps {
  id?: string;
  width?: number;
  height?: number;
}

interface AgentData {
  user_profile_pic: string;
  name: string;
  employee_code: string;
}

export const AgentImage = ({ id, width = 30, height = 30 }: AgentImageProps) => {
  const [agentData, setAgentData] = useState<AgentData | null>(null);

  useEffect(() => {
    const fetchAgentData = async () => {
      if (!id) {
        setAgentData(null);
        return;
      }

      try {
        const response = await fetch(
          `https://qgixcznoxktrxdcytyxo.supabase.co/rest/v1/users?select=name,employee_code&id=eq.${id}`,
          {
            headers: {
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
            }
          }
        );
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
          setAgentData({
            user_profile_pic: data[0].user_profile_pic,
            name: data[0].name,
            employee_code: data[0].employee_code
          });
        } else {
          console.log("No agent data found for ID:", id);
          setAgentData(null);
        }
      } catch (error) {
        console.error('Error fetching agent data:', error);
        setAgentData(null);
      }
    };

    fetchAgentData();
  }, [id]);

  if (!id || !agentData) return <div className="flex flex-col">
    <span className="text-sm text-gray-300">Loading...</span>
  </div>
  
  return (
    <div className="flex items-center gap-2">
      {/* <div className="relative">
        <Image
          src={agentData.user_profile_pic || 'https://cdn.pixabay.com/photo/2018/11/13/22/01/avatar-3814081_960_720.png'}
          alt={`${agentData.name}'s profile`}
          width={width}
          height={height}
          className="rounded-full object-cover"
        />
      </div> */}
      <div className="flex flex-col">
        <span className="text-sm text-gray-300">{agentData.name}</span>
        <span className="text-xs text-gray-300">{agentData.employee_code}</span>
      </div>
    </div>
  );
}; 