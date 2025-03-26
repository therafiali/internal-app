"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

import Image from "next/image";
import { signInWithEmail, getUser, signUpWithEmail } from "@/supabase";
import { User as DbUser } from "@/supabase/types";
import { User } from "@/types/user";
import { setAuthState, getAuthState } from '@/utils/auth';
import { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export default function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log("Attempting login for:", email);

      // Sign in with Supabase
      const { data: authData, error: signInError } = await signInWithEmail({
        email,
        password,
      });

      // Debug auth response
      console.log("Auth response:", { authData, signInError });

      if (signInError) {
        console.error("Sign in error:", signInError);
        throw new Error(signInError);
      }

      if (!authData?.user) {
        console.error("No user data in auth response");
        throw new Error("Invalid credentials");
      }

      // Fetch user data from users table to get profile picture and status
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

        

      if (userError) {
        console.error("Error fetching user data:", userError);
        throw new Error("Failed to fetch user data");
      }

      // Check if user is disabled before proceeding
      if (userData.status === 'disabled') {
        throw new Error("Your account has been disabled. Please contact an supervisor.");
      }

      // The user data is now included in the auth response
      const dbUser: DbUser = {
        id: authData.user.id,
        email: authData.user.email!,
        name: authData.user.user_metadata.name || "Unknown",
        department: authData.user.user_metadata.department,
        role: authData.user.user_metadata.role,
        employee_code: authData.user.user_metadata.employee_code,
        status: authData.user.user_metadata.status || "active",
        ent_access: authData.user.user_metadata.ent_access || [],
        ent_section: authData.user.user_metadata.ent_section,
        user_profile_pic: authData.user.user_metadata.user_profile_pic || null,
        last_sign_in_at: authData.user.last_sign_in_at,
        is_active: true,
        login_attempts: 0,
        user_activity: true
      };

      // Convert to User type expected by setAuthState
      const user: User = {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        department: dbUser.department,
        role: dbUser.role,
        employee_code: dbUser.employee_code,
        ent_access: dbUser.ent_access || [],
        ent_section: dbUser.ent_section,
        status: dbUser.status === "active" ? "active" : "disabled",
        user_profile_pic: dbUser.user_profile_pic,
        last_sign_in_at: authData.user.last_sign_in_at
      };

      // Validate required fields
      if (!user.department || !user.role) {
        console.error("Missing required user metadata:", { user });
        throw new Error(
          "User profile is incomplete. Please contact an supervisor."
        );
      }

      // Check if user is active
      if (user.status !== "active") {
        throw new Error(
          "Your account is currently disabled. Please contact an supervisor."
        );
      }

      // Update last_login and user_activity in users table
      const currentTime = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          last_login: currentTime,
          user_activity: true 
        })
        .eq('id', user.id);

      if (updateError) {
        console.error("Error updating last login:", updateError);
        // Don't throw error here, just log it as it's not critical
      }

      // Store session and user data using centralized auth management
      if (authData.session?.access_token) {
        console.log("Storing session and user data");
        
        setAuthState(authData.session.access_token, user);

        try {
          // Set success message
          setMessage("Login Success!");

          // Add a small delay before redirect to show the success message
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Redirect based on department
          console.log("Redirecting user based on department:", user.department);

          switch (user.department) {
            case "Finance":
              router.push("/main/finance/cashtags");
              break;
            case "Operations":
              router.push("/main/operations/recharge");
              break;
            case "Verification":
              router.push("/main/verification/recharge");
              break;
            case "Support":
              router.push("/main/support/search");
              break;
            case "Audit":
              router.push("/main/audit/player-activity");
              break;
            case "Admin":
              router.push("/main/users");
              break;
            default:
              console.error("Unknown department:", user.department);
              router.push("/login");
          }
        } catch (logError) {
          console.error("Failed to log activity:", logError);
          // Don't throw here, just log the error
        }
      } else {
        console.error("No access token in session");
        throw new Error("No access token received");
      }
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An error occurred during login";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="relative w-24 h-24 mb-4 mx-auto">
          <Image
            src="/logo.png"
            alt="Techmile Solutions"
            width={96}
            height={96}
            className="animate-float"
          />
          <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-gray-800 bg-opacity-50 backdrop-blur-lg py-8 px-4 shadow-2xl sm:rounded-lg sm:px-10 border border-gray-700">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div
                className="bg-red-900 bg-opacity-50 border border-red-500 text-red-200 px-4 py-3 rounded relative"
                role="alert"
              >
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            {message && (
              <div
                className="bg-blue-900 bg-opacity-50 border border-blue-500 text-blue-200 px-4 py-3 rounded relative text-center mx-auto"
                role="alert"
              >
                <span className="block sm:inline">{message}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-200"
              >
                Email
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-colors duration-200"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-200"
              >
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm pr-10 transition-colors duration-200"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-300 transition-colors duration-200"
                >
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5 text-gray-500"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5 text-gray-500"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200"
              >
                {loading ? (
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
                    <span className="text-gray-100">Signing in...</span>
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
