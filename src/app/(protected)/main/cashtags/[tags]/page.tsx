"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FiEdit2 } from "react-icons/fi";
import { AdminHeader, FinanceHeader } from "@/app/components/Headers";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

interface ActivityLog {
  date: string;
  activityType: string;
  transactionId: string;
  amount: number;
  before: number;
  after: number;
  initiatedBy: string;
  details: string;
}

interface TagData {
  cashtag: string;
  name: string;
  status: "Active" | "Inactive";
  procurementCost: number;
  procuredBy: string;
  procuredAt: string;
  lastActive: string;
  balance: number;
  transactions: number;
  received: number;
  withdrawn: number;
  personalInfo: {
    cashtagId: string;
    fullName: string;
    last4SS: string;
    address: string;
  };
  accountDetails: {
    accountType: string;
    verificationStatus: string;
    email: string;
    pin: string;
  };
  withdrawDetails: {
    linkedCard: string;
    linkedBank: string;
    cashCard: string;
  };
}

interface User {
  name: string;
  email: string;
  department: string;
  role: string;
}

interface PageProps {
  params: {
    tags: string;
  };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function CashtagPage({ params }: PageProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tagData, setTagData] = useState<TagData | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [timeFilter, setTimeFilter] = useState("Last 24 Hours");

  useEffect(() => {
    const token = Cookies.get("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    const fetchTags = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}api/companytag/get-company-tag/${params.tags}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch tag details");
        }

        const data = await response.json();
        if (data.success) {
          setTagData(data.data);
        }

        // Fetch activity logs
        const logsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}api/companytag/get-tag-activities/${params.tags}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (logsResponse.ok) {
          const logsData = await logsResponse.json();
          if (logsData.success) {
            setActivityLogs(logsData.data);
          }
        }
      } catch (error) {
        console.error("Error fetching tag data:", error);
        // You might want to show an error message to the user here
      }
    };

    try {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.department !== "Finance") {
        router.push("/login");
        return;
      }
      setUser(parsedUser);
      fetchTags();
    } catch (error) {
      console.error("Error parsing user data:", error);
      router.push("/login");
    }
  }, [router, params.tags]);



  if (!tagData || !user) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {<FinanceHeader user={user} />}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto space-y-6"
      >
        {/* Header Section */}
        <div className="bg-gray-800 rounded-lg p-6 transform hover:scale-[1.02] transition-transform duration-300 shadow-xl">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">${tagData.cashtag}</h1>
              <p className="text-gray-400">{tagData.name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <span
                className={`px-3 py-1 rounded-full ${
                  tagData.status === "Active" ? "bg-green-600" : "bg-red-600"
                }`}
              >
                {tagData.status}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            {
              label: "CURRENT BALANCE",
              value: `$${tagData.balance.toLocaleString()}`,
            },
            { label: "TRANSACTIONS", value: tagData.transactions },
            {
              label: "RECEIVED",
              value: `$${tagData.received.toLocaleString()}`,
            },
            {
              label: "WITHDRAWN",
              value: `$${tagData.withdrawn.toLocaleString()}`,
            },
          ].map((stat, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.05 }}
              className="bg-gray-800 p-6 rounded-lg transform hover:shadow-2xl transition-all duration-300"
            >
              <h3 className="text-sm text-gray-400">{stat.label}</h3>
              <p className="text-2xl font-bold mt-2">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Personal Information */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gray-800 p-6 rounded-lg"
          >
            <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
            <div className="space-y-3">
              <InfoRow
                label="Cashtag ID"
                value={tagData.personalInfo.cashtagId}
              />
              <InfoRow
                label="Full Name"
                value={tagData.personalInfo.fullName}
              />
              <InfoRow
                label="Last 4 SS"
                value={`•••• ${tagData.personalInfo.last4SS}`}
              />
              <InfoRow label="Address" value={tagData.personalInfo.address} />
            </div>
          </motion.div>

          {/* Account Details */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gray-800 p-6 rounded-lg"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Account Details</h2>
              <button className="text-blue-400 hover:text-blue-300">
                <FiEdit2 size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <InfoRow
                label="Account Type"
                value={tagData.accountDetails.accountType}
              />
              <InfoRow
                label="Verification Status"
                value={tagData.accountDetails.verificationStatus}
              />
              <InfoRow label="Email" value={tagData.accountDetails.email} />
              <InfoRow label="Account PIN" value="••••" />
            </div>
          </motion.div>

          {/* Withdraw Details */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gray-800 p-6 rounded-lg"
          >
            <h2 className="text-xl font-semibold mb-4">Withdraw Details</h2>
            <div className="space-y-3">
              <InfoRow
                label="Linked Card"
                value={tagData.withdrawDetails.linkedCard}
              />
              <InfoRow
                label="Linked Bank"
                value={tagData.withdrawDetails.linkedBank}
              />
              <InfoRow
                label="Cash Card"
                value={tagData.withdrawDetails.cashCard}
                valueClassName="text-green-400"
              />
            </div>
          </motion.div>
        </div>

        {/* Activity Logs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gray-800 p-6 rounded-lg mt-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Activity Logs</h2>
            <div className="flex space-x-4">
              <select
                className="bg-gray-700 border-none rounded-md px-4 py-2"
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
              >
                <option>Last 24 Hours</option>
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-gray-400">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Activity Type</th>
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Before</th>
                  <th className="py-3 px-4">After</th>
                  <th className="py-3 px-4">Initiated By</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody>
                {activityLogs.map((log, index) => (
                  <tr
                    key={index}
                    className="border-t border-gray-700 hover:bg-gray-700/50"
                  >
                    <td className="py-3 px-4">{log.date}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${
                          log.activityType === "Deposit"
                            ? "bg-green-600/20 text-green-400"
                            : log.activityType === "Withdraw"
                            ? "bg-red-600/20 text-red-400"
                            : "bg-blue-600/20 text-blue-400"
                        }`}
                      >
                        {log.activityType}
                      </span>
                    </td>
                    <td className="py-3 px-4">{log.transactionId}</td>
                    <td className="py-3 px-4">
                      <span
                        className={
                          log.amount >= 0 ? "text-green-400" : "text-red-400"
                        }
                      >
                        {log.amount >= 0 ? "+" : ""}
                        {log.amount}
                      </span>
                    </td>
                    <td className="py-3 px-4">${log.before}</td>
                    <td className="py-3 px-4">${log.after}</td>
                    <td className="py-3 px-4">{log.initiatedBy}</td>
                    <td className="py-3 px-4 text-gray-400">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

const InfoRow = ({
  label,
  value,
  valueClassName = "",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) => (
  <div className="flex justify-between items-center">
    <span className="text-gray-400">{label}</span>
    <span className={valueClassName}>{value}</span>
  </div>
);
