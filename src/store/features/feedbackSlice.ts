import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Feedback, ApiResponse } from '@/types/feedback'; // Create these types

interface FeedbackState {
  feedbacks: Feedback[];
  loading: boolean;
  error: string | null;
  selectedFeedback: Feedback | null;
  filters: {
    searchQuery: string;
    selectedRating: string;
    selectedCategory: string;
  };
  stats: {
    total: number;
    averageRating: string;
    pendingResponses: number;
  };
}

const initialState: FeedbackState = {
  feedbacks: [],
  loading: false,
  error: null,
  selectedFeedback: null,
  filters: {
    searchQuery: '',
    selectedRating: 'All Ratings',
    selectedCategory: 'All Categories',
  },
  stats: {
    total: 0,
    averageRating: '0',
    pendingResponses: 0,
  },
};

// Async thunk for fetching feedbacks
export const fetchFeedbacks = createAsyncThunk(
  'feedback/fetchFeedbacks',
  async (_, { rejectWithValue }) => {
    try {
      const token = Cookies.get('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}api/feedback/get-all-feedback`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch feedbacks');
      const data: ApiResponse = await response.json();
      return data.data.feedback;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const feedbackSlice = createSlice({
  name: 'feedback',
  initialState,
  reducers: {
    setSelectedFeedback: (state, action: PayloadAction<Feedback | null>) => {
      state.selectedFeedback = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<typeof state.filters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    updateStats: (state) => {
      state.stats = {
        total: state.feedbacks.length,
        averageRating: state.feedbacks.length > 0
          ? (state.feedbacks.reduce((acc, curr) => acc + curr.rating, 0) / state.feedbacks.length).toFixed(1)
          : '0',
        pendingResponses: state.feedbacks.filter(f => !f.text).length,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFeedbacks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFeedbacks.fulfilled, (state, action) => {
        state.loading = false;
        state.feedbacks = action.payload;
        state.error = null;
      })
      .addCase(fetchFeedbacks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSelectedFeedback, setFilters, updateStats } = feedbackSlice.actions;
export default feedbackSlice.reducer; 