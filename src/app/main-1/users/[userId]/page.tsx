"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Activity, Shield, Building2, Mail, Clock, Calendar, Users } from "lucide-react";
import { AdminHeader } from "@/app/components/Headers";
import Loader from "@/app/components/Loader";

interface User {
  name: string;
  email: string;
  department: string;
  role: string;
}

interface ActivityLog {
  action: string;
  timestamp: string;
  details: string;
  ip: string;
}

interface UserDetails {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  status: "active" | "inactive";
  lastLogin: string;
  createdAt: string;
  managedTeams: string[];
  permissions: string[];
  activityLogs: ActivityLog[];
}

const UserDetailsPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated API call with dummy data
    setTimeout(() => {
      setUser({
        id: "USR123",
        name: "John Doe",
        email: "john.doe@example.com",
        department: "Support",
        role: "manager",
        status: "active",
        lastLogin: "2024-01-28T08:30:00",
        createdAt: "2023-12-01T14:00:00",
        managedTeams: ["ENT-1", "ENT-2"],
        permissions: ["view players", "edit players", "view promotions", "edit promotions", "view reports"],
        activityLogs: [
          {
            action: "Login",
            timestamp: "2024-01-28T08:30:00",
            details: "Successful login from desktop",
            ip: "192.168.1.1"
          },
          {
            action: "Updated Player Status",
            timestamp: "2024-01-28T07:20:00",
            details: "Changed player VIP001 status to active",
            ip: "192.168.1.1"
          },
          {
            action: "Created Promotion",
            timestamp: "2024-01-28T05:15:00",
            details: "Created new promotion WELCOME100",
            ip: "192.168.1.1"
          }
        ]
      });
      setLoading(false);
    }, 1000);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

  // Create a User object from UserDetails for the header
  const headerUser: User | null = user ? {
    name: user.name,
    email: user.email,
    department: user.department,
    role: user.role
  } : null;

  if (loading) {
    return <Loader text="user details" />;
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <AdminHeader user={headerUser as User}  />
      <div className="flex-1 pl-64">
        <div className="p-8">
          {/* Header Section */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.back()}
                className="p-2 text-gray-400 hover:text-white bg-[#1a1a1a] rounded-xl
                  transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white">User Details</h1>
                <p className="text-gray-400">View and manage user information</p>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {/* User Information Card */}
            <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-gray-800/20
              before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.04] before:to-transparent before:rounded-2xl relative overflow-hidden group
              transform transition-all duration-200 hover:scale-[1.02]">
              <div className="relative">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-500" />
                  User Information
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400">Name</label>
                    <p className="text-white font-medium">{user?.name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Email</label>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-500" />
                      <p className="text-white">{user?.email}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Department</label>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-500" />
                      <p className="text-white">{user?.department}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Role</label>
                    <p className="text-white">{user?.role}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Status Card */}
            <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-gray-800/20
              before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.04] before:to-transparent before:rounded-2xl relative overflow-hidden group
              transform transition-all duration-200 hover:scale-[1.02]">
              <div className="relative">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-500" />
                  Account Status
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400">Current Status</label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`w-2 h-2 rounded-full ${user?.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                      <span className="text-white capitalize">{user?.status}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Last Login</label>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-500" />
                      <p className="text-white">{new Date(user?.lastLogin || '').toLocaleString()}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Created At</label>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-500" />
                      <p className="text-white">{new Date(user?.createdAt || '').toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Teams & Permissions Card */}
            <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-gray-800/20
              before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.04] before:to-transparent before:rounded-2xl relative overflow-hidden group
              transform transition-all duration-200 hover:scale-[1.02]">
              <div className="relative">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-500" />
                  Teams & Permissions
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400">Managed Teams</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {user?.managedTeams.map((team) => (
                        <span key={team} className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded-lg text-sm">
                          {team}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Permissions</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {user?.permissions.map((permission) => (
                        <span key={permission} className="px-2 py-1 bg-purple-500/10 text-purple-500 rounded-lg text-sm">
                          {permission}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Log Section */}
          <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800/20 overflow-hidden">
            <div className="p-6 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                Activity Log
              </h2>
            </div>
            <div className="divide-y divide-gray-800">
              {user?.activityLogs.map((log, index) => (
                <div key={index} className="p-6 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-white font-medium">{log.action}</h3>
                      <p className="text-gray-400 text-sm mt-1">{log.details}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-gray-500">IP: {log.ip}</span>
                      </div>
                    </div>
                    <time className="text-sm text-gray-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </time>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsPage; 