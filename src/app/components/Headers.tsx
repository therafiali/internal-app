"use client";
import { EntType } from "@/supabase/types";
import { convertEntFormat } from "@/utils/entFormat";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  DoorOpen,
  Search,
  User,
  Users,
  Activity,
  DollarSign,
  Wallet,
  RefreshCw,
  Key,
  UserCog,
  Shield,
  FileText,
  BarChart3,
  UserPlus,
  MessageSquare,
  ClipboardList,
  CheckCircle,
  CircleDollarSign,
  ArrowDownToLine,
  ArrowUpFromLine,
  Settings,
  ShieldCheck,
  Circle,
  CircleDotDashedIcon,
  ChevronDown,
  ChevronsLeftRight,
} from "lucide-react";
import { usePlayerRequests } from "@/hooks/usePlayerRequests";
import { useVerificationRecharge } from "@/hooks/useVerificationRecharge";
import { useVerificationRedeem } from "@/hooks/useVerificationRedeem";
import { supabase } from "@/supabase/client";
import { fetchUserProfilePic } from "./getProfile";

// Add the utility function to fetch profile picture

interface User {
  name: string;
  email: string;
  department: string;
  role: string;
  profile_pic?: string;
  ent_access?: EntType[];
  employee_code?: string; // Add employee_code field
}

interface HeaderProps {
  user: User;
  requestCounts?: {
    recharge?: number;
    redeem?: number;
    resetPassword?: number;
  };
  onLogout?: () => void;
}

interface SupportCounts {
  intercom: number;
  submitRequest: number;
  players: number;
  transactions: number;
  dispute: number;
}

