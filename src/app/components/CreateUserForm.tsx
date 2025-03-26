"use client"
import { useState, useRef } from 'react';
import { X, Loader2, Eye, EyeOff, User2, Mail, BadgeCheck, KeyRound, Briefcase, UserCircle, ChevronDown, Building, Check, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { signUpWithEmail } from '@/supabase/auth';
import { EntType } from '@/supabase/types';
import Image from 'next/image';

interface CreateUserFormProps {
  onClose: () => void;
  onSuccess: () => void;
  currentUserRole: string;
}

const ENT_OPTIONS: EntType[] = ['ENT1', 'ENT2', 'ENT3'];

interface FormData {
  name: string;
  email: string;
  password: string;
  department: string;
  role: string;
  employee_code: string;
  status: string;
  ent_section?: EntType;
  ent_access: EntType[];
  profile_pic?: File;
}

interface CreateUserData {
  name: string;
  email: string;
  password: string;
  department: string;
  role: string;
  employee_code: string;
  status: string;
  ent_section?: EntType;
  ent_access: EntType[];
  user_profile_pic?: string | null;
}

const CreateUserForm = ({ onClose, onSuccess, currentUserRole }: CreateUserFormProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    department: 'Support',
    role: 'Agent',
    employee_code: '',
    status: 'active',
    ent_access: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const getRolesForDepartment = (department: string): string[] => {
    switch (department) {
      case 'Admin':
        return ['Admin', 'Executive'];
      case 'Support':
        return ['Manager', 'Agent', 'Shift Incharge'];
      case 'Finance':
        return ['Manager', 'Agent'];
      case 'Operations':
        return ['Agent'];
      case 'Verification':
        return ['Agent'];
      case 'Audit':
        return ['Manager', 'Agent'];
      default:
        return ['Agent'];
    }
  };

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDepartment = e.target.value;
    const availableRoles = getRolesForDepartment(newDepartment);
    
    // Set default ENT access for all departments except Support
    const defaultEntAccess: EntType[] = newDepartment === 'Support' ? [] : ['ENT1', 'ENT2', 'ENT3'];
    
    setFormData(prev => ({
      ...prev,
      department: newDepartment,
      role: availableRoles[0],
      ent_access: defaultEntAccess,
      ent_section: undefined
    }));
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;
    
    // Set default ENT access based on department and role
    let defaultEntAccess: EntType[] = ['ENT1', 'ENT2', 'ENT3'];
    let defaultEntSection: EntType | undefined = undefined;

    // Clear ENT access only for Support department's Agent and Shift Incharge roles
    if (formData.department === 'Support' && (newRole === 'Agent' || newRole === 'Shift Incharge')) {
      defaultEntAccess = [];
      defaultEntSection = undefined;
    }
    
    setFormData(prev => ({
      ...prev,
      role: newRole,
      ent_access: defaultEntAccess,
      ent_section: defaultEntSection
    }));
  };

  const handleEntAccessChange = (ent: EntType) => {
    setFormData(prev => {
      const isAgent = prev.department === 'Support' && prev.role === 'Agent';

      // For Support Agent, allow only single ENT selection
      if (isAgent) {
        return {
          ...prev,
          ent_section: ent,
          ent_access: [ent]
        };
      }

      // For other roles (including Shift Incharge), allow multiple ENT selection
      const newEntAccess = prev.ent_access.includes(ent)
        ? prev.ent_access.filter(e => e !== ent)
        : [...prev.ent_access, ent];
      
      // Ensure at least one ENT is selected
      if (newEntAccess.length === 0) {
        toast.error('At least one ENT must be selected');
        return prev;
      }
      
      return {
        ...prev,
        ent_access: newEntAccess,
        // For Shift Incharge, set the first selected ENT as ent_section
        ent_section: prev.role === 'Shift Incharge' ? newEntAccess[0] : undefined
      };
    });
  };

  const showEntAccess = formData.department === 'Support';
  const isRestrictedRole = formData.department === 'Support' && 
    ['Agent'].includes(formData.role);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setFormData(prev => ({ ...prev, profile_pic: file }));
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    // Validate required fields
    if (!formData.name || !formData.email || !formData.password || !formData.employee_code) {
      setError('Please fill in all required fields');
      setIsSubmitting(false);
      return;
    }

    // Validate ENT access
    if (formData.ent_access.length === 0) {
      setError('At least one ENT must be selected');
      setIsSubmitting(false);
      return;
    }

    // Validate ent_section for Support Agent and Shift Incharge
    const needsEntSection = formData.department === 'Support' && 
      ['Agent', 'Shift Incharge'].includes(formData.role);
    
    if (needsEntSection && !formData.ent_section) {
      setError('Please select an ENT section');
      setIsSubmitting(false);
      return;
    }

    try {
      let profilePicUrl = null;

      // Upload profile picture if exists
      if (formData.profile_pic) {
        const fileName = `${Date.now()}-${formData.profile_pic.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('profile-pictures')
          .upload(fileName, formData.profile_pic);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('profile-pictures')
          .getPublicUrl(fileName);

        profilePicUrl = publicUrl;
      }

      // Create user with profile picture URL
      const createUserData: CreateUserData = {
        ...formData,
        ent_section: needsEntSection ? formData.ent_section : undefined,
        user_profile_pic: profilePicUrl
      };

      const { data: authData, error: signUpError } = await signUpWithEmail(createUserData);

      if (signUpError) throw signUpError;

      toast.success('User created successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating user:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create user';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="relative border-b border-gray-800">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 blur-xl opacity-50" />
        <div className="relative flex items-center justify-between p-6">
          <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Create New User
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800/50 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Form Fields */}
      <div className="p-6">
        {/* Profile Picture Upload */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-400">Profile Picture</label>
          <div className="flex items-center justify-center">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              {previewUrl ? (
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-800">
                  <Image
                    src={previewUrl}
                    alt="Profile preview"
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 
                  border-2 border-gray-800 flex flex-col items-center justify-center gap-2">
                  <Upload className="w-6 h-6 text-gray-400" />
                  <span className="text-xs text-gray-400">Upload Photo</span>
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 
                flex items-center justify-center transition-opacity">
                <Upload className="w-6 h-6 text-white" />
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

        {/* Form Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User2 className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-[#252b3b] border border-gray-800 rounded-xl pl-10 px-4 py-2.5 text-white 
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/20 
                  transition-all duration-200"
                placeholder="Enter user's name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-[#252b3b] border border-gray-800 rounded-xl pl-10 px-4 py-2.5 text-white 
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/20 
                  transition-all duration-200"
                placeholder="Enter user's email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Employee Code</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <BadgeCheck className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={formData.employee_code}
                onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                className="w-full bg-[#252b3b] border border-gray-800 rounded-xl pl-10 px-4 py-2.5 text-white 
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/20 
                  transition-all duration-200"
                placeholder="Enter employee code"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <KeyRound className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-[#252b3b] border border-gray-800 rounded-xl pl-10 px-4 py-2.5 text-white 
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/20 
                  transition-all duration-200 pr-10"
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white 
                  transition-colors p-1 hover:bg-gray-800/50 rounded-lg"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Department</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Briefcase className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={formData.department}
                onChange={handleDepartmentChange}
                className="w-full bg-[#252b3b] border border-gray-800 rounded-xl pl-10 px-4 py-2.5 text-white 
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/20 
                  transition-all duration-200 appearance-none"
              >
                <option value="Support">Support</option>
                <option value="Finance">Finance</option>
                <option value="Operations">Operations</option>
                <option value="Verification">Verification</option>
                <option value="Audit">Audit</option>
                {currentUserRole === 'Admin' && <option value="Admin">Admin</option>}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Role</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserCircle className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={formData.role}
                onChange={handleRoleChange}
                className="w-full bg-[#252b3b] border border-gray-800 rounded-xl pl-10 px-4 py-2.5 text-white 
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/20 
                  transition-all duration-200 appearance-none"
              >
                {getRolesForDepartment(formData.department).map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {showEntAccess && (
          <div className="space-y-2 mt-4">
            <label className="text-sm font-medium text-gray-400">
              {isRestrictedRole ? 'ENT Section' : 'ENT Access'}
            </label>
            <div className="bg-[#252b3b] border border-gray-800 rounded-xl p-2">
              {isRestrictedRole ? (
                // Single ENT selection for Support Agent
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Building className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    value={formData.ent_section || ''}
                    onChange={(e) => {
                      const selectedEnt = e.target.value as EntType;
                      setFormData(prev => ({
                        ...prev,
                        ent_section: selectedEnt,
                        ent_access: selectedEnt ? [selectedEnt] : []
                      }));
                    }}
                    className="w-full bg-[#1a1a1a] border border-gray-800 rounded-lg pl-10 px-4 py-2.5 text-white 
                      focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/20 
                      transition-all duration-200 appearance-none"
                  >
                    <option value="">Select ENT Section</option>
                    {ENT_OPTIONS.map(ent => (
                      <option key={ent} value={ent}>{ent}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              ) : (
                // Multiple ENT selection for other roles (Manager and Shift Incharge)
                <>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.ent_access.map(ent => (
                      <div
                        key={ent}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm
                          ${formData.role === 'Shift Incharge' && ent === formData.ent_section
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-blue-500/20 text-blue-400'}`}
                      >
                        <span>{ent}</span>
                        <button
                          type="button"
                          onClick={() => handleEntAccessChange(ent)}
                          className="hover:text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ENT_OPTIONS.filter(ent => !formData.ent_access.includes(ent)).map(ent => (
                      <button
                        key={ent}
                        type="button"
                        onClick={() => handleEntAccessChange(ent)}
                        className="flex items-center gap-1 text-gray-400 hover:text-white px-2 py-1 rounded-lg text-sm
                          hover:bg-gray-800/50 transition-colors"
                      >
                        <Building className="h-4 w-4" />
                        <span>{ent}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {isRestrictedRole 
                ? "Select your ENT section"
                : formData.role === 'Shift Incharge'
                  ? "Select ENTs - the first selected ENT will be your primary section"
                  : "Select one or more ENTs to grant access"}
            </p>
          </div>
        )}

        {error && (
          <div className="text-red-500 text-sm mt-4">{error}</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl px-4 py-2.5
            hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 
            focus:ring-blue-500/20 transition-all duration-200 relative overflow-hidden
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 mx-auto animate-spin" />
          ) : (
            'Create User'
          )}
        </button>
      </div>
    </div>
  );
};

export default CreateUserForm; 