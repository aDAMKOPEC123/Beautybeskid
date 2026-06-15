// filepath: apps/web/src/lib/socket.ts
import { io, Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents } from '@cosmo/shared';
import { useAuthStore } from '../store/auth.store';

let socketInstance: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io(import.meta.env.VITE_SOCKET_URL || '/', {
      auth: { token: useAuthStore.getState().accessToken },
      autoConnect: false,
      reconnection: true,
    });
  }
  socketInstance.auth = { token: useAuthStore.getState().accessToken };
  return socketInstance;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};
