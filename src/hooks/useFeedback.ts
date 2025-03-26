import { useState, useEffect } from 'react';
import { supabase } from '@/supabase/client';

export interface Feedback {
  id: string;
  messenger_id: string;
  page_id: string;
  player_name: string;
  category: string;
  rating: number;
  text: string;
  manychat_data: any;
  created_at: string;
  updated_at: string;
}

export const useFeedback = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setFeedbacks(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching feedback');
      console.error('Error fetching feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const getStats = () => {
    const total = feedbacks.length;
    const averageRating = total > 0 
      ? Number((feedbacks.reduce((acc, curr) => acc + curr.rating, 0) / total).toFixed(1))
      : 0;
    const pendingResponses = feedbacks.filter(f => !f.text).length;

    return {
      total,
      averageRating,
      pendingResponses
    };
  };

  // Calculate rating distribution
  const getRatingDistribution = () => {
    const distribution: Record<number, number> = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    feedbacks.forEach(feedback => {
      if (feedback.rating >= 1 && feedback.rating <= 5) {
        distribution[feedback.rating] = (distribution[feedback.rating] || 0) + 1;
      }
    });

    const total = feedbacks.length;
    return Object.entries(distribution).map(([rating, count]) => ({
      rating: Number(rating),
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }));
  };

  // Calculate category distribution
  const getCategoryDistribution = () => {
    const distribution: Record<string, number> = {};

    feedbacks.forEach(feedback => {
      distribution[feedback.category] = (distribution[feedback.category] || 0) + 1;
    });

    const total = feedbacks.length;
    return Object.entries(distribution).map(([category, count]) => ({
      category,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }));
  };

  // Filter feedbacks
  const filterFeedbacks = ({
    searchQuery = '',
    selectedRating = 'All Ratings',
    selectedCategory = 'All Categories'
  }: {
    searchQuery?: string;
    selectedRating?: string;
    selectedCategory?: string;
  }) => {
    return feedbacks.filter(feedback => {
      const matchesSearch = searchQuery.toLowerCase() === '' || 
        feedback.player_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feedback.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feedback.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRating = selectedRating === "All Ratings" || 
        feedback.rating === Number(selectedRating);

      const matchesCategory = selectedCategory === "All Categories" || 
        feedback.category === selectedCategory;

      return matchesSearch && matchesRating && matchesCategory;
    });
  };

  return {
    feedbacks,
    loading,
    error,
    fetchFeedbacks,
    getStats,
    getRatingDistribution,
    getCategoryDistribution,
    filterFeedbacks
  };
}; 