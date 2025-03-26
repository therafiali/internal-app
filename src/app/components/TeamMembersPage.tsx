import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { User, EntType } from '@/supabase/types';
import Image from 'next/image';
import { 
  UsersIcon, 
  UserCircleIcon,
  EnvelopeIcon,
  IdentificationIcon,
  ClockIcon,
  CheckCircleIcon,
  MinusCircleIcon,
  PencilSquareIcon,
  KeyIcon,
  NoSymbolIcon,
  CheckIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowUpTrayIcon,
  BuildingOfficeIcon as Building,
  XMarkIcon as X,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { LogOutIcon } from 'lucide-react';

interface TeamMember extends User {
  last_active?: string;
  user_profile_pic?: string | null;
  last_login?: string | null;
}

interface EditModalProps {
  member: TeamMember;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { role: string; profile_pic?: File; ent_access: EntType[]; ent_section?: EntType }) => Promise<void>;
  currentUser: User | null;
}

const EditModal: React.FC<EditModalProps> = ({ member, isOpen, onClose, onSave, currentUser }) => {
  const [role, setRole] = useState(member.role);
  const [loading, setLoading] = useState(false);
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(member.user_profile_pic || null);
  const [entAccess, setEntAccess] = useState<EntType[]>(member.ent_access || []);
  const [entSection, setEntSection] = useState<EntType | undefined>(member.ent_section as EntType | undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setProfilePic(file);
    }
  };

  const handleEntAccessChange = (ent: EntType) => {
    if (member.role === 'Agent') {
      // For agents, only allow single ENT selection
      setEntAccess([ent]);
      setEntSection(ent);
    } else {
      // For others, allow multiple selection
      const newEntAccess = entAccess.includes(ent)
        ? entAccess.filter(e => e !== ent)
        : [...entAccess, ent];
      
      if (newEntAccess.length === 0) {
        toast.error('At least one ENT must be selected');
        return;
      }

      setEntAccess(newEntAccess);
      if (member.role === 'Shift Incharge') {
        setEntSection(newEntAccess[0]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSave({ 
      role, 
      profile_pic: profilePic || undefined,
      ent_access: entAccess,
      ent_section: member.role === 'Agent' || member.role === 'Shift Incharge' ? entSection : undefined 
    });
    setLoading(false);
    onClose();
  };

  const ENT_OPTIONS: EntType[] = ['ENT1', 'ENT2', 'ENT3'];
  const isRestrictedRole = member.role === 'Agent';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-semibold mb-4">Edit User</h3>
        <form onSubmit={handleSubmit}>
          {/* Profile Picture Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-2">Profile Picture</label>
            <div className="flex items-center justify-center">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                {previewUrl ? (
                  <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-700">
                    <Image
                      src={previewUrl}
                      alt="Profile preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 
                    border-2 border-gray-700 flex flex-col items-center justify-center gap-2">
                    <ArrowUpTrayIcon className="w-6 h-6 text-gray-400" />
                    <span className="text-xs text-gray-400">Upload Photo</span>
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 
                  flex items-center justify-center transition-opacity">
                  <ArrowUpTrayIcon className="w-6 h-6 text-white" />
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">Click to upload a profile picture</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-gray-700 rounded-lg p-2 text-white"
            >
              <option value="Agent">Agent</option>
              <option value="Shift Incharge">Shift Incharge</option>
              {currentUser?.role === 'Executive' && (
                <option value="Manager">Manager</option>
              )}
            </select>
          </div>

          {/* ENT Access Section */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">ENT Access</label>
            {isRestrictedRole ? (
              <select
                value={entSection || ''}
                onChange={(e) => {
                  const selectedEnt = e.target.value as EntType;
                  setEntSection(selectedEnt);
                  setEntAccess(selectedEnt ? [selectedEnt] : []);
                }}
                className="w-full bg-gray-700 rounded-lg p-2 text-white"
              >
                <option value="">Select ENT Section</option>
                {ENT_OPTIONS.map(ent => (
                  <option key={ent} value={ent}>{ent}</option>
                ))}
              </select>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {entAccess.map(ent => (
                    <div
                      key={ent}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                        ${member.role === 'Shift Incharge' && ent === entSection
                          ? 'bg--500/20 text-teal-400 border border-teal-500/20'
                          : 'bg-sky-500/20 text-sky-400 border border-sky-500/20'}`}
                    >
                      <span>{ent}</span>
                      <button
                        type="button"
                        onClick={() => handleEntAccessChange(ent)}
                        className="hover:text-white p-1 hover:bg-gray-800/50 rounded"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {ENT_OPTIONS.filter(ent => !entAccess.includes(ent as EntType)).map(ent => (
                    <button
                      key={ent}
                      type="button"
                      onClick={() => handleEntAccessChange(ent as EntType)}
                      className="flex items-center gap-2 text-gray-400 hover:text-white px-3 py-2 rounded-lg text-sm
                        hover:bg-gray-800/50 transition-colors border border-gray-800"
                    >
                      <Building className="h-4 w-4" />
                      <span>{ent}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ProfilePicModalProps {
  member: TeamMember;
  isOpen: boolean;
  onClose: () => void;
  onSave: (file: File) => Promise<void>;
}

const ProfilePicModal: React.FC<ProfilePicModalProps> = ({ member, isOpen, onClose, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(member.user_profile_pic || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setProfilePic(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profilePic) return;
    
    setLoading(true);
    try {
      await onSave(profilePic);
      toast.success('Profile picture updated successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to update profile picture');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-white">Update Profile Picture</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              {previewUrl ? (
                <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-gray-700">
                  <Image
                    src={previewUrl}
                    alt="Profile preview"
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 
                  border-2 border-gray-700 flex flex-col items-center justify-center gap-2">
                  <ArrowUpTrayIcon className="w-8 h-8 text-gray-400" />
                  <span className="text-sm text-gray-400">Upload Photo</span>
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 
                flex items-center justify-center transition-opacity">
                <ArrowUpTrayIcon className="w-8 h-8 text-white" />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="text-sm text-gray-400">Click to upload a new profile picture</p>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!profilePic || loading}
              className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-400 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Picture'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Add this new component for the confirmation modal
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  confirmColor: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  confirmColor
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm">
        <h3 className="text-xl font-semibold mb-4">{title}</h3>
        <p className="text-gray-300 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 rounded-lg ${confirmColor}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const TeamMembersPage = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [profilePicMember, setProfilePicMember] = useState<TeamMember | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    userId: string;
    currentStatus: string;
  }>({ isOpen: false, userId: '', currentStatus: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const ITEMS_PER_PAGE = 9;

  // Role priority order
  const rolePriority: { [key: string]: number } = {
    'Admin': 1,
    'Executive': 2,
    'Manager': 3,
    'Shift Incharge': 4,
    'Agent': 5
  };

  // Sort function for team members
  const sortByRole = (a: TeamMember, b: TeamMember) => {
    return (rolePriority[a.role] || 999) - (rolePriority[b.role] || 999);
  };

  // Add this new function to format time difference
  const formatTimeDifference = (startTime: string) => {
    const start = new Date(startTime);
    const diff = Math.floor((currentTime.getTime() - start.getTime()) / 1000); // difference in seconds
    
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    
    return hours > 0 
      ? `${hours}h ${minutes}m ${seconds}s`
      : `${minutes}m ${seconds}s`;
  };

  // Modify the getElapsedTime function
  const getElapsedTime = (timestamp: string | null, isOnlineTime = false) => {
    if (!timestamp) return { text: 'Never', color: 'text-gray-400' };
    
    const date = new Date(timestamp);
    const hours = Math.abs(currentTime.getTime() - date.getTime()) / 3600000;

    // For online users, return timer format
    if (isOnlineTime) {
      return { 
        text: formatTimeDifference(timestamp),
        color: 'text-green-400'
      };
    }

    // For offline users, keep the existing format
    const elapsed = formatDistanceToNow(date, { addSuffix: true });
    
    if (hours < 1) {
      return { text: elapsed, color: 'text-green-400' };
    } else if (hours < 24) {
      return { text: elapsed, color: 'text-yellow-400' };
    } else if (hours < 72) {
      return { text: elapsed, color: 'text-orange-400' };
    } else {
      return { text: elapsed, color: 'text-red-400' };
    }
  };

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          setError('Failed to fetch user data');
          return;
        }

        setCurrentUser(userData);
      }
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const fetchTeamMembers = async () => {
      try {
        let query = supabase
          .from('users')
          .select('*')
          .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1)
          .order('created_at', { ascending: false });

        if (currentUser.role === 'Shift Incharge' && currentUser.department === 'Support') {
          query = query
            .eq('department', 'Support')
            .eq('role', 'Agent')
            .in('ent_section', currentUser.ent_access || []);
        } else if (currentUser.role === 'Manager') {
          query = query
            .eq('department', currentUser.department)
            .in('role', ['Agent', 'Shift Incharge', 'Manager']);
        } else if (['Admin', 'Executive'].includes(currentUser.role)) {
          // No additional filters needed for Admin and Executive
        } else {
          setError('Unauthorized access');
          return;
        }

        const { data, error: fetchError, count } = await query;

        if (fetchError) {
          setError('Failed to fetch team members');
          return;
        }

        // Update hasMore based on whether we have more items
        setHasMore(data && data.length === ITEMS_PER_PAGE);

        // If it's the first page, replace the data, otherwise append
        if (page === 1) {
          setTeamMembers(data || []);
        } else {
          setTeamMembers(prev => [...prev, ...(data || [])]);
        }

        setLoading(false);
      } catch (err) {
        setError('An error occurred while fetching team members');
        setLoading(false);
      }
    };

    fetchTeamMembers();

    // Set up presence channel subscription with heartbeat
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: currentUser.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const onlineUserIds = new Set(
          Object.keys(newState) // Use keys directly as they represent user IDs
        );
        setOnlineUsers(onlineUserIds);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track presence for current user with a heartbeat
          await channel.track({
            online_at: new Date().toISOString(),
            user_id: currentUser.id
          });
        }
      });

    // Set up heartbeat to maintain presence
    const heartbeat = setInterval(async () => {
      await channel.track({
        online_at: new Date().toISOString(),
        user_id: currentUser.id
      });
    }, 30000); // Send heartbeat every 30 seconds

    // Cleanup subscriptions and heartbeat on unmount
    return () => {
      clearInterval(heartbeat);
      channel.unsubscribe();
    };
  }, [currentUser, page]);

  useEffect(() => {
    // Timer for updating timestamps every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Add function to load more data
  const loadMore = () => {
    setLoadingMore(true);
    setPage(prev => prev + 1);
    setLoadingMore(false);
  };

  // Reset pagination when search query changes
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    setTeamMembers([]);
  }, [searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-black">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-black">
        <div className="text-red-500 bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20">
          {error}
        </div>
      </div>
    );
  }

  // Filter and sort members by status and role
  const activeMembers = teamMembers
    .filter(member => 
      member.status !== 'disabled' && 
      onlineUsers.has(member.id) // This directly checks if user is in the presence channel
    )
    .sort(sortByRole);

  const offlineMembers = teamMembers
    .filter(member => 
      member.status !== 'disabled' && 
      !onlineUsers.has(member.id) // If not in presence channel, they're offline
    )
    .sort(sortByRole);

  const disabledMembers = teamMembers
    .filter(member => member.status === 'disabled')
    .sort(sortByRole);

  // Modified toggle user status function
  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) throw error;

      setTeamMembers(members =>
        members.map(member =>
          member.id === userId
            ? { ...member, status: newStatus }
            : member
        )
      );

      toast.success(`User ${newStatus === 'disabled' ? 'disabled' : 'enabled'} successfully`);
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  // Function to handle role update
  const handleRoleUpdate = async (userId: string, data: { role: string; profile_pic?: File }) => {
    try {
      // Get the user being edited
      const targetUser = teamMembers.find(member => member.id === userId);
      if (!targetUser) throw new Error('User not found');

      // Check permissions
      if (!currentUser) throw new Error('Not authenticated');
      
      // Admin and Executive can edit everyone
      if (['Admin', 'Executive'].includes(currentUser.role)) {
        // Allow the update
      }
      // Manager can only edit Agents and Shift Incharge
      else if (currentUser.role === 'Manager') {
        if (!['Agent', 'Shift Incharge'].includes(targetUser.role)) {
          throw new Error('Managers can only edit Agents and Shift Incharge');
        }
      }
      // Shift Incharge can only edit Agents
      else if (currentUser.role === 'Shift Incharge') {
        if (targetUser.role !== 'Agent') {
          throw new Error('Shift Incharge can only edit Agents');
        }
      }
      else {
        throw new Error('You do not have permission to edit this user');
      }

      let profilePicUrl = null;

      // Upload profile picture if exists
      if (data.profile_pic) {
        const fileName = `${Date.now()}-${data.profile_pic.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('profile-pictures')
          .upload(fileName, data.profile_pic);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('profile-pictures')
          .getPublicUrl(fileName);

        profilePicUrl = publicUrl;
      }

      // Update user data
      const { error } = await supabase
        .from('users')
        .update({
          role: data.role,
          ...(profilePicUrl && { user_profile_pic: profilePicUrl })
        })
        .eq('id', userId);

      if (error) throw error;

      setTeamMembers(members =>
        members.map(member =>
          member.id === userId
            ? { 
                ...member, 
                role: data.role,
                ...(profilePicUrl && { user_profile_pic: profilePicUrl })
              }
            : member
        )
      );

      toast.success('User updated successfully');
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update user');
    }
  };

  // Function to handle profile picture update
  const handleProfilePicUpdate = async (userId: string, file: File) => {
    try {
      // Get the user being edited
      const targetUser = teamMembers.find(member => member.id === userId);
      if (!targetUser) throw new Error('User not found');

      // Check permissions
      if (!currentUser) throw new Error('Not authenticated');
      
      const canEdit = targetUser.role === 'Shift Incharge' 
        ? ['Admin', 'Executive', 'Manager'].includes(currentUser.role)
        : ['Admin', 'Executive'].includes(currentUser.role) || 
          (currentUser.role === 'Manager' && ['Agent', 'Shift Incharge'].includes(targetUser.role));

      if (!canEdit) {
        throw new Error('You do not have permission to update this user\'s profile picture');
      }

      console.log('Starting profile picture update for user:', userId);

      // Convert file to base64
      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            console.log('File converted to base64 successfully');
            resolve(reader.result);
          }
        };
        reader.onerror = (error) => {
          console.error('Error reading file:', error);
          reject(error);
        };
        reader.readAsDataURL(file);
      });

      console.log('File converted to base64, updating user profile...');

      // Update the user's profile picture in the database
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          user_profile_pic: base64String,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating user profile:', updateError);
        throw new Error('Failed to update profile picture');
      }

      // Update local state
      setTeamMembers(members =>
        members.map(member =>
          member.id === userId
            ? { ...member, user_profile_pic: base64String }
            : member
        )
      );

      console.log('Profile picture updated successfully');
      toast.success('Profile picture updated successfully');
    } catch (error) {
      console.error('Profile picture update error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update profile picture');
      throw error;
    }
  };

  const handleEntUpdate = async (userId: string, data: { ent_access: EntType[]; ent_section?: EntType }) => {
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          ent_access: data.ent_access,
          ent_section: data.ent_section
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Update local state
      setTeamMembers(prev => prev.map(member => 
        member.id === userId
          ? { ...member, ent_access: data.ent_access, ent_section: data.ent_section }
          : member
      ));

      toast.success('ENT access updated successfully');
    } catch (error) {
      console.error('Error updating ENT access:', error);
      toast.error('Failed to update ENT access');
    }
  };

  const handleForceLogout = async (userId: string) => {
    try {
      // Send a custom broadcast message to notify the user to logout
      const channel = supabase.channel('online-users');
      await channel.send({
        type: 'broadcast',
        event: 'force_logout',
        payload: { user_id: userId }
      });

      // Update the sessions state
      setOnlineUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });

      toast.success('User has been forced to logout');
    } catch (error) {
      console.error('Error forcing logout:', error);
      toast.error('Failed to force logout user');
    }
  };

  const renderMemberCard = (member: TeamMember) => {
    const isOnline = onlineUsers.has(member.id);
    const lastLoginTime = member.last_login ? new Date(member.last_login) : null;

    // Check permissions for member actions
    const checkMemberPermissions = () => {
      if (!currentUser) return false;
      
      // Prevent actions on users with same role
      if (currentUser.role === member.role) return false;
      
      // Executive can manage everyone except Admin and other Executives
      if (currentUser.role === 'Executive') {
        return !['Admin', 'Executive'].includes(member.role);
      }
      
      // Admin can manage everyone
      if (currentUser.role === 'Admin') return true;
      
      // Manager can only manage Agents and Shift Incharge
      if (currentUser.role === 'Manager') {
        return ['Agent', 'Shift Incharge'].includes(member.role);
      }
      
      // Shift Incharge can only manage Agents
      if (currentUser.role === 'Shift Incharge') {
        return member.role === 'Agent';
      }
      
      return false;
    };

    // Check if current user can edit this member
    const canEditMember = () => checkMemberPermissions();

    // Show status toggle for users with edit permission
    const showStatusToggle = canEditMember();

    // Check if current user can force logout this member
    const canForceLogout = () => checkMemberPermissions();

    const lastLoginElapsed = getElapsedTime(member.last_login || null, isOnline);

    return (
      <div className="bg-gray-800 rounded-xl p-6 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent"></div>
        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                {member.user_profile_pic ? (
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-gray-700">
                    <Image
                      src={member.user_profile_pic}
                      alt={member.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                    <UserCircleIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800
                  ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`}>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-white">{member.name}</h3>
                <div className="flex items-center text-xs text-gray-400">
                  {member.role}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {canEditMember() && (
                <button
                  onClick={() => setEditingMember(member)}
                  className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                  title="Edit Member"
                >
                  <PencilSquareIcon className="w-5 h-5" />
                </button>
              )}
              {isOnline ? (
                // Show force logout button only for online users if user has permission
                canForceLogout() && (
                  <button
                    onClick={() => handleForceLogout(member.id)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400"
                    title="Force Logout"
                  >
                    <LogOutIcon className="w-4 h-4" />
                  </button>
                )
              ) : (
                // Show disable/enable button only for offline users if user has permission
                showStatusToggle && (
                  <button
                    onClick={() => setConfirmationModal({
                      isOpen: true,
                      userId: member.id,
                      currentStatus: member.status || 'active'
                    })}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm ${
                      member.status === 'active'
                        ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                        : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                    }`}
                    title={member.status === 'active' ? 'Disable User' : 'Enable User'}
                  >
                    {member.status === 'active' ? (
                      <NoSymbolIcon className="w-4 h-4" />
                    ) : (
                      <CheckIcon className="w-4 h-4" />
                    )}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="space-y-2">
            {isOnline ? (
              <div className="flex items-center text-xs font-semibold mt-1">
                <ClockIcon className="w-3 h-3 mr-1" />
                <span className="text-green-400">
                  Online now
                </span>
              </div>
            ) : (
              <>
                {member.last_login && (
                  <div className="flex items-center text-xs font-semibold mt-1">
                    <ClockIcon className="w-3 h-3 mr-1" />
                    <span className="text-gray-400">
                      Last login: {formatDistanceToNow(new Date(member.last_login), { addSuffix: true })}
                    </span>
                  </div>
                )}
              </>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {member.ent_access?.map((ent) => {
                const isPrimary = (member.role === 'Shift Incharge' || member.role === 'Agent') && 
                                 ent === member.ent_section;
                return (
                  <span
                    key={ent}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium
                      ${isPrimary 
                        ? 'bg-sky-500/20 text-sky-400 border border-sky-500/20' 
                        : 'bg-sky-500/20 text-sky-400 border border-sky-500/20'}`}
                  >
                    {ent}
                    {isPrimary && (
                      <span className="" />
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Filter members based on search query
  const filteredMembers = teamMembers.filter(member => {
    const searchableFields = [member.name, member.role, ...(member.ent_access || [])];
    return searchableFields.some(field =>
      field.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Separate filtered members into online, offline, and disabled
  const filteredActiveMembers = filteredMembers
    .filter(member => member.status !== 'disabled' && member.user_activity)
    .sort(sortByRole);

  const filteredOfflineMembers = filteredMembers
    .filter(member => member.status !== 'disabled' && !member.user_activity)
    .sort(sortByRole);

  const filteredDisabledMembers = filteredMembers
    .filter(member => member.status === 'disabled')
    .sort(sortByRole);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Title and Search Section */}
      <div className="mb-12">
        <div className="flex flex-col space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Team Members
            </h1>
          </div>
          
          <div className="relative max-w-2xl mx-auto w-full">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-blue-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, role, or ENT..."
              className="block w-full pl-12 pr-4 py-3 border-2 border-gray-700/50 rounded-2xl 
                bg-gray-800/50 backdrop-blur-sm text-white placeholder-gray-400 
                transition-all duration-300
                focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50
                hover:border-gray-600/50 hover:bg-gray-800/80"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Show "No results found" message if no members match the search */}
      {filteredMembers.length === 0 && (
        <div className="text-center text-gray-400">
          No results found
        </div>
      )}

      {/* Active Members Section */}
      {filteredActiveMembers.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <h2 className="text-lg font-semibold text-white">Online Members</h2>
            </div>
            <span className="text-sm text-gray-400">({filteredActiveMembers.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredActiveMembers.map(member => (
              <div key={member.id}>
                {renderMemberCard(member)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Offline Members Section */}
      {filteredOfflineMembers.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-500"></div>
              <h2 className="text-lg font-semibold text-white">Offline Members</h2>
            </div>
            <span className="text-sm text-gray-400">({filteredOfflineMembers.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOfflineMembers.map(member => (
              <div key={member.id}>
                {renderMemberCard(member)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disabled Members Section */}
      {filteredDisabledMembers.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <h2 className="text-lg font-semibold text-white">Disabled Members</h2>
            </div>
            <span className="text-sm text-gray-400">({filteredDisabledMembers.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDisabledMembers.map(member => (
              <div key={member.id}>
                {renderMemberCard(member)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Show More Button */}
      {hasMore && !loadingMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={loadMore}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg 
              transition-colors duration-200 flex items-center gap-2"
          >
            <span>Show More</span>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Loading More Indicator */}
      {loadingMore && (
        <div className="flex justify-center mt-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal({ isOpen: false, userId: '', currentStatus: '' })}
        onConfirm={() => toggleUserStatus(confirmationModal.userId, confirmationModal.currentStatus)}
        title={confirmationModal.currentStatus === 'active' ? 'Disable User' : 'Enable User'}
        message={confirmationModal.currentStatus === 'active' 
          ? 'Are you sure you want to disable this user? They will be moved to the disabled section and won\'t be able to access the system.'
          : 'Are you sure you want to enable this user? They will be able to access the system again.'}
        confirmText={confirmationModal.currentStatus === 'active' ? 'Disable' : 'Enable'}
        confirmColor={confirmationModal.currentStatus === 'active' 
          ? 'bg-red-500 hover:bg-red-600 text-white' 
          : 'bg-green-500 hover:bg-green-600 text-white'}
      />

      {editingMember && (
        <EditModal
          member={editingMember}
          isOpen={true}
          onClose={() => setEditingMember(null)}
          onSave={(data) => handleRoleUpdate(editingMember.id, data)}
          currentUser={currentUser}
        />
      )}

      {profilePicMember && (
        <ProfilePicModal
          member={profilePicMember}
          isOpen={true}
          onClose={() => setProfilePicMember(null)}
          onSave={(file) => handleProfilePicUpdate(profilePicMember.id, file)}
        />
      )}
    </div>
  );
};

export default TeamMembersPage;