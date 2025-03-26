"use client"

import { useState } from 'react';
import { supabase } from '@/supabase/client';

interface TagData {
  id: string;
  c_id: string;
  cashtag: string;
  name: string;
  status: string;
  procurement_cost: number;
  procured_by: {
    name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
  balance: number;
  transaction_count: number;
  total_received: number;
  total_withdrawn: number;
  full_name: string;
  last4_ss: string;
  address: string;
  ct_type: string;
  verification_status: string;
  email: string;
  pin: string;
  linked_card: string;
  linked_bank: string;
  cash_card: string;
  limit: number;
}

interface EditTagModalProps {
  selectedTag: TagData | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditTagModal({ selectedTag, onClose, onSuccess }: EditTagModalProps) {
  const [showEditTagPin, setShowEditTagPin] = useState(false);
  const [cashtagError, setCashtagError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateCashtag = (value: string) => {
    if (!value) {
      setCashtagError("Cashtag is required");
      return false;
    }
    if (!/^[a-zA-Z0-9]+$/.test(value)) {
      setCashtagError("Cashtag can only contain letters and numbers");
      return false;
    }
    if (value.length < 3 || value.length > 20) {
      setCashtagError("Cashtag must be between 3 and 20 characters");
      return false;
    }
    setCashtagError(null);
    return true;
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTag) return;
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

      const { error } = await supabase
        .from('company_tags')
        .update(payload)
        .eq('id', selectedTag.id);

      if (error) throw new Error(error.message);

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error updating tag:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedTag) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] rounded-lg w-[600px] border border-gray-800">
        <div className="flex justify-between items-center p-4 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white">Edit Tag</h2>
          <button
            onClick={onClose}
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
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 