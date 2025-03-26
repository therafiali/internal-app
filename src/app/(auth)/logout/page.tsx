"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { handleLogout } from "@/utils/auth";
import Image from "next/image";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const performLogout = async () => {
      try {
        await handleLogout();
      } catch (error) {
        console.error("Error during logout:", error);
        router.push("/login");
      }
    };

    performLogout();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#1a1a1a]">
      <div className="text-center space-y-6">
        <Image
          src="/logo.png"
          alt="Techmile Solutions"
          width={80}
          height={80}
          className="mx-auto"
        />
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-white">Signing Out</h2>
          <p className="text-gray-400">Please wait while we log you out...</p>
        </div>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    </div>
  );
}
