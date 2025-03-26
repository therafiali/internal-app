"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminHeader, SupportHeader } from "@/app/components/Headers";
import React from "react";
import useTransactions from "@/hooks/useTransactions";
import useTransactionDetails from "@/hooks/useTransactionDetails";
import { useFinanceRedeem } from "@/hooks/useFinanceRedeem";
import TransactionDetailsModal from "@/app/components/TransactionDetailsModal";
import {
  Eye,
  Search,
  RefreshCw,
  Key,
  Clock,
  DollarSign,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { convertEntFormat } from '@/utils/entFormat';
import { EntType } from '@/supabase/types';
import { toast } from "react-hot-toast";
import type { User } from "@/types/user";

// ... [Keep all the interfaces from the original file] ...

export interface PlayerActivityProps {
  user: User;
  showHeader?: boolean;
  onRefresh?: () => void;
  initialActiveSection?: "transactions" | "reset-password" | "redeem" | "transfer";
}

export const PlayerActivity: React.FC<PlayerActivityProps> = ({
  user,
  showHeader = true,
  onRefresh,
  initialActiveSection = "transactions"
}) => {
  // ... [Keep all the component code from the original file] ...
};

export default PlayerActivity; 