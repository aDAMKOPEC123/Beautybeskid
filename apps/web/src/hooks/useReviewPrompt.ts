import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSocket } from './useSocket';
import { useAuth } from './useAuth';
import { reviewsApi } from '@/api/reviews.api';
import { useReviewPromptStore } from '@/store/review-prompt.store';

export const useReviewPrompt = () => {
  const { isAuthenticated } = useAuth();
  const { socket, isConnected } = useSocket();
  const addToQueue = useReviewPromptStore((s) => s.addToQueue);

  // A) Real-time: listen for completed appointments via socket
  useEffect(() => {
    if (!isConnected || !socket) return;

    const onAppointmentUpdated = (data: any) => {
      if (data.status === 'COMPLETED') {
        addToQueue({
          appointmentId: data.id,
          serviceName: data.service?.name ?? 'Wizyta',
          employeeName: data.employee?.name,
          date: data.date,
        });
      }
    };

    socket.on('appointment:updated', onAppointmentUpdated);
    return () => {
      socket.off('appointment:updated', onAppointmentUpdated);
    };
  }, [isConnected, socket, addToQueue]);

  // B) On app open: fetch pending reviews and seed the queue
  const { data: pending } = useQuery({
    queryKey: ['reviews-pending'],
    queryFn: reviewsApi.getPending,
    staleTime: 5 * 60 * 1000,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!pending) return;
    for (const item of pending) {
      addToQueue({
        appointmentId: item.id,
        serviceName: item.service.name,
        employeeName: item.employee?.name,
        date: item.date,
      });
    }
  }, [pending, addToQueue]);
};
