"use client"
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import { AdminHeader } from '@/app/components/Headers'
import { Pencil, ShieldBan } from 'lucide-react'


export interface User {
  name: string;
  email: string;
  department: string;
  role: string;
}

export interface CompanyTag {
  _id: string;
  cId: string;
  name: string;
  cashtag: string;
  type: string;
  pin: string;
  email: string;
  procuredBy: {
    _id: string;
    email: string;
    name: string;
    department: string;
  };
  balance: number;
  limit: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  success: boolean;
  data: {
    companyTags: CompanyTag[];
    pagination: {
      total: number;
      totalPages: number;
      currentPage: number;
      limit: number;
    };
  };
}

interface TagStats {
  active: number;
  paused: number;
  disabled: number;
}

const AdminCashtagsPage = () => {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState<'Active Tags' | 'Paused Tags' | 'Disabled Tags'>('Active Tags')
  const [showAddTagModal, setShowAddTagModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tags, setTags] = useState<CompanyTag[]>([]);
  const [tagStats, setTagStats] = useState<TagStats>({
    active: 0,
    paused: 0,
    disabled: 0
  });



  const [showEditModal, setShowEditModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [selectedTag, setSelectedTag] = useState<CompanyTag | null>(null);

  const [cashtagError, setCashtagError] = useState('');

  useEffect(() => {
    const token = Cookies.get('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      if (parsedUser.department !== 'Admin') {
        router.push('/login')
        return
      }
      setUser(parsedUser)
      fetchTags() // Fetch tags after user is authenticated
    } catch (error) {
      console.error('Error parsing user data:', error)
      router.push('/login')
    }
  }, [router])

  const fetchTags = async () => {
    try {
      setLoading(true);
      const token = Cookies.get('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/companytag/get-all-company-tags`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data: ApiResponse = await response.json();
      setTags(data.data.companyTags);

      // Calculate stats from the fetched data
      const stats = data.data.companyTags.reduce((acc, tag) => {
        switch (tag.status) {
          case 'active':
            acc.active++;
            break;
          case 'paused':
            acc.paused++;
            break;
          case 'disabled':
            acc.disabled++;
            break;
        }
        return acc;
      }, { active: 0, paused: 0, disabled: 0 });

      setTagStats(stats);
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter tags based on active tab
  const filteredTags = tags.filter(tag => {
    switch (activeTab) {
      case 'Active Tags':
        return tag.status === 'active';
      case 'Paused Tags':
        return tag.status === 'paused';
      case 'Disabled Tags':
        return tag.status === 'disabled';
      default:
        return true;
    }
  });

  const handleLogout = () => {
    Cookies.remove('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  const validateCashtag = (value: string) => {
    if (!value.includes('$')) {
      setCashtagError('Cashtag must include a "$" symbol');
      return false;
    }
    setCashtagError('');
    return true;
  };

  // const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  //   e.preventDefault();
    
  //   try {
  //     const formData = new FormData(e.currentTarget);

  //     const payload = {
  //       name: formData.get('name'),
  //       cashtag: formData.get('cashtag'),
  //       type: formData.get('type'),
  //       pin: formData.get('pin'),
  //       email: formData.get('email'),
  //       balance: Number(formData.get('balance')),
  //       limit: Number(formData.get('limit')),
  //       status: 'active'
  //     };
  //     console.log("payload",payload);
  //     const token = Cookies.get('token');
      
  //     const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/companytag/create-company-tag`, {
  //       method: 'POST',
  //       headers: {
  //         'Authorization': `Bearer ${token}`,
  //         'Content-Type': 'application/json'
  //       },
  //       body: JSON.stringify(payload)
  //     });

  //     if (!response.ok) {
  //       throw new Error('Failed to create tag');
  //     }

  //     const data = await response.json();
  //     if (data.success) {
  //       fetchTags();
  //       setShowAddTagModal(false);
  //     }
  //   } catch (error) {
  //     console.error('Error creating tag:', error);
  //   }
  // };


  const EditTagModal = () => {
    const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!selectedTag) return;
      const formData = new FormData(e.currentTarget);
      const cashtag = formData.get('cashtag') as string;

      if (!validateCashtag(cashtag)) {
        return; // Prevent form submission if validation fails
      }

      try {
        const payload = {
          name: formData.get('name'),
          cashtag: cashtag,
          type: formData.get('type'),
          pin: formData.get('pin'),
          email: formData.get('email'),
          balance: Number(formData.get('balance')),
          limit: Number(formData.get('limit')),
          status: formData.get('status')
        };

        const token = Cookies.get('token');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/companytag/update-company-tag/${selectedTag.cId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error('Failed to update tag');
        }

        const data = await response.json();
        if (data.success) {
          fetchTags(); // Refresh the tags list
          setShowEditModal(false);
        }
      } catch (error) {
        console.error('Error updating tag:', error);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[#1a1a1a] rounded-lg w-[600px] border border-gray-800">
          <div className="flex justify-between items-center p-4 border-b border-gray-800">
            <h2 className="text-xl font-semibold text-white">Edit Tag</h2>
            <button 
              onClick={() => setShowEditModal(false)}
              className="text-gray-400 hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleEdit} className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={selectedTag?.name}
                  required
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Type
                </label>
                <select
                  name="type"
                  defaultValue={selectedTag?.type}
                  required
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select type</option>
                  <option value="personal">Personal</option>
                  <option value="business">Business</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Cashtag
                </label>
                <input
                  type="text"
                  name="cashtag"
                  defaultValue={selectedTag?.cashtag}
                  required
                  onChange={(e) => validateCashtag(e.target.value)}
                  className={`w-full bg-[#0a0a0a] border ${
                    cashtagError ? 'border-red-500' : 'border-gray-800'
                  } rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500`}
                />
                {cashtagError && (
                  <p className="mt-1 text-sm text-red-500">{cashtagError}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  defaultValue={selectedTag?.email}
                  required
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  PIN
                </label>
                <input
                  type="password"
                  name="pin"
                  defaultValue={selectedTag?.pin}
                  required
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Balance
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400">$</span>
                  <input
                    type="number"
                    name="balance"
                    defaultValue={selectedTag?.balance}
                    required
                    min="0"
                    className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg pl-8 pr-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Limit
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400">$</span>
                  <input
                    type="number"
                    name="limit"
                    defaultValue={selectedTag?.limit}
                    required
                    min="0"
                    className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg pl-8 pr-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  defaultValue={selectedTag?.status}
                  required
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const PauseWarningModal = () => {
    const handlePause = async () => {
      if (!selectedTag) return;
      try {
        const token = Cookies.get('token');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/companytag/update-company-tag/${selectedTag.cId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'paused'
          })
        });

        if (!response.ok) {
          throw new Error('Failed to pause tag');
        }

        const data = await response.json();
        if (data.success) {
          fetchTags(); // Refresh the tags list
          setShowPauseModal(false);
        }
      } catch (error) {
        console.error('Error pausing tag:', error);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[#1a1a1a] rounded-lg w-[400px] border border-gray-800">
          <div className="flex justify-between items-center p-4 border-b border-gray-800">
            <h2 className="text-xl font-semibold text-white">Pause Tag</h2>
            <button 
              onClick={() => setShowPauseModal(false)}
              className="text-gray-400 hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">Pause Cashtag</h3>
                <p className="text-sm text-gray-400">Are you sure you want to pause this cashtag?</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowPauseModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handlePause}
                className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600"
              >
                Confirm Pause
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const DisableWarningModal = () => {
    const handleDisable = async () => {
      if (!selectedTag) return;
      try {
        const token = Cookies.get('token');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/companytag/update-company-tag/${selectedTag.cId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'disabled'
          })
        });

        if (!response.ok) {
          throw new Error('Failed to disable tag');
        }

        const data = await response.json();
        if (data.success) {
          fetchTags(); // Refresh the tags list
          setShowDisableModal(false);
        }
      } catch (error) {
        console.error('Error disabling tag:', error);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[#1a1a1a] rounded-lg w-[400px] border border-gray-800">
          <div className="flex justify-between items-center p-4 border-b border-gray-800">
            <h2 className="text-xl font-semibold text-white">Disable Tag</h2>
            <button 
              onClick={() => setShowDisableModal(false)}
              className="text-gray-400 hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">Disable Cashtag</h3>
                <p className="text-sm text-gray-400">Are you sure you want to disable this cashtag? This action cannot be undone.</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowDisableModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDisable}
                className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600"
              >
                Confirm Disable
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AddTagModal = () => {
    const handleModalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const cashtag = formData.get('cashtag') as string;

      if (!validateCashtag(cashtag)) {
        return; // Prevent form submission if validation fails
      }

      try {
        const payload = {
          name: formData.get('name'),
          cashtag: cashtag,
          type: formData.get('type'),
          pin: formData.get('pin'),
          email: formData.get('email'),
          balance: Number(formData.get('balance')),
          limit: Number(formData.get('limit')),
          status: 'active'
        };

        const token = Cookies.get('token');
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/companytag/create-company-tag`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error('Failed to create tag');
        }

        const data = await response.json();
        if (data.success) {
          fetchTags(); // Refresh the tags list
          setShowAddTagModal(false); // Close the modal
        }
      } catch (error) {
        console.error('Error creating tag:', error);
        // You might want to add error handling UI here
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[#1a1a1a] rounded-lg w-[600px] border border-gray-800">
          <div className="flex justify-between items-center p-4 border-b border-gray-800">
            <h2 className="text-xl font-semibold text-white">Add New Tag</h2>
            <button 
              onClick={() => setShowAddTagModal(false)}
              className="text-gray-400 hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleModalSubmit} className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="Enter name"
                  required
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Type
                </label>
                <select
                  name="type"
                  required
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select type</option>
                  <option value="personal">Personal</option>
                  <option value="business">Business</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Cashtag
                </label>
                <input
                  type="text"
                  name="cashtag"
                  placeholder="Enter cashtag (must include $)"
                  required
                  onChange={(e) => validateCashtag(e.target.value)}
                  className={`w-full bg-[#0a0a0a] border ${
                    cashtagError ? 'border-red-500' : 'border-gray-800'
                  } rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500`}
                />
                {cashtagError && (
                  <p className="mt-1 text-sm text-red-500">{cashtagError}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="Enter email"
                  required
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  PIN
                </label>
                <input
                  type="password"
                  name="pin"
                  placeholder="Enter PIN"
                  required
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Initial Balance
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400">$</span>
                  <input
                    type="number"
                    name="balance"
                    placeholder="0"
                    required
                    min="0"
                    className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg pl-8 pr-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Limit
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400">$</span>
                  <input
                    type="number"
                    name="limit"
                    placeholder="0"
                    required
                    min="0"
                    className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg pl-8 pr-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button
                type="button"
                onClick={() => setShowAddTagModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600"
              >
                Create Tag
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const StatsCards = () => (
    <div className="grid grid-cols-3 gap-6 mb-8">
      {/* Active Tags Card */}
      <div 
        onClick={() => setActiveTab('Active Tags')}
        className="bg-emerald-500/10 rounded-2xl p-6 border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/20 transition-all"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-emerald-500">Active Tags</h3>
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <div className="text-4xl font-bold text-white mb-1">{tagStats.active}</div>
        <p className="text-sm text-emerald-500/60">Click to view active tags</p>
      </div>

      {/* Paused Tags Card */}
      <div 
        onClick={() => setActiveTab('Paused Tags')}
        className="bg-amber-500/10 rounded-2xl p-6 border border-amber-500/20 cursor-pointer hover:bg-amber-500/20 transition-all"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-amber-500">Paused Tags</h3>
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="text-4xl font-bold text-white mb-1">{tagStats.paused}</div>
        <p className="text-sm text-amber-500/60">Click to view paused tags</p>
      </div>

      {/* Disabled Tags Card */}
      <div 
        onClick={() => setActiveTab('Disabled Tags')}
        className="bg-red-500/10 rounded-2xl p-6 border border-red-500/20 cursor-pointer hover:bg-red-500/20 transition-all"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-red-500">Disabled Tags</h3>
          <div className="p-2 bg-red-500/10 rounded-lg">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>
        <div className="text-4xl font-bold text-white mb-1">{tagStats.disabled}</div>
        <p className="text-sm text-red-500/60">Click to view disabled tags</p>
      </div>
    </div>
  );

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <AdminHeader user={user}  />
      <div className="flex-1 pl-64">
        <main className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <svg className="w-8 h-8 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                Cashtags Directory
              </h1>
            </div>
            <button
              onClick={() => setShowAddTagModal(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add New Tag
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <StatsCards />
          )}

          {/* Tabs */}
          <div className="bg-[#1a1a1a] rounded-2xl p-4 mb-8 border border-gray-800/20">
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab('Active Tags')}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium ${
                  activeTab === 'Active Tags'
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Active Tags
              </button>
              <button
                onClick={() => setActiveTab('Paused Tags')}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium ${
                  activeTab === 'Paused Tags'
                    ? 'bg-amber-500/10 text-amber-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Paused Tags
              </button>
              <button
                onClick={() => setActiveTab('Disabled Tags')}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium ${
                  activeTab === 'Disabled Tags'
                    ? 'bg-red-500/10 text-red-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Disabled Tags
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-gray-800/20">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex justify-center items-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
             
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">NAME</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Cashtag</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Email</th>
              
                
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">ACCOUNT TYPE</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">BALANCE</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Limit</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">LAST ACTIVE</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filteredTags.map((tag) => (
                      <tr key={tag._id} className="hover:bg-gray-800/30">
                        <td className="px-4 py-3">
                          <span className="bg-blue-500/10 text-blue-500 px-2 py-1 rounded-lg text-xs">{tag.name}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">{tag.cashtag}</td>
                        <td className="px-4 py-3 text-sm text-gray-300">{tag.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-300">{tag.type}</td>
                        <td className="px-4 py-3 text-sm text-gray-300">{tag.balance}</td>
                        <td className="px-4 py-3 text-sm text-gray-300">${tag.limit.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-gray-300">{new Date(tag.updatedAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => {
                                setSelectedTag(tag);
                                setShowEditModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-amber-500/10 text-blue-500 hover:bg-amber-500/20"
                            >
                              <Pencil size={15}/>
                            </button>
                            <button 
                              onClick={() => {
                                setSelectedTag(tag);
                                setShowPauseModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => {
                                setSelectedTag(tag);
                                setShowDisableModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20"
                            >
                             <ShieldBan size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>
    
      {showAddTagModal && <AddTagModal />}
      {showEditModal && selectedTag && <EditTagModal />}
      {showPauseModal && <PauseWarningModal />}
      {showDisableModal && <DisableWarningModal />}
    </div>
  )
}

export default AdminCashtagsPage 