import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import CreateUserForm from "@/app/components/CreateUserForm";
import { toast } from "react-hot-toast";
import { X, Loader2, Edit2, Ban, Eye, EyeOff, User2, Briefcase, UserCircle, BadgeCheck, KeyRound, ShieldCheck, ChevronDown, Building, Upload, Search, Building2 } from "lucide-react";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { supabase } from "@/lib/supabase";
import { User } from "@/supabase/types";
import Image from 'next/image';

interface UserManagementProps {
  currentUser: User;
  department: string;
  title?: string;
  description?: string;
  allowedRoles?: string[];
  showDepartmentFilter?: boolean;
}

interface ApiResponse {
  success: boolean;
  data: {
    users: User[];
    pagination: {
      total: number;
      totalPages: number;
      currentPage: number;
      limit: number;
    };
  };
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EditUserData) => Promise<void>;
  user: User;
  currentUserRole: string;
  allowedRoles?: string[];
}

interface ConfirmStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  user: User;
  currentUserRole: string;
}

interface EditUserData {
  name: string;
  department: string;
  role: string;
  status: 'active' | 'disabled';
  newPassword?: string;
  employeeCode: string;
  ent_section?: string;
  ent_access: string[];
  profile_pic?: File;
}

// Add permission helper functions
const canManageUser = (currentUserRole: string, targetUserRole: string): boolean => {
  const rolePriority: { [key: string]: number } = {
    'Admin': 1,
    'Executive': 2,
    'Manager': 3,
    'Shift Incharge': 4,
    'Agent': 5
  };

  // Admin can manage everyone
  if (currentUserRole === 'Admin') return true;

  // Executive can manage everyone except Admin and Executive
  if (currentUserRole === 'Executive') {
    return rolePriority[targetUserRole] > rolePriority['Executive'];
  }

  // Manager can only manage Agents and Shift Incharge
  if (currentUserRole === 'Manager') {
    return targetUserRole === 'Agent' || targetUserRole === 'Shift Incharge';
  }

  return false;
};

const canCreateUser = (currentUserRole: string): boolean => {
  return ['Admin', 'Executive'].includes(currentUserRole);
};

const canViewUser = (currentUserRole: string, targetUserRole: string): boolean => {
  const rolePriority: { [key: string]: number } = {
    'Admin': 1,
    'Executive': 2,
    'Manager': 3,
    'Shift Incharge': 4,
    'Agent': 5
  };

  // Admin can view everyone
  if (currentUserRole === 'Admin') return true;

  // Executive can view everyone except Admin and Executive
  if (currentUserRole === 'Executive') {
    return rolePriority[targetUserRole] > rolePriority['Executive'];
  }

  // Manager can only view Agents and Shift Incharge
  if (currentUserRole === 'Manager') {
    return targetUserRole === 'Agent' || targetUserRole === 'Shift Incharge';
  }

  return false;
};

