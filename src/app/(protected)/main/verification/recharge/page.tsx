"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { AdminHeader, VerificationHeader } from "@/app/components/Headers";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import RefreshButton from "@/app/components/RefreshButton";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { X, Loader2, Link } from "lucide-react";
import AlertModal from "@/app/components/AlertModal";
import { supabase } from "@/lib/supabase";
import { sendManyChatMessage, MANYCHAT_TEMPLATES } from "@/utils/manychat";
import TimeElapsed from "@/app/components/TimeElapsed";

import { AgentImage } from "@/app/components/recharge/AgentImage";
import Image from "next/image";

interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
}

interface PaymentMethod {
  type: string;
  details: string;
}

interface ProcessedBy {
  name: string;
  email: string;
}

interface RechargeRequest {
  rechargeId: string;
  recharge_id: string | null;
  init_id: string;
  assigned_id: string;
  playerName: string;
  messengerId: string;
  gamePlatform: string;
  gameUsername: string;
  amount: number;
  bonusAmount: number;
  status: string;
  screenshotUrl?: string;
  teamCode: string;
  promotion: string | null;
  createdAt: string;
  processedBy: ProcessedBy | null;
  pageId?: string;
  profile_pic?: string;
  paymentMethod: PaymentMethod;
  creditsLoaded?: number;
  promoCode?: string;
  promoType?: string;
  notes?: string;
  manyChatData?: any;
  agentName?: string;
  agentDepartment?: string;
  processedAt?: string;
  updatedAt?: string;
  assigned_redeem: any;
  processing_state: {
    status: "idle" | "in_progress";
    processed_by: string | null;
    modal_type:
    | "process_modal"
    | "reject_modal"
    | "approve_modal"
    | "verify_modal"
    | "payment_modal"
    | "none";
  };
  rejectReason?: string;
  rejectNotes?: string;
  rejectedAt?: string;
  rejectedBy?: ProcessedBy | null;
  platform_usernames?: string[];
  vipCode?: string;
}

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (identifier: string) => Promise<void>;
  rechargeId: string;
}

const VerificationModal: React.FC<VerificationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  rechargeId,
}) => {
  const [identifier, setIdentifier] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-lg border border-gray-800/20">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h3 className="text-xl font-semibold text-white">Verify Recharge</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Identifier</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full bg-[#252b3b] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter identifier..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-800">
          {error && <div className="flex-1 text-red-500 text-sm">{error}</div>}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              setIsSubmitting(true);
              setError(null);
              try {
                await onSubmit(identifier);
                onClose();
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "Failed to verify recharge"
                );
              } finally {
                setIsSubmitting(false);
              }
            }}
            disabled={isSubmitting || !identifier}
            className="px-4 py-2 text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 
              transition-all duration-200 transform hover:scale-105 active:scale-95 
              disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
              flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Define interface for ScreenshotViewer props
interface ScreenshotViewerProps {
  imageUrl: string | undefined;
  alt?: string;
}

