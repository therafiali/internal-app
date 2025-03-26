import { useState, useEffect } from 'react';
import Image from 'next/image';

const DEFAULT_PROFILE_PIC = "https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_1280.png";

const UserProfile = ({ user }: { user: any }) => {
  const [userProfilePicUrl, setUserProfilePicUrl] = useState<string>(DEFAULT_PROFILE_PIC);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debug log for user prop
  useEffect(() => {
    console.log('==========================================');
    console.log('UserProfile Component Mounted');
    console.log('User prop received:', user);
    console.log('Employee code:', user?.employee_code);
    console.log('==========================================');
  }, [user]);

  useEffect(() => {
    const fetchUserProfilePic = async () => {
      console.log('🔄 Starting profile picture fetch...');
      
      try {
        if (!user) {
          throw new Error('No user data provided');
        }

        if (!user.employee_code) {
          throw new Error('No employee code found');
        }

        const apiUrl = `https://qgixcznoxktrxdcytyxo.supabase.co/rest/v1/users?select=user_profile_pic&employee_code=eq.${user.employee_code}`;
        console.log('🌐 Fetching from URL:', apiUrl);

        const res = await fetch(apiUrl);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        console.log('📦 Received data:', data);
        
        const profilePic = data[0]?.user_profile_pic;
        console.log('🖼️ Profile picture URL:', profilePic);

        if (profilePic && typeof profilePic === 'string' && profilePic.trim() !== '') {
          console.log('✅ Setting valid profile picture URL');
          setUserProfilePicUrl(profilePic);
          setError(null);
        } else {
          throw new Error('No valid profile picture URL found');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('❌ Error:', errorMessage);
        setError(errorMessage);
        setUserProfilePicUrl(DEFAULT_PROFILE_PIC);
      } finally {
        setIsLoading(false);
        console.log('🏁 Profile picture fetch completed');
        console.log('==========================================');
      }
    };

    fetchUserProfilePic();
  }, [user]);

  if (isLoading) {
    return <div className="h-8 w-8 rounded-full bg-blue-500/10" />;
  }

  // Debug log for render
  console.log('🎨 Rendering with URL:', userProfilePicUrl);

  return (
    <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
      <Image 
        src={userProfilePicUrl}
        alt={`${user?.name || 'User'}'s Profile`}
        width={40} 
        height={40} 
        className="rounded-full"
        onError={(e) => {
          console.error('🚫 Image failed to load:', userProfilePicUrl);
          setUserProfilePicUrl(DEFAULT_PROFILE_PIC);
        }}
      />
      {error && (
        <div className="hidden">Error: {error}</div> // Hidden error for debugging
      )}
    </div>
  );
};

export default UserProfile;
