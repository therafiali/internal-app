import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '@/supabase/client';
import { RedeemRequest } from '@/types/requests';

interface RejectedRequestsState {
  requests: RedeemRequest[];
  loading: boolean;
  error: string | null;
}

const initialState: RejectedRequestsState = {
  requests: [],
  loading: false,
  error: null,
};

export const fetchRejectedRequests = createAsyncThunk(
  'rejectedRequests/fetchRejectedRequests',
  async () => {
    const { data, error } = await supabase
      .from('redeem_requests')
      .select('*')
      .eq('status', 'verification_failed')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
);

const rejectedRequestsSlice = createSlice({
  name: 'rejectedRequests',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRejectedRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRejectedRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.requests = action.payload;
      })
      .addCase(fetchRejectedRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch rejected requests';
      });
  },
});

export default rejectedRequestsSlice.reducer; 