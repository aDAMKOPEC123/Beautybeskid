// filepath: apps/web/src/hooks/useSocket.ts
import { useEffect, useState } from 'react';
import { getSocket, disconnectSocket } from '../lib/socket';
import { useAuthStore } from '../store/auth.store';

export const useSocket = () => {
  const { accessToken } = useAuthStore();
  // Initialize with actual socket state so already-connected sockets work immediately
  const [isConnected, setIsConnected] = useState(() => getSocket().connected);

  useEffect(() => {
    const socket = getSocket();

    if (!accessToken) {
      disconnectSocket();
      setIsConnected(false);
      return;
    }

    socket.auth = { token: accessToken };

    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Sync in case socket connected between render and effect
    if (socket.connected) setIsConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [accessToken]);

  return { socket: getSocket(), isConnected };
};