export const VerificationHeader = ({ user }: { user: User }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [verificationCounts, setVerificationCounts] = useState({
    recharge: 0,
    redeem: 0,
  });
  const [profilePic, setProfilePic] = useState<string | null>(null);

  useEffect(() => {
    const loadProfilePic = async () => {
      // Extract employee code from email (assuming email format is like "700000@example.com")
      const employeeCode = user?.employee_code || "";
      console.log("employeeCode", employeeCode);
      const pic = await fetchUserProfilePic(employeeCode);
      console.log("pic", pic);
      setProfilePic(pic);
    };
    loadProfilePic();
  }, [user?.employee_code]);

  const isActive = useCallback((path: string) => pathname === path, [pathname]);

  // Fetch counts using Supabase
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Fetch verification recharge count
        const { count: rechargeCount, error: rechargeError } = await supabase
          .from("recharge_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "sc_submitted");
        console.log("rechargeCount", rechargeCount);
        if (rechargeError) throw rechargeError;

        // Fetch verification redeem count
        const { count: redeemCount, error: redeemError } = await supabase
          .from("redeem_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "verification_pending");

        if (redeemError) throw redeemError;

        setVerificationCounts({
          recharge: rechargeCount || 0,
          redeem: redeemCount || 0,
        });
      } catch (error) {
        console.error("Error fetching verification counts:", error);
      }
    };

    // Initial fetch
    fetchCounts();
  }, []);

  const navigationItems = useMemo(
    () => [
      {
        href: "/main/verification/search",
        icon: <Search size={18} />,
        label: "Search",
        prefetch: true,
      },
      {
        href: "/main/verification/recharge",
        icon: (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        ),
        label: "Recharge Requests",
        prefetch: true,
      },
      {
        href: "/main/verification/redeem",
        icon: <ArrowUpFromLine size={18} />,
        label: "Redeem Requests",
        prefetch: true,
      },
    ],
    []
  );

  // Prefetch routes on component mount
  useEffect(() => {
    navigationItems.forEach((item) => {
      if (item.prefetch) {
        router.prefetch(item.href);
      }
    });
  }, [navigationItems, router]);

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-[#1a1a1a] border-r border-gray-800/20">
      {/* Logo Section */}
      <div className="h-16 flex items-center px-6 border-b border-gray-800/20 py-12">
        <Link
          href="/main/verification/agent"
          className="text-md font-bold text-white flex items-center gap-2"
        >
          <Image src="/logo.png" alt="Logo" width={40} height={40} />
          <span className="text-md font-bold text-white">
            Techmile Solutions
          </span>
        </Link>
      </div>

      {/* Simplified Navigation Links */}
      <nav className="px-4 mt-6">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            prefetch={item.prefetch}
            className={`flex items-center justify-between px-4 py-2.5 text-sm rounded-lg transition-all duration-200 ${
              isActive(item.href)
                ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/50 transform scale-105"
                : "text-gray-400 hover:text-white hover:bg-gray-800/50 hover:shadow-md hover:scale-102"
            } ${
              item.label === "Search"
                ? "mb-2 bg-blue-500/5 hover:bg-blue-500/10"
                : ""
            }`}
          >
            <div className="flex items-center gap-3">
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </div>
            {item.href === "/main/verification/recharge" && null}
            {item.href === "/main/verification/redeem" && null}
          </Link>
        ))}
      </nav>

      {/* User Profile Section */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="border-t border-gray-800/20 pt-4">
          <div className="flex items-center">
            <Link
              className="flex items-center flex-shrink-0"
              href="/main/verification/agent"
            >
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                  {profilePic ? (
                    <div className="h-8 w-8 rounded-full overflow-hidden">
                      <img
                        src={profilePic}
                        alt={user.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                      {user?.name?.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-300 truncate">
                  {user.name}
                </div>
                <div className="text-xs text-gray-500 truncate flex items-center space-x-1">
                  <span>{user.department}</span>
                  <span>•</span>
                  <span>{user.role}</span>
                </div>
              </div>
            </Link>
            <div className="ml-auto flex space-x-2">
              <Link
                href="/logout"
                className="bg-gray-800 p-1 rounded-lg text-gray-400 hover:text-white"
                title="Logout"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const StandardHeader = ({ user }: { user: User }) => {
  const pathname = usePathname();
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [profilePic, setProfilePic] = useState<string | null>(null);

  useEffect(() => {
    if (user.employee_code) {
      fetchUserProfilePic(user.employee_code).then((pic) => setProfilePic(pic));
    }
  }, [user.employee_code]);

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-[#1a1a1a] border-r border-gray-800/20">
      {/* Logo */}
      <div className="p-6">
        <Link
          href="/"
          className="text-2xl font-bold text-blue-500 flex items-center gap-2"
        >
          {profilePic ? (
            <Image
              src={profilePic}
              alt="Profile"
              width={40}
              height={40}
              className="rounded-full"
            />
          ) : (
            <User size={40} className="text-gray-400" />
          )}
          <span>{user.name}</span>
        </Link>
      </div>

      {/* Search */}
      <div className="px-4 mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search..."
            className="w-full bg-[#0a0a0a] text-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm border border-gray-800/20 focus:outline-none focus:border-blue-500/50"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-4 w-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0118 0z"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4">
        <div className="space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800/50 transition-colors duration-200"
          >
            <svg
              className="mr-3 h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Home
          </Link>
        </div>
      </nav>

      {/* User Profile & Logout */}
      <div className="p-4 border-t border-gray-800/20">
        <div className="flex items-center">
          <Link
            className="flex items-center flex-shrink-0"
            href="/main/standard/agent"
          >
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                {user?.name?.charAt(0)}
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-300">{user.name}</p>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-400">{user.department}</span>
                <span className="text-gray-600">•</span>
                <span className="text-xs text-gray-400">{user.role}</span>
              </div>
            </div>
          </Link>
          <div className="ml-auto flex space-x-2">
            <Link
              href="/logout"
              className="text-xs text-gray-400 hover:text-white transition-colors duration-200"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export const OperationsHeader = ({ user, requestCounts }: HeaderProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [redeemCount, setRedeemCount] = useState(0);
  const [rechargeCount, setRechargeCount] = useState(0);
  const [disputeCount, setDisputeCount] = useState(0);
  const [resetPasswordCount, setResetPasswordCount] = useState(0);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [transferCount, setTransferCount] = useState(0);

  useEffect(() => {
    const loadProfilePic = async () => {
      // Extract employee code from email (assuming email format is like "700000@example.com")
      const employeeCode = user?.employee_code || "";
      console.log("employeeCode", employeeCode);
      const pic = await fetchUserProfilePic(employeeCode);
      console.log("pic", pic);
      setProfilePic(pic);
    };
    loadProfilePic();
  }, [user?.employee_code]);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Fetch reset password requests count
        const { count: resetPasswordCount, error: resetPasswordError } =
          await supabase
            .from("reset_password_requests")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending");
        console.log("resetPasswordCount", resetPasswordCount);
        if (resetPasswordError) throw resetPasswordError;
        setResetPasswordCount(resetPasswordCount || 0);

        // Fetch recharge requests count
        const { count: rechargeCount, error: rechargeError } = await supabase
          .from("recharge_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "sc_processed");

        if (rechargeError) throw rechargeError;
        setRechargeCount(rechargeCount || 0);
        // Fetch recharge requests count
        const { count: transferCount, error: transferError } = await supabase
          .from("transfer_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");

        if (transferError) throw transferError;
        setTransferCount(transferCount || 0);

        const { count: disputeCount, error: disputeError } = await supabase
          .from("recharge_requests")
          .select("*", { count: "exact", head: true })
          .eq("deposit_status", "disputed");

        if (disputeError) throw disputeError;
        setDisputeCount(disputeCount || 0);

        // Fetch redeem requests count
        const { count: redeemCount, error: redeemError } = await supabase
          .from("redeem_requests")
          .select("*", { count: "exact", head: true })
          .in("status", ["pending", "verification_failed"]);

        if (redeemError) throw redeemError;
        console.log(redeemCount);
        setRedeemCount(redeemCount || 0);
      } catch (error) {
        console.error("Error fetching counts:", error);
      }
    };

    // Initial fetch
    fetchCounts();
  }, [user.employee_code]);

  const navigationItems = useMemo(
    () => [
      {
        href: "/main/operations/search",
        icon: <Search size={18} />,
        label: "Search",
        prefetch: true,
      },
      {
        href: "/main/operations/recharge",
        icon: (
          <svg
            className="w-5 h-5 "
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        ),
        label: "Recharge Requests",
        prefetch: true,
      },
      {
        href: "/main/operations/redeem",
        icon: <ArrowUpFromLine size={18} />,
        label: "Redeem Requests",
        prefetch: true,
      },
      {
        href: "/main/operations/reset-player-password",
        icon: <Key size={18} />,
        label: "Reset Password",
        prefetch: true,
      },
      {
        href: "/main/operations/transfer",
        icon: <ArrowDownToLine size={18} />,
        label: "Transfer",
        prefetch: true,
      },
      // {
      //   href: "/main/operations/agent",
      //   icon: <User size={18} />,
      //   label: "Profile",
      //   prefetch: true,
      // },
    ],
    []
  );

  // Prefetch routes
  useEffect(() => {
    navigationItems.forEach((item) => {
      if (item.prefetch) {
        router.prefetch(item.href);
      }
    });
  }, [navigationItems, router]);

  return (
    <div className="fixed inset-y-0 z-50 left-0 w-64 bg-[#1a1a1a] border-r border-gray-800/20">
      {/* Logo Section */}
      <div className="h-16 flex items-center px-6 border-b border-gray-800/20 py-12">
        <Link
          href="/main/operations/agent"
          className="text-md font-bold text-white flex items-center gap-2"
        >
          <Image src="/logo.png" alt="Logo" width={40} height={40} />
          <span className="text-md font-bold text-white">
            Techmile Solutions
          </span>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="px-4 mt-6 ">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center bo text-start justify-between px-1  py-2.5 text-sm rounded-lg transition-all duration-200  ${
              pathname === item.href
                ? "bg-gradient-to-r px-4 from-blue-600 to-blue-400 text-white shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/50 transform scale-105"
                : "text-gray-400 hover:text-white px-4 hover:bg-gray-800/50 hover:shadow-md hover:scale-102 "
            } ${
              item.label === "Search"
                ? "mb-2 bg-blue-500/5 hover:bg-blue-500/10"
                : ""
            }`}
          >
            <div className="flex items-start justify-start gap-3 ">
              {item.icon}
              <span className="font-medium text-start ">{item.label}</span>
            </div>
            {item.href === "/main/operations/recharge" && (
              null
            )}
            {item.href === "/main/operations/redeem" && (
              null
            )}
            {item.href === "/main/operations/reset-player-password" && (
              null
            )}
            {item.href === "/main/operations/transfer" && (
              null
            )}
          </Link>
        ))}
      </nav>

      {/* User Profile Section */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="border-t border-gray-800/20 pt-4">
          <div className="flex items-center">
            <Link
              className="flex items-center flex-shrink-0"
              href="/main/operations/agent"
            >
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                  {profilePic ? (
                    <div className="h-8 w-8 rounded-full overflow-hidden">
                      <img
                        src={profilePic}
                        alt={user.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                      {user?.name?.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-300 truncate">
                  {user.name}
                </div>
                <div className="text-xs text-gray-500 truncate flex items-center space-x-1">
                  <span>{user.department}</span>
                  <span>•</span>
                  <span>{user.role}</span>
                </div>
              </div>
            </Link>
            <div className="ml-auto flex space-x-2">
              <Link
                href="/logout"
                className="bg-gray-800 p-1 rounded-lg text-gray-400 hover:text-white"
                title="Logout"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FinanceHeader = ({ user }: { user: User }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [userRole, setUserRole] = useState("");
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [financeCounts, setFinanceCounts] = useState({
    pendingConfirmation: 0,
    pendingRedeem: 0,
    pendingRecharge: 0,
  });
  const [profilePic, setProfilePic] = useState<string | null>(null);

  // Get user role only once on mount
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const { role } = JSON.parse(userData);
      setUserRole(role);
    }
  }, []);

  useEffect(() => {
    const loadProfilePic = async () => {
      // Extract employee code from email (assuming email format is like "700000@example.com")
      const employeeCode = user?.employee_code || "";
      const pic = await fetchUserProfilePic(employeeCode);
      setProfilePic(pic);
    };
    loadProfilePic();
  }, [user?.employee_code]);

  // Fetch counts using Supabase
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Fetch pending confirmation count
        const { count: confirmationCount, error: confirmationError } =
          await supabase
            .from("recharge_requests")
            .select("*", { count: "exact", head: true })
            .eq("deposit_status", "paid")
            .is("assigned_redeem", null);
        if (confirmationError) throw confirmationError;
        console.log("confirmationCount---->", confirmationCount);

        // Fetch pending redeem count
        const { count: redeemCount, error: redeemError } = await supabase
          .from("redeem_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "queued");

        if (redeemError) throw redeemError;

        // Fetch pending recharge count
        const { count: rechargeCount, error: rechargeError } = await supabase
          .from("recharge_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");

        if (rechargeError) throw rechargeError;

        setFinanceCounts({
          pendingConfirmation: confirmationCount || 0,
          pendingRedeem: redeemCount || 0,
          pendingRecharge: rechargeCount || 0,
        });
      } catch (error) {
        console.error("Error fetching finance counts:", error);
      }
    };

    // Initial fetch
    fetchCounts();
  }, [user.employee_code]);

  const navigationItems = useMemo(
    () => [
      {
        href: "/main/finance/search",
        icon: <Search size={18} />,
        label: "Search",
        prefetch: true,
      },
      {
        href: "/main/finance/pending-confirmation",
        icon: <CheckCircle size={18} />,
        label: "Confirmations",
        prefetch: true,
        count: financeCounts.pendingConfirmation,
      },

      {
        href: "/main/finance/recharge",
        icon: <CircleDotDashedIcon size={18} />,
        label: "Recharge Queue",
        prefetch: true,
        count: financeCounts.pendingRecharge,
      },
      {
        href: "/main/finance/redeem",
        icon: <CircleDollarSign size={18} />,
        label: "Redeem Queue",
        prefetch: true,
        count: financeCounts.pendingRedeem,
      },
      {
        href: "/main/finance/cashtags",
        icon: <Wallet size={18} />,
        label: "Cashtag List",
        prefetch: true,
      },

      // {
      //   href: "/main/finance/agent",
      //   icon: <User size={18} />,
      //   label: "Profile ",
      //   prefetch: true
      // },
      ...(user.role === "Manager"
        ? [
            {
              href: "/main/finance/users",
              icon: <Users size={18} />,
              label: "Team Members",
              prefetch: true,
            },
          ]
        : []),
    ],
    [user.role, financeCounts]
  );

  // Prefetch routes
  useEffect(() => {
    navigationItems.forEach((item) => {
      if (item.prefetch) {
        router.prefetch(item.href);
      }
    });
  }, [navigationItems, router]);

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-[#1a1a1a] border-r border-gray-800/20">
      {/* Logo Section */}
      <div className="h-16 flex items-center px-6 border-b border-gray-800/20">
        <Link href="/main/finance/queue" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Logo" width={40} height={40} />
          <h1 className="text-md font-bold text-white">Techmile Solutions</h1>
        </Link>
      </div>

      {/* Simplified Navigation Links */}
      <nav className="p-4 space-y-2">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center justify-between px-4 py-2.5 text-sm rounded-lg transition-all duration-200 ${
              pathname === item.href
                ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/50 transform scale-105"
                : "text-gray-400 hover:text-white hover:bg-gray-800/50 hover:shadow-md hover:scale-102"
            } ${
              item.label === "Search"
                ? "mb-2 bg-blue-500/5 hover:bg-blue-500/10"
                : ""
            }`}
          >
            <div className="flex items-center gap-3">
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </div>
            {item.count !== undefined && (
              null
            )}
          </Link>
        ))}
      </nav>

      {/* User Profile Section */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="border-t border-gray-800/20 pt-4">
          <div className="flex items-center">
            <Link
              className="flex items-center flex-shrink-0"
              href="/main/finance/agent"
            >
              <div className="flex-shrink-0">
                {profilePic ? (
                  <div className="h-8 w-8 rounded-full overflow-hidden">
                    <img
                      src={profilePic}
                      alt={user.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                    {user?.name?.charAt(0)}
                  </div>
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white uppercase">
                  {user.name}
                </p>
                <p className="text-xs text-gray-400">{user.role}</p>
              </div>
            </Link>
            <div className="ml-auto flex space-x-2">
              <Link
                href="/logout"
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
                title="Logout"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SupportHeader = ({
  user,
  onLogout,
}: {
  user: User;
  onLogout?: () => void;
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedEnt, setSelectedEnt] = useState<string | null>(null);
  const [isEntDropdownOpen, setIsEntDropdownOpen] = useState(false);
  const [supportCounts, setSupportCounts] = useState<SupportCounts>({
    intercom: 0,
    submitRequest: 0,
    players: 0,
    transactions: 0,
    dispute: 0,
  });
  const [profilePic, setProfilePic] = useState<string | null>(null);

  // Get user's ENT access in database format (ENT-1)
  const userEntAccess = useMemo(() => {
    if (!user?.ent_access) return [];
    return convertEntFormat.arrayToDb(user.ent_access);
  }, [user]);

  // Handle ENT selection with format conversion
  const handleEntSelect = (ent: string | null) => {
    setSelectedEnt(ent);
    setIsEntDropdownOpen(false);

    if (ent) {
      // Store the ENT in database format (ENT-1)
      localStorage.setItem("selectedEnt", ent);
      // Add ENT filter to URL
      const url = new URL(window.location.href);
      url.searchParams.set("ent", ent);
      router.push(url.pathname + url.search);
    } else {
      localStorage.removeItem("selectedEnt");
      // Remove ENT filter from URL
      const url = new URL(window.location.href);
      url.searchParams.delete("ent");
      router.push(url.pathname + url.search);
    }
  };

  // Load selected ENT from localStorage and validate access on mount
  // useEffect(() => {
  //   const savedEnt = localStorage.getItem("selectedEnt");
  //   if (savedEnt && convertEntFormat.hasEntAccess(user, savedEnt)) {
  //     setSelectedEnt(savedEnt);
  //   } else {
  //     localStorage.removeItem("selectedEnt");
  //     setSelectedEnt(null);
  //   }
  // }, [user]);

  // Update counts based on ENT filter
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Create base queries
        let intercomQuery = supabase
          .from("pending_players")
          .select("*", { count: "exact", head: true })
          .eq("registration_status", "pending");

        let submitRequestQuery = supabase
          .from("recharge_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "assigned");

        let disputeQuery = supabase
          .from("recharge_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "disputed");

        // Add ENT filter if selected
        if (selectedEnt) {
          intercomQuery = intercomQuery.eq("team_code", selectedEnt);
          submitRequestQuery = submitRequestQuery.eq("team_code", selectedEnt);
          disputeQuery = disputeQuery.eq("team_code", selectedEnt);
        } else if (userEntAccess.length > 0) {
          // If no specific ENT is selected, filter by all accessible ENTs
          intercomQuery = intercomQuery.in("team_code", userEntAccess);
          submitRequestQuery = submitRequestQuery.in(
            "team_code",
            userEntAccess
          );
          disputeQuery = disputeQuery.in("team_code", userEntAccess);
        }

        // Execute queries
        const [
          { count: intercomCount, error: intercomError },
          { count: submitRequestCount, error: submitRequestError },
          { count: disputeCount, error: disputeError },
        ] = await Promise.all([
          intercomQuery,
          submitRequestQuery,
          disputeQuery,
        ]);

        if (intercomError) throw intercomError;
        if (submitRequestError) throw submitRequestError;
        if (disputeError) throw disputeError;

        setSupportCounts({
          intercom: intercomCount || 0,
          submitRequest: submitRequestCount || 0,
          players: 0,
          transactions: 0,
          dispute: disputeCount || 0,
        });
      } catch (error) {
        console.error("Error fetching support counts:", error);
      }
    };

    fetchCounts();
  }, [selectedEnt, userEntAccess]);

  const navigationItems = useMemo(
    () => [
      {
        href: "/main/support/search",
        icon: <Search size={18} />,
        label: "Search",
        prefetch: true,
      },
      {
        href: "/main/support/submit-request",
        icon: <ClipboardList size={18} />,
        label: "Submit Request",
        prefetch: true,
        count: supportCounts.submitRequest,
      },

      {
        href: "/main/support/dashboard",
        icon: <UserPlus size={18} />,
        label: "Dashboard",
        prefetch: true,
        count: supportCounts.intercom,
      },
      {
        href: "/main/support/new-players",
        icon: <UserPlus size={18} />,
        label: "Player Intercom",
        prefetch: true,
        count: supportCounts.intercom,
      },
      {
        href: "/main/support/players",
        icon: <Users size={18} />,
        label: "Player List",
        prefetch: true,
      },
      {
        href: "/main/support/players-activity",
        icon: <Activity size={18} />,
        label: "Player Activity",
        prefetch: true,
      },
      {
        href: "/main/support/feedback",
        icon: <MessageSquare size={18} />,
        label: "Player Feedback",
        prefetch: true,
      },
      {
        href: "/main/support/promotions",
        icon: <CircleDollarSign size={18} />,
        label: "Player Promotion",
        prefetch: true,
      },
      {
        href: "/main/support/dispute",
        icon: <FileText size={18} />,
        label: "Player Disputes",
        prefetch: true,
        count: supportCounts.dispute,
      },
      {
        href: "/main/support/offline-players",
        icon: <Circle size={18} />,
        label: "Offline Players",
        prefetch: true,
      },
      ...(user.role === "Manager" || user.role === "Shift Incharge"
        ? [
            {
              href: "/main/support/team-members",
              icon: <Users size={18} />,
              label: "Team Members",
              prefetch: true,
            },
          ]
        : []),
      // ...(user.role === "Manager" ? [{
      //   href: "/main/support/users",
      //   icon: <Users size={18} />,
      //   label: "Users",
      //   prefetch: true
      // }] : []),
      // {
      //   href: "/main/support/agent",
      //   icon: <User size={18} />,
      //   label: "Profile",
      //   prefetch: true
      // }
    ],
    [user.role, supportCounts]
  );

  useEffect(() => {
    const loadProfilePic = async () => {
      // Extract employee code from email (assuming email format is like "700000@example.com")
      const employeeCode = user?.employee_code || "";
      console.log("employeeCode", employeeCode);
      const pic = await fetchUserProfilePic(employeeCode);
      console.log("pic", pic);
      setProfilePic(pic);
    };
    loadProfilePic();
  }, [user?.employee_code]);

  // Prefetch routes
  useEffect(() => {
    navigationItems.forEach((item) => {
      if (item.prefetch) {
        router.prefetch(item.href);
      }
    });
  }, [navigationItems, router]);

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-[#1a1a1a] border-r border-white/5">
      {/* Logo Section */}
      <div className="flex items-center h-16 px-6 border-b border-white/5">
        <Link
          href="/main/support/new-players"
          className="flex items-center gap-2"
        >
          <Image
            src="/logo.png"
            alt="Techmile Solutions"
            width={50}
            height={50}
          />
          <h1 className="text-md font-bold text-white">Techmile Solutions</h1>
        </Link>
      </div>

      {/* ENT Selection Dropdown */}
      {/* <div className="px-4 py-3 border-b border-white/5">
        <div className="relative">
          <button
            onClick={() => setIsEntDropdownOpen(!isEntDropdownOpen)}
            className="w-full px-4 py-2 text-sm text-left text-gray-300 bg-black/20 rounded-lg hover:bg-black/30 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-colors flex items-center justify-between"
          >
            <span>{selectedEnt || 'All ENTs'}</span>
            <ChevronDown size={16} className={`transform transition-transform ${isEntDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isEntDropdownOpen && (
            <div className="absolute z-50 w-full mt-1 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-lg overflow-hidden">
              <div className="py-1">
                <button
                  onClick={() => handleEntSelect(null)}
                  className={`w-full px-4 py-2 text-sm text-left ${!selectedEnt ? 'text-blue-500 bg-blue-500/10' : 'text-gray-300 hover:bg-black/20'}`}
                >
                  All ENTs
                </button>
                {userEntAccess.map((ent) => (
                  <button
                    key={ent}
                    onClick={() => handleEntSelect(ent)}
                    className={`w-full px-4 py-2 text-sm text-left ${selectedEnt === ent ? 'text-blue-500 bg-blue-500/10' : 'text-gray-300 hover:bg-black/20'}`}
                  >
                    {ent}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div> */}

      {/* Navigation Links */}
      <nav className="flex-1 p-4">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            href={`${item.href}${selectedEnt ? `?ent=${selectedEnt}` : ""}`}
            className={`flex items-center justify-between px-4 py-2.5 text-sm rounded-lg transition-all duration-200 ${
              pathname === item.href
                ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/50 transform scale-105"
                : "text-gray-400 hover:text-white hover:bg-gray-800/50 hover:shadow-md hover:scale-102"
            } ${
              item.label === "Search"
                ? "mb-2 bg-blue-500/5 hover:bg-blue-500/10"
                : ""
            }`}
          >
            <div className="flex items-center gap-3">
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </div>
            {item.count !== undefined && (
              null
            )}
          </Link>
        ))}
      </nav>

      {/* User Profile Section */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="border-t border-gray-800/20 pt-4">
          <div className="flex items-center">
            <Link
              className="flex items-center flex-shrink-0"
              href="/main/support/agent"
            >
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                  {profilePic ? (
                    <div className="h-8 w-8 rounded-full overflow-hidden">
                      <img
                        src={profilePic}
                        alt={user.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                      {user?.name?.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-300 truncate">
                  {user.name}
                </div>
                <div className="text-xs text-gray-500 truncate flex items-center space-x-1">
                  <span>{user.department}</span>
                  <span>•</span>
                  <span>{user.role}</span>
                  {/* <span>•</span>
                  <span>
                    {Array.isArray(user.ent_access) && user.ent_access.length > 0 
                      ? (user.ent_access.length >= 3 ? 'All ENT' : user.ent_access.join(', '))
                      : 'No ENT Access'}
                  </span> */}
                </div>
              </div>
            </Link>
            <div className="ml-auto flex space-x-2">
              <Link
                href="/logout"
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-md w-full"
              >
                <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-md w-full">
                  <DoorOpen size={18} />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminHeader = ({ user }: { user: User }) => {
  const pathname = usePathname();
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Add hooks for getting counts
  const { players: pendingPlayers } = usePlayerRequests(1);
  const { redeemRequests } = useVerificationRedeem();
  const { rechargeRequests } = useVerificationRecharge();

  const [financeCounts, setFinanceCounts] = useState({
    pendingConfirmation: 0,
    pendingRedeem: 0,
    pendingRecharge: 0,
  });
  const [operationsCounts, setOperationsCounts] = useState({
    transfer: 0,
    recharge: 0,
    redeem: 0,
    resetPassword: 0,
  });
  const [supportCounts, setSupportCounts] = useState<SupportCounts>({
    intercom: 0,
    submitRequest: 0,
    players: 0,
    transactions: 0,
    dispute: 0,
  });
  const [verificationCounts, setVerificationCounts] = useState({
    recharge: 0,
    redeem: 0,
  });

  const [profilePic, setProfilePic] = useState<string | null>(null);

  useEffect(() => {
    const loadProfilePic = async () => {
      // Extract employee code from email (assuming email format is like "700000@example.com")
      const employeeCode = user?.employee_code || "";
      const pic = await fetchUserProfilePic(employeeCode);
      setProfilePic(pic);
    };
    loadProfilePic();
  }, [user?.employee_code]);

  // Fetch verification counts using Supabase
  useEffect(() => {
    const fetchVerificationCounts = async () => {
      try {
        // Fetch verification recharge count
        const { count: rechargeCount, error: rechargeError } = await supabase
          .from("recharge_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "sc_submitted");

        if (rechargeError) throw rechargeError;

        // Fetch verification redeem count
        const { count: redeemCount, error: redeemError } = await supabase
          .from("redeem_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "verification_pending");

        if (redeemError) throw redeemError;

        setVerificationCounts({
          recharge: rechargeCount || 0,
          redeem: redeemCount || 0,
        });
      } catch (error) {
        console.error("Error fetching verification counts:", error);
      }
    };

    // Initial fetch
    fetchVerificationCounts();

    // Set up realtime subscriptions with specific filters
    const rechargeChannel = supabase
      .channel("admin_verification_recharge_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "recharge_requests",
        },
        () => fetchVerificationCounts
      )
      .subscribe();

    const redeemChannel = supabase
      .channel("admin_verification_redeem_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "redeem_requests",
        },
        () => fetchVerificationCounts
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      rechargeChannel.unsubscribe();
      redeemChannel.unsubscribe();
    };
  }, []);

  // Fetch all counts using Supabase
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Fetch intercom count (pending players)
        const { count: intercomCount, error: intercomError } = await supabase
          .from("pending_players")
          .select("*", { count: "exact", head: true })
          .eq("registration_status", "pending");

        if (intercomError) throw intercomError;

        // Fetch submit request count
        const { count: submitRequestCount, error: submitRequestError } =
          await supabase
            .from("recharge_requests")
            .select("*", { count: "exact", head: true })
            .eq("status", "assigned");

        if (submitRequestError) throw submitRequestError;

        // Fetch dispute count - Updated to use recharge_requests table with disputed status
        const { count: disputeCount, error: disputeError } = await supabase
          .from("recharge_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "disputed");

        if (disputeError) throw disputeError;

        // Update support counts
        setSupportCounts((prev) => ({
          ...prev,
          intercom: intercomCount || 0,
          submitRequest: submitRequestCount || 0,
          players: pendingPlayers.length || 0,
          transactions: 0,
          dispute: disputeCount || 0,
        }));

        // Reset password requests count
        const { count: resetPasswordCount, error: resetPasswordError } =
          await supabase
            .from("reset_password_requests")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending");

        if (resetPasswordError) throw resetPasswordError;

        // Recharge requests count for operations
        const { count: operationsRechargeCount, error: rechargeError } =
          await supabase
            .from("recharge_requests")
            .select("*", { count: "exact", head: true })
            .eq("status", "sc_processed");

        if (rechargeError) throw rechargeError;

        // Redeem requests count for operations
        const { count: operationsRedeemCount, error: redeemError } =
          await supabase
            .from("redeem_requests")
            .select("*", { count: "exact", head: true })
            .in("status", ["pending", "verification_failed"]);

        if (redeemError) throw redeemError;

        // Transfer requests count for operations
        const { count: operationsTransferCount, error: transferError } =
          await supabase
            .from("transfer_requests")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending");

        // Update operations counts
        setOperationsCounts({
          resetPassword: resetPasswordCount || 0,
          recharge: operationsRechargeCount || 0,
          redeem: operationsRedeemCount || 0,
          transfer: operationsTransferCount || 0,
        });

        // Finance pending recharge count
        const {
          count: financePendingRechargeCount,
          error: financePendingRechargeError,
        } = await supabase
          .from("recharge_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");

        if (financePendingRechargeError) throw financePendingRechargeError;

        // Finance pending confirmation count
        const {
          count: financePendingConfirmationCount,
          error: financePendingConfirmationError,
        } = await supabase
          .from("recharge_requests")
          .select("*", { count: "exact", head: true })
          .eq("deposit_status", "paid")
          .is("assigned_redeem", null);

 

        if (financePendingConfirmationError)
          throw financePendingConfirmationError;

        // Finance processed redeem count
        const {
          count: financeProcessedRedeemCount,
          error: financeProcessedRedeemError,
        } = await supabase
          .from("redeem_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "queued");

        if (financeProcessedRedeemError) throw financeProcessedRedeemError;

        // Update finance counts
        setFinanceCounts({
          pendingConfirmation: financePendingConfirmationCount || 0,
          pendingRedeem: financeProcessedRedeemCount || 0,
          pendingRecharge: financePendingRechargeCount || 0,
        });

        // Update support counts from existing hook data - Remove dispute reset
        setSupportCounts((prev) => ({
          ...prev,
          transactions: 0,
        }));
      } catch (error) {
        console.error("Error fetching counts:", error);
      }
    };

    // Initial fetch
    fetchCounts();

    // Set up realtime subscriptions
    const resetPasswordChannel = supabase
      .channel("reset_password_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reset_password_requests" },
        () => fetchCounts()
      )
      .subscribe();

    const rechargeChannel = supabase
      .channel("recharge_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recharge_requests" },
        () => fetchCounts()
      )
      .subscribe();

    const redeemChannel = supabase
      .channel("redeem_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "redeem_requests" },
        () => fetchCounts()
      )
      .subscribe();

    // Update disputes channel to watch recharge_requests table
    const disputesChannel = supabase
      .channel("admin_disputes_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recharge_requests" },
        fetchCounts
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      resetPasswordChannel.unsubscribe();
      rechargeChannel.unsubscribe();
      redeemChannel.unsubscribe();
      disputesChannel.unsubscribe();
    };
  }, [pendingPlayers]);

  // Function to check if current path is in a section
  const isInSection = (section: string): boolean => {
    const sectionPaths: { [key: string]: string[] } = {
      admin: [
        "/main/users",
        "/main/activity-logs",
        "/main/search",
        "/main/config",
      ],
      finance: [
        "/main/finance/cashtags",
        "/main/finance/pending-confirmation",
        "/main/finance/redeem",
        "/main/finance/recharge",
      ],
      operations: [
        "/main/operations/recharge",
        "/main/operations/redeem",
        "/main/operations/reset-player-password",
        "/main/operations/transfer",
      ],
      support: [
        "/main/support/players",
        "/main/support/search",
        "/main/support/players-activity",
        "/main/support/submit-request",
        "/main/support/feedback",
        "/main/support/new-players",
        "/main/support/promotions",
        "/main/support/dispute",
        "/main/support/team-members",
      ],
      verification: [
        "/main/verification/recharge",
        "/main/verification/redeem",
      ],
    };

    return sectionPaths[section]?.some((path) => pathname === path) || false;
  };

  // Auto expand section based on current path
  useEffect(() => {
    Object.keys({
      admin: "",
      finance: "",
      operations: "",
      support: "",
      verification: "",
    }).forEach((section) => {
      if (isInSection(section)) {
        setExpandedSection(section);
      }
    });
  }, [pathname]);

  const toggleSection = (section: string) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
    }
  };

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-[#1a1a1a] border-r border-gray-800/20">
      {/* Logo Section */}
      <div className="h-16 flex items-center px-6 border-b border-gray-800/20">
        <Link href="/main/dashboard" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Techmile Solutions"
            width={40}
            height={40}
          />
          <h1 className="text-md font-bold text-white">Techmile Solutions</h1>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {/* Admin Section - Only visible for admin department + admin role OR executive role */}

        {user.role === "Executive" && (
          <Link
            href="/main/support/search"
            className={`flex items-center justify-between px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
              pathname === "/main/support/team-members"
                ? "bg-blue-500/10 text-blue-500 transform scale-105 shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/50"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <Search size={18} />
              <span>Search</span>
            </div>
          </Link>
        )}

        {(user.role === "Executive" ||
          (user.department === "Admin" && user.role === "Admin")) && (
          <div>
            {/* <button
              onClick={() => toggleSection("admin")}
              className={`w-full flex items-center justify-between px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                isInSection("admin") || expandedSection === "admin"
                  ? "bg-blue-500/10 text-blue-500"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <Shield size={18} />
                <span className="font-semibold">Admin</span>
              </div>
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${
                  expandedSection === "admin" ? "transform rotate-180" : ""
                }`}
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
            </button> */}
            {/* {expandedSection === "admin"  && ( */}
            <div className="mt-2 ml- space-y-1">
              <Link
                href="/main/users"
                className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                  pathname === "/main/users"
                    ? "bg-blue-500/10 text-blue-500 transform scale-105 shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/50"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <Users size={18} />
                <span>Users</span>
              </Link>
              <Link
                href="/main/activity-logs"
                className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                  pathname === "/main/activity-logs"
                    ? "bg-blue-500/10 text-blue-500 transform scale-105 shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/50"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <Activity size={18} />
                <span>Activity Logs</span>
              </Link>
              {user.role === "Admin" && (
                <Link
                  href="/main/config"
                  className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                    pathname === "/main/config"
                      ? "bg-blue-500/10 text-blue-500 transform scale-105 shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/50"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  <ChevronsLeftRight size={18} />
                  <span>Config </span>
                </Link>
              )}
              {/* {user.role === 'Admin' || user.role === 'Executive' && (
                <Link
                  href="/main/activity-logs"
                  className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                    pathname === "/main/activity-logs"
                      ? "bg-blue-500/10 text-blue-500 transform scale-105 shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/50"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  <Activity size={18} />
                  <span>Config</span>
                </Link>
                )} */}
            </div>
            {/* <div className="mt-2 ml- space-y-1">
                <Link
                  href="/main/users"
                  className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                    pathname === "/main/users"
                      ? "bg-blue-500/10 text-blue-500 transform scale-105 shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/50"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  <Users size={18} />
                  <span>Manage Users</span>
                </Link>
                {user.role === 'Admin' && (   

                <Link
                  href="/main/activity-logs"
                  className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                    pathname === "/main/activity-logs"
                      ? "bg-blue-500/10 text-blue-500 transform scale-105 shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/50"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  <Activity size={18} />
                  <span>Activity Logs</span>
                </Link>
                )}
                {user.role === 'Admin' && (
                <Link
                  href="/main/activity-logs"
                  className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                    pathname === "/main/activity-logs"
                      ? "bg-blue-500/10 text-blue-500 transform scale-105 shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/50"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  <Activity size={18} />
                  <span>Config</span>
                </Link>
                )}
              </div> */}
            {/* )} */}
          </div>
        )}

        {/* Other sections - Only visible for executive role */}
        {user.role === "Executive" && (
          <>
            {/* Operations Section */}
            <div>
              <button
                onClick={() => toggleSection("operations")}
                className={`w-full flex items-center justify-between px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                  isInSection("operations") || expandedSection === "operations"
                    ? "bg-blue-500/10 text-blue-500"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Settings size={18} />
                  <span className="font-semibold">Operations</span>
                </div>
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${
                    expandedSection === "operations"
                      ? "transform rotate-180"
                      : ""
                  }`}
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
              {expandedSection === "operations" && (
                <div className="mt-2 ml-4 space-y-1">
                  <Link
                    href="/main/operations/recharge"
                    className={`flex items-center justify-between px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                      pathname === "/main/operations/recharge"
                        ? "bg-blue-500/10 text-blue-500 transform scale-105 shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/50"
                        : "text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ArrowDownToLine size={18} />
                      <span>Recharge</span>
                    </div>
                    {null}
                  </Link>
                  <Link
                    href="/main/operations/redeem"
                    className={`flex items-center justify-between px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                      pathname === "/main/operations/redeem"
                        ? "bg-blue-500/10 text-blue-500"
                        : "text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ArrowUpFromLine size={18} />
                      <span>Redeem</span>
                    </div>
                    {null}
                  </Link>
                  <Link
                    href="/main/operations/reset-player-password"
                    className={`flex items-center justify-between px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                      pathname === "/main/operations/reset-player-password"
                        ? "bg-blue-500/10 text-blue-500 transform scale-105 shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/50"
                        : "text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Key size={18} />
                      <span>Reset Password</span>
                    </div>
                    {null}
                  </Link>
                  <Link
                    href="/main/operations/transfer"
                    className={`flex items-center justify-between px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                      pathname === "/main/operations/transfer"
                        ? "bg-blue-500/10 text-blue-500 transform scale-105 shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/50"
                        : "text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ArrowDownToLine size={18} />
                      <span>Transfer</span>
                    </div>
                    {null}
                  </Link>
                </div>
              )}
            </div>

            {/* Verification Section */}
            <div>
              <button
                onClick={() => toggleSection("verification")}
                className={`w-full flex items-center justify-between px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                  isInSection("verification") ||
                  expandedSection === "verification"
                    ? "bg-blue-500/10 text-blue-500"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} />
                  <span className="font-semibold">Verification</span>
                </div>
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${
                    expandedSection === "verification"
                      ? "transform rotate-180" : ""
                  }`}
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
              {expandedSection === "verification" && (
                <div className="mt-2 ml-4 space-y-1">
                  <Link
                    href="/main/verification/recharge"
                    className={`flex items-center justify-between px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                      pathname === "/main/verification/recharge"
                        ? "bg-blue-500/10 text-blue-500 transform scale-105 shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/50"
                        : "text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ArrowDownToLine size={18} />
                      <span>Recharge</span>
                    </div>
                    {null}
                  </Link>
                  <Link
                    href="/main/verification/redeem"
                    className={`flex items-center justify-between px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                      pathname === "/main/verification/redeem"
                        ? "bg-blue-500/10 text-blue-500 transform scale-105 shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/50"
                        : "text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ArrowUpFromLine size={18} />
                      <span>Redeem</span>
                    </div>
                    {null}
                  </Link>
                </div>
              )}
            </div>

            {/* Finance Section */}
            <div>
              <button
                onClick={() => toggleSection("finance")}
                className={`w-full flex items-center justify-between px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                  isInSection("finance") || expandedSection === "finance"
                    ? "bg-blue-500/10 text-blue-500"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <DollarSign size={18} />
                  <span className="font-semibold">Finance</span>
                </div>
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${
                    expandedSection === "finance" ? "transform rotate-180" : ""
                  }`}
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
              {expandedSection === "finance" && (
                <div className="mt-2 ml-4 space-y-1">
                  <Link
                    href="/main/finance/cashtags"
                    className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                      pathname.includes("/main/finance/cashtags")
                        ? "bg-blue-500/10 text-blue-500 transform scale-105 shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/50"
                        : "text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                  >
                    <Wallet size={18} />
                    <span>Cashtag List</span>
                  </Link>
                  <Link
                    href="/main/finance/recharge"
                    className={`flex items-center justify-between px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                      pathname === "/main/finance/recharge"
                        ? "bg-blue-500/10 text-blue-500 transform scale-105 shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/50"
                        : "text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ArrowDownToLine size={18} />
                      <span>Recharge Queue</span>
                    </div>
                    {null}
                  </Link>
                  <Link
                    href="/main/finance/redeem"
                    className={`flex items-center justify-between px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                      pathname === "/main/finance/redeem"
                        ? "bg-blue-500/10 text-blue-500"
                        : "text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CircleDollarSign size={18} />
                      <span>Redeem Queue</span>
                    </div>
                    {null}
                  </Link>
                  <Link
                    href="/main/finance/pending-confirmation"
                    className={`flex items-center justify-between px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                      pathname === "/main/finance/pending-confirmation"
                        ? "bg-blue-500/10 text-blue-500"
                        : "text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle size={18} />
                      <span>Confirmations</span>
                    </div>
                    {null}
                  </Link>
                </div>
              )}
            </div>

            {/* Support Section */}
            <div>
              <button
                onClick={() => toggleSection("support")}
                className={`w-full flex items-center justify-between px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                  isInSection("support") || expandedSection === "support"
                    ? "bg-blue-500/10 text-blue-500"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare size={18} />
                  <span className="font-semibold">Customer Support</span>
                </div>
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${
                    expandedSection === "support" ? "transform rotate-180" : ""
                  }`}
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
              {expandedSection === "support" && (
                <div className="mt-2 ml-4 space-y-1">
                  <Link
                    href="/main/support/new-players"
                    className={`flex items-center justify-between px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                      pathname === "/main/support/new-players"
                        ? "bg-blue-500/10 text-blue-500 transform scale-105 shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/50"
                        : "text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <UserPlus size={18} />
                      <span>Intercom</span>
                    </div>
                    {null}
                  </Link>
                  <Link
                    href="/main/support/submit-request"
                    className={`flex items-center justify-between px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                      pathname === "/main/support/submit-request"
                        ? "bg-blue-500/10 text-blue-500 transform scale-105 shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/50"
                        : "text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ClipboardList size={18} />
                      <span>Submit Request</span>
                    </div>
                    {null}
                  </Link>
                  <Link
                    href="/main/support/players"
                    className={`flex items-center justify-between px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                      pathname === "/main/support/players"
                        ? "bg-blue-500/10 text-blue-500 transform scale-105 shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/50"
                        : "text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Users size={18} />
                      <span>Player List</span>
                    </div>
                    {null}
                  </Link>
                  <Link
                    href="/main/support/players-activity"
                    className={`flex items-center justify-between px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                      pathname === "/main/support/players-activity"
                        ? "bg-blue-500/10 text-blue-500 transform scale-105 shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/50"
                        : "text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Activity size={18} />
                      <span>Player Activity</span>
                    </div>
                    {null}
                  </Link>
                  <Link
                    href="/main/support/dispute"
                    className={`flex items-center justify-between px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                      pathname === "/main/support/dispute"
                        ? "bg-blue-500/10 text-blue-500 transform scale-105 shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/50"
                        : "text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={18} />
                      <span>Player Dispute</span>
                    </div>
                    {null}
                  </Link>

                  <Link
                    href="/main/support/feedback"
                    className={`flex items-center justify-between px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                      pathname === "/main/support/feedback"
                        ? "bg-blue-500/10 text-blue-500 transform scale-105 shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/50"
                        : "text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare size={18} />
                      <span>Player Feedback</span>
                    </div>
                  </Link>
                  <Link
                    href="/main/support/promotions"
                    className={`flex items-center justify-between px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                      pathname === "/main/support/promotions"
                        ? "bg-blue-500/10 text-blue-500 transform scale-105 shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/50"
                        : "text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CircleDollarSign size={18} />
                      <span>Player Promotion</span>
                    </div>
                  </Link>
                  <Link
                    href="/main/support/offline-players"
                    className={`flex items-center justify-between px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                      pathname === "/main/support/offline-players"
                        ? "bg-blue-500/10 text-blue-500 transform scale-105 shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/50"
                        : "text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Circle size={18} />
                      <span>Offline Players</span>
                    </div>
                  </Link>
                  <Link
                    href="/main/support/team-members"
                    className={`flex items-center justify-between px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                      pathname === "/main/support/team-members"
                        ? "bg-blue-500/10 text-blue-500 transform scale-105 shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/50"
                        : "text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Users size={18} />
                      <span>Team Members</span>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </>
        )}
      </nav>

      {/* User Profile */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="border-t border-gray-800/20 pt-4">
          <div className="flex items-center">
            <Link href="/main/agent" className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                  {profilePic ? (
                    <div className="h-8 w-8 rounded-full overflow-hidden">
                      <img
                        src={profilePic}
                        alt={user.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                      {user?.name?.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white  uppercase">
                  {user.name}
                </p>
                <p className="text-xs text-gray-400">{user.role}</p>
              </div>
            </Link>
            <div className="ml-auto flex space-x-2">
              <Link
                href="/logout"
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
                title="Logout"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AuditHeader = ({ user }: { user: User }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [auditCounts, setAuditCounts] = useState({
    playerActivity: 0,
    transactions: 0,
  });

  const isActive = useCallback((path: string) => pathname === path, [pathname]);

  // Fetch counts using Supabase
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Add your count fetching logic here for audit activities
        // Example:
        const { count: playerActivityCount, error: playerActivityError } =
          await supabase
            .from("player_activity")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending_review");

        if (playerActivityError) throw playerActivityError;

        setAuditCounts({
          playerActivity: playerActivityCount || 0,
          transactions: 0, // Add transaction count logic here
        });
      } catch (error) {
        console.error("Error fetching audit counts:", error);
      }
    };

    // Initial fetch
    fetchCounts();
  }, []);

  const [profilePic, setProfilePic] = useState<string | null>(null);

  useEffect(() => {
    const loadProfilePic = async () => {
      // Extract employee code from email (assuming email format is like "700000@example.com")
      const employeeCode = user?.employee_code || "";
      console.log("employeeCode", employeeCode);
      const pic = await fetchUserProfilePic(employeeCode);
      console.log("pic", pic);
      setProfilePic(pic);
    };
    loadProfilePic();
  }, [user?.employee_code]);

  const navigationItems = useMemo(
    () => [
      // {
      //   href: "/main/audit/search",
      //   icon: <Search size={18} />,
      //   label: "Search",
      //   prefetch: true
      // },
      {
        href: "/main/audit/player-activity",
        icon: <Activity size={18} />,
        label: "Player Activity",
        count: auditCounts.playerActivity,
        prefetch: true,
      },
      // {
      //   href: "/main/audit/transactions",
      //   icon: <CircleDollarSign size={18} />,
      //   label: "Transactions",
      //   count: auditCounts.transactions,
      //   prefetch: true
      // },
      // {
      //   href: "/main/audit/reports",
      //   icon: <FileText size={18} />,
      //   label: "Reports",
      //   prefetch: true
      // },
      // {
      //   href: "/main/audit/agent",
      //   icon: <User size={18} />,
      //   label: "Profile"
      // }
    ],
    [auditCounts]
  );

  // Prefetch routes on component mount
  useEffect(() => {
    navigationItems.forEach((item) => {
      if (item.prefetch) {
        router.prefetch(item.href);
      }
    });
  }, [navigationItems, router]);

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-[#1a1a1a] border-r border-gray-800/20">
      {/* Logo Section */}
      <div className="h-16 flex items-center px-6 border-b border-gray-800/20">
        <Link
          href="/main/audit/player-activity"
          className="text-md font-bold text-white flex items-center gap-2"
        >
          <ShieldCheck className="w-6 h-6 text-blue-500" />
          <span>Audit Dashboard</span>
        </Link>
      </div>

      {/* Navigation Section */}
      <div className="px-3 py-4">
        <nav className="space-y-1">
          {navigationItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? "bg-blue-500/10 text-blue-500"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/50"
              }`}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                {item.label}
              </div>
              {item.count !== undefined && (
                null
              )}
            </a>
          ))}
        </nav>
      </div>

      {/* User Section */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="px-3 py-2 rounded-lg bg-gray-800/50">
          <div className="flex items-center gap-3">
            {profilePic ? (
              <div className="h-8 w-8 rounded-full overflow-hidden">
                <img
                  src={profilePic}
                  alt={user.name}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                {user?.name?.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.name}
              </p>
              <p className="text-xs text-gray-400 truncate">{user.role}</p>
            </div>
            <div className="ml-auto flex space-x-2">
              <Link
                href="/logout"
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
                title="Logout"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Temporarily disable CountBadge functionality
const CountBadge = () => null;
