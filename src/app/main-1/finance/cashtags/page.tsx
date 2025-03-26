"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { AdminHeader, FinanceHeader } from "@/app/components/Headers";
import {
  CircleDollarSign,
  Pencil,
  ShieldBan,
  ClockIcon,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import AlertModal from "@/app/components/AlertModal";
import { CompanyTag, TagStats, useCashtags } from "@/hooks/useCashtags";
import { User } from "@/types/user";
import { useCTActivityLogger } from '@/hooks/useCTActivityLogger';

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

const FinanceCashtagsPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<
    "Active Tags" | "Inactive Tags" | "Disabled Tags"
  >("Active Tags");
  const [activePaymentMethod, setActivePaymentMethod] = useState<string>("all");
  const [showAddTagModal, setShowAddTagModal] = useState(false);
  const [selectedTag, setSelectedTag] = useState<CompanyTag | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [showAddTagPin, setShowAddTagPin] = useState(false);
  const [showEditTagPin, setShowEditTagPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cashtagError, setCashtagError] = useState("");
  const [loadingActions, setLoadingActions] = useState<{
    [key: string]: boolean;
  }>({});
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: "success" | "error";
    message: string;
  }>({ isOpen: false, type: "success", message: "" });
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [selectedTargetTag, setSelectedTargetTag] = useState<CompanyTag | null>(
    null
  );
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Use our new hook
  const {
    tags,
    loading: tagsLoading,
    error,
    tagStats,
    fetchTags,
    createTag,
    updateTag,
    transferBalance,
    setTags,
    setTagStats,
  } = useCashtags();

  const { logCTActivity } = useCTActivityLogger();

  useEffect(() => {
    const token = Cookies.get("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (
        parsedUser.department !== "Finance" &&
        parsedUser.department !== "Admin"
      ) {
        router.push("/login");
        return;
      }
      setUser(parsedUser);
      fetchTags(); // Fetch tags after user is authenticated
    } catch (error) {
      console.error("Error parsing user data:", error);
      router.push("/login");
    }
  }, [router]);

  const validateCashtag = (value: string) => {
    if (!value.includes("$")) {
      setCashtagError('Cashtag must include a "$" symbol');
      return false;
    }
    setCashtagError("");
    return true;
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTag || !user) return;
    const formData = new FormData(e.currentTarget);
    const cashtag = formData.get("cashtag") as string;

    if (!validateCashtag(cashtag)) {
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: formData.get("name") as string,
        full_name: formData.get("full_name") as string,
        cashtag: cashtag,
        ct_type: formData.get("ct_type") as string,
        pin: formData.get("pin") as string,
        email: formData.get("email") as string,
        address: formData.get("address") as string,
        last4_ss: formData.get("last4_ss") as string,
        procurement_cost: Number(formData.get("procurement_cost")),
        balance: Number(formData.get("currentBalance")),
        linked_card: formData.get("linked_card") as string,
        linked_bank: formData.get("linked_bank") as string,
        cash_card: formData.get("cash_card") as string,
        verification_status: formData.get("verification_status") as string,
        limit: Number(formData.get("limit")),
        status: formData.get("status") as string,
      };

      const { data, error } = await updateTag(selectedTag.id, payload);

      if (error) throw new Error(error);

      // Log the activity
      await logCTActivity({
        ct_id: selectedTag.id,
        tag: cashtag,
        tag_name: payload.name,
        action_type: 'UPDATE',
        action_description: 'Updated cashtag details',
        status: 'success',
        user_id: user.id,
        user_name: user.name,
        user_department: user.department,
        user_role: user.role,
        additional_details: {
          old_data: selectedTag,
          new_data: payload
        }
      });

      setShowEditModal(false);
      setSelectedTag(null);

      // Fetch fresh data after successful edit
      await fetchTags();

      setAlertModal({
        isOpen: true,
        type: "success",
        message: "Tag updated successfully",
      });
    } catch (error) {
      console.error("Error updating tag:", error);
      
      // Log failed activity
      if (selectedTag) {
        await logCTActivity({
          ct_id: selectedTag.id,
          tag: selectedTag.cashtag,
          tag_name: selectedTag.name,
          action_type: 'UPDATE',
          action_description: 'Failed to update cashtag details',
          status: 'failed',
          user_id: user.id,
          user_name: user.name,
          user_department: user.department,
          user_role: user.role,
          additional_details: {
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }

      setAlertModal({
        isOpen: true,
        type: "error",
        message: error instanceof Error ? error.message : "Failed to update tag",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    if (!selectedTag || !user) return;
    try {
      const { data, error } = await updateTag(selectedTag.id, {
        status: "paused",
      });

      if (error) throw new Error(error);

      // Log the activity
      await logCTActivity({
        ct_id: selectedTag.id,
        tag: selectedTag.cashtag,
        tag_name: selectedTag.name,
        action_type: 'PAUSE',
        action_description: 'Paused cashtag',
        status: 'success',
        user_id: user.id,
        user_name: user.name,
        user_department: user.department,
        user_role: user.role,
        balance_before: selectedTag.balance,
        balance_after: selectedTag.balance
      });

      setShowPauseModal(false);
      setSelectedTag(null);

      // Fetch fresh data after successful pause
      await fetchTags();

      setAlertModal({
        isOpen: true,
        type: "success",
        message: "Tag Inactivated successfully",
      });
    } catch (error) {
      console.error("Error pausing tag:", error);

      // Log failed activity
      if (selectedTag) {
        await logCTActivity({
          ct_id: selectedTag.id,
          tag: selectedTag.cashtag,
          tag_name: selectedTag.name,
          action_type: 'PAUSE',
          action_description: 'Failed to pause cashtag',
          status: 'failed',
          user_id: user.id,
          user_name: user.name,
          user_department: user.department,
          user_role: user.role,
          additional_details: {
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }

      setAlertModal({
        isOpen: true,
        type: "error",
        message: error instanceof Error ? error.message : "Failed to inactivate tag",
      });
    }
  };

  const handleDisable = async () => {
    if (!selectedTag || !user) return;
    try {
      const { data, error } = await updateTag(selectedTag.id, {
        status: "disabled",
      });

      if (error) throw new Error(error);

      // Log the activity
      await logCTActivity({
        ct_id: selectedTag.id,
        tag: selectedTag.cashtag,
        tag_name: selectedTag.name,
        action_type: 'DISABLE',
        action_description: 'Disabled cashtag',
        status: 'success',
        user_id: user.id,
        user_name: user.name,
        user_department: user.department,
        user_role: user.role,
        balance_before: selectedTag.balance,
        balance_after: selectedTag.balance
      });

      setShowDisableModal(false);
      setSelectedTag(null);

      // Fetch fresh data after successful disable
      await fetchTags();

      setAlertModal({
        isOpen: true,
        type: "success",
        message: "Tag disabled successfully",
      });
    } catch (error) {
      console.error("Error disabling tag:", error);

      // Log failed activity
      if (selectedTag) {
        await logCTActivity({
          ct_id: selectedTag.id,
          tag: selectedTag.cashtag,
          tag_name: selectedTag.name,
          action_type: 'DISABLE',
          action_description: 'Failed to disable cashtag',
          status: 'failed',
          user_id: user.id,
          user_name: user.name,
          user_department: user.department,
          user_role: user.role,
          additional_details: {
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }

      setAlertModal({
        isOpen: true,
        type: "error",
        message: error instanceof Error ? error.message : "Failed to disable tag",
      });
    }
  };

  const handleEnable = async (tag: CompanyTag) => {
    if (!user) return;
    try {
      setLoadingActions((prev) => ({ ...prev, [`enable-${tag.id}`]: true }));

      const { data, error } = await updateTag(tag.id, {
        status: "active",
      });

      if (error) throw new Error(error);

      // Log the activity
      await logCTActivity({
        ct_id: tag.id,
        tag: tag.cashtag,
        tag_name: tag.name,
        action_type: 'ENABLE',
        action_description: 'Enabled cashtag',
        status: 'success',
        user_id: user.id,
        user_name: user.name,
        user_department: user.department,
        user_role: user.role,
        balance_before: tag.balance,
        balance_after: tag.balance
      });

      // Fetch fresh data after successful enable
      await fetchTags();

      setAlertModal({
        isOpen: true,
        type: "success",
        message: "Tag enabled successfully",
      });
    } catch (error) {
      console.error("Error enabling tag:", error);

      // Log failed activity
      await logCTActivity({
        ct_id: tag.id,
        tag: tag.cashtag,
        tag_name: tag.name,
        action_type: 'ENABLE',
        action_description: 'Failed to enable cashtag',
        status: 'failed',
        user_id: user.id,
        user_name: user.name,
        user_department: user.department,
        user_role: user.role,
        additional_details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      setAlertModal({
        isOpen: true,
        type: "error",
        message: error instanceof Error ? error.message : "Failed to enable tag",
      });
    } finally {
      setLoadingActions((prev) => ({ ...prev, [`enable-${tag.id}`]: false }));
    }
  };

  const EditTagModal = () => {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[#1a1a1a] rounded-lg w-[600px] border border-gray-800">
          <div className="flex justify-between items-center p-4 border-b border-gray-800">
            <h2 className="text-xl font-semibold text-white">Edit Tag</h2>
            <button
              onClick={() => setShowEditModal(false)}
              className="text-gray-400 hover:text-gray-300"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <form onSubmit={handleEdit} className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  CASHTAG NAME
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
                  Full Name
                </label>
                <input
                  type="text"
                  name="full_name"
                  defaultValue={selectedTag?.full_name}
                  required
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Type
                </label>
                <select
                  name="ct_type"
                  defaultValue={selectedTag?.ct_type}
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
                    cashtagError ? "border-red-500" : "border-gray-800"
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
                <div className="relative">
                  <input
                    type={showEditTagPin ? "text" : "password"}
                    name="pin"
                    defaultValue={selectedTag?.pin}
                    required
                    className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditTagPin(!showEditTagPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showEditTagPin ? (
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
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    ) : (
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
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  defaultValue={selectedTag?.address}
                  required
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Last 4 SS
                </label>
                <input
                  type="text"
                  name="last4_ss"
                  defaultValue={selectedTag?.last4_ss}
                  maxLength={4}
                  pattern="\d{4}"
                  required
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Procurement Cost
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400">$</span>
                  <input
                    type="number"
                    name="procurement_cost"
                    defaultValue={selectedTag?.procurement_cost}
                    required
                    min="0"
                    className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg pl-8 pr-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
      
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Linked Card
                </label>
                <input
                  type="text"
                  name="linked_card"
                  defaultValue={selectedTag?.linked_card}
                  required
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Linked Bank
                </label>
                <input
                  type="text"
                  name="linked_bank"
                  defaultValue={selectedTag?.linked_bank}
                  required
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Cash Card Status
                </label>
                <select
                  name="cash_card"
                  defaultValue={selectedTag?.cash_card}
                  required
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select status</option>
                  <option value="activated">Activated</option>
                  <option value="deactivated">Deactivated</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div>
                <label
                  className="block text-sm font-medium text-gray-400 mb-2 uppercase
                "
                >
                  LIMIT
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
                  Verification Status
                </label>
                <select
                  name="verification_status"
                  defaultValue={selectedTag?.verification_status}
                  required
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select status</option>
                  <option value="verified">Verified</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
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
                  <option value="inactive">Inactive</option>
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
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[#1a1a1a] rounded-lg w-[400px] border border-gray-800">
          <div className="flex justify-between items-center p-4 border-b border-gray-800">
            <h2 className="text-xl font-semibold text-white">Pause Tag</h2>
            <button
              onClick={() => setShowPauseModal(false)}
              className="text-gray-400 hover:text-gray-300"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-amber-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">
                  Inactivate Cashtag
                </h3>
                <p className="text-sm text-gray-400">
                  Are you sure you want to inactivate this cashtag?
                </p>
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
                Confirm Inactivate
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const DisableWarningModal = () => {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[#1a1a1a] rounded-lg w-[400px] border border-gray-800">
          <div className="flex justify-between items-center p-4 border-b border-gray-800">
            <h2 className="text-xl font-semibold text-white">Disable Tag</h2>
            <button
              onClick={() => setShowDisableModal(false)}
              className="text-gray-400 hover:text-gray-300"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">
                  Disable Cashtag
                </h3>
                <p className="text-sm text-gray-400">
                  Are you sure you want to disable this cashtag? This action
                  cannot be undone.
                </p>
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

  const handleModalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const cashtag = formData.get("cashtag") as string;

    if (!validateCashtag(cashtag)) {
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      const payload = {
        c_id: crypto.randomUUID(),
        name: formData.get("name") as string,
        full_name: formData.get("full_name") as string,
        cashtag: cashtag,
        ct_type: formData.get("ct_type") as string,
        pin: formData.get("pin") as string,
        email: formData.get("email") as string,
        address: formData.get("address") as string,
        last4_ss: formData.get("last4_ss") as string,
        procurement_cost: Number(formData.get("procurement_cost")),
        balance: Number(formData.get("current_balance")),
        linked_card: formData.get("linked_card") as string,
        linked_bank: formData.get("linked_bank") as string,
        cash_card: formData.get("cash_card") as string,
        verification_status: formData.get("verification_status") as string,
        payment_method: formData.get("payment_method") as string,
        limit: Number(formData.get("limit")),
        status: "paused",
        procured_by: user.id,
        procured_at: new Date().toISOString(),
        total_received: 0,
        total_withdrawn: 0,
        transaction_count: 0,
        last_active: new Date().toISOString(),
      };

      console.log("Creating tag with payload:", payload);

      const { data, error } = await createTag(payload);

      if (error) {
        console.error("Error from createTag:", error);
        throw new Error(error);
      }

      setShowAddTagModal(false);
      setAlertModal({
        isOpen: true,
        type: "success",
        message: "Tag created successfully",
      });
    } catch (error) {
      console.error("Error creating tag:", error);
      setAlertModal({
        isOpen: true,
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "An error occurred while creating the tag",
      });
    }
  };

  const AddTagModal = () => {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[#1a1a1a] rounded-lg w-[600px] border border-gray-800">
          <div className="flex justify-between items-center p-4 border-b border-gray-800">
            <h2 className="text-xl font-semibold text-white">Add New Tag</h2>
            <button
              onClick={() => setShowAddTagModal(false)}
              className="text-gray-400 hover:text-gray-300"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
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
                  Full Name
                </label>
                <input
                  type="text"
                  name="full_name"
                  placeholder="Enter full name"
                  required
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Type
                </label>
                <select
                  name="ct_type"
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
                    cashtagError ? "border-red-500" : "border-gray-800"
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
                <div className="relative">
                  <input
                    type={showAddTagPin ? "password" : "text"}
                    name="pin"
                    placeholder="Enter PIN"
                    required
                    className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddTagPin(!showAddTagPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  ></button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  placeholder="Enter address"
                  required
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Last 4 SS
                </label>
                <input
                  type="text"
                  name="last4_ss"
                  placeholder="Enter last 4 SS"
                  maxLength={4}
                  pattern="\d{4}"
                  required
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Procurement Cost
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400">$</span>
                  <input
                    type="number"
                    name="procurement_cost"
                    placeholder="0"
                    required
                    min="0"
                    className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg pl-8 pr-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Current Balance
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400">$</span>
                  <input
                    type="number"
                    name="current_balance"
                    placeholder="0"
                    required
                    min="0"
                    className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg pl-8 pr-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Linked Card
                </label>
                <input
                  type="text"
                  name="linked_card"
                  placeholder="Enter linked card"
                  required
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Linked Bank
                </label>
                <input
                  type="text"
                  name="linked_bank"
                  placeholder="Enter linked bank"
                  required
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Cash Card Status
                </label>
                <select
                  name="cash_card"
                  required
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select status</option>
                  <option value="activated">Activated</option>
                  <option value="deactivated">Deactivated</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  LIMIT
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
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Verification Status
                </label>
                <select
                  name="verification_status"
                  required
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select status</option>
                  <option value="verified">Verified</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Payment Method
                </label>
                <select
                  name="payment_method"
                  required
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select payment method</option>
                  <option value="cashapp">CashApp</option>
                  <option value="chime">Chime</option>
                  <option value="venmo">Venmo</option>
                  <option value="paypal">PayPal</option>
                </select>
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
    <>
      {/* Payment Method Filter */}
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActivePaymentMethod("all")}
            className={`px-4 py-2 rounded-lg ${
              activePaymentMethod === "all"
                ? "bg-blue-500 text-white"
                : "bg-[#1a1a1a] text-gray-400 hover:text-white"
            }`}
          >
            All Methods
          </button>
          <button
            onClick={() => setActivePaymentMethod("cashapp")}
            className={`px-4 py-2 rounded-lg ${
              activePaymentMethod === "cashapp"
                ? "bg-green-500 text-white"
                : "bg-[#1a1a1a] text-gray-400 hover:text-white"
            }`}
          >
            CashApp
          </button>
          <button
            onClick={() => setActivePaymentMethod("chime")}
            className={`px-4 py-2 rounded-lg ${
              activePaymentMethod === "chime"
                ? "bg-blue-400 text-white"
                : "bg-[#1a1a1a] text-gray-400 hover:text-white"
            }`}
          >
            Chime
          </button>
          <button
            onClick={() => setActivePaymentMethod("venmo")}
            className={`px-4 py-2 rounded-lg ${
              activePaymentMethod === "venmo"
                ? "bg-purple-500 text-white"
                : "bg-[#1a1a1a] text-gray-400 hover:text-white"
            }`}
          >
            Venmo
          </button>
          <button
            onClick={() => setActivePaymentMethod("paypal")}
            className={`px-4 py-2 rounded-lg ${
              activePaymentMethod === "paypal"
                ? "bg-blue-600 text-white"
                : "bg-[#1a1a1a] text-gray-400 hover:text-white"
            }`}
          >
            PayPal
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Active Tags Card */}
        <div
          onClick={() => setActiveTab("Active Tags")}
          className={`relative bg-[#1a1a1a] rounded-2xl p-6 cursor-pointer transform transition-all duration-200 
            ${
              activeTab === "Active Tags"
                ? "scale-105 border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/20 hover:scale-105"
                : "hover:scale-102 border border-emerald-500/20 hover:border-emerald-500/30"
            } bg-emerald-500/5`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3
              className={`text-lg font-medium ${
                activeTab === "Active Tags"
                  ? "text-emerald-400"
                  : "text-emerald-500"
              }`}
            >
              Active Tags
            </h3>
            <div
              className={`p-2 ${
                activeTab === "Active Tags"
                  ? "bg-emerald-500/20"
                  : "bg-emerald-500/10"
              } rounded-lg`}
            >
              <svg
                className="w-6 h-6 text-emerald-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <div
            className={`text-4xl font-bold text-white mb-1 transition-transform duration-300 ${
              activeTab === "Active Tags" ? "text-emerald-400" : "text-white"
            }`}
          >
            {tagStats.active}
          </div>
        </div>

        {/* Inactive Tags Card */}
        <div
          onClick={() => setActiveTab("Inactive Tags")}
          className={`relative bg-[#1a1a1a] rounded-2xl p-6 cursor-pointer transform transition-all duration-200 
            ${
              activeTab === "Inactive Tags"
                ? "scale-105 border-2 border-amber-500/50 shadow-lg shadow-amber-500/20 hover:scale-105"
                : "hover:scale-102 border border-amber-500/20 hover:border-amber-500/30"
            } bg-amber-500/5`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3
              className={`text-lg font-medium ${
                activeTab === "Inactive Tags"
                  ? "text-amber-400"
                  : "text-amber-500"
              }`}
            >
              Inactive Tags
            </h3>
            <div
              className={`p-2 ${
                activeTab === "Inactive Tags"
                  ? "bg-amber-500/20"
                  : "bg-amber-500/10"
              } rounded-lg`}
            >
              <svg
                className="w-6 h-6 text-amber-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div
            className={`text-4xl font-bold text-white mb-1 transition-transform duration-300 ${
              activeTab === "Inactive Tags" ? "text-amber-400" : "text-white"
            }`}
          >
            {tagStats.paused}
          </div>
        </div>

        {/* Disabled Tags Card */}
        <div
          onClick={() => setActiveTab("Disabled Tags")}
          className={`relative bg-[#1a1a1a] rounded-2xl p-6 cursor-pointer transform transition-all duration-200 
            ${
              activeTab === "Disabled Tags"
                ? "scale-105 border-2 border-red-500/50 shadow-lg shadow-red-500/20 hover:scale-105"
                : "hover:scale-102 border border-red-500/20 hover:border-red-500/30"
            } bg-red-500/5`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3
              className={`text-lg font-medium ${
                activeTab === "Disabled Tags" ? "text-red-400" : "text-red-500"
              }`}
            >
              Disabled Tags
            </h3>
            <div
              className={`p-2 ${
                activeTab === "Disabled Tags"
                  ? "bg-red-500/20"
                  : "bg-red-500/10"
              } rounded-lg`}
            >
              <svg
                className="w-6 h-6 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>
          <div
            className={`text-4xl font-bold text-white mb-1 transition-transform duration-300 ${
              activeTab === "Disabled Tags" ? "text-red-400" : "text-white"
            }`}
          >
            {tagStats.disabled}
          </div>
        </div>
      </div>
    </>
  );

  console.log("tags", tags);

  // Update the payment processing function
  const handlePayment = async () => {
    if (!selectedTag || !selectedTargetTag || !paymentAmount || !user) return;

    try {
      setIsProcessingPayment(true);

      const amount = Number(paymentAmount);
      const { data, error } = await transferBalance(
        selectedTag.id,
        selectedTargetTag.id,
        amount
      );

      if (error) throw new Error(error);

      // Log the activity for source tag
      await logCTActivity({
        ct_id: selectedTag.id,
        tag: selectedTag.cashtag,
        tag_name: selectedTag.name,
        action_type: 'TRANSFER',
        action_description: `Transferred funds to ${selectedTargetTag.cashtag}`,
        status: 'success',
        user_id: user.id,
        user_name: user.name,
        user_department: user.department,
        user_role: user.role,
        amount: -amount,
        balance_before: selectedTag.balance,
        balance_after: selectedTag.balance - amount,
        additional_details: {
          target_cashtag: selectedTargetTag.cashtag,
          transfer_type: 'outgoing'
        }
      });

      // Log the activity for target tag
      await logCTActivity({
        ct_id: selectedTargetTag.id,
        tag: selectedTargetTag.cashtag,
        tag_name: selectedTargetTag.name,
        action_type: 'TRANSFER',
        action_description: `Received funds from ${selectedTag.cashtag}`,
        status: 'success',
        user_id: user.id,
        user_name: user.name,
        user_department: user.department,
        user_role: user.role,
        amount: amount,
        balance_before: selectedTargetTag.balance,
        balance_after: selectedTargetTag.balance + amount,
        additional_details: {
          source_cashtag: selectedTag.cashtag,
          transfer_type: 'incoming'
        }
      });

      setShowPayModal(false);
      setSelectedTag(null);
      setSelectedTargetTag(null);
      setPaymentAmount("");

      // Fetch fresh data after successful payment
      await fetchTags();

      setAlertModal({
        isOpen: true,
        type: "success",
        message: "Payment processed successfully",
      });
    } catch (error) {
      console.error("Payment error:", error);

      // Log failed activity
      if (selectedTag && selectedTargetTag) {
        await logCTActivity({
          ct_id: selectedTag.id,
          tag: selectedTag.cashtag,
          tag_name: selectedTag.name,
          action_type: 'TRANSFER',
          action_description: `Failed to transfer funds to ${selectedTargetTag.cashtag}`,
          status: 'failed',
          user_id: user.id,
          user_name: user.name,
          user_department: user.department,
          user_role: user.role,
          amount: Number(paymentAmount),
          additional_details: {
            error: error instanceof Error ? error.message : 'Unknown error',
            target_cashtag: selectedTargetTag.cashtag
          }
        });
      }

      setAlertModal({
        isOpen: true,
        type: "error",
        message: error instanceof Error ? error.message : "Failed to process payment",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">

      <div className="flex-1 pl-64">
        <main className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <svg
                className="w-8 h-8 text-blue-500 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                Cashtag List{" "}
                {user.role === "Agent" && (
                  <span className="text-sm font-normal text-gray-400 ml-2">
                    (View Only)
                  </span>
                )}
              </h1>
            </div>
            {user.role !== "Agent" && (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowAddTagModal(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add New Tag
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <StatsCards />
          )}

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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        CASHTAG
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        CASHTAG NAME
                      </th>
                      {user.role !== "Agent" && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                          PIN
                        </th>
                      )}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        ACCOUNT TYPE
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        PAYMENT METHOD
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        BALANCE
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        LIMIT
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        LAST ACTIVE
                      </th>
                      {user.role !== "Agent" && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                          ACTIONS
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {tags
                      .filter((tag) => {
                        const statusMatch = (() => {
                          switch (activeTab) {
                            case "Active Tags":
                              return tag.status === "active";
                            case "Inactive Tags":
                              return tag.status === "paused";
                            case "Disabled Tags":
                              return tag.status === "disabled";
                            default:
                              return true;
                          }
                        })();

                        const paymentMethodMatch =
                          activePaymentMethod === "all" ||
                          tag.payment_method === activePaymentMethod;

                        return statusMatch && paymentMethodMatch;
                      })
                      .map((tag) => (
                        <tr key={tag.id} className="hover:bg-gray-800/30">
                          <td className="px-4 py-3">
                            {user.role === "null" ? (
                              <span className="text-sm text-gray-300">
                                {tag.cashtag}
                              </span>
                            ) : (
                              <Link
                                className="bg-blue-500/10 text-blue-500 px-2 py-1 rounded-lg text-xs hover:bg-blue-500/20 transition-colors inline-block"
                                href={`/main/finance/cashtags/${tag.cashtag}`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-300">
                                    {tag.cashtag}
                                  </span>
                                </div>
                              </Link>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {user.role === "null" ? (
                              <span className="text-sm text-gray-300">
                                {tag.name}
                              </span>
                            ) : (
                              <Link
                                href={`/main/finance/cashtags/${tag.cashtag}`}
                                className=""
                              >
                                {tag.name}
                              </Link>
                            )}
                          </td>
                          {user.role !== "Agent" && (
                            <td className="px-4 py-3">
                              {user.role === "Agent" ? (
                                <span className="text-xs text-gray-400">
                                  ••••
                                </span>
                              ) : (
                                <div className="relative group">
                                  <button
                                    className="text-xs text-gray-400 hover:text-white transition-colors bg-gray-800/50 px-2 py-0.5 rounded border border-teal-700"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      const pinElement =
                                        document.getElementById(
                                          `pin-${tag.id}`
                                        );
                                      if (pinElement) {
                                        pinElement.textContent =
                                          pinElement.textContent === "••••"
                                            ? tag.pin
                                            : "••••";
                                      }
                                    }}
                                  >
                                    <span
                                      id={`pin-${tag.id}`}
                                      className="font-mono"
                                    >
                                      ••••
                                    </span>
                                  </button>
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                    Click to show/hide PIN
                                  </div>
                                </div>
                              )}
                            </td>
                          )}
                          <td className="px-4 py-3 text-sm text-gray-300 capitalize">
                            {tag.ct_type}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded-lg text-xs ${
                                tag.payment_method === "cashapp"
                                  ? "bg-green-500/10 text-green-500"
                                  : tag.payment_method === "chime"
                                  ? "bg-blue-400/10 text-blue-400"
                                  : tag.payment_method === "venmo"
                                  ? "bg-purple-500/10 text-purple-500"
                                  : tag.payment_method === "paypal"
                                  ? "bg-blue-600/10 text-blue-600"
                                  : "bg-gray-500/10 text-gray-500"
                              }`}
                            >
                              {tag.payment_method.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300">
                            <span className="text-emerald-500">
                              $
                              {typeof tag.balance === "number"
                                ? tag.balance.toFixed(2)
                                : "0.00"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300">
                            <span className="text-amber-500">
                              $
                              {typeof tag.limit === "number"
                                ? tag.limit.toFixed(2)
                                : "0.00"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300">
                            {new Date(tag.last_active).toLocaleDateString()}
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex space-x-2">
                              {/* Active Tags buttons */}
                              {activeTab === "Active Tags" && (
                                <>
                                  {user.role !== "Agent" ? (
                                    <>
                                      <button
                                        onClick={() => {
                                          setSelectedTag(tag);
                                          setShowPayModal(true);
                                        }}
                                        className="p-1.5 rounded-lg bg-blue-500/10 text-purple-500 hover:bg-blue-500/20 transform hover:scale-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        <DollarSign className="" size={15} />
                                      </button>
                                      {/* <button
                                        onClick={() => {
                                          setSelectedTag(tag);
                                          setShowEditModal(true);
                                        }}
                                        disabled={
                                          loadingActions[`edit-${tag.id}`]
                                        }
                                        className="p-1.5 rounded-lg bg-amber-500/10 text-blue-500 hover:bg-amber-500/20 transform hover:scale-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {loadingActions[`edit-${tag.id}`] ? (
                                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                          <Pencil size={15} />
                                        )}
                                      </button> */}
                                    </>
                                  ) : null}
                                  <button
                                    onClick={() => {
                                      setSelectedTag(tag);
                                      setShowPauseModal(true);
                                    }}
                                    disabled={loadingActions[`pause-${tag.id}`]}
                                    className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transform hover:scale-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {loadingActions[`pause-${tag.id}`] ? (
                                      <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="2"
                                          d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                      </svg>
                                    )}
                                  </button>
                                </>
                              )}

                              {/* Inactive Tags buttons */}
                              {activeTab === "Inactive Tags" && (
                                <>
                                  {user.role !== "Agent" && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setSelectedTag(tag);
                                          setShowPayModal(true);
                                        }}
                                        className="p-1.5 rounded-lg bg-blue-500/10 text-purple-500 hover:bg-blue-500/20 transform hover:scale-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        <DollarSign className="" size={15} />
                                      </button>

                                      <button
                                        onClick={() => handleEnable(tag)}
                                        disabled={
                                          loadingActions[`enable-${tag.id}`]
                                        }
                                        className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transform hover:scale-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {loadingActions[`enable-${tag.id}`] ? (
                                          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                          <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth="2"
                                              d="M5 13l4 4L19 7"
                                            />
                                          </svg>
                                        )}
                                      </button>

                                      <button
                                        onClick={() => {
                                          setSelectedTag(tag);
                                          setShowDisableModal(true);
                                        }}
                                        disabled={
                                          loadingActions[`disable-${tag.id}`]
                                        }
                                        className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transform hover:scale-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {loadingActions[`disable-${tag.id}`] ? (
                                          <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                          <ShieldBan size={15} />
                                        )}
                                      </button>
                                    </>
                                  )}
                                </>
                              )}

                              {/* Disabled Tags buttons */}
                              {activeTab === "Disabled Tags" && (
                                <>
                                  {user.role !== "Agent" && (
                                    <>
                                      <button
                                        onClick={() => handleEnable(tag)}
                                        disabled={
                                          loadingActions[`enable-${tag.id}`]
                                        }
                                        className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transform hover:scale-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {loadingActions[`enable-${tag.id}`] ? (
                                          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                          <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth="2"
                                              d="M5 13l4 4L19 7"
                                            />
                                          </svg>
                                        )}
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedTag(tag);
                                          setShowPauseModal(true);
                                        }}
                                        disabled={
                                          loadingActions[`pause-${tag.id}`]
                                        }
                                        className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transform hover:scale-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {loadingActions[`pause-${tag.id}`] ? (
                                          <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                          <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth="2"
                                              d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                          </svg>
                                        )}
                                      </button>
                                    </>
                                  )}
                                </>
                              )}
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

      {/* Update modal conditions to show PauseWarningModal for agents */}
      {showAddTagModal && user.role !== "Agent" && <AddTagModal />}
      {showEditModal && selectedTag && user.role !== "Agent" && <EditTagModal />}
      {showPauseModal && <PauseWarningModal />}
      {showDisableModal && user.role !== "Agent" && <DisableWarningModal />}

      {/* Alert Modal - show for all users */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
        type={alertModal.type}
        message={alertModal.message}
      />

      {/* Add CT to CT Payment Modal */}
      {showPayModal && selectedTag && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] rounded-lg w-[500px] border border-gray-800">
            <div className="flex justify-between items-center p-4 border-b border-gray-800">
              <h2 className="text-xl font-semibold text-white">
                CT to CT Payment
              </h2>
              <button
                onClick={() => {
                  setShowPayModal(false);
                  setSelectedTargetTag(null);
                  setPaymentAmount("");
                }}
                className="text-gray-400 hover:text-gray-300"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* From CT (Source) */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  From CT (Source)
                </label>
                <div className="p-3 bg-[#0a0a0a] rounded-lg border border-gray-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">
                        {selectedTag.cashtag}
                      </p>
                      <p className="text-sm text-gray-400">
                        {selectedTag.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Payment Method: {selectedTag.payment_method}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Balance</p>
                      <p className="text-emerald-500">
                        ${selectedTag.balance.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* To CT (Target) */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  To CT (Target)
                </label>
                <select
                  value={selectedTargetTag?.id || ""}
                  onChange={(e) => {
                    const targetTag = tags.find((t) => t.id === e.target.value);
                    setSelectedTargetTag(targetTag || null);
                  }}
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select target CT</option>
                  {tags
                    .filter(
                      (t) =>
                        t.id !== selectedTag.id &&
                        t.payment_method === selectedTag.payment_method
                    )
                    .map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.cashtag} - {tag.name} ({tag.payment_method})
                      </option>
                    ))}
                </select>
                {tags.filter((t) => t.id !== selectedTag.id).length > 0 &&
                  tags.filter(
                    (t) =>
                      t.id !== selectedTag.id &&
                      t.payment_method === selectedTag.payment_method
                  ).length === 0 && (
                    <p className="mt-2 text-sm text-amber-500">
                      No available target tags with matching payment method (
                      {selectedTag.payment_method})
                    </p>
                  )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400">$</span>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full pl-8 pr-4 py-2 bg-[#0a0a0a] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                {Number(paymentAmount) > selectedTag.balance && (
                  <p className="mt-1 text-sm text-red-500">
                    Amount exceeds available balance
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-4 p-4 border-t border-gray-800">
              <button
                onClick={() => {
                  setShowPayModal(false);
                  setSelectedTargetTag(null);
                  setPaymentAmount("");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                disabled={
                  !selectedTargetTag ||
                  !paymentAmount ||
                  Number(paymentAmount) <= 0 ||
                  Number(paymentAmount) > selectedTag.balance ||
                  isProcessingPayment ||
                  selectedTag.payment_method !==
                    selectedTargetTag?.payment_method
                }
                className="px-4 py-2 bg-purple-500 text-white text-sm font-medium rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handlePayment}
              >
                {isProcessingPayment ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Processing...
                  </div>
                ) : (
                  "Process Payment"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceCashtagsPage;
