"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { User } from "@/supabase/types";
import UserManagement from "@/app/components/UserManagement";

const AdminDashboardPage = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
  
      console.log("User>>>>>>", user);
      // Get user's role and department
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (userData.department !== "Admin") {
       
                return <div>
                    <h1>You are not authorized to access this page</h1>
                </div>
      }

      setCurrentUser(userData);
    };

    checkUser();
  }, [router]);

  if (!currentUser || currentUser.department !== "Admin") {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <div className="flex-1 pl-64">
        <div className="p-8">
          <UserManagement
            currentUser={currentUser}
            department="Admin"
            showDepartmentFilter={true}
            title="User Management"
            description="Manage and monitor user accounts across all departments"
          />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
