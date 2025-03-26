"use client";

import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { AdminHeader } from "@/app/components/Headers";
import { PageCreationCard } from "@/app/components/PageCreationCard";
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Page {
  id: number;
  page_name: string;
  page_link: string | null;
  team_code: string;
  created_at: string;
}

export default function ConfigPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPages = async () => {
    try {
      const { data, error } = await supabase
        .from('ent_pages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPages(data || []);
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = Cookies.get("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.department !== "Admin") {
        router.push("/login");
        return;
      }
      setUser(parsedUser);
      fetchPages();
    } catch (error) {
      console.error("Error parsing user data:", error);
      router.push("/login");
    }
  }, [router]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <AdminHeader user={user} />

      <div className="container mx-auto px-4 py-8 pl-64">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Configuration</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Create New Page
          </button>
        </div>

        <div className="bg-[#1a1a1a] rounded-lg shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-4 text-white">Loading pages...</div>
          ) : pages.length === 0 ? (
            <div className="p-4 text-gray-400">No pages found</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-[#2a2a2a] text-gray-300">
                <tr>
                  <th className="p-4">Page Name</th>
                  <th className="p-4">Team Code</th>
                  <th className="p-4">Page Link</th>
                  <th className="p-4">Created At</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                {pages.map((page) => (
                  <tr key={page.id} className="border-t border-[#2a2a2a] hover:bg-[#2a2a2a]">
                    <td className="p-4">{page.page_name}</td>
                    <td className="p-4">{page.team_code}</td>
                    <td className="p-4">
                      {page.page_link ? (
                        <a
                          href={page.page_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          {page.page_link}
                        </a>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      {new Date(page.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <PageCreationCard
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            fetchPages();
          }}
        />
      </div>
    </div>
  );
}
