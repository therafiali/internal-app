import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';
import { debounce } from 'lodash';

interface UseSocketIOProps {
  room?: string;
  userId?: string;
}

interface SocketState {
  connected: boolean;
  error: Error | null;
  loading: boolean;
}

export const useSocketIO = ({ room, userId }: UseSocketIOProps = {}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<SocketState>({
    connected: false,
    error: null,
    loading: true
  });
  const [data, setData] = useState<any[]>([]);

  // Debounced update function
  const debouncedSetData = debounce((newData: any[]) => {
    setData(newData);
  }, 300);

  // Setup socket connection
  const setupSocket = useCallback(() => {
    const token = Cookies.get('token');
    if (!token) {
      setState(prev => ({ ...prev, error: new Error('No authentication token found') }));
      return null;
    }

    const newSocket = io(`${process.env.NEXT_PUBLIC_API_URL}`, {
      auth: { token },
      transports: ['websocket'],
      path: '/socket.io',
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    return newSocket;
  }, []);

  // Handle socket events
  useEffect(() => {
    const newSocket = setupSocket();
    if (!newSocket) return;

    setSocket(newSocket);

    // Connection events
    newSocket.on('connect', () => {
      console.log('Socket connected successfully');
      setState(prev => ({ ...prev, connected: true, error: null }));
      if (room) {
        newSocket.emit('join', { room, userId });
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setState(prev => ({ ...prev, connected: false }));
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setState(prev => ({ ...prev, error, connected: false }));
    });

    // Data events
    newSocket.on('initialLoad', (response) => {
      console.log('Received initial load data:', response);
      if (response.redeemRequests) {
        setData(response.redeemRequests);
        setState(prev => ({ ...prev, loading: false }));
      }
    });

    newSocket.on('verificationRequestUpdate', (request) => {
      setData(prev => {
        const newData = [...prev];
        const index = newData.findIndex(item => item.redeemId === request.redeemId);
        if (index === -1) {
          newData.push(request);
        } else {
          newData[index] = request;
        }
        debouncedSetData(newData);
        return newData;
      });
    });

    // Cleanup
    return () => {
      if (room && newSocket.connected) {
        newSocket.emit('leave', { room, userId });
      }
      newSocket.disconnect();
      debouncedSetData.cancel();
    };
  }, [room, userId, setupSocket]);

  // Fetch data through REST API (fallback)
  const fetchThroughREST = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const token = Cookies.get('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}api/players/redeem-requests/verification?page=1&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const result = await response.json();
      setData(result.data?.redeemRequests || []);
    } catch (error) {
      setState(prev => ({ ...prev, error: error as Error }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  // Request data method
  const requestData = useCallback(() => {
    if (socket?.connected) {
      socket.emit('requestVerificationData');
      // Fallback to REST API if socket doesn't respond in 5 seconds
      setTimeout(() => {
        setState(prev => {
          if (prev.loading) {
            fetchThroughREST();
          }
          return prev;
        });
      }, 5000);
    } else {
      fetchThroughREST();
    }
  }, [socket]);

  return {
    socket,
    data,
    state,
    requestData,
    fetchThroughREST
  };
}; 