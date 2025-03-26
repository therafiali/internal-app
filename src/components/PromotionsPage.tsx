"use client";
import React, { useState, useEffect } from "react";


import { useRouter } from "next/navigation";
import useEmblaCarousel from "embla-carousel-react";
import { CircleOff, CirclePlay, Plus } from "lucide-react";
import ParticipantsModal from "@/app/components/modals/ParticipantsModal";
import AlertModal from '@/app/components/AlertModal';
import { AdminHeader, StandardHeader, SupportHeader } from "@/app/components/Headers";
import { supabase } from "@/lib/supabase";
import { EmblaViewportRefType } from 'embla-carousel-react';

interface User {
  name: string;
  email: string;
  department: string;
  role: string;
  ent_access?: string[];
}

interface Participant {
  id: string;
  name: string;
  email: string;
  usedAt: string;
  bonusAmount: number;
}

interface BasePromotion {
  id: string;
  code: string;
  description: string;
  type: "PERCENTAGE" | "FIXED";
  amount: number;
  percentage: number;
  max_discount: number;
  min_recharge_amount: number;
  max_recharge_amount: number;
  current_usage: number;
  max_usage_per_user: number;
  total_usage_limit: number;
  is_referral_promo: boolean;
  referral_balance: number;
  owner_vip_code: string;
  applicable_games: string[];
  applicable_teams: string[];
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DisplayPromotion extends Omit<BasePromotion, 'type'> {
  type: "percentage" | "fixed";
  value: number;
  status: "active" | "inactive";
}

interface ModalPromotion {
  id: string;
  code: string;
  name: string;
  type: "percentage" | "fixed";
  value: number;
  usageLimit?: number;
  status: "active" | "inactive";
  participants?: Participant[];
  team: string;
}

interface ParticipantsModalProps {
  promotion: ModalPromotion;
  onClose: () => void;
}

const PromotionsPage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [promotions, setPromotions] = useState<DisplayPromotion[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "fixed" | "percentage">("all");
  const [selectedPromotion, setSelectedPromotion] = useState<DisplayPromotion | null>(null);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState("ENT-1");
  const [ent1Promotions, setEnt1Promotions] = useState<DisplayPromotion[]>([]);
  const [ent2Promotions, setEnt2Promotions] = useState<DisplayPromotion[]>([]);
  const [ent3Promotions, setEnt3Promotions] = useState<DisplayPromotion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'success'
  });

  // Initialize Embla Carousel for each team with updated options
  const [ent1ViewportRef, ent1EmblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
    slidesToScroll: 1,
  });
  const [ent2ViewportRef, ent2EmblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
    slidesToScroll: 1,
  });
  const [ent3ViewportRef, ent3EmblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
    slidesToScroll: 1,
  });

  const mapPromotionForDisplay = (p: BasePromotion): DisplayPromotion => ({
    ...p,
    type: p.type.toLowerCase() as "percentage" | "fixed",
    value: p.type === "PERCENTAGE" ? p.percentage || 0 : p.amount || 0,
    status: p.is_active ? "active" : "inactive"
  });

  const fetchPromotions = async (teamId: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log(`Fetching promotions for team ${teamId}`);

      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .contains('applicable_teams', [teamId]);

      if (error) {
        throw new Error(`Failed to fetch promotions: ${error.message}`);
      }

      const mappedPromotions = (data || []).map(mapPromotionForDisplay);

      switch (teamId) {
        case "ENT-1":
          setEnt1Promotions([...mappedPromotions]);
          break;
        case "ENT-2":
          setEnt2Promotions([...mappedPromotions]);
          break;
        case "ENT-3":
          setEnt3Promotions([...mappedPromotions]);
          break;
      }

      return mappedPromotions;
    } catch (error: any) {
      console.error(`Error fetching promotions for team ${teamId}:`, error);
      setError(error.message);
      showAlert('Error', error.message, 'error');
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }

    // Fetch promotions for all teams
    const fetchAllPromotions = async () => {
      try {
        console.log("Starting to fetch all promotions...");
        const results = await Promise.all([
          fetchPromotions("ENT-1"),
          fetchPromotions("ENT-2"),
          fetchPromotions("ENT-3"),
        ]);
        console.log("All promotions fetched:", results);
      } catch (error) {
        console.error("Error fetching all promotions:", error);
      }
    };

    fetchAllPromotions();
  }, []);

  // Add debug logs in the render section
  console.log("Current state:", {
    ent1Promotions,
    ent2Promotions,
    ent3Promotions,
    loading,
    error,
  });

  // Add loading state display
  // if (loading) {
  //   return (
  //     <Loader text="promotions" />
  //   );
  // }

  // Add error state display
  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="bg-red-500/10 text-red-500 p-4 rounded-lg">
          <p>Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="bg-red-500/10 text-red-500 p-4 rounded-lg">
          <p>Error: User not authenticated</p>
          <button
            onClick={() => router.push("/login")}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  const handleCreatePromotion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const type = formData.get("type") === "percentage" ? "PERCENTAGE" : "FIXED";
      const value = Number(formData.get("value")) || 0;
      const maxAmount = Number(formData.get("maxAmount")) || 0;
      const minAmount = Number(formData.get("minAmount")) || 0;
      const usageLimit = Number(formData.get("usageLimit")) || 0;
      const startDate = new Date(formData.get("startDate") as string).toISOString();
      const endDate = new Date(formData.get("endDate") as string).toISOString();

      const promotionData = {
        code: formData.get("code")?.toString().toUpperCase() || '',
        description: formData.get("name")?.toString() || '',
        type: type,
        percentage: type === "PERCENTAGE" ? value : 0,
        amount: type === "FIXED" ? value : 0,
        max_discount: type === "PERCENTAGE" ? maxAmount : 0,
        min_recharge_amount: minAmount,
        max_recharge_amount: maxAmount,
        current_usage: 0,
        max_usage_per_user: 1,
        total_usage_limit: usageLimit,
        is_referral_promo: false,
        referral_balance: 0,
        owner_vip_code: '',
        applicable_games: [],
        applicable_teams: [selectedTeam],
        start_date: startDate,
        end_date: endDate,
        is_active: true
      } as const;

      const { data, error } = await supabase
        .from('promotions')
        .insert([promotionData])
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const newPromotion = mapPromotionForDisplay(data);

      // Update the specific team's promotions
      switch (selectedTeam) {
        case "ENT-1":
          setEnt1Promotions(prev => [newPromotion, ...prev]);
          break;
        case "ENT-2":
          setEnt2Promotions(prev => [newPromotion, ...prev]);
          break;
        case "ENT-3":
          setEnt3Promotions(prev => [newPromotion, ...prev]);
          break;
      }

      setShowCreateModal(false);
      showAlert('Success', 'Promotion created successfully!', 'success');
    } catch (error: any) {
      console.error("Error creating promotion:", error);
      showAlert('Error', error.message || 'Failed to create promotion', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Update the team IDs to match the correct format
  const handleENT1Click = () => {
    setSelectedTeam("ENT-1");
    setShowCreateModal(true);
  };

  const handleENT2Click = () => {
    setSelectedTeam("ENT-2");
    setShowCreateModal(true);
  };

  const handleENT3Click = () => {
    setSelectedTeam("ENT-3");
    setShowCreateModal(true);
  };

  const filteredPromotions = promotions.filter(
    (promo) => statusFilter === "all" || promo.type === statusFilter
  );

  // Calculate stats from promotions data
  const stats = {
    active: promotions.filter((p) => p.status === "active").length,
    engagement: promotions.reduce((acc, p) => acc + p.current_usage, 0),
    revenue: promotions.reduce(
      (acc, p) =>
        acc + p.current_usage * p.value * (p.type === "percentage" ? 0.01 : 1),
      0
    ),
    conversion:
      (promotions.reduce((acc, p) => acc + p.current_usage, 0) /
        promotions.reduce((acc, p) => acc + p.total_usage_limit, 0)) *
        100 || 0,
  };

  const CreatePromotionModal = () => {
    const [formType, setFormType] = useState<"percentage" | "fixed">(
      "percentage"
    );

    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (e.target.value === "percentage" || e.target.value === "fixed") {
        setFormType(e.target.value);
      }
    };

    return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] rounded-lg w-[600px] border border-gray-800">
        <div className="flex justify-between items-center p-4 border-b border-gray-800">
            <h2 className="text-xl font-semibold text-white">
              Create New Promotion
            </h2>
          <button 
            onClick={() => setShowCreateModal(false)}
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

        <form onSubmit={handleCreatePromotion} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="text-sm font-medium text-gray-400">
                  Name
                </label>
              <input
                type="text"
                  name="name"
                required
                  defaultValue=""
                className="mt-1 w-full px-3 py-2 bg-[#242424] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
                <label className="text-sm font-medium text-gray-400">
                  Code
                </label>
              <input
                type="text"
                  name="code"
                required
                  defaultValue=""
                  className="mt-1 w-full px-3 py-2 bg-[#242424] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="text-sm font-medium text-gray-400">
                  Type
                </label>
              <select
                  name="type"
                  defaultValue="percentage"
                  onChange={handleTypeChange}
                className="mt-1 w-full px-3 py-2 bg-[#242424] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            <div>
                <label className="text-sm font-medium text-gray-400">
                  {formType === "percentage"
                    ? "Percentage Value"
                    : "Fixed Amount"}
                </label>
              <input
                type="number"
                  name="value"
                required
                  defaultValue=""
                className="mt-1 w-full px-3 py-2 bg-[#242424] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

            {formType === "percentage" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
                  <label className="text-sm font-medium text-gray-400">
                    Min Amount
                  </label>
              <input
                type="number"
                    name="minAmount"
                required
                    defaultValue=""
                className="mt-1 w-full px-3 py-2 bg-[#242424] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
                  <label className="text-sm font-medium text-gray-400">
                    Max Amount
                  </label>
              <input
                type="number"
                    name="maxAmount"
                required
                    defaultValue=""
                className="mt-1 w-full px-3 py-2 bg-[#242424] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
            )}

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="text-sm font-medium text-gray-400">
                  Start Date
                </label>
              <input
                type="datetime-local"
                  name="startDate"
                required
                className="mt-1 w-full px-3 py-2 bg-[#242424] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
                <label className="text-sm font-medium text-gray-400">
                  End Date
                </label>
              <input
                type="datetime-local"
                  name="endDate"
                required
                className="mt-1 w-full px-3 py-2 bg-[#242424] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
              <label className="text-sm font-medium text-gray-400">
                Usage Limit
              </label>
            <input
              type="number"
                name="usageLimit"
              required
                defaultValue=""
              className="mt-1 w-full px-3 py-2 bg-[#242424] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-lg text-white font-medium transition-all duration-200 ${
                loading
                  ? "bg-blue-500/50 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span className="ml-2">Creating...</span>
              </div>
            ) : (
                "Create Promotion"
            )}
          </button>
        </form>
      </div>
    </div>
  );
  };

  const handleDisablePromotion = async (promotion: DisplayPromotion) => {
    try {
      const { error } = await supabase
        .from('promotions')
        .update({ is_active: false })
        .eq('code', promotion.code);

      if (error) {
        throw new Error(error.message);
      }

      // Refresh promotions after disabling
      await Promise.all([
        fetchPromotions("ENT1"),
        fetchPromotions("ENT2"),
        fetchPromotions("ENT3"),
      ]);

      showAlert('Success', 'Promotion disabled successfully!', 'success');
    } catch (error: any) {
      console.error("Error disabling promotion:", error);
      showAlert('Error', error.message || 'Failed to disable promotion', 'error');
    }
  };

  const handleEditPromotion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const type = formData.get("type") === "percentage" ? "PERCENTAGE" : "FIXED";
      const value = Number(formData.get("value")) || 0;
      const maxAmount = Number(formData.get("maxAmount")) || 0;
      const minAmount = Number(formData.get("minAmount")) || 0;
      const usageLimit = Number(formData.get("usageLimit")) || 0;
      const startDate = new Date(formData.get("startDate") as string).toISOString();
      const endDate = new Date(formData.get("endDate") as string).toISOString();

      const promotionData = {
        description: formData.get("name")?.toString() || '',
        type: type,
        percentage: type === "PERCENTAGE" ? value : 0,
        amount: type === "FIXED" ? value : 0,
        max_discount: type === "PERCENTAGE" ? maxAmount : 0,
        min_recharge_amount: minAmount,
        max_recharge_amount: maxAmount,
        total_usage_limit: usageLimit,
        start_date: startDate,
        end_date: endDate,
      } as const;

      const { error } = await supabase
        .from('promotions')
        .update(promotionData)
        .eq('code', selectedPromotion?.code);

      if (error) {
        throw new Error(error.message);
      }

      // Refresh promotions after update
      await Promise.all([
        fetchPromotions("ENT1"),
        fetchPromotions("ENT2"),
        fetchPromotions("ENT3"),
      ]);

      setShowEditModal(false);
      showAlert('Success', 'Promotion updated successfully!', 'success');
    } catch (error: any) {
      console.error("Error updating promotion:", error);
      showAlert('Error', error.message || 'Failed to update promotion', 'error');
    } finally {
      setLoading(false);
    }
  };

  const EditPromotionModal = () => {
    const [formType, setFormType] = useState<"percentage" | "fixed">(
      (selectedPromotion?.type as "percentage" | "fixed") || "percentage"
    );

    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (e.target.value === "percentage" || e.target.value === "fixed") {
        setFormType(e.target.value);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
        <div className="bg-[#1a1a1a] rounded-lg w-[600px] border border-gray-800 animate-slideUp">
          <div className="flex justify-between items-center p-4 border-b border-gray-800">
            <h2 className="text-xl font-semibold text-white">Edit Promotion</h2>
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

          <form onSubmit={handleEditPromotion} className="p-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-400">Name</label>
              <input
                type="text"
                name="name"
                required
                defaultValue={selectedPromotion?.description}
                className="mt-1 w-full px-3 py-2 bg-[#242424] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-400">
                  Type
                </label>
            <select 
                  name="type"
                  defaultValue={selectedPromotion?.type}
                  onChange={handleTypeChange}
                  className="mt-1 w-full px-3 py-2 bg-[#242424] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
              <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
            </select>
          </div>
              <div>
                <label className="text-sm font-medium text-gray-400">
                  {formType === "percentage"
                    ? "Percentage Value"
                    : "Fixed Amount"}
                </label>
                <input
                  type="number"
                  name="value"
                  required
                  defaultValue={selectedPromotion?.value}
                  className="mt-1 w-full px-3 py-2 bg-[#242424] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
                </div>

            {formType === "percentage" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-400">
                    Min Amount
                  </label>
                  <input
                    type="number"
                    name="minAmount"
                    required
                    defaultValue={selectedPromotion?.min_recharge_amount}
                    className="mt-1 w-full px-3 py-2 bg-[#242424] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                  </div>
                  <div>
                  <label className="text-sm font-medium text-gray-400">
                    Max Amount
                  </label>
                  <input
                    type="number"
                    name="maxAmount"
                    required
                    defaultValue={selectedPromotion?.max_discount}
                    className="mt-1 w-full px-3 py-2 bg-[#242424] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                    </div>
                  </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-400">
                  Start Date
                </label>
                <input
                  type="datetime-local"
                  name="startDate"
                  required
                  defaultValue={selectedPromotion?.start_date.slice(0, 16)}
                  className="mt-1 w-full px-3 py-2 bg-[#242424] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-400">
                  End Date
                </label>
                <input
                  type="datetime-local"
                  name="endDate"
                  required
                  defaultValue={selectedPromotion?.end_date.slice(0, 16)}
                  className="mt-1 w-full px-3 py-2 bg-[#242424] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
                </div>

            <div>
              <label className="text-sm font-medium text-gray-400">
                Usage Limit
              </label>
              <input
                type="number"
                name="usageLimit"
                required
                defaultValue={selectedPromotion?.total_usage_limit}
                className="mt-1 w-full px-3 py-2 bg-[#242424] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
                  </div>

                    <button 
              type="submit"
              disabled={loading}
              className={`w-full py-2 rounded-lg text-white font-medium transition-all duration-200 ${
                loading
                  ? "bg-blue-500/50 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span className="ml-2">Updating...</span>
                </div>
              ) : (
                "Update Promotion"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  };

  const sortPromotions = (promotions: DisplayPromotion[]) => {
    const statusOrder = {
      active: 1,
      inactive: 2,
    };
    
    return [...promotions].sort(
      (a, b) => statusOrder[a.status] - statusOrder[b.status]
    );
  };

  const handleEnablePromotion = async (promotion: DisplayPromotion) => {
    try {
      const { error } = await supabase
        .from('promotions')
        .update({ is_active: true })
        .eq('code', promotion.code);

      if (error) {
        throw new Error(error.message);
      }

      // Refresh promotions after enabling
      await Promise.all([
        fetchPromotions("ENT1"),
        fetchPromotions("ENT2"),
        fetchPromotions("ENT3"),
      ]);

      showAlert('Success', 'Promotion enabled successfully!', 'success');
    } catch (error: any) {
      console.error("Error enabling promotion:", error);
      showAlert('Error', error.message || 'Failed to enable promotion', 'error');
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000); // Reset after 2 seconds
    });
  };

  // Helper function to show alert modal
  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning') => {
    setAlertModal({
      isOpen: true,
      title,
      message,
      type
    });
  };

  // Helper function to close alert modal
  const closeAlert = () => {
    setAlertModal(prev => ({ ...prev, isOpen: false }));
    window.location.reload();
  };

  const mapToModalPromotion = (p: DisplayPromotion): ModalPromotion => ({
    id: p.id,
    code: p.code,
    name: p.description,
    type: p.type,
    value: p.value,
    usageLimit: p.total_usage_limit,
    status: p.status,
    team: p.applicable_teams[0] || '',
    participants: []
  });

  // Check if user has access to view the page
  const isAdmin = user.department === "Admin";
  const isManager = user.role === "Manager";
  const isShiftIncharge = user.role === "Shift Incharge";
  const isAgent = user.role === "Agent";

  // Add function to check ENT access
  const hasEntAccess = (entId: string): boolean => {
    if (!user) return false;
    if (user.department === "Admin") return true;
    return user.ent_access?.includes(entId) || false;
  };

  // Filter promotions based on access
  const accessibleEnts = ["ENT1", "ENT2", "ENT3"].filter(ent => hasEntAccess(ent));

  // Get promotions for accessible ENTs
  const getAccessiblePromotions = (entId: string): DisplayPromotion[] => {
    switch(entId) {
      case "ENT1":
        return ent1Promotions;
      case "ENT2":
        return ent2Promotions;
      case "ENT3":
        return ent3Promotions;
      default:
        return [];
    }
  };

  // Get viewport ref for ENT
  const getViewportRef = (entId: string): EmblaViewportRefType | undefined => {
    switch(entId) {
      case "ENT1":
        return ent1ViewportRef;
      case "ENT2":
        return ent2ViewportRef;
      case "ENT3":
        return ent3ViewportRef;
      default:
        return undefined;
    }
  };

  // Get add promotion handler
  const getAddHandler = (entId: string): () => void => {
    switch(entId) {
      case "ENT1":
        return handleENT1Click;
      case "ENT2":
        return handleENT2Click;
      case "ENT3":
        return handleENT3Click;
      default:
        return () => {};
    }
  };

  // Render promotion card
  const renderPromotionCard = (promotion: DisplayPromotion): React.ReactElement => {
    return (
      <div
        key={promotion.id}
        className="flex-[0_0_400px] min-w-0"
      >
        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800/20 hover:border-emerald-500/20 transition-all duration-300 relative">
          <div className={`status-indicator ${promotion.status}`} />
          <div className="flex flex-col h-full">
            <div className="flex gap-2 mb-4">
              <span
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  promotion.status === "active"
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-yellow-500/10 text-yellow-500"
                }`}
              >
                {promotion.status.charAt(0).toUpperCase() + promotion.status.slice(1)}
              </span>
              <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-500/10 text-purple-500">
                {promotion.type === "percentage" ? "Percentage" : "Fixed"}
              </span>
              <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-500">
                {promotion.type === "percentage" ? `${promotion.value}%` : `$${promotion.value}`}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => copyToClipboard(promotion.code)}
                className="w-full group relative flex items-center justify-center px-4 py-3 rounded-lg bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 transition-all duration-300 cursor-pointer"
                title="Click to copy"
              >
                <code className="text-base font-bold font-mono tracking-wider text-white group-hover:text-gray-200">
                  {promotion.code}
                </code>
                {copiedCode === promotion.code && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-500 text-white text-xs rounded-lg whitespace-nowrap animate-fadeIn">
                    Copied!
                  </div>
                )}
              </button>
            </div>

            <h3 className="text-lg text-white mb-4 italic">
              {promotion.description}
            </h3>

            <div className="grid grid-cols-2 gap-4 mt-auto">
              <div className="bg-black/20 p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-1">
                  Claimed
                </div>
                <div className="text-lg font-bold text-white">
                  {promotion.current_usage}/{promotion.total_usage_limit}
                </div>
              </div>
              <div className="bg-black/20 p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-1">
                  Expires
                </div>
                <div className="text-lg font-bold text-white">
                  {new Date(promotion.end_date).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-2 mt-4 pt-4 border-t border-gray-800">
              <div className="flex gap-2">
                {isAdmin && (
                  <>
                    <button 
                      onClick={() => {
                        setSelectedPromotion(promotion);
                        setShowEditModal(true);
                      }}
                      className="p-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                      title="Edit"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPromotion(promotion);
                        setShowParticipantsModal(true);
                      }}
                      className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                      title="View Details"
                    >
                      <Plus
                        size={16}
                        className="hover:rotate-180 transition-all duration-500"
                      />
                    </button>
                  </>
                )}
              </div>
              {(isAdmin || isManager) && (
                promotion.status === "inactive" ? (
                  <button
                    onClick={() => handleEnablePromotion(promotion)}
                    className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                    title="Enable"
                  >
                    <div className="flex items-center gap-2">
                      <CirclePlay size={16} />
                      <span>Activate</span>
                    </div>
                  </button>
                ) : (
                  <button
                    onClick={() => handleDisablePromotion(promotion)}
                    className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 transition-colors"
                    title="Disable"
                  >
                    <div className="flex items-center gap-2">
                      <CircleOff size={16} />
                      <span>Deactivate</span>
                    </div>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!user || (user.department !== "Admin" && user.department !== "Support" && !isManager && !isShiftIncharge && !isAgent)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* {isAdmin ? <AdminHeader user={user} /> : <SupportHeader user={user} />} */}
      <div className="flex-1 pl-64 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl my-4 font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
            Promotions {(!isAdmin && !isManager) && (
              <span className="text-sm font-normal text-gray-400 ml-2">
                {isShiftIncharge ? "(Assign/Unassign Only)" : "(View Only)"}
              </span>
            )}
          </h1>

          {/* ENT Stats Cards */}
          <div className="grid grid-cols-3 gap-6 mb-12">
            {accessibleEnts.map(entId => (
              <div
                key={entId}
                onClick={() => {
                  const section = document.getElementById(`${entId.toLowerCase()}-section`);
                  section?.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-[#1a1a1a] rounded-xl border border-gray-800/20 hover:border-emerald-500/20 transition-all duration-300 cursor-pointer"
              >
                <h3 className="text-xl font-bold text-white p-6">
                  {entId} Promotions
                </h3>
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col items-center">
                      <div className="text-2xl font-bold text-white mb-2">
                        {getAccessiblePromotions(entId).filter(p => p.status === "active").length}
                      </div>
                      <div className="px-3 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-500">
                        Active
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="text-2xl font-bold text-white mb-2">
                        {getAccessiblePromotions(entId).filter(p => p.status === "inactive").length}
                      </div>
                      <div className="px-3 py-1 rounded-lg text-xs font-medium bg-yellow-500/10 text-yellow-500">
                        Inactive
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Total Promotions</span>
                      <span className="text-2xl font-bold text-white">
                        {getAccessiblePromotions(entId).length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ENT Promotions Sections */}
          {accessibleEnts.map(entId => (
            <div key={entId} className="mb-16" id={`${entId.toLowerCase()}-section`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {entId} Team Promotions
                </h2>
                {((isAdmin && entId !== "ENT1") || ((isAdmin || isManager) && entId === "ENT1")) && (
                  <button
                    onClick={getAddHandler(entId)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
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
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Add {entId} Promotion
                  </button>
                )}
              </div>
              <div className="relative mb-10">
                <div
                  className="overflow-x-auto overflow-y-hidden scrollbar-container"
                  ref={getViewportRef(entId)}
                >
                  <div className="flex gap-4 pb-4">
                    {sortPromotions(getAccessiblePromotions(entId)).map(renderPromotionCard)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {(isAdmin || isManager) && (
        <>
          {showCreateModal && <CreatePromotionModal />}
          {showParticipantsModal && selectedPromotion && (
            <ParticipantsModal
              promotion={mapToModalPromotion(selectedPromotion)}
              onClose={() => setShowParticipantsModal(false)}
            />
          )}
          {showEditModal && selectedPromotion && <EditPromotionModal />}
        </>
      )}

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
};

export default PromotionsPage;