// New ScreenshotViewer component for handling images with zoom functionality
const ScreenshotViewer: React.FC<ScreenshotViewerProps> = ({
  imageUrl,
  alt = "Screenshot",
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [processedUrl, setProcessedUrl] = useState<string | undefined>(
    undefined
  );
  // Add new state variables for magnifying glass
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [magnifierPosition, setMagnifierPosition] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  // Add retry mechanism
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  console.log("imageUrl", imageUrl);

  // Reset states when imageUrl changes
  useEffect(() => {
    console.log(
      "ScreenshotViewer - imageUrl changed:",
      imageUrl?.substring(0, 30)
    );
    setIsLoading(true);
    setHasError(false);
    setRetryCount(0);
  }, [imageUrl]);

  // Process the image URL when component mounts or when imageUrl changes
  useEffect(() => {
    if (!imageUrl) {
      console.log("ScreenshotViewer - No imageUrl provided");
      setProcessedUrl(undefined);
      setIsLoading(false);
      setHasError(true);
      return;
    }

    // Process the URL to handle different formats
    try {
      console.log(
        "ScreenshotViewer - Processing URL:",
        imageUrl?.substring(0, 30)
      );
      let url = imageUrl;

      // If it's a bare base64 string without proper prefix
      if (
        imageUrl.match(/^[A-Za-z0-9+/=]+$/) &&
        !imageUrl.startsWith("data:")
      ) {
        console.log(
          "ScreenshotViewer - Adding data:image prefix to bare base64"
        );
        // Try to add the proper prefix
        url = `data:image/png;base64,${imageUrl}`;
      } else if (
        imageUrl.startsWith("data:image") &&
        !imageUrl.includes(";base64,")
      ) {
        console.log("ScreenshotViewer - Fixing incomplete data:image format");
        // Fix incomplete data:image format that's missing the base64 marker
        url = imageUrl.replace("data:image/", "data:image/png;base64,");
      }

      // Force a small delay to ensure the DOM is ready
      setTimeout(() => {
        console.log("ScreenshotViewer - Setting processedUrl after delay");
        setProcessedUrl(url);
      }, 100);
    } catch (err) {
      console.error("Error processing image URL:", err);
      setHasError(true);
      setIsLoading(false);
    }
  }, [imageUrl]);

  // Implement retry logic for image loading
  useEffect(() => {
    if (hasError && retryCount < maxRetries && imageUrl) {
      console.log(
        `ScreenshotViewer - Retrying image load (${retryCount + 1
        }/${maxRetries})`
      );
      const timer = setTimeout(() => {
        setIsLoading(true);
        setHasError(false);
        setRetryCount((prev) => prev + 1);
        // Force reprocessing by setting a timestamp query param
        if (processedUrl) {
          const timestamp = new Date().getTime();
          const separator = processedUrl.includes("?") ? "&" : "?";
          setProcessedUrl(`${processedUrl}${separator}_t=${timestamp}`);
        }
      }, 500 * (retryCount + 1)); // Increasing backoff

      return () => clearTimeout(timer);
    }
  }, [hasError, retryCount, maxRetries, imageUrl, processedUrl]);

  const isValidImageUrl = (url: string | undefined): boolean => {
    if (!url) return false;

    // Check for http(s) URLs
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return true;
    }

    // Check for data:image URLs with proper format
    if (url.startsWith("data:image/")) {
      return true;
    }

    // Check for partial data:image URLs
    if (url.startsWith("data:image")) {
      return true;
    }

    // Check if it might be a base64 string (simplified check)
    // This handles raw base64 strings without the proper data:image prefix
    if (url.match(/^[A-Za-z0-9+/=]+$/) && url.length > 20) {
      return true;
    }

    return false;
  };

  const handleImageLoad = (): void => {
    console.log(
      "Image loaded successfully:",
      processedUrl?.substring(0, 30) + "..."
    );
    setIsLoading(false);
    setHasError(false);
    setRetryCount(0);
  };

  const handleImageError = (): void => {
    console.error(
      "Failed to load image:",
      processedUrl?.substring(0, 30) + "..."
    );
    setIsLoading(false);
    setHasError(true);

    // If we've already retried the maximum number of times, show a fallback placeholder
    if (retryCount >= maxRetries) {
      console.log(
        "ScreenshotViewer - Max retries reached, showing error state"
      );
    }
  };

  const handleZoomIn = (e: React.MouseEvent): void => {
    e.stopPropagation();
    setZoomLevel((prev) => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = (e: React.MouseEvent): void => {
    e.stopPropagation();
    setZoomLevel((prev) => Math.max(prev - 0.5, 1));
  };

  const handleZoomReset = (e: React.MouseEvent): void => {
    e.stopPropagation();
    setZoomLevel(1);
  };

  // Add magnifier functionality
  const handleMouseMove = (e: React.MouseEvent): void => {
    if (!imageRef.current) return;

    const { left, top, width, height } =
      imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;

    setMagnifierPosition({ x, y });
  };

  return (
    <>
      {/* Regular view */}
      <div
        className="relative"
        onMouseEnter={() => setShowMagnifier(true)}
        onMouseLeave={() => setShowMagnifier(false)}
        onMouseMove={handleMouseMove}
        onClick={() => setIsFullScreen(true)}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a]">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        )}

        {hasError && retryCount >= maxRetries && (
          <div className="flex items-center justify-center h-[200px] bg-[#1a1a1a] text-gray-400">
            <div className="text-center">
              <div className="mb-2">Failed to load screenshot</div>
              <button
                onClick={() => {
                  setIsLoading(true);
                  setHasError(false);
                  setRetryCount(0);
                }}
                className="px-3 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <img
          ref={imageRef}
          src={processedUrl || imageUrl}
          alt={alt}
          className={`rounded-lg object-contain w-full h-auto max-h-[300px] transition-all duration-300 ${isLoading || (hasError && retryCount >= maxRetries)
              ? "opacity-0"
              : "opacity-100"
            } cursor-zoom-in`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{
            display: hasError && retryCount >= maxRetries ? "none" : "block",
          }}
        />

        {/* Magnifying glass */}
        {showMagnifier && !isLoading && !hasError && (
          <div
            className="absolute pointer-events-none rounded-full border-2 border-white shadow-lg overflow-hidden z-10"
            style={{
              width: "120px",
              height: "120px",
              top: `calc(${magnifierPosition.y}% - 60px)`,
              left: `calc(${magnifierPosition.x}% - 60px)`,
              backgroundImage: `url(${processedUrl || imageUrl})`,
              backgroundPosition: `${magnifierPosition.x}% ${magnifierPosition.y}%`,
              backgroundSize: "250%",
              backgroundRepeat: "no-repeat",
              opacity: 0.9,
            }}
          />
        )}

        {!isLoading && !hasError && (
          <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="bg-black/50 p-2 rounded-lg">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m4-3H6"
                />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen view */}
      {isFullScreen && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-8">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close button */}
            <button
              onClick={() => {
                setIsFullScreen(false);
                setZoomLevel(1);
              }}
              className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors z-10"
            >
              <svg
                className="w-6 h-6 text-white"
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

            {/* Zoom controls */}
            <div className="absolute top-4 left-4 flex space-x-2 z-10">
              <button
                onClick={handleZoomIn}
                className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
              >
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </button>
              <button
                onClick={handleZoomOut}
                className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
              >
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M18 12H6"
                  />
                </svg>
              </button>
              <button
                onClick={handleZoomReset}
                className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
              >
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                  />
                </svg>
              </button>
            </div>

            {/* Fullscreen image with zoom */}
            <div
              className="max-h-full max-w-full overflow-auto cursor-zoom-out"
              onClick={() => {
                setIsFullScreen(false);
                setZoomLevel(1);
              }}
            >
              <img
                src={processedUrl || imageUrl}
                alt={alt}
                className="object-contain transition-transform duration-300"
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: "center",
                  margin: "auto",
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Image info */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 px-4 py-2 rounded-lg text-white text-sm z-10">
              {Math.round(zoomLevel * 100)}% | Click background to close
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Interface for ScreenshotFetcher props
interface ScreenshotFetcherProps {
  rechargeId: string;
  initialUrl?: string;
}

// New component to fetch and display screenshots using direct API call
const ScreenshotFetcher: React.FC<ScreenshotFetcherProps> = ({
  rechargeId,
  initialUrl,
}) => {
  const [imageUrl, setImageUrl] = useState<string | undefined>(initialUrl);
  const [isLoading, setIsLoading] = useState(!initialUrl);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If we already have the URL, don't fetch
    if (initialUrl) {
      setImageUrl(initialUrl);
      setIsLoading(false);
      return;
    }

    const fetchScreenshotUrl = async () => {
      if (!rechargeId) return;

      setIsLoading(true);
      setError(null);

      try {
        console.log("Fetching screenshot URL for:", rechargeId);

        // Direct API call to Supabase REST endpoint
        const response = await fetch(
          `https://qgixcznoxktrxdcytyxo.supabase.co/rest/v1/recharge_requests?select=screenshot_url&id=eq.${rechargeId}`,
          {
            headers: {
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
                }`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch screenshot URL: ${response.statusText}`
          );
        }

        const data = await response.json();
        console.log("Screenshot response:", data);

        if (data && data.length > 0 && data[0].screenshot_url) {
          console.log(
            "Successfully fetched screenshot URL:",
            data[0].screenshot_url
          );
          setImageUrl(data[0].screenshot_url);
        } else {
          console.log("No screenshot URL found for this request");
          setError("No screenshot available for this request");
        }
      } catch (err) {
        console.error("Error fetching screenshot URL:", err);
        setError("Failed to load screenshot");
      } finally {
        setIsLoading(false);
      }
    };

    fetchScreenshotUrl();
  }, [rechargeId, initialUrl]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[200px] bg-[#1a1a1a] rounded-lg">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
          <div className="text-sm text-gray-400">Loading screenshot...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[200px] bg-[#1a1a1a] rounded-lg">
        <div className="text-center text-gray-400">
          <svg
            className="w-12 h-12 mx-auto mb-2 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          {error}
        </div>
      </div>
    );
  }

  return <ScreenshotViewer imageUrl={imageUrl} alt="Recharge Screenshot" />;
};

const VerificationRechargePage: React.FC = () => {
  const router = useRouter();
  const { logActivity } = useActivityLogger();

  const [isLoading, setIsLoading] = useState(false);
  const [rechargeRequests, setRechargeRequests] = useState<RechargeRequest[]>(
    []
  );
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<
    "Pending" | "Processed" | "Rejected"
  >("Pending");
  const [activeTeamCode, setActiveTeamCode] = useState<
    "ALL" | "ENT-1" | "ENT-2" | "ENT-3"
  >("ALL");
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<RechargeRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectNotes, setRejectNotes] = useState("");
  const [processingAction, setProcessingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [verificationModal, setVerificationModal] = useState<{
    isOpen: boolean;
    rechargeId: string;
  }>({ isOpen: false, rechargeId: "" });
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: "success" | "error";
    message: string;
  }>({ isOpen: false, type: "success", message: "" });

  // Stats counts
  const pendingCount = rechargeRequests.filter(
    (r) => r.status === "sc_submitted"
  ).length;
  const processedCount = rechargeRequests.filter(
    (r) => r.status === "sc_processed"
  ).length;
  const rejectedCount = rechargeRequests.filter(
    (r) => r.status === "sc_rejected"
  ).length;

  console.log("selectedRequest", selectedRequest?.screenshotUrl);

  // Add useEffect for real-time subscription
  useEffect(() => {
    if (!user) return;

    console.log("Setting up realtime subscription for user:", user.id);

    // Create a single channel with multiple subscriptions
    const channel = supabase
      .channel("verification-recharge-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "recharge_requests",
        },
        (payload) => {
          console.log("Realtime change for pending:", payload);
          handleRealtimeChange(payload);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "recharge_requests",
          filter: "status=eq.sc_submitted",
        },
        (payload) => {
          console.log("Realtime change for pending:", payload);
          handleRealtimeChange(payload);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "recharge_requests",
          filter: "status=eq.sc_processed",
        },
        (payload) => {
          console.log("Realtime change for processed:", payload);
          handleRealtimeChange(payload);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "recharge_requests",
          filter: "status=eq.completed",
        },
        (payload) => {
          console.log("Realtime change for processed:", payload);
          handleRealtimeChange(payload);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "recharge_requests",
          filter: "status=eq.sc_rejected",
        },
        (payload) => {
          console.log("Realtime change for rejected:", payload);
          handleRealtimeChange(payload);
        }
      );

    // Function to handle realtime changes
    function handleRealtimeChange(payload: any) {
      console.log("Handling realtime change:", payload);

      // Handle different events
      switch (payload.eventType) {
        case "INSERT":
          console.log("INSERT event:", payload.new);
          setRechargeRequests((prev) => {
            const newRequest = transformRechargeRequest(payload.new);
            // Only add if it doesn't already exist
            if (!prev.find((r) => r.rechargeId === newRequest.rechargeId)) {
              return [newRequest, ...prev];
            }
            return prev;
          });
          break;

        case "UPDATE":
          console.log("UPDATE event:", payload.new);
          setRechargeRequests((prev) =>
            prev.map((request) =>
              request.rechargeId === payload.new.id
                ? transformRechargeRequest(payload.new)
                : request
            )
          );

          // Handle processing_state changes
          if (
            payload.old.processing_state?.status !==
            payload.new.processing_state?.status
          ) {
            handleProcessingStateChange(payload.new);
          }
          break;

        case "DELETE":
          console.log("DELETE event:", payload.old);
          setRechargeRequests((prev) =>
            prev.filter((request) => request.rechargeId !== payload.old.id)
          );
          break;
      }
    }

    // Helper function to handle processing state changes
    function handleProcessingStateChange(updatedRequest: any) {
      console.log("Processing state changed:", updatedRequest);

      // If the request was being processed by this user and is now idle, close any open modals
      if (
        selectedRequest?.rechargeId === updatedRequest.id &&
        updatedRequest.processing_state?.status === "idle"
      ) {
        setShowProcessModal(false);
        setShowRejectModal(false);
        setSelectedRequest(null);
      }

      // If another user started processing this request
      if (
        updatedRequest.processing_state?.status === "in_progress" &&
        updatedRequest.processing_state?.processed_by !== user?.id
      ) {
        // Update UI to show request is being processed by another user
        setRechargeRequests((prev) =>
          prev.map((request) =>
            request.rechargeId === updatedRequest.id
              ? transformRechargeRequest(updatedRequest)
              : request
          )
        );
      }
    }

    // Subscribe to the channel
    channel.subscribe((status: any) => {
      console.log(`Channel subscription status:`, status);
    });

    // Initial fetch
    fetchRechargeRequests();

    // Cleanup subscription
    return () => {
      console.log("Cleaning up subscription");
      channel.unsubscribe();
    };
  }, [user]); // Only depend on user changes

  // Helper function to transform recharge request data
  const transformRechargeRequest = (data: any): RechargeRequest => ({
    rechargeId: data.id,
    recharge_id: data.recharge_id,
    init_id: data.init_id,
    assigned_id: data.assigned_id,
    playerName: data.player_name,
    messengerId: data.messenger_id,
    gamePlatform: data.game_platform,
    gameUsername: data.game_username,
    amount: data.amount,
    bonusAmount: data.bonus_amount,
    creditsLoaded: data.credits_loaded,
    status: data.status,
    teamCode: data.team_code,
    promoCode: data.promo_code,
    promoType: data.promo_type,
    paymentMethod: data.payment_method,
    screenshotUrl: data.screenshot_url,
    notes: data.notes,
    manyChatData: data.manychat_data,
    agentName: data.agent_name,
    agentDepartment: data.agent_department,
    processedBy: data.processed_by,
    processedAt: data.processed_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    profile_pic: data.manychat_data?.profile?.profilePic,
    promotion: data.promotion,
    assigned_redeem: data.assigned_redeem,
    processing_state: data.processing_state || {
      status: "idle",
      processed_by: null,
      modal_type: "none",
    },
    rejectReason: data.reject_reason,
    rejectNotes: data.reject_notes,
    rejectedAt: data.rejected_at,
    rejectedBy: data.rejected_by,
    platform_usernames: data.platform_usernames,
    vipCode: data.vip_code,
  });

  // Update fetchRechargeRequests with more logging
  const fetchRechargeRequests = async () => {
    setIsLoading(true);
    try {
      console.log("Fetching recharge requests...");
      const { data: rechargeData, error: rechargeError } = await supabase
        .from("recharge_requests")
        .select(`
          id,
          vip_code,
          team_code,
          game_platform,
          game_username,
          player_name,
          amount,
          bonus_amount,
          credits_loaded,
          status,
          processing_state,
          promo_code,
          promo_type,
          payment_method,
          screenshot_url,
          notes,
          manychat_data,
          agent_name,
          agent_department,
          processed_by,
          processed_at,
          created_at,
          updated_at,
          assigned_redeem,
          assigned_ct,
          identifier,
          recharge_id,
          assigned_recharge,
          init_by, 
          init_id,
          assigned_id
  
        `).in("status", ["sc_submitted", "sc_processed", "sc_rejected"])
        .order("created_at", { ascending: false });

      if (rechargeError) {
        console.error("Supabase error:", rechargeError);
        throw rechargeError;
      }

      console.log("Received data:", rechargeData);
      const transformedRequests = (rechargeData || []).map(
        transformRechargeRequest
      );
      console.log("Transformed requests:", transformedRequests);
      setRechargeRequests(transformedRequests);
    } catch (error) {
      console.error("Error fetching recharge requests:", error);
      setAlertModal({
        isOpen: true,
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch recharge requests",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add user effect to check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const token = Cookies.get("token");
      const userData = localStorage.getItem("user");

      console.log(
        "Checking auth - Token exists:",
        !!token,
        "User data exists:",
        !!userData
      );

      if (!token || !userData) {
        console.log("No token or user data, redirecting to login");
        router.push("/login");
        return;
      }

      try {
        const parsedUser = JSON.parse(userData);
        console.log("Parsed user:", parsedUser);

        if (
          parsedUser.department !== "Verification" &&
          parsedUser.department !== "Admin"
        ) {
          console.log("Invalid department, redirecting to login");
          router.push("/login");
          return;
        }
        setUser(parsedUser);
      } catch (error) {
        console.error("Error parsing user data:", error);
        router.push("/login");
      }
    };

    checkAuth();
  }, [router]);

  // Add auto-open modal effect
  useEffect(() => {
    const handleAutoOpenModal = async () => {
      if (!user?.id) return;

      // Find any request that's in progress and assigned to current user
      const inProgressRequest = rechargeRequests.find(
        (request) =>
          request.processing_state?.status === "in_progress" &&
          request.processing_state?.processed_by === user.id
      );

      if (inProgressRequest) {
        console.log("Found in-progress request:", inProgressRequest);
        setSelectedRequest(inProgressRequest);

        // Open appropriate modal based on modal_type
        switch (inProgressRequest.processing_state?.modal_type) {
          case "process_modal":
            setShowProcessModal(true);
            break;
          case "reject_modal":
            setShowRejectModal(true);
            break;
          default:
            // If modal_type is none or unknown, release the lock
            try {
              const { error } = await supabase
                .from("recharge_requests")
                .update({
                  processing_state: {
                    status: "idle",
                    processed_by: null,
                    modal_type: "none",
                  },
                })
                .eq("id", inProgressRequest.rechargeId);

              if (error) {
                console.error("Error resetting processing state:", error);
              }
            } catch (error) {
              console.error("Error in auto-open modal cleanup:", error);
            }
            break;
        }
      }
    };

    if (user?.id && rechargeRequests.length > 0) {
      handleAutoOpenModal();
    }
  }, [rechargeRequests, user?.id]);

  // Add useEffect to fetch processor name when a request's processing state changes


  // Update handleProcessClick
  const handleProcessClick = async (request: RechargeRequest) => {
    // Check if request is already being processed
    if (request.processing_state?.status === "in_progress") {
      return;
    }

    try {
      // Check if player is banned
      const { data: playerStatus, error: statusError } = await supabase
        .from("players")
        .select("status")
        .eq("vip_code", request.vipCode)
        .maybeSingle();

      if (statusError) {
        console.error("Error checking player status:", statusError);
        setAlertModal({
          isOpen: true,
          type: "error",
          message: "Error checking player status",
        });
        return;
      }

      if (playerStatus?.status === "banned") {
        setAlertModal({
          isOpen: true,
          type: "error",
          message: "This player is banned. Cannot process any requests.",
        });
        return;
      }

      // Update processing_state to in_progress
      const { data, error: updateError } = await supabase
        .from("recharge_requests")
        .update({
          processing_state: {
            status: "in_progress",
            processed_by: user?.id || null,
            modal_type: "process_modal",
          },
        })
        .eq("id", request.rechargeId)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating processing state:", updateError);
        throw updateError;
      }

      // Update local state
      setSelectedRequest(transformRechargeRequest(data));
      setShowProcessModal(true);

      // Update the request in the list
      setRechargeRequests((prev) =>
        prev.map((r) =>
          r.rechargeId === request.rechargeId
            ? transformRechargeRequest(data)
            : r
        )
      );
    } catch (error) {
      console.error("Error updating processing state:", error);
      setError("Failed to start processing request");
    }
  };

  // Update handleRejectClick
  const handleRejectClick = async (request: RechargeRequest) => {
    if (request.processing_state?.status === "in_progress") {
      return;
    }

    try {
      // Check if player is banned
      const { data: playerStatus, error: statusError } = await supabase
        .from("players")
        .select("status")
        .eq("vip_code", request.vipCode)
        .single();

      if (statusError) {
        console.error("Error checking player status:", statusError);
        setAlertModal({
          isOpen: true,
          type: "error",
          message: "Error checking player status",
        });
        return;
      }

      if (playerStatus?.status === "banned") {
        setAlertModal({
          isOpen: true,
          type: "error",
          message: "This player is banned. Cannot process any requests.",
        });
        return;
      }

      // Update processing_state to in_progress with reject modal
      const { data, error: updateError } = await supabase
        .from("recharge_requests")
        .update({
          processing_state: {
            status: "in_progress",
            processed_by: user?.id || null,
            modal_type: "reject_modal",
          },
        })
        .eq("id", request.rechargeId)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating processing state:", updateError);
        throw updateError;
      }

      // Update local state
      setSelectedRequest(transformRechargeRequest(data));
      setShowRejectModal(true);

      // Update the request in the list
      setRechargeRequests((prev) =>
        prev.map((r) =>
          r.rechargeId === request.rechargeId
            ? transformRechargeRequest(data)
            : r
        )
      );
    } catch (error) {
      console.error("Error updating processing state:", error);
      setError("Failed to start reject process");
    }
  };

  // Update handleCloseProcessModal
  const handleCloseProcessModal = async () => {
    if (selectedRequest) {
      try {
        // Reset processing_state to idle
        const { error } = await supabase
          .from("recharge_requests")
          .update({
            processing_state: {
              status: "idle",
              processed_by: null,
              modal_type: "none",
            },
          })
          .eq("id", selectedRequest.rechargeId);

        if (error) {
          console.error("Error resetting processing_state:", error);
          throw error;
        }
      } catch (error) {
        console.error("Error in handleCloseProcessModal:", error);
      }
    }
    setShowProcessModal(false);
    setSelectedRequest(null);
    setIdentifier("");
  };

  // Update handleCloseRejectModal
  const handleCloseRejectModal = async () => {
    if (selectedRequest) {
      try {
        // Reset processing_state to idle
        const { error } = await supabase
          .from("recharge_requests")
          .update({
            processing_state: {
              status: "idle",
              processed_by: null,
              modal_type: "none",
            },
          })
          .eq("id", selectedRequest.rechargeId);

        if (error) {
          console.error("Error resetting processing_state:", error);
          throw error;
        }
      } catch (error) {
        console.error("Error in handleCloseRejectModal:", error);
      }
    }
    setShowRejectModal(false);
    setRejectReason("");
    setRejectNotes("");
    setSelectedRequest(null);
  };

  const handleStatsCardClick = (tab: "Pending" | "Processed" | "Rejected") => {
    setActiveTab(tab);
    // Scroll to table section
    const tableElement = document.querySelector(".table-section");
    if (tableElement) {
      tableElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleProcessSubmit = async (identifier: string) => {
    if (!selectedRequest || !user) return;

    try {
      setProcessingAction(true);

      // Start a Supabase transaction
      const {
        data: { user: supabaseUser },
      } = await supabase.auth.getUser();
      if (!supabaseUser) throw new Error("No authenticated user found");

      // Insert the identifier into the identifier table
      const { error: identifierError } = await supabase
        .from("identifier")
        .insert({
          identifier: identifier,
          recharge_id: selectedRequest.recharge_id,
        });

      if (identifierError) {
        // Check for duplicate identifier error
        if (identifierError.message.includes("identifier_identifier_key")) {
          throw new Error("This identifier has already been used.");
        }
        throw new Error(identifierError.message);
      }

      // Check if there's an assigned redeem request
      if (selectedRequest.assigned_redeem) {
        const redeemId = selectedRequest.assigned_redeem.redeem_id;

        // Get the current redeem request
        const { data: redeemRequest, error: redeemFetchError } = await supabase
          .from("redeem_requests")
          .select(
            "amount_hold, amount_paid, messenger_id,redeem_id, total_amount, game_platform"
          )
          .eq("id", redeemId)
          .single();

        if (redeemFetchError) {
          throw new Error(
            "Failed to fetch redeem request: " + redeemFetchError.message
          );
        }

        if (!redeemRequest) {
          throw new Error("Redeem request not found");
        }

        // Calculate new amounts
        const newAmountHold =
          (redeemRequest.amount_hold || 0) - selectedRequest.amount;
        const newAmountPaid =
          (redeemRequest.amount_paid || 0) + selectedRequest.amount;

        // Update the redeem request
        const { error: redeemUpdateError } = await supabase
          .from("redeem_requests")
          .update({
            amount_hold: newAmountHold,
            amount_paid: newAmountPaid,
            updated_at: new Date().toISOString(),
            status:
              newAmountPaid === redeemRequest.total_amount
                ? "completed"
                : "queued_partially_paid",
          })
          .eq("id", redeemId);

        if (redeemUpdateError) {
          throw new Error(
            "Failed to update redeem request: " + redeemUpdateError.message
          );
        }

        // Send ManyChat message to the player
        try {

          console.log("manychat message:", redeemRequest.messenger_id, selectedRequest.amount, redeemRequest.redeem_id, selectedRequest.gamePlatform, selectedRequest.teamCode);
          await sendManyChatMessage({
            subscriberId: redeemRequest.messenger_id,
            message: MANYCHAT_TEMPLATES.RECHARGE_VERIFICATION_WITH_REDEEM(
              selectedRequest.amount,
              redeemRequest.redeem_id,
              selectedRequest.gamePlatform
            ),
            teamCode: selectedRequest.teamCode,
          });
        } catch (manyChatError) {
          console.error("Failed to send ManyChat message:", manyChatError);
          // Don't throw error here, continue with the process
        }
      }

      // Update the recharge request status in Supabase
      const { error: updateError } = await supabase
        .from("recharge_requests")
        .update({
          status: "sc_processed",
          deposit_status: "paid",
          verified_id: user.id,

          identifier: identifier,
          processing_state: {
            status: "idle",
            processed_by: null,
            modal_type: "none",
          },
        })
        .eq("id", selectedRequest.rechargeId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setShowProcessModal(false);
      setSelectedRequest(null);
      setIdentifier("");

      setAlertModal({
        isOpen: true,
        type: "success",
        message: "Recharge request processed successfully",
      });
    } catch (error) {
      console.error("Error processing recharge:", error);

      setAlertModal({
        isOpen: true,
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to process recharge request",
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!selectedRequest || !rejectReason || !user) return;

    console.log(rejectReason, rejectNotes, " reject submit");


    try {
      setProcessingAction(true);

      // Update the recharge request status in Supabase
      const { error: updateError } = await supabase
        .from("recharge_requests")
        .update({
          status: "sc_rejected",
          notes: rejectReason + ': ' + rejectNotes,
          deposit_status: "pending",

          // rejected_by: {
          //   id: user.id,
          //   name: user.id,
          //   email: user.email,
          // },
          // rejected_at: new Date().toISOString(),
          processing_state: {
            status: "idle",
            processed_by: null,
            modal_type: "none",
          },
        })
        .eq("id", selectedRequest.rechargeId);

      if (updateError) {
        throw new Error(updateError.message);
      }
      const { error: transationError } = await supabase
        .from("transactions")
        .update({
          deposit_status: "pending",
        })
        .eq("recharge_uuid", selectedRequest.rechargeId);

      if (transationError) {
        throw new Error(transationError.message);
      }

      setShowRejectModal(false);
      setRejectReason("");
      setRejectNotes("");
      setSelectedRequest(null);

      setAlertModal({
        isOpen: true,
        type: "success",
        message: "Recharge request rejected successfully",
      });
    } catch (error) {
      console.error("Error rejecting recharge:", error);

      setAlertModal({
        isOpen: true,
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to reject recharge request",
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleVerifySubmit = async (identifier: string) => {
    if (!user) return;

    try {
      // Update the recharge request status in Supabase
      const { error: updateError } = await supabase
        .from("recharge_requests")
        .update({
          status: "sc_processed",
          processed_by: user.id,
          processed_at: new Date().toISOString(),
          identifier: identifier,
        })
        .eq("id", verificationModal.rechargeId)
        .select();

      if (updateError) {
        throw new Error(updateError.message);
      }

      setVerificationModal({ isOpen: false, rechargeId: "" });
      await fetchRechargeRequests();

      setAlertModal({
        isOpen: true,
        type: "success",
        message: "Recharge request verified successfully",
      });
    } catch (error) {
      console.error("Error verifying recharge:", error);

      setAlertModal({
        isOpen: true,
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to verify recharge request",
      });
    }
  };

  // Make sure user is initialized before rendering anything
  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      {/* Make sure we safely access user properties with optional chaining */}
      {user?.department === "Verification" ? (
        <VerificationHeader user={user} />
      ) : (
        <AdminHeader user={user} />
      )}
      <div className="flex-1 pl-64">
        <main className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-white">Recharge</h1>
              <span className="text-3xl font-bold text-gray-500">Requests</span>
            </div>
            <div className="flex items-center gap-4">
              <RefreshButton
                onClick={fetchRechargeRequests}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {/* Pending Card */}
            <div
              onClick={() => handleStatsCardClick("Pending")}
              className={`relative bg-[#1a1a1a] rounded-2xl p-6 cursor-pointer transform transition-all duration-200 hover:scale-105 ${activeTab === "Pending" ? "scale-105 before:opacity-100" : ""
                } before:absolute before:inset-0 before:bg-gradient-to-b before:from-amber-500/20 before:to-transparent before:rounded-2xl before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 group`}
            >
              <div
                className={`absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent ${activeTab === "Pending" ? "opacity-100" : ""
                  }`}
              ></div>
              <div
                className={`absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-amber-500/10 to-transparent ${activeTab === "Pending" ? "opacity-100" : ""
                  }`}
              ></div>
              <div
                className={`absolute inset-y-0 -left-px w-px bg-gradient-to-b from-transparent via-amber-500/50 to-transparent transition-opacity duration-500 ${activeTab === "Pending"
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                  }`}
              ></div>
              <div
                className={`absolute inset-y-0 -right-px w-px bg-gradient-to-b from-transparent via-amber-500/50 to-transparent transition-opacity duration-500 ${activeTab === "Pending"
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                  }`}
              ></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xl text-amber-500 font-medium tracking-wider">
                    PENDING
                  </div>
                  <div className="p-2 bg-amber-500/10 rounded-lg">
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
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0zM10 7v6m4-3H6"
                      />
                    </svg>
                  </div>
                </div>
                <div
                  className={`text-3xl font-bold text-white mb-1 transition-transform duration-300 ${activeTab === "Pending"
                      ? "scale-105"
                      : "group-hover:scale-105"
                    }`}
                >
                  {pendingCount}
                </div>
                <div className="text-sm text-gray-400 mb-4">Requests</div>
              </div>
            </div>

            {/* Processed Card */}
            <div
              onClick={() => handleStatsCardClick("Processed")}
              className={`relative bg-[#1a1a1a] rounded-2xl p-6 cursor-pointer transform transition-all duration-200 hover:scale-105 ${activeTab === "Processed" ? "scale-105 before:opacity-100" : ""
                } before:absolute before:inset-0 before:bg-gradient-to-b before:from-emerald-500/20 before:to-transparent before:rounded-2xl before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 group`}
            >
              <div
                className={`absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent ${activeTab === "Processed" ? "opacity-100" : ""
                  }`}
              ></div>
              <div
                className={`absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent ${activeTab === "Processed" ? "opacity-100" : ""
                  }`}
              ></div>
              <div
                className={`absolute inset-y-0 -left-px w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent transition-opacity duration-500 ${activeTab === "Processed"
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                  }`}
              ></div>
              <div
                className={`absolute inset-y-0 -right-px w-px bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent transition-opacity duration-500 ${activeTab === "Processed"
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                  }`}
              ></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xl text-emerald-500 font-medium tracking-wider">
                    PROCESSED
                  </div>
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
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
                  className={`text-3xl font-bold text-white mb-1 transition-transform duration-300 ${activeTab === "Processed"
                      ? "scale-105"
                      : "group-hover:scale-105"
                    }`}
                >
                  {processedCount}
                </div>
                <div className="text-sm text-gray-400 mb-4">Requests</div>
              </div>
            </div>

            {/* Rejected Card */}
            <div
              onClick={() => handleStatsCardClick("Rejected")}
              className={`relative bg-[#1a1a1a] rounded-2xl p-6 cursor-pointer transform transition-all duration-200 hover:scale-105 ${activeTab === "Rejected" ? "scale-105 before:opacity-100" : ""
                } before:absolute before:inset-0 before:bg-gradient-to-b before:from-red-500/20 before:to-transparent before:rounded-2xl before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 group`}
            >
              <div
                className={`absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent ${activeTab === "Rejected" ? "opacity-100" : ""
                  }`}
              ></div>
              <div
                className={`absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-red-500/10 to-transparent ${activeTab === "Rejected" ? "opacity-100" : ""
                  }`}
              ></div>
              <div
                className={`absolute inset-y-0 -left-px w-px bg-gradient-to-b from-transparent via-red-500/50 to-transparent transition-opacity duration-500 ${activeTab === "Rejected"
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                  }`}
              ></div>
              <div
                className={`absolute inset-y-0 -right-px w-px bg-gradient-to-b from-transparent via-red-500/50 to-transparent transition-opacity duration-500 ${activeTab === "Rejected"
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                  }`}
              ></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xl text-red-500 font-medium tracking-wider">
                    REJECTED
                  </div>
                  <div className="p-2 bg-red-500/10 rounded-lg">
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
                  className={`text-3xl font-bold text-white mb-1 transition-transform duration-300 ${activeTab === "Rejected"
                      ? "scale-105"
                      : "group-hover:scale-105"
                    }`}
                >
                  {rejectedCount}
                </div>
                <div className="text-sm text-gray-400 mb-4">Requests</div>
              </div>
            </div>
          </div>

          {/* Team Code Tabs */}
          <div className="flex space-x-4 mb-8 bg-[#1a1a1a] p-4 rounded-2xl border border-gray-800/20">
            <button
              onClick={() => setActiveTeamCode("ALL")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTeamCode === "ALL"
                  ? "bg-blue-500/10 text-blue-500"
                  : "text-gray-400 hover:text-white"
                }`}
            >
              All Teams
            </button>
            <button
              onClick={() => setActiveTeamCode("ENT-1")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTeamCode === "ENT-1"
                  ? "bg-purple-500/10 text-purple-500"
                  : "text-gray-400 hover:text-white"
                }`}
            >
              ENT-1
            </button>
            <button
              onClick={() => setActiveTeamCode("ENT-2")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTeamCode === "ENT-2"
                  ? "bg-pink-500/10 text-pink-500"
                  : "text-gray-400 hover:text-white"
                }`}
            >
              ENT-2
            </button>
            <button
              onClick={() => setActiveTeamCode("ENT-3")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTeamCode === "ENT-3"
                  ? "bg-indigo-500/10 text-indigo-500"
                  : "text-gray-400 hover:text-white"
                }`}
            >
              ENT-3
            </button>
          </div>

          {/* Table */}
          <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-gray-800/20">
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="flex justify-center items-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                        INIT BY
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                        ASSIGNED BY
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                        PENDING SINCE
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                        TEAM CODE
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                        RECHARGE ID
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                        PLAYER NAME
                      </th>

                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                        PLATFORM
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                        AMOUNT
                      </th>
                      {activeTab === "Processed" && (
                        <>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                            PROCESSED BY
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                            PROCESSED AT
                          </th>
                        </>
                      )}
                      {activeTab === "Rejected" && (
                        <>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                            REJECTED BY
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                            REJECTED AT
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                            REASON
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                            NOTES
                          </th>
                        </>
                      )}
                      {activeTab === "Pending" && (
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                          ACTIONS
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {rechargeRequests
                      .filter((request: RechargeRequest) => {
                        if (!request?.status) return false;

                        const status = request.status.toLowerCase();
                        const matchesStatus = (() => {
                          switch (activeTab) {
                            case "Pending":
                              return status === "sc_submitted";
                            case "Rejected":
                              return status === "sc_rejected";
                            case "Processed":
                              return status === "sc_processed";
                            default:
                              return true;
                          }
                        })();

                        const matchesTeamCode =
                          activeTeamCode === "ALL" ||
                          request.teamCode === activeTeamCode;
                        return matchesStatus && matchesTeamCode;
                      })
                      .map((request: RechargeRequest, index: number) => (
                        <tr key={index} className="hover:bg-[#252b3b]">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 text-center">
                            <AgentImage
                              id={request.init_id}
                              width={32}
                              height={32}
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 text-center">
                            <AgentImage
                              id={request.assigned_id}
                              width={32}
                              height={32}
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 text-center">
                            {request.updatedAt && (
                              <TimeElapsed
                                date={request.updatedAt}
                                className="flex flex-col items-center"
                                elapsedClassName="text-sm font-medium text-gray-300"
                                fullDateClassName="text-xs text-gray-400"
                              />
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-500/10 text-blue-500">
                              {request.teamCode}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 text-center">
                            {request.recharge_id}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center justify-center space-x-3">
                              <div className="flex-shrink-0 h-8 w-8">
                                {/* <img
                                  className="h-8 w-8 rounded-full object-cover border border-gray-700"
                                  src={
                                    request.profile_pic ||
                                    `https://ui-avatars.com/api/?name=${request.playerName}`
                                  }
                                  alt={`${request.playerName}'s profile`}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src =
                                      "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y";
                                  }}
                                /> */}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-white flex flex-col">
                                  <span>{request.playerName}</span>
                                  <span className="text-xs text-gray-500">
                                    {request.vipCode}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 text-center">
                            <div className="flex flex-col">
                              <span className="text-sm text-white-500">
                                {request.gameUsername}
                              </span>
                              <span className="text-xs text-white-500">
                                {request.gamePlatform}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap text-sm text-emerald-500 text-center">
                            ${request.amount}
                          </td>
                          {activeTab === "Processed" && (
                            <>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 text-center">
                                {request.processedBy?.name || "-"}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 text-center">
                                {request.processedAt && (
                                  <TimeElapsed
                                    date={request.processedAt}
                                    className="flex flex-col items-center"
                                    elapsedClassName="text-sm font-medium text-gray-300"
                                    fullDateClassName="text-xs text-gray-400"
                                  />
                                )}
                              </td>
                            </>
                          )}
                          {activeTab === "Rejected" && (
                            <>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 text-center">
                                {request.rejectedBy?.name || "-"}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 text-center">
                                {request.rejectedAt && (
                                  <TimeElapsed
                                    date={request.rejectedAt}
                                    className="flex flex-col items-center"
                                    elapsedClassName="text-sm font-medium text-gray-300"
                                    fullDateClassName="text-xs text-gray-400"
                                  />
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-500/10 text-red-500">
                                  {request.rejectReason || "-"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-300 text-center">
                                {request.rejectNotes || "-"}
                              </td>
                            </>
                          )}
                          {activeTab === "Pending" && (
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleProcessClick(request)}
                                  disabled={
                                    request.rechargeId ===
                                    selectedRequest?.rechargeId ||
                                    request.processing_state?.status ===
                                    "in_progress"
                                  }
                                  title={
                                    request.processing_state?.status ===
                                      "in_progress"
                                      ? `This request is being processed by ${"another user"
                                      }`
                                      : "Process request"
                                  }
                                  className={`px-3 py-1.5 text-xs font-medium ${request.rechargeId ===
                                      selectedRequest?.rechargeId ||
                                      request.processing_state?.status ===
                                      "in_progress"
                                      ? "bg-gray-500/10 text-gray-500 cursor-not-allowed"
                                      : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                                    } rounded-lg transition-all duration-200`}
                                >
                                  {request.processing_state?.status ===
                                    "in_progress" ? (
                                    <div className="flex items-center gap-2">
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      <span>Processing...</span>
                                    </div>
                                  ) : (
                                    "Process"
                                  )}
                                </button>
                                <button
                                  onClick={() => handleRejectClick(request)}
                                  disabled={
                                    request.rechargeId ===
                                    selectedRequest?.rechargeId ||
                                    request.processing_state?.status ===
                                    "in_progress"
                                  }
                                  title={
                                    request.processing_state?.status ===
                                      "in_progress"
                                      ? `This request is being processed by ${"another user"
                                      }`
                                      : "Process request"
                                  }
                                  className={`px-3 py-1.5 text-xs font-medium ${request.rechargeId ===
                                      selectedRequest?.rechargeId ||
                                      request.processing_state?.status ===
                                      "in_progress"
                                      ? "bg-gray-500/10 text-gray-500 cursor-not-allowed"
                                      : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                    } rounded-lg transition-all duration-200`}
                                >
                                  {request.processing_state?.status ===
                                    "in_progress" ? (
                                    <div className="flex items-center gap-2">
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      <span>Processing...</span>
                                    </div>
                                  ) : (
                                    "Reject"
                                  )}
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Process Modal */}
      {showProcessModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#1a1a1a] rounded-2xl w-[1000px] border border-gray-800/20">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h3 className="text-xl font-semibold text-white">
                Process Recharge Request
              </h3>
              <button
                onClick={handleCloseProcessModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6 p-6">
              {/* Left Side - Details */}
              <div className="space-y-4">
                {/* Basic Information */}
                <div className="bg-[#252b3b] p-4 rounded-lg space-y-4">
                  <h3 className="text-sm font-medium text-gray-400 border-b border-gray-700 pb-2">
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Recharge ID
                      </label>
                      <div className="text-white">
                        {selectedRequest.recharge_id}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Player Name
                      </label>
                      <div className="text-white">
                        {selectedRequest.playerName}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Team Code
                      </label>
                      <div className="text-blue-400">
                        {selectedRequest.teamCode}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Game Details */}
                <div className="bg-[#252b3b] p-4 rounded-lg space-y-4">
                  <h3 className="text-sm font-medium text-gray-400 border-b border-gray-700 pb-2">
                    Game Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Game Username
                      </label>
                      <div className="text-white">
                        {selectedRequest.gameUsername}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Platform
                      </label>
                      <div className="text-white">
                        {selectedRequest.gamePlatform}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Amount Details */}
                {/* <div className="bg-[#252b3b] p-4 rounded-lg space-y-4">
                  <h3 className="text-sm font-medium text-gray-400 border-b border-gray-700 pb-2">Amount Details</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Base Amount</label>
                      <div className="text-yellow-500">${selectedRequest.amount.toFixed(2)}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Bonus Amount</label>
                      <div className="text-emerald-500">${(selectedRequest.bonusAmount || 0).toFixed(2)}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Total Amount</label>
                      <div className="text-blue-500 font-medium">
                        ${((selectedRequest.amount || 0) + (selectedRequest.bonusAmount || 0)).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div> */}

                {/* Screenshot - Use ScreenshotFetcher to handle API call */}
                <div className="bg-[#252b3b] p-4 rounded-lg space-y-4">
                  <h3 className="text-sm font-medium text-gray-400 border-b border-gray-700 pb-2">
                    Screenshot
                  </h3>
                  <div className="relative rounded-lg overflow-hidden">
                    {/* <ScreenshotFetcher
                        rechargeId={selectedRequest.rechargeId}
                        initialUrl={selectedRequest.screenshotUrl}
                      /> */}
                    <a href={selectedRequest.screenshotUrl as string} target='_blank'>
                      <img src={selectedRequest.screenshotUrl as string} alt='' width={500} height={500} />
                    </a>
                  </div>
                </div>
              </div>

              {/* Right Side - Verification */}
              <div className="bg-[#252b3b] p-6 rounded-lg flex flex-col">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-white mb-6">
                    Verification
                  </h3>
                  <div className="space-y-6">
                    <div className="bg-[#1a1a1a] p-4 rounded-lg">
                      <div className="text-sm text-gray-400 mb-4">
                        Please review the details carefully and enter the
                        identifier below:
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Player:</span>
                          <span className="text-white">
                            {selectedRequest.playerName}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Game Username:</span>
                          <span className="text-white">
                            {selectedRequest.gameUsername}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Amount:</span>
                          <span className="text-blue-500">
                            ${(selectedRequest.amount || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-400">
                        Enter Identifier <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="w-full bg-[#1a1a1a] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                        placeholder="Enter identifier..."
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-700">
                  <button
                    onClick={handleCloseProcessModal}
                    className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                    disabled={processingAction}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleProcessSubmit(identifier)}
                    disabled={processingAction || !identifier.trim()}
                    className="px-4 py-2 text-sm font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 
                      transition-all duration-200 transform hover:scale-105 active:scale-95 
                      disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                      flex items-center gap-2"
                  >
                    {processingAction ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Process Request"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center ">
          <div className="bg-[#1a1a1a] rounded-2xl w-[600px] border border-gray-800/20 max-h-[90vh] overflow-y-scroll">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h3 className="text-xl font-semibold text-white">
                Reject Request
              </h3>
              <button
                onClick={handleCloseRejectModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Request Details */}
              <div className="space-y-4 bg-[#252b3b] p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400">Player Name</label>
                    <div className="text-white">
                      {selectedRequest.playerName}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">
                      Game Username
                    </label>
                    <div className="text-white">
                      {selectedRequest.gameUsername}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400">Platform</label>
                    <div className="text-white">
                      {selectedRequest.gamePlatform}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Amount</label>
                    <div className="text-emerald-500">
                      ${selectedRequest.amount}
                    </div>
                  </div>
                </div>
              </div>

              {/* Screenshot for Reject Modal */}
              <div className="bg-[#252b3b] p-4 rounded-lg space-y-4">
                <h3 className="text-sm font-medium text-gray-400 border-b border-gray-700 pb-2">
                  Screenshot
                </h3>
                <div className="relative rounded-lg overflow-hidden">
                  {/* <ScreenshotFetcher
                    rechargeId={selectedRequest.rechargeId}
                    initialUrl={selectedRequest.screenshotUrl}
                  /> */}
                  <a href={selectedRequest.screenshotUrl as string} target='_blank'>
                    <img src={selectedRequest.screenshotUrl as string} alt='' width={500} height={500} />
                  </a>
                </div>
              </div>

              {/* Reject Reason */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400">
                  Reject Reason <span className="text-red-500">*</span>
                </label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-[#252b3b] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select a reason</option>
                  <option value="INVALID_SCREENSHOT">Invalid Screenshot</option>
                  <option value="DUPLICATE_REQUEST">Duplicate Request</option>
                  <option value="INCORRECT_AMOUNT">Incorrect Amount</option>
                  <option value="SUSPICIOUS_ACTIVITY">
                    Suspicious Activity
                  </option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Additional Notes */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400">
                  Additional Notes
                </label>
                <textarea
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  className="w-full bg-[#252b3b] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 min-h-[100px]"
                  placeholder="Enter additional notes..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-800">
              {error && (
                <div className="flex-1 text-red-500 text-sm">{error}</div>
              )}
              <button
                onClick={handleCloseRejectModal}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                disabled={processingAction}
              >
                Cancel
              </button>
              <button
                onClick={() => handleRejectSubmit()}
                disabled={processingAction || !rejectReason}
                className="px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 
                  transition-all duration-200 transform hover:scale-105 active:scale-95 
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                  flex items-center gap-2"
              >
                {processingAction ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  "Reject Request"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Modal */}
      <VerificationModal
        isOpen={verificationModal.isOpen}
        onClose={() => setVerificationModal({ isOpen: false, rechargeId: "" })}
        onSubmit={handleVerifySubmit}
        rechargeId={verificationModal.rechargeId}
      />

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() =>
          setAlertModal({
            isOpen: false,
            type: alertModal.type,
            message: alertModal.message,
          })
        }
        type={alertModal.type}
        message={alertModal.message}
      />
    </div>
  );
};

export default VerificationRechargePage;
