import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import rejectedRequestsReducer from './features/rejectRequestsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    rejectedRequests: rejectedRequestsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Disable serializable check for Supabase client
    }),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export a hook that can be reused to resolve types
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector; 