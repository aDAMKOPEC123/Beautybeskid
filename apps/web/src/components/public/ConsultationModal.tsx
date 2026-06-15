import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { consultationsApi } from '@/api/consultations.api';
import { toast } from 'sonner';
import { X } from 'lucide-react';

const schema = z.object({
  name: z.string().min(2, 'Imię musi mieć min. 2 znaki'),
  phone: z.string().min(9, 'Podaj prawidłowy numer telefonu'),
  email: z.string().email('Podaj prawidłowy adres e-mail'),
  consentContact: z.literal(true, { errorMap: () => ({ message: 'Zgoda jest wymagana' }) }),
  consentData: z.literal(true, { errorMap: () => ({ message: 'Zgoda jest wymagana' }) }),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
}

export const ConsultationModal = ({ open, onClose }: Props) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  if (!open) return null;

  const onSubmit = async (data: FormData) => {
    try {
      await consultationsApi.submit(data);
      toast.success('Dziękujemy! Oddzwonimy wkrótce.');
      reset();
      onClose();
    } catch {
      toast.error('Coś poszło nie tak. Spróbuj ponownie.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b flex justify-between items-center bg-muted/20">
          <h2 className="font-heading font-bold text-xl">Bezpłatna konsultacja</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-muted transition-colors"
            aria-label="Zamknij"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Imię i nazwisko *</label>
            <input
              {...register('name')}
              type="text"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-primary/30"
              placeholder="np. Anna Kowalska"
            />
            {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Telefon *</label>
            <input
              {...register('phone')}
              type="tel"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-primary/30"
              placeholder="np. 600 123 456"
            />
            {errors.phone && <p className="text-destructive text-xs mt-1">{errors.phone.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">E-mail *</label>
            <input
              {...register('email')}
              type="email"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-primary/30"
              placeholder="np. anna@example.com"
            />
            {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div className="flex items-start gap-2">
            <input
              {...register('consentContact')}
              type="checkbox"
              id="consentContact"
              className="mt-1 accent-primary"
            />
            <label htmlFor="consentContact" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
              Wyrażam zgodę na kontakt telefoniczny w celu umówienia konsultacji. *
            </label>
          </div>
          {errors.consentContact && (
            <p className="text-destructive text-xs -mt-2">{errors.consentContact.message}</p>
          )}

          <div className="flex items-start gap-2">
            <input
              {...register('consentData')}
              type="checkbox"
              id="consentData"
              className="mt-1 accent-primary"
            />
            <label htmlFor="consentData" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
              Wyrażam zgodę na przetwarzanie danych osobowych zgodnie z RODO. *
            </label>
          </div>
          {errors.consentData && (
            <p className="text-destructive text-xs -mt-2">{errors.consentData.message}</p>
          )}

          <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
            {isSubmitting ? 'Wysyłanie...' : 'Wyślij zgłoszenie'}
          </Button>
        </form>
      </div>
    </div>
  );
};
