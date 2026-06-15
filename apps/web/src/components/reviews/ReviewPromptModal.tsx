import { useReviewPromptStore } from '@/store/review-prompt.store';
import { ReviewForm } from './ReviewForm';

export const ReviewPromptModal = () => {
  const current = useReviewPromptStore((s) => s.queue[0] ?? null);
  const dismiss = useReviewPromptStore((s) => s.dismiss);

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => dismiss(current.appointmentId)}
      />
      <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <ReviewForm
          appointmentId={current.appointmentId}
          serviceName={current.serviceName}
          employeeName={current.employeeName}
          date={current.date}
          onDone={() => dismiss(current.appointmentId)}
        />
      </div>
    </div>
  );
};
