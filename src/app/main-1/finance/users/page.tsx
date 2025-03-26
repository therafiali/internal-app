"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminHeader, FinanceHeader } from "@/app/components/Headers";
import { supabase } from "@/lib/supabase";
import { User } from "@/supabase/types";
import UserManagement from "@/app/components/UserManagement";
import TeamMembersView from "../../support/team-members/page";
import TeamMembersPage from "@/app/components/TeamMembersPage";

const FinanceTeamPage = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push("/login");
        return;
      }

      // Get user's role and department
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (userError || !userData || userData.role !== 'Manager') {
        router.push("/login");
        return;
      }

      setCurrentUser(userData);
    };

    checkUser();
  }, [router]);

  if (!currentUser) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <FinanceHeader user={currentUser} />

      <div className="flex-1 pl-64">
        <div className="p-8">
         <TeamMembersPage/>
        </div>
      </div>
    </div>
  );
};

export default FinanceTeamPage; 