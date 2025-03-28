"use client";
import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import PlayerSearch, { Player } from "./PlayerSearch";
import Cookies from "js-cookie";
import Image from "next/image";
import GameUsernameField from "./GameUsernameField";
import { supabase } from "@/lib/supabase";
import { convertEntFormat } from "@/utils/entFormat";
import { EntType } from "@/supabase/types";
import { sendManyChatMessage, MANYCHAT_TEMPLATES } from "@/utils/manychat";
import EntPagesDropdown from "./EntPagesDropdown";

interface RedeemModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRedeemId?: string;
  isVerificationOnly?: boolean;
  redeemRequest?: {
    redeemId: string;
    username: string;
    gamePlatform: string;
    totalAmount: number;
    status: string;
  };
  user: {
    name: string;
    department: string;
    ent_access?: EntType[];
    id: string;
  };
}

interface PaymentMethods {
  cashapp: boolean;
  venmo: boolean;
  chime: boolean;
}

interface CashTags {
  cashapp: string;
  venmo: string;
  chime: string;
}

interface VerifyOTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  otp: string;
  setOtp: (otp: string) => void;
  isVerifying: boolean;
  verificationError: string | null;
  handleVerifyOtp: () => Promise<void>;
  redeemRequest?: {
    redeemId: string;
    username: string;
    gamePlatform: string;
    totalAmount: number;
    status: string;
  };
}