// Add the missing modal components before the UserManagement component
const ConfirmStatusModal: React.FC<ConfirmStatusModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  user,
  currentUserRole
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if current user can modify target user's status
  const canModifyStatus = canManageUser(currentUserRole, user.role);

  if (!isOpen || !canModifyStatus) return null;

  const isDisabling = user.status === "active";

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-md border border-gray-800 shadow-xl transform transition-all">
        {/* Modal Header */}
        <div className="relative border-b border-gray-800">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 blur-xl opacity-50" />
          <div className="relative flex items-center justify-between p-6">
            <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              {isDisabling ? 'Disable User' : 'Enable User'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800/50 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className={`p-3 rounded-full ${isDisabling ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
              {isDisabling ? (
                <Ban className={`w-6 h-6 text-red-400`} />
              ) : (
                <ShieldCheck className={`w-6 h-6 text-green-400`} />
              )}
            </div>
            <div>
              <h4 className="text-lg font-medium text-white mb-1">
                {isDisabling ? 'Are you sure you want to disable this user?' : 'Enable user access?'}
              </h4>
              <p className="text-gray-400 text-sm">
                {isDisabling 
                  ? `This will prevent ${user.name} from accessing the system.`
                  : `This will restore ${user.name}'s access to the system.`}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white 
                hover:bg-gray-800/50 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                setIsSubmitting(true);
                try {
                  await onConfirm();
                  onClose();
                } finally {
                  setIsSubmitting(false);
                }
              }}
              disabled={isSubmitting}
              className={`px-4 py-2 text-sm font-medium rounded-lg 
                transition-all duration-200 transform hover:scale-105 
                active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed 
                disabled:transform-none shadow-lg flex items-center gap-2
                ${isDisabling 
                  ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20'
                  : 'bg-green-500 text-white hover:bg-green-600 shadow-green-500/20'
                }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isDisabling ? 'Disabling...' : 'Enabling...'}
                </>
              ) : (
                <>
                  {isDisabling ? 'Yes, disable user' : 'Yes, enable user'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  user,
  currentUserRole,
  allowedRoles
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(user?.user_profile_pic || null);
  const [formData, setFormData] = useState<EditUserData>({
    name: "",
    department: "",
    role: "",
    status: "active",
    newPassword: "",
    employeeCode: "",
    ent_section: "",
    ent_access: ['ENT1', 'ENT2', 'ENT3']
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        department: user.department || "",
        role: user.role || "",
        status: (user.status === "active" || user.status === "disabled") ? user.status : "active",
        newPassword: "",
        employeeCode: user.employee_code || "",
        ent_section: user.ent_section || "",
        ent_access: user.ent_access || ['ENT1', 'ENT2', 'ENT3']
      });
      setPreviewUrl(user.user_profile_pic || null);
    }
  }, [user]);

  const getRolesForDepartment = (department: string): string[] => {
    const validDepartments = ['Admin', 'Support', 'Finance', 'Operations', 'Verification', 'Audit'] as const;
    type Department = typeof validDepartments[number];
    
    const roles: Record<Department, string[]> = {
      'Admin': ['Admin', 'Executive'],
      'Support': ['Manager', 'Agent', 'Shift Incharge'],
      'Finance': ['Manager', 'Agent'],
      'Operations': ['Agent'],
      'Verification': ['Agent'],
      'Audit': ['Manager', 'Agent']
    };
    
    return department in roles ? roles[department as Department] : ['Agent'];
  };

  // Restrict available roles based on currentUserRole and allowedRoles
  const getAvailableRoles = (department: string): string[] => {
    let roles = getRolesForDepartment(department);
    
    // Filter by allowed roles if specified
    if (allowedRoles) {
      roles = roles.filter(role => allowedRoles.includes(role));
    }
    
    // Filter based on user permissions
    if (currentUserRole === 'Admin') return roles;
    if (currentUserRole === 'Executive') {
      return roles.filter(role => !['Admin', 'Executive'].includes(role));
    }
    if (currentUserRole === 'Manager') {
      return roles.filter(role => ['Agent', 'Shift Incharge'].includes(role));
    }
    return [];
  };

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDepartment = e.target.value;
    const availableRoles = getAvailableRoles(newDepartment);
    
    // Reset ENT access to all ENTs when changing department
    let newEntAccess = ['ENT1', 'ENT2', 'ENT3'];
    
    setFormData(prev => ({
      ...prev,
      department: newDepartment,
      role: availableRoles[0],
      ent_access: newEntAccess,
      ent_section: '' // Reset ENT section when department changes
    }));
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;
    
    // Reset ENT access to all ENTs by default
    let newEntAccess = ['ENT1', 'ENT2', 'ENT3'];
    
    // If Support department and specific roles, set ENT access based on ent_section
    if (formData.department === 'Support' && (newRole === 'Shift Incharge' || newRole === 'Agent')) {
      newEntAccess = formData.ent_section ? [formData.ent_section] : [];
    }
    
    setFormData(prev => ({
      ...prev,
      role: newRole,
      ent_access: newEntAccess
    }));
  };

  const handleEntSectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newEntSection = e.target.value;
    
    // Update ENT access for Support department specific roles
    let newEntAccess = ['ENT1', 'ENT2', 'ENT3'];
    if (formData.department === 'Support') {
      if (formData.role === 'Agent') {
        // For Agent, only allow single ENT selection
        newEntAccess = newEntSection ? [newEntSection] : [];
      } else if (formData.role === 'Shift Incharge') {
        // For Shift Incharge, ensure their section is in their access list
        if (newEntSection) {
          if (!formData.ent_access.includes(newEntSection)) {
            newEntAccess = [newEntSection, ...formData.ent_access];
          } else {
            newEntAccess = formData.ent_access;
          }
        }
      }
    }
    
    setFormData(prev => ({
      ...prev,
      ent_section: newEntSection,
      ent_access: newEntAccess
    }));
  };

  const handleEntAccessChange = (ent: string) => {
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
        ent_section: prev.role === 'Shift Incharge' ? newEntAccess[0] : prev.ent_section
      };
    });
  };

  const showEntSection = formData.department === 'Support' && 
    (formData.role === 'Shift Incharge' || formData.role === 'Agent');

  const isRestrictedRole = formData.department === 'Support' && 
    formData.role === 'Agent';

  const ENT_OPTIONS = ['ENT1', 'ENT2', 'ENT3'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setFormData(prev => ({ ...prev, profile_pic: file }));
    }
  };

  if (!isOpen || !user) return null;

  const availableRoles = getAvailableRoles(formData.department);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-3xl border border-gray-800 shadow-xl transform transition-all my-8">
        {/* Modal Header */}
        <div className="relative border-b border-gray-800">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 blur-xl opacity-50" />
          <div className="relative flex items-center justify-between p-6">
            <div className="space-y-1">
              <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                Edit User
              </h3>
              <p className="text-sm text-gray-400">Update user information and permissions</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800/50 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Fields */}
        <div className="p-6 space-y-6">
          {/* Profile Picture Upload - Centered */}
          <div className="flex flex-col items-center space-y-3 pb-4">
            <label className="text-sm font-medium text-gray-400">Profile Picture</label>
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              {previewUrl ? (
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-gray-800 transition-transform transform group-hover:scale-105">
                  <Image
                    src={previewUrl}
                    alt="Profile preview"
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 
                  border-2 border-gray-800 flex flex-col items-center justify-center gap-2
                  transition-transform transform group-hover:scale-105">
                  <Upload className="w-8 h-8 text-gray-400" />
                  <span className="text-sm text-gray-400">Upload Photo</span>
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 
                flex items-center justify-center transition-all">
                <Upload className="w-8 h-8 text-white" />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="text-xs text-gray-500">Click to upload a new profile picture</p>
          </div>

          {/* Two Column Layout for Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Name Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User2 className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full bg-[#252b3b] border border-gray-800 rounded-xl pl-10 px-4 py-3 text-white 
                      focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/20 
                      transition-all duration-200"
                  />
                </div>
              </div>

              {/* Employee Code Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Employee Code</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BadgeCheck className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={formData.employeeCode}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, employeeCode: e.target.value }))
                    }
                    className="w-full bg-[#252b3b] border border-gray-800 rounded-xl pl-10 px-4 py-3 text-white 
                      focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/20 
                      transition-all duration-200"
                  />
                </div>
              </div>

              {/* Department Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Department</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Briefcase className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    value={formData.department}
                    onChange={handleDepartmentChange}
                    className="w-full bg-[#252b3b] border border-gray-800 rounded-xl pl-10 px-4 py-3 text-white 
                      focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/20 
                      transition-all duration-200 appearance-none"
                  >
                    <option value="Support">Support</option>
                    <option value="Finance">Finance</option>
                    <option value="Operations">Operations</option>
                    <option value="Verification">Verification</option>
                    <option value="Audit">Audit</option>
                    <option value="Admin">Admin</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Role Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Role</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserCircle className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    value={formData.role}
                    onChange={handleRoleChange}
                    className="w-full bg-[#252b3b] border border-gray-800 rounded-xl pl-10 px-4 py-3 text-white 
                      focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/20 
                      transition-all duration-200 appearance-none"
                  >
                    {availableRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Password Reset Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Reset Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.newPassword}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, newPassword: e.target.value }))
                    }
                    placeholder="Leave blank to keep current password"
                    className="w-full bg-[#252b3b] border border-gray-800 rounded-xl pl-10 px-4 py-3 text-white 
                      focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/20 
                      transition-all duration-200 pr-10"
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
                <p className="text-xs text-gray-500">
                  Enter a new password only if you want to reset it
                </p>
              </div>
            </div>
          </div>

          {/* ENT Section - Full Width */}
          {showEntSection && (
            <div className="space-y-3 pt-4">
              <label className="text-sm font-medium text-gray-400">
                {isRestrictedRole ? 'ENT Section' : 'ENT Access'}
              </label>
              <div className="bg-[#252b3b] border border-gray-800 rounded-xl p-4">
                {isRestrictedRole ? (
                  // Single ENT selection for Support Agent
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <Building className="h-5 w-5 text-gray-400" />
                    </div>
                    <select
                      value={formData.ent_section || ''}
                      onChange={(e) => {
                        const selectedEnt = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          ent_section: selectedEnt,
                          ent_access: selectedEnt ? [selectedEnt] : []
                        }));
                      }}
                      className="w-full bg-[#1a1a1a] border border-gray-800 rounded-lg pl-10 px-4 py-3 text-white 
                        focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/20 
                        transition-all duration-200 appearance-none"
                      required={showEntSection}
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
                  // Multiple ENT selection for other roles
                  <div className="space-y-">
                    <div className="flex flex-wrap gap-2">
                      {formData.ent_access.map(ent => (
                        <div
                          key={ent}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                            ${formData.role === 'Shift Incharge' && ent === formData.ent_section
                              ? 'bg-teal-500/20 text-teal-400 border border-teal-500/20'
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
                      {ENT_OPTIONS.filter(ent => !formData.ent_access.includes(ent)).map(ent => (
                        <button
                          key={ent}
                          type="button"
                          onClick={() => handleEntAccessChange(ent)}
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
              <p className="text-xs text-gray-500">
                {isRestrictedRole 
                  ? "Select your ENT section"
                  : formData.role === 'Shift Incharge'
                    ? "Select ENTs - the first selected ENT will be your primary section"
                    : "Select one or more ENTs to grant access"}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-gray-800 p-6">
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
            {error && (
              <div className="flex items-center text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">
                <X className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-white 
                  hover:bg-gray-800/50 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsSubmitting(true);
                  setError(null);
                  try {
                    await onSubmit(formData);
                    onClose();
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : "Failed to update user"
                    );
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium bg-blue-500 text-white rounded-lg 
                  hover:bg-blue-600 transition-all duration-200 transform hover:scale-105 
                  active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed 
                  disabled:transform-none shadow-lg shadow-blue-500/20
                  flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update User"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add new interfaces for pagination and filters
interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

interface FilterState {
  searchQuery: string;
  selectedRole: string;
  selectedDepartment: string;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  currentUser,
  department,
  title = "User Management",
  description = "Manage and monitor user accounts",
  allowedRoles,
  showDepartmentFilter = false
}) => {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const { logActivity } = useActivityLogger();
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    user: User | null;
  }>({ isOpen: false, user: null });
  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    user: User | null;
  }>({ isOpen: false, user: null });
  const [selectedDepartment, setSelectedDepartment] = useState<string>(department);
  
  // Add new state for pagination and filters
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    selectedRole: '',
    selectedDepartment: ''
  });

  // Add new state for filtered users
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  // Define all available departments
  const allDepartments = [
    "Admin",
    "Support",
    "Finance",
    "Operations",
    "Verification",
    "Audit"
  ];

  // Define all available roles
  const allRoles = [
    "Admin",
    "Executive",
    "Manager",
    "Shift Incharge",
    "Agent"
  ];

  // Define department-specific roles
  const departmentRoles: { [key: string]: string[] } = {
    "Admin": ["Admin", "Executive"],
    "Support": ["Manager", "Shift Incharge", "Agent"],
    "Finance": ["Manager", "Agent"],
    "Operations": ["Agent"],
    "Verification": ["Agent"],
    "Audit": ["Manager", "Agent"]
  };

  // Get available roles based on selected department
  const getAvailableRoles = (selectedDepartment: string): string[] => {
    if (!selectedDepartment) {
      // If no department is selected, return all unique roles
      return Array.from(new Set([
        "Admin", "Executive", "Manager", "Shift Incharge", "Agent"
      ])).sort();
    }
    return departmentRoles[selectedDepartment] || [];
  };

  useEffect(() => {
    fetchUsers();
  }, [selectedDepartment]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Calculate the range for pagination
      const from = (pagination.currentPage - 1) * pagination.itemsPerPage;
      const to = from + pagination.itemsPerPage - 1;

      // Build the base query
      let query = supabase
        .from("users")
        .select("*", { count: 'exact' });

      // Apply department filter
      if (department !== "Admin") {
        query = query.eq("department", selectedDepartment);
      }

      // Apply role filter if selected
      if (filters.selectedRole) {
        query = query.eq("role", filters.selectedRole);
      }

      // Apply department filter if selected
      if (filters.selectedDepartment) {
        query = query.eq("department", filters.selectedDepartment);
      }

      // Apply search filter if present
      if (filters.searchQuery) {
        const searchQuery = filters.searchQuery.toLowerCase();
        query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,employee_code.ilike.%${searchQuery}%`);
      }

      // Add pagination
      query = query
        .range(from, to)
        .order('role', { ascending: true })
        .order('department', { ascending: true })
        .order('name', { ascending: true });

      const { data: users, error, count } = await query;

      if (error) {
        throw error;
      }

      // Update pagination state
      const totalPages = Math.ceil((count || 0) / pagination.itemsPerPage);
      setPagination(prev => ({
        ...prev,
        totalItems: count || 0,
        totalPages
      }));

      // Update users state
      setUsers(users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  // Update useEffect to fetch users when pagination or filters change
  useEffect(() => {
    fetchUsers();
  }, [pagination.currentPage, pagination.itemsPerPage, filters, selectedDepartment]);

  // Update handlePageChange to use the new pagination
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  // Update handleRoleFilterChange to reset pagination
  const handleRoleFilterChange = (role: string) => {
    setFilters(prev => ({ ...prev, selectedRole: role }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Update handleSearch to reset pagination
  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Update handleDepartmentFilterChange to reset pagination
  const handleDepartmentFilterChange = (department: string) => {
    setFilters(prev => ({ ...prev, selectedDepartment: department }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Get unique departments for filter dropdown
  const uniqueDepartments = Array.from(new Set([
    ...allDepartments,
    ...users.map(user => user.department)
  ])).sort();

  // Get unique roles for filter dropdown
  const uniqueRoles = Array.from(new Set([
    ...allRoles,
    ...users.map(user => user.role)
  ])).sort();

  // Add these missing handler functions before the UserManagement component
  const handleEditUser = async (data: EditUserData) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: data.name,
          department: data.department,
          role: data.role,
          status: data.status,
          employee_code: data.employeeCode,
          ent_section: data.ent_section,
          ent_access: data.ent_access
        })
        .eq('id', editModal.user?.id);

      if (error) throw error;

      // If there's a new password, update it separately
      if (data.newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: data.newPassword
        });
        if (passwordError) throw passwordError;
      }

      // Handle profile picture upload if provided
      if (data.profile_pic) {
        const fileExt = data.profile_pic.name.split('.').pop();
        const fileName = `${editModal.user?.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('profile-pictures')
          .upload(fileName, data.profile_pic);
        
        if (uploadError) throw uploadError;

        // Update user profile with new picture URL
        const { error: updateError } = await supabase
          .from('users')
          .update({
            user_profile_pic: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile-pictures/${fileName}`
          })
          .eq('id', editModal.user?.id);

        if (updateError) throw updateError;
      }

      toast.success('User updated successfully');
   
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
      throw error;
    }
  };

  const handleDisableUser = async (userId: string, userName: string) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) throw new Error('User not found');

      const newStatus = user.status === 'active' ? 'disabled' : 'active';

      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`User ${newStatus === 'disabled' ? 'disabled' : 'activated'} successfully`);
      
      
      setStatusModal({ isOpen: false, user: null });
      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Section with Gradient */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 blur-3xl" />
        <div className="relative flex justify-between items-center backdrop-blur-sm bg-[#1a1a1a]/50 rounded-2xl p-6 border border-gray-800/50">
          <div>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
              {title}
            </h1>
            <p className="text-gray-400 mt-2">
              {description}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* {showDepartmentFilter && department === "Admin" && (
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="bg-[#252b3b] text-white border border-gray-800 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="Admin">Admin</option>
                <option value="Support">Support</option>
                <option value="Finance">Finance</option>
                <option value="Operations">Operations</option>
                <option value="Verification">Verification</option>
                <option value="Audit">Audit</option>
              </select>
            )} */}

            {canCreateUser(currentUser.role) && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 
                  transition-all duration-200 transform hover:scale-105 active:scale-95
                  shadow-lg shadow-blue-600/20 font-medium"
              >
                + Create New User
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Updated Filters Section with Icons */}
      <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800/50 p-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search users..."
                value={filters.searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full bg-[#252b3b] border border-gray-800 rounded-xl pl-10 px-4 py-3 text-white 
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/20 
                  transition-all duration-200"
              />
            </div>
          </div>

          {/* Department Filter */}
          <div className="w-full md:w-48">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Building2 className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={filters.selectedDepartment}
                onChange={(e) => {
                  handleDepartmentFilterChange(e.target.value);
                  // Reset role filter when department changes
                  setFilters(prev => ({ ...prev, selectedRole: '' }));
                }}
                className="w-full bg-[#252b3b] border border-gray-800 rounded-xl pl-10 pr-10 py-3 text-white 
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/20 
                  transition-all duration-200 appearance-none"
              >
                <option value="">All Departments</option>
                {allDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Role Filter */}
          <div className="w-full md:w-48">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserCircle className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={filters.selectedRole}
                onChange={(e) => handleRoleFilterChange(e.target.value)}
                className="w-full bg-[#252b3b] border border-gray-800 rounded-xl pl-10 pr-10 py-3 text-white 
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/20 
                  transition-all duration-200 appearance-none"
                disabled={!filters.selectedDepartment && department !== "Admin"}
              >
                <option value="">All Roles</option>
                {getAvailableRoles(filters.selectedDepartment).map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Table Section */}
      <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800/50 overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#252b3b]">
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                      ENT Access
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-[#252b3b] transition-colors duration-150"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          {user.user_profile_pic ? (
                            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-gray-800 ">
                              <Image
                                src={user.user_profile_pic}
                                alt={user.name}
                              
                                className="object-cover"
                                width={48}
                                height={48}
                                
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 
                              border-2 border-gray-800 flex items-center justify-center">
                              <User2 className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div className="text-sm font-medium text-white capitalize flex flex-col gap-1">
                            <span>
                              {user.name}
                            </span>
                            <span className="text-gray-400 text-xs">
                              {user.employee_code}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-700/50 text-gray-300">
                          {user.department}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          user.role === 'Admin' 
                            ? 'bg-purple-500/10 text-purple-400'
                            : user.role === 'Executive'
                            ? 'bg-indigo-500/10 text-indigo-400'
                            : user.role === 'Manager'
                            ? 'bg-blue-500/10 text-blue-400'
                            : user.role === 'Shift Incharge'
                            ? 'bg-cyan-500/10 text-cyan-400'
                            : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-gray-300">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {user.ent_access?.length === 3 ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-indigo-500/20 text-indigo-400 border border-indigo-500/20">
                              ALL
                            </span>
                          ) : (
                            user.ent_access?.map((ent) => {
                              const isPrimary = (user.role === 'Shift Incharge' || user.role === 'Agent') && 
                                               ent === user.ent_section;
                              const colors = {
                                'ENT1': isPrimary ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/20 text-blue-400 border-blue-500/20',
                                'ENT2': isPrimary ? 'bg-teal-500/20 text-teal-400 border-teal-500/20' : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/20',
                                'ENT3': isPrimary ? 'bg-purple-500/20 text-purple-400 border-purple-500/20' : 'bg-pink-500/20 text-pink-400 border-pink-500/20'
                              };

                              return (
                                <span
                                  key={ent}
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border ${colors[ent]}`}
                                >
                                  {ent}
                                  {isPrimary && (
                                    <span className="" />
                                  )}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            user.status === "disabled"
                              ? "bg-rose-500/10 text-rose-400"
                              : "bg-emerald-500/10 text-emerald-400"
                          }`}
                        >
                          {user.status === "disabled" ? "Disabled" : "Active"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap text-sm space-x-3">
                        {canManageUser(currentUser.role, user.role) && (
                          <>
                            <button
                              onClick={() => {
                                setEditModal({ isOpen: true, user });
                              }}
                              className="inline-flex items-center px-4 py-2 bg-sky-500/10 text-sky-400 rounded-lg 
                                hover:bg-sky-500/20 transition-all duration-200 font-medium"
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              {/* Edit */}
                            </button>
                            {user.role !== "Admin" && (
                              <button
                                onClick={() =>
                                  setStatusModal({ isOpen: true, user })
                                }
                                className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                                  user.status === "disabled"
                                    ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                                    : "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                                }`}
                              >
                                <Ban className="w-4 h-4 mr-2" />
                                {/* {user.status === "disabled"
                                  ? "Activate"
                                  : "Disable"} */}
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-800">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
                  {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                  {pagination.totalItems} users
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className="px-3 py-1 rounded-lg bg-[#252b3b] text-white disabled:opacity-50 
                      disabled:cursor-not-allowed hover:bg-[#252b3b]/80 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-gray-400">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage >= pagination.totalPages}
                    className="px-3 py-1 rounded-lg bg-[#252b3b] text-white disabled:opacity-50 
                      disabled:cursor-not-allowed hover:bg-[#252b3b]/80 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {showAddModal && canCreateUser(currentUser.role) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div
            className="w-full max-w-lg transform transition-all scale-100 opacity-100
            animate-in zoom-in-95 duration-200"
          >
            <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 shadow-xl overflow-hidden">
              <CreateUserForm
                onClose={() => setShowAddModal(false)}
                onSuccess={() => {
                  setShowAddModal(false);
                  fetchUsers();
                }}
                currentUserRole={currentUser.role}
              />
            </div>
          </div>
        </div>
      )}

      {editModal.isOpen && editModal.user && canManageUser(currentUser.role, editModal.user.role) && (
        <EditUserModal
          isOpen={editModal.isOpen}
          onClose={() => setEditModal({ isOpen: false, user: null })}
          onSubmit={handleEditUser}
          user={editModal.user}
          currentUserRole={currentUser.role}
          allowedRoles={allowedRoles}
        />
      )}

      {statusModal.isOpen && statusModal.user && canManageUser(currentUser.role, statusModal.user.role) && (
        <ConfirmStatusModal
          isOpen={true}
          onClose={() => setStatusModal({ isOpen: false, user: null })}
          onConfirm={() => {
            if (statusModal.user) {
              return handleDisableUser(statusModal.user.id, statusModal.user.name);
            }
            return Promise.resolve();
          }}
          user={statusModal.user}
          currentUserRole={currentUser.role}
        />
      )}
    </div>
  );
};

export default UserManagement; 