const VerifyOTPModal: React.FC<VerifyOTPModalProps> = ({
  isOpen,
  onClose,
  otp,
  setOtp,
  isVerifying,
  verificationError,
  handleVerifyOtp,
  redeemRequest,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-md border border-gray-800/20">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h3 className="text-xl font-semibold text-white">
            Verify Redeem Request
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {redeemRequest && (
            <div className="bg-[#252b3b] rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Redeem ID:</span>
                <span className="text-white font-medium">
                  {redeemRequest.redeemId}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Username:</span>
                <span className="text-white">{redeemRequest.username}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Platform:</span>
                <span className="text-white">{redeemRequest.gamePlatform}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Amount:</span>
                <span className="text-white">${redeemRequest.totalAmount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Status:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 uppercase">
                  {redeemRequest.status}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm text-gray-400">Enter OTP</label>
            <input
              type="text"
              className="w-full bg-[#252b3b] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter OTP code..."
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
            />
          </div>

          {verificationError && (
            <div className="text-red-500 text-sm mt-2">{verificationError}</div>
          )}

          <button
            onClick={handleVerifyOtp}
            disabled={isVerifying || !otp}
            className="w-full px-4 py-2 text-sm font-medium bg-blue-500 text-white rounded-lg
              hover:bg-blue-600 transition-all duration-200 transform hover:scale-105
              active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
              disabled:transform-none flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Verifying...
              </>
            ) : (
              "Verify Request"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const RedeemModal: React.FC<RedeemModalProps> = ({
  isOpen,
  onClose,
  initialRedeemId,
  isVerificationOnly = false,
  redeemRequest,
  user,
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [amount, setAmount] = useState("");
  const [platform, setPlatform] = useState("");
  const [username, setUsername] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethods>({
    cashapp: false,
    venmo: false,
    chime: false,
  });
  const [cashTags, setCashTags] = useState<CashTags>({
    cashapp: "",
    venmo: "",
    chime: "",
  });
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVerification, setShowVerification] = useState(false);
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );
  const [redeemId, setRedeemId] = useState<string>("");
  const [selectedPage, setSelectedPage] = useState("");
  const [pageError, setPageError] = useState<string | null>(null);

  // Reset states when modal closes
  useEffect(() => {
    if (!isOpen) {
      if (!isVerificationOnly) {
        setSelectedPlayer(null);
        setAmount("");
        setPlatform("");
        setUsername("");
        setPaymentMethods({ cashapp: false, venmo: false, chime: false });
        setCashTags({ cashapp: "", venmo: "", chime: "" });
        setNotes("");
        setError(null);
        setSelectedPage("");
        setPageError(null);
      }
      setOtp("");
      setVerificationError(null);
    } else if (isVerificationOnly && initialRedeemId) {
      setRedeemId(initialRedeemId);
      setShowVerification(true);
    }
  }, [isOpen, isVerificationOnly, initialRedeemId]);

  // Cleanup redeemId only after successful verification or modal close without verification
  const handleModalClose = () => {
    if (!showVerification) {
      setRedeemId(""); // Reset redeemId only if we're not in verification mode
    }
    onClose();
  };

  const handlePaymentMethodChange = (method: keyof PaymentMethods) => {
    setPaymentMethods((prev) => ({
      ...prev,
      [method]: !prev[method],
    }));
  };

  const handleCashTagChange = (method: keyof CashTags, value: string) => {
    let formattedValue = value;

    // Add prefix if not present
    if (
      value &&
      !value.startsWith("$") &&
      (method === "cashapp" || method === "chime")
    ) {
      formattedValue = `$${value}`;
    }
    if (value && !value.startsWith("@") && method === "venmo") {
      formattedValue = `@${value}`;
    }

    // Remove any duplicate prefix symbols
    formattedValue = formattedValue.replace(/^\$+/, "$").replace(/^@+/, "@");

    setCashTags((prev) => ({
      ...prev,
      [method]: formattedValue,
    }));
  };

  // Validation function for payment methods
  const isValidPaymentTag = (
    method: keyof CashTags,
    value: string
  ): boolean => {
    if (!value) return false;
    switch (method) {
      case "cashapp":
      case "chime":
        return value.startsWith("$");
      case "venmo":
        return value.startsWith("@");
      default:
        return true;
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      setVerificationError("Please enter OTP");
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);

    try {
      const token = Cookies.get("token");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const verifyBody = {
        redeemId: isVerificationOnly ? initialRedeemId : redeemId,
        otp: otp,
      };

      console.log("Sending verification request with:", verifyBody);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}api/players/verify-redeem-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(verifyBody),
        }
      );

      const data = await response.json();
      console.log("Verification API Response:", data);

      if (!response.ok || data.status === "error") {
        setVerificationError(data.message || "Failed to verify OTP");
        setOtp("");
        return;
      }

      onClose();
    } catch (err) {
      console.error("Error verifying OTP:", err);
      setVerificationError(
        err instanceof Error ? err.message : "Failed to verify OTP"
      );
      setOtp("");
    } finally {
      setIsVerifying(false);
    }
  };

  // Add validation for ENT access
  const validateEntAccess = (player: Player | null) => {
    if (!player || !user.ent_access) return false;
    return convertEntFormat.hasEntAccess(user, player.team);
  };

  // Add this function to validate page team code
  const validatePageTeamCode = async (
    pageName: string,
    playerTeamCode: string
  ) => {
    const { data, error } = await supabase
      .from("ent_pages")
      .select("team_code")
      .eq("page_name", pageName)
      .single();

    if (error) {
      console.error("Error validating page team code:", error);
      return false;
    }

    return data.team_code === playerTeamCode;
  };

  // Modify handleSubmit to include page validation
  const handleSubmit = async () => {
    if (!selectedPlayer) return;

    // Validate ENT access before proceeding
    if (!validateEntAccess(selectedPlayer)) {
      setError("You do not have access to submit requests for this ENT");
      return;
    }

    // Validate page team code
    if (selectedPage) {
      const isValidPage = await validatePageTeamCode(
        selectedPage,
        selectedPlayer.team
      );
      if (!isValidPage) {
        setPageError("Selected page does not match player's team code");
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);
    setPageError(null);

    try {
      // Check if player is banned
      const { data: playerStatus, error: statusError } = await supabase
        .from("players")
        .select("status")
        .eq("vip_code", selectedPlayer.vipCode)
        .single();

      if (statusError) throw statusError;

      if (playerStatus?.status === "banned") {
        setError("This player is banned. Cannot process any requests.");
        return;
      }

      // Update player's game usernames
      const platformToKey: { [key: string]: string } = {
        "Fire Kirin": "fireKirin",
        "Game Vault": "gameVault",
        "Orion Stars": "orionStars",
        Juwa: "juwa",
        Moolah: "moolah",
        "Panda Master": "pandaMaster",
        Yolo: "yolo",
        VBlink: "vblink",
        "Vegas Sweeps": "vegasSweeps",
        // Add more mappings as needed
      };

      const key = platformToKey[platform];
      if (key) {
        // Get current game_usernames
        const { data: playerData, error: fetchError } = await supabase
          .from("players")
          .select("game_usernames")
          .eq("vip_code", selectedPlayer.vipCode)
          .single();

        if (fetchError && fetchError.code !== "PGRST116") {
          // PGRST116 is "not found" error
          throw fetchError;
        }

        // Update game_usernames
        const currentUsernames = playerData?.game_usernames || {};
        const { error: updateError } = await supabase
          .from("players")
          .update({
            vip_code: selectedPlayer.vipCode,
            game_usernames: {
              ...currentUsernames,
              [key]: username,
            },
          })
          .eq("vip_code", selectedPlayer.vipCode);

        if (updateError) throw updateError;
      }

      // Format payment methods
      const formattedPaymentMethods = Object.entries(paymentMethods)
        .filter(([_, value]) => value)
        .map(([type]) => ({
          type,
          username: cashTags[type as keyof CashTags],
        }));

      console.log("Starting redeem submission for player:", {
        vipCode: selectedPlayer.vipCode,
        playerName: selectedPlayer.playerName,
        platform,
        amount,
      });

      // Get player's current data including last reset time
      console.log("Fetching player data from Supabase...");
      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select("total_redeemed, game_limits, last_reset_time")
        .eq("vip_code", selectedPlayer.vipCode)
        .single();

      if (playerError) {
        console.error("Error fetching player data:", playerError);
        throw playerError;
      }

      console.log("Retrieved player data:", playerData);

      const currentTime = new Date();
      const lastResetTime = playerData.last_reset_time
        ? new Date(playerData.last_reset_time)
        : new Date(0);
      const timeDifference = currentTime.getTime() - lastResetTime.getTime();
      const hoursSinceReset = timeDifference / (1000 * 60 * 60);

      console.log("Time calculations:", {
        currentTime: currentTime.toISOString(),
        lastResetTime: lastResetTime.toISOString(),
        timeDifference,
        hoursSinceReset,
      });

      // If 24 hours have passed since last reset, reset the limits
      if (hoursSinceReset >= 24) {
        console.log("24 hours passed, resetting limits...");
        // Reset all limits
        const { error: resetError } = await supabase
          .from("players")
          .update({
            total_redeemed: 0,
            game_limits: [],
            last_reset_time: currentTime.toISOString(),
            redeem_online_status: false,
          })
          .eq("vip_code", selectedPlayer.vipCode);

        if (resetError) {
          console.error("Error resetting limits:", resetError);
          throw resetError;
        }

        console.log("Limits reset successfully");
        // Reset local variables
        playerData.total_redeemed = 0;
        playerData.game_limits = [];
      }

      // Check total redeem limit
      const currentTotalRedeemed = playerData.total_redeemed || 0;
      const requestAmount = parseFloat(amount);

      console.log("Current redeem state:", {
        existingTotal: currentTotalRedeemed,
        newAmount: requestAmount,
        willAddTo: currentTotalRedeemed + requestAmount,
        playerData: playerData,
      });

      if (currentTotalRedeemed + requestAmount > 2000) {
        const errorMsg = `Daily redeem limit exceeded. Current total: $${currentTotalRedeemed}. Available to redeem: $${
          2000 - currentTotalRedeemed
        }. Maximum allowed: $2000`;
        console.log("Total limit exceeded:", errorMsg);
        setError(errorMsg);
        setIsSubmitting(false);
        return;
      }

      // Check game-specific limit
      const gameLimits = playerData.game_limits || [];
      console.log("Current game limits:", {
        allLimits: gameLimits,
        platform: platform,
        searching: `Searching for ${platform} in limits`,
      });

      const currentGameLimit = gameLimits.find(
        (limit: any) => limit.game_name === platform
      );

      const currentGameAmount = currentGameLimit ? currentGameLimit.amount : 0;

      console.log("Game limit check:", {
        foundLimit: currentGameLimit,
        currentAmount: currentGameAmount,
        newAmount: requestAmount,
        willTotal: currentGameAmount + requestAmount,
        maxAllowed: 500,
      });

      if (currentGameAmount + requestAmount > 500) {
        const errorMsg = `Game limit exceeded for ${platform}. Current amount: $${currentGameAmount}. Maximum allowed per game: $500`;
        console.log("Game limit exceeded:", errorMsg);
        setError(errorMsg);
        setIsSubmitting(false);
        return;
      }

      // Create redeem request in Supabase
      console.log("Creating redeem request...", selectedPlayer);
      const { data: redeemData, error: redeemError } = await supabase
        .from("redeem_requests")
        .insert([
          {
            vip_code: selectedPlayer.vipCode,
            player_name: selectedPlayer.playerName,
            messenger_id: selectedPlayer.messengerId,
            team_code: selectedPlayer.team,
            game_platform: platform,
            game_username: username,
            total_amount: parseFloat(amount),
            status: "pending",
            payment_methods: formattedPaymentMethods,
            notes: notes || "Agent initiated redeem request",
            manychat_data: selectedPlayer,
            player_data: selectedPlayer,
            agent_name: user.name,
            agent_department: user.department,
            init_by: "agent",
            init_id: user.id,
            page_name: selectedPage || null,
            initiated_by: {
              name: user.name,
              department: user.department,
              employee_code: user.employee_code
            },
          },
        ])
        .select()
        .single();

      if (redeemError) {
        console.error("Error creating redeem request:", redeemError);
        throw redeemError;
      }

      console.log("Redeem request created successfully:", redeemData);

      // Send notification to player via ManyChat
      try {
        await sendManyChatMessage({
          subscriberId: selectedPlayer.messengerId,
          message: MANYCHAT_TEMPLATES.REDEEM_REQUEST_CREATED(
            parseFloat(amount),
            platform,
            redeemData.redeem_id
          ),
          customFields: {
            redeem_request_id: redeemData.redeem_id,
            redeem_status: "pending",
            redeem_amount: parseFloat(amount),
            redeem_platform: platform,
            redeem_created_at: new Date().toISOString(),
            redeem_created_by: user.name,
          },
          teamCode: selectedPlayer.team,
        });
      } catch (manyChatError) {
        console.error("Error sending ManyChat notification:", manyChatError);
        // Continue with the process even if notification fails
      }

      // Update player's total_redeemed and game_limits
      const updatedGameLimits = [...gameLimits];
      const gameIndex = updatedGameLimits.findIndex(
        (limit: any) => limit.game_name === platform
      );

      console.log("Preparing game limits update:", {
        existingLimits: gameLimits,
        foundIndex: gameIndex,
        currentPlatform: platform,
      });

      if (gameIndex >= 0) {
        // Update existing game limit
        const newAmount = currentGameAmount + requestAmount;
        console.log("Updating existing game limit:", {
          oldAmount: currentGameAmount,
          addingAmount: requestAmount,
          newTotal: newAmount,
        });

        updatedGameLimits[gameIndex] = {
          ...updatedGameLimits[gameIndex],
          amount: newAmount,
          timestamp: currentTime.toISOString(),
        };
      } else {
        // Add new game limit
        console.log("Adding new game limit:", {
          platform: platform,
          initialAmount: requestAmount,
        });

        updatedGameLimits.push({
          game_name: platform,
          amount: requestAmount,
          timestamp: currentTime.toISOString(),
        });
      }

      console.log("Final game limits to update:", updatedGameLimits);

      // Calculate new total redeemed amount
      const newTotalRedeemed = currentTotalRedeemed + requestAmount;
      console.log("Calculating new total redeemed:", {
        previousTotal: currentTotalRedeemed,
        addingAmount: requestAmount,
        newTotal: newTotalRedeemed,
      });

      // Update player record with new limits
      console.log("Updating player record with new limits...");
      const updateData = {
        total_redeemed: newTotalRedeemed, // Use the calculated new total
        game_limits: updatedGameLimits,
        ...(hoursSinceReset >= 24
          ? { last_reset_time: currentTime.toISOString() }
          : {}),
      };
      console.log("Final update data to be sent:", updateData);

      // Double check the data before update
      console.log("Verification before update:", {
        originalTotal: playerData.total_redeemed,
        amountToAdd: requestAmount,
        calculatedNewTotal: newTotalRedeemed,
        willReset: hoursSinceReset >= 24,
        finalUpdateData: updateData,
      });

      const { error: updateError } = await supabase
        .from("players")
        .update(updateData)
        .eq("vip_code", selectedPlayer.vipCode);

      if (updateError) {
        console.error("Error updating player record:", updateError);
        throw updateError;
      }

      // Verify the update was successful
      const { data: verifyData, error: verifyError } = await supabase
        .from("players")
        .select("total_redeemed, game_limits")
        .eq("vip_code", selectedPlayer.vipCode)
        .single();

      console.log("Verification after update:", {
        success: !verifyError,
        newData: verifyData,
        expectedTotal: newTotalRedeemed,
      });

      if (verifyError) {
        console.error("Error verifying update:", verifyError);
      }

      console.log("Player record updated successfully");
      onClose();
    } catch (err) {
      console.error("Error submitting redeem request:", err);
      setError(
        err instanceof Error ? err.message : "Failed to submit redeem request"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add a new function to handle opening the OTP verification modal
  const handleOpenVerification = () => {
    setShowVerification(true);
  };

  const getPlatformUsername = (platform: string) => {
    if (!selectedPlayer?.platforms) return "";
    switch (platform) {
      case "firekirin":
        return selectedPlayer.platforms.firekirin_username || "";
      case "juwa":
        return selectedPlayer.platforms.juwa_username || "";
      case "orionstars":
        return selectedPlayer.platforms.orionstars_username || "";
      default:
        return "";
    }
  };

  if (!isOpen) return null;

  // If it's verification only mode, only show the verification modal
  if (isVerificationOnly) {
    return (
      <VerifyOTPModal
        isOpen={true}
        onClose={onClose}
        otp={otp}
        setOtp={setOtp}
        isVerifying={isVerifying}
        verificationError={verificationError}
        handleVerifyOtp={handleVerifyOtp}
        redeemRequest={redeemRequest}
      />
    );
  }

  return (
    <>
      <VerifyOTPModal
        isOpen={showVerification}
        onClose={handleModalClose}
        otp={otp}
        setOtp={setOtp}
        isVerifying={isVerifying}
        verificationError={verificationError}
        handleVerifyOtp={handleVerifyOtp}
        redeemRequest={redeemRequest}
      />

      {!showVerification && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-lg border border-gray-800/20 shadow-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h3 className="text-xl font-semibold text-white">
                Submit Redeem Request
              </h3>
              <button
                onClick={handleModalClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <PlayerSearch
                onSelect={setSelectedPlayer}
                selectedPlayer={selectedPlayer}
                userEntAccess={user.ent_access}
              />

              <div className="grid grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Platform</label>
                    <select
                      className="w-full bg-[#252b3b] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                      value={platform}
                      onChange={(e) => {
                        setPlatform(e.target.value);
                        setUsername(getPlatformUsername(e.target.value));
                      }}
                    >
                      <option value="">Select platform...</option>
                      <option value="Orion Stars">Orion Stars</option>
                      <option value="Fire Kirin">Fire Kirin</option>
                      <option value="Game Vault">Game Vault</option>
                      <option value="VBlink">VBlink</option>
                      <option value="Vegas Sweeps">Vegas Sweeps</option>
                      <option value="Ultra Panda">Ultra Panda</option>
                      <option value="Yolo">Yolo</option>
                      <option value="Juwa">Juwa</option>
                      <option value="Moolah">Moolah</option>
                      <option value="Panda Master">Panda Master</option>
                    </select>
                  </div>

                  {/* Game Username */}
                  <GameUsernameField
                    value={username}
                    onChange={setUsername}
                    platform={platform}
                    vipCode={selectedPlayer?.vipCode || ""}
                  />

                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Amount</label>
                    <input
                      type="number"
                      className="w-full bg-[#252b3b] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                      placeholder="Enter amount..."
                      value={amount}
                      max={500}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </div>

                {/* Right Column - Payment Methods */}
                <div className="space-y-4">
                  <label className="text-sm text-gray-400">
                    Payment Methods
                  </label>
                  <div className="grid grid-cols-1   gap-3">
                    {/* Cashapp */}
                    <div className="space-y-2 flex gap-x-4 ">
                      <button
                        onClick={() => handlePaymentMethodChange("cashapp")}
                        className={`w-full flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 
                          ${
                            paymentMethods.cashapp
                              ? "border-green-500 bg-green-500/10"
                              : "border-gray-800 hover:border-green-500/50 hover:bg-green-500/5"
                          }`}
                      >
                        <Image
                          src="/cashapp.svg"
                          alt="Cashapp"
                          width={32}
                          height={32}
                          className="mb-2"
                        />
                        <span
                          className={`text-xs font-medium ${
                            paymentMethods.cashapp
                              ? "text-green-500"
                              : "text-gray-400"
                          }`}
                        >
                          Cashapp
                        </span>
                      </button>
                      {paymentMethods.cashapp && (
                        <input
                          type="text"
                          className={`w-full bg-[#252b3b] border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none ${
                            cashTags.cashapp &&
                            !isValidPaymentTag("cashapp", cashTags.cashapp)
                              ? "border-red-500 focus:border-red-500"
                              : "border-gray-800 focus:border-blue-500"
                          }`}
                          placeholder="$tag..."
                          value={cashTags.cashapp}
                          onChange={(e) =>
                            handleCashTagChange("cashapp", e.target.value)
                          }
                        />
                      )}
                    </div>

                    {/* Venmo */}
                    <div className="space-y-2 flex gap-x-4">
                      <button
                        onClick={() => handlePaymentMethodChange("venmo")}
                        className={`w-full flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 
                          ${
                            paymentMethods.venmo
                              ? "border-blue-500 bg-blue-500/10"
                              : "border-gray-800 hover:border-blue-500/50 hover:bg-blue-500/5"
                          }`}
                      >
                        <Image
                          src="/venmo.svg"
                          alt="Venmo"
                          width={32}
                          height={32}
                          className="mb-2"
                        />
                        <span
                          className={`text-xs font-medium ${
                            paymentMethods.venmo
                              ? "text-blue-500"
                              : "text-gray-400"
                          }`}
                        >
                          Venmo
                        </span>
                      </button>
                      {paymentMethods.venmo && (
                        <input
                          type="text"
                          className={`w-full bg-[#252b3b] border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none ${
                            cashTags.venmo &&
                            !isValidPaymentTag("venmo", cashTags.venmo)
                              ? "border-red-500 focus:border-red-500"
                              : "border-gray-800 focus:border-blue-500"
                          }`}
                          placeholder="@tag..."
                          value={cashTags.venmo}
                          onChange={(e) =>
                            handleCashTagChange("venmo", e.target.value)
                          }
                        />
                      )}
                    </div>

                    {/* Chime */}
                    <div className="space-y-2 flex gap-x-4">
                      <button
                        onClick={() => handlePaymentMethodChange("chime")}
                        className={`w-full flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 
                          ${
                            paymentMethods.chime
                              ? "border-green-500 bg-green-500/10"
                              : "border-gray-800 hover:border-green-500/50 hover:bg-green-500/5"
                          }`}
                      >
                        <Image
                          src="/chime.svg"
                          alt="Chime"
                          width={32}
                          height={32}
                          className="mb-2"
                        />
                        <span
                          className={`text-xs font-medium ${
                            paymentMethods.chime
                              ? "text-green-500"
                              : "text-gray-400"
                          }`}
                        >
                          Chime
                        </span>
                      </button>
                      {paymentMethods.chime && (
                        <input
                          type="text"
                          className={`w-full bg-[#252b3b] border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none ${
                            cashTags.chime &&
                            !isValidPaymentTag("chime", cashTags.chime)
                              ? "border-red-500 focus:border-red-500"
                              : "border-gray-800 focus:border-blue-500"
                          }`}
                          placeholder="$tag..."
                          value={cashTags.chime}
                          onChange={(e) =>
                            handleCashTagChange("chime", e.target.value)
                          }
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Add ENT Pages Dropdown */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Page Name</label>
                <EntPagesDropdown
                  teamCode={selectedPlayer?.team}
                  value={selectedPage}
                  onChange={setSelectedPage}
                  disabled={!selectedPlayer}
                />
                {pageError && (
                  <p className="text-sm text-red-500 mt-1">{pageError}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400">
                  Additional Notes
                </label>
                <textarea
                  className="w-full bg-[#252b3b] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Enter any additional notes..."
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-800">
              {(error || pageError) && (
                <div className="flex-1 text-red-500 text-sm">
                  {error || pageError}
                </div>
              )}
              <button
                onClick={handleModalClose}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  !selectedPlayer ||
                  !platform ||
                  !username ||
                  !amount ||
                  !Object.values(paymentMethods).some(Boolean) ||
                  !Object.entries(paymentMethods).every(
                    ([method, enabled]) =>
                      !enabled ||
                      isValidPaymentTag(
                        method as keyof CashTags,
                        cashTags[method as keyof CashTags]
                      )
                  ) ||
                  !validateEntAccess(selectedPlayer)
                }
                className="px-4 py-2 text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                  transition-all duration-200 transform hover:scale-105 active:scale-95 
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                  flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Submitting...
                  </>
                ) : (
                  "Submit Request"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RedeemModal;
