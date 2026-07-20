import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  addDays,
  addMonths,
  format,
  getDay,
  getDaysInMonth,
  isBefore,
  startOfDay,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  AlertCircle,
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Plus,
  RefreshCw,
  UserRound,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Appointment, AppointmentHistoryStatus, AppointmentOverview } from '@cosmo/shared';
import { appointmentsApi } from '@/api/appointments.api';
import { employeesApi } from '@/api/employees.api';
import { reviewsApi } from '@/api/reviews.api';
import { useSocket } from '@/hooks/useSocket';
import { downloadAppointmentIcs } from '@/lib/appointment-calendar';
import { Button } from '@/components/ui/button';
import { AnimatedCollapse } from '@/components/ui/AnimatedCollapse';
import { AppointmentListSkeleton } from '@/components/skeletons';
import { FollowUpReminderWidget } from '@/components/appointments/FollowUpReminderWidget';
import { ReviewForm } from '@/components/reviews/ReviewForm';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Oczekująca',
  CONFIRMED: 'Potwierdzona',
  CANCELLED: 'Anulowana',
  COMPLETED: 'Zakończona',
  NO_SHOW: 'Nieobecność',
};

const STATUS_STYLES: Record<string, { background: string; color: string; border: string }> = {
  PENDING: { background: 'rgba(196,150,90,0.14)', color: '#7C3E08', border: '1px solid rgba(124,62,8,0.18)' },
  CONFIRMED: { background: 'rgba(34,197,94,0.12)', color: '#146C35', border: '1px solid rgba(20,108,53,0.18)' },
  CANCELLED: { background: 'rgba(239,68,68,0.1)', color: '#B91C1C', border: '1px solid rgba(185,28,28,0.16)' },
  COMPLETED: { background: 'rgba(196,150,90,0.12)', color: '#7A4F1D', border: '1px solid rgba(122,79,29,0.18)' },
  NO_SHOW: { background: 'rgba(75,85,99,0.1)', color: '#374151', border: '1px solid rgba(55,65,81,0.16)' },
};

const HISTORY_FILTERS: Array<{ value: AppointmentHistoryStatus; label: string }> = [
  { value: 'ALL', label: 'Wszystkie' },
  { value: 'COMPLETED', label: 'Zakończone' },
  { value: 'CANCELLED', label: 'Anulowane' },
  { value: 'NO_SHOW', label: 'Nieobecność' },
];

const ACTIVE_STATUSES = new Set(['PENDING', 'CONFIRMED']);

const getStatusExplanation = (appointment: Appointment) => {
  if (appointment.activeCancellationRequest) {
    return 'Salon rozpatruje wniosek o anulowanie. Do czasu decyzji wizyta pozostaje aktywna.';
  }
  if (appointment.rescheduleStatus === 'PENDING') {
    return 'Salon rozpatruje zaproponowany nowy termin. Obecny termin nadal obowiązuje.';
  }
  switch (appointment.status) {
    case 'PENDING': return 'Salon jeszcze nie potwierdził tego terminu.';
    case 'CONFIRMED': return 'Termin został potwierdzony przez salon.';
    case 'COMPLETED': return 'Wizyta została zakończona.';
    case 'CANCELLED': return 'Wizyta została anulowana.';
    case 'NO_SHOW': return 'Wizyta została oznaczona jako nieobecność.';
    default: return '';
  }
};

const routeUrlFor = (appointment: Appointment) => {
  const latitude = Number(appointment.locationLatitudeAtBooking);
  const longitude = Number(appointment.locationLongitudeAtBooking);
  const destination = Number.isFinite(latitude) && Number.isFinite(longitude)
    ? `${latitude},${longitude}`
    : appointment.locationAddressAtBooking ?? '';
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
};

export const UserAppointments = () => {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawStatus = String(searchParams.get('status') ?? 'ALL').toUpperCase();
  const status: AppointmentHistoryStatus = HISTORY_FILTERS.some((filter) => filter.value === rawStatus)
    ? rawStatus as AppointmentHistoryStatus
    : 'ALL';
  const rawPage = Number(searchParams.get('page') ?? 1);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  const overviewQuery = useQuery({
    queryKey: ['appointments', 'overview'],
    queryFn: appointmentsApi.getMyOverview,
  });
  const historyQuery = useQuery({
    queryKey: ['appointments', 'history', status, page],
    queryFn: () => appointmentsApi.getMyHistory({ status, page, limit: 10 }),
    placeholderData: (previous) => previous,
  });
  const { data: pendingReviews = [] } = useQuery({
    queryKey: ['reviews-pending'],
    queryFn: reviewsApi.getPending,
  });

  useEffect(() => {
    if (!socket) return;
    const handler = () => queryClient.invalidateQueries({ queryKey: ['appointments'] });
    socket.on('appointment:updated', handler);
    socket.on('appointment:created', handler);
    socket.on('appointment:deleted', handler);
    return () => {
      socket.off('appointment:updated', handler);
      socket.off('appointment:created', handler);
      socket.off('appointment:deleted', handler);
    };
  }, [socket, queryClient]);

  useEffect(() => {
    const totalPages = historyQuery.data?.totalPages;
    if (totalPages && page > totalPages) {
      const next = new URLSearchParams(searchParams);
      next.set('page', String(totalPages));
      setSearchParams(next, { replace: true });
    }
  }, [historyQuery.data?.totalPages, page, searchParams, setSearchParams]);

  const setHistoryState = (nextStatus: AppointmentHistoryStatus, nextPage = 1) => {
    const next = new URLSearchParams(searchParams);
    next.set('status', nextStatus);
    next.set('page', String(nextPage));
    setSearchParams(next, { replace: true });
  };

  if (overviewQuery.isLoading && historyQuery.isLoading) return <AppointmentListSkeleton count={3} />;

  if (overviewQuery.isError) {
    return (
      <PageError
        title="Nie udało się pobrać wizyt"
        description="Sprawdź połączenie i spróbuj ponownie. Twoja historia nie została usunięta."
        isFetching={overviewQuery.isFetching}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const overview = overviewQuery.data;
  if (!overview) return null;
  const history = historyQuery.data;
  const hasAnyAppointment = Boolean(overview.nextAppointment || overview.otherUpcoming.length || history?.total);

  return (
    <div className="space-y-8 animate-enter">
      <div className="flex items-center justify-between gap-4">
        <h1 data-tour="appointments-list" className="w-fit text-3xl font-heading font-bold" style={{ color: '#1A3828' }}>
          Moje wizyty
        </h1>
        {hasAnyAppointment && (
          <Link
            to="/rezerwacja"
            className="hidden min-h-11 items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80 sm:inline-flex"
            style={{ background: '#1A3828', color: '#fff' }}
          >
            <Plus size={16} /> Umów wizytę
          </Link>
        )}
      </div>

      <FollowUpReminderWidget />

      {!hasAnyAppointment && <EmptyState />}

      {overview.nextAppointment && (
        <section aria-labelledby="next-appointment-heading">
          <h2 id="next-appointment-heading" className="mb-3 font-heading text-xl font-bold" style={{ color: '#1A3828' }}>
            Najbliższa wizyta
          </h2>
          <AppointmentCard
            appointment={overview.nextAppointment}
            overview={overview}
            featured
            hasPendingReview={pendingReviews.some((review: { id: string }) => review.id === overview.nextAppointment?.id)}
          />
        </section>
      )}

      {overview.otherUpcoming.length > 0 && (
        <section aria-labelledby="other-upcoming-heading">
          <h2 id="other-upcoming-heading" className="mb-3 font-heading text-lg font-bold" style={{ color: '#1A3828' }}>
            Kolejne wizyty
          </h2>
          <div className="grid gap-3">
            {overview.otherUpcoming.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                overview={overview}
                hasPendingReview={pendingReviews.some((review: { id: string }) => review.id === appointment.id)}
              />
            ))}
          </div>
        </section>
      )}

      {(history?.total || status !== 'ALL' || historyQuery.isError) && (
        <HistorySection
          status={status}
          page={page}
          overview={overview}
          history={history}
          isError={historyQuery.isError}
          isFetching={historyQuery.isFetching}
          onRetry={() => historyQuery.refetch()}
          onFilter={(nextStatus) => setHistoryState(nextStatus, 1)}
          onPage={(nextPage) => setHistoryState(status, nextPage)}
          pendingReviewIds={new Set(pendingReviews.map((review: { id: string }) => review.id))}
        />
      )}
    </div>
  );
};

function PageError({
  title,
  description,
  isFetching,
  onRetry,
}: {
  title: string;
  description: string;
  isFetching: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-6 animate-enter">
      <h1 className="text-3xl font-heading font-bold" style={{ color: '#1A3828' }}>Moje wizyty</h1>
      <div role="alert" className="rounded-[24px] border bg-white p-6 text-center sm:p-8" style={{ borderColor: 'rgba(185,28,28,0.18)' }}>
        <AlertCircle className="mx-auto mb-3" size={32} style={{ color: '#B91C1C' }} />
        <h2 className="font-heading text-xl font-bold" style={{ color: '#1A3828' }}>{title}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6" style={{ color: 'rgba(20,40,28,0.72)' }}>{description}</p>
        <Button type="button" className="mt-5 min-h-11 rounded-full px-6" onClick={onRetry} disabled={isFetching} style={{ background: '#1A3828', color: '#fff' }}>
          <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
          {isFetching ? 'Ponawiam...' : 'Spróbuj ponownie'}
        </Button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="space-y-5 rounded-[24px] border bg-white p-8 text-center" style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full" style={{ background: 'rgba(196,150,90,0.1)' }}>
        <CalendarDays size={36} style={{ color: '#C4965A' }} />
      </div>
      <div>
        <h2 className="mb-2 font-heading text-xl font-bold" style={{ color: '#1A3828' }}>Twoja historia zaczyna się teraz</h2>
        <p className="mx-auto max-w-2xl text-sm leading-6" style={{ color: 'rgba(20,40,28,0.72)' }}>
          Umów pierwszą wizytę i korzystaj z historii zabiegów, rutyn domowych oraz programu lojalnościowego.
        </p>
      </div>
      <Link to="/rezerwacja" className="inline-flex min-h-11 items-center gap-2 rounded-full px-8 py-3 text-sm font-semibold" style={{ background: '#1A3828', color: '#fff' }}>
        <Plus size={16} /> Umów pierwszą wizytę
      </Link>
    </div>
  );
}

function HistorySection({
  status,
  page,
  overview,
  history,
  isError,
  isFetching,
  onRetry,
  onFilter,
  onPage,
  pendingReviewIds,
}: {
  status: AppointmentHistoryStatus;
  page: number;
  overview: AppointmentOverview;
  history: Awaited<ReturnType<typeof appointmentsApi.getMyHistory>> | undefined;
  isError: boolean;
  isFetching: boolean;
  onRetry: () => void;
  onFilter: (status: AppointmentHistoryStatus) => void;
  onPage: (page: number) => void;
  pendingReviewIds: Set<string>;
}) {
  return (
    <section aria-labelledby="appointment-history-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="appointment-history-heading" className="font-heading text-xl font-bold" style={{ color: '#1A3828' }}>Historia wizyt</h2>
          {history && <p className="mt-1 text-xs" style={{ color: 'rgba(20,40,28,0.68)' }}>{history.total} zapisanych wizyt</p>}
        </div>
        {isFetching && <span className="text-xs" role="status" style={{ color: '#7A4F1D' }}>Aktualizuję...</span>}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filtry historii wizyt">
        {HISTORY_FILTERS.map((filter) => {
          const active = filter.value === status;
          return (
            <button
              key={filter.value}
              type="button"
              aria-pressed={active}
              onClick={() => onFilter(filter.value)}
              className="min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold"
              style={active
                ? { background: '#1A3828', color: '#fff', borderColor: '#1A3828' }
                : { background: '#fff', color: '#1A3828', borderColor: 'rgba(26,56,40,0.18)' }}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {isError ? (
        <div role="alert" className="rounded-2xl border bg-white p-5" style={{ borderColor: 'rgba(185,28,28,0.18)' }}>
          <p className="font-semibold" style={{ color: '#991B1B' }}>Nie udało się pobrać tej strony historii.</p>
          <button type="button" className="mt-2 min-h-11 font-semibold underline" onClick={onRetry} style={{ color: '#1A3828' }}>Spróbuj ponownie</button>
        </div>
      ) : history?.items.length ? (
        <div className={`grid gap-3 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
          {history.items.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              overview={overview}
              hasPendingReview={pendingReviewIds.has(appointment.id)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border bg-white p-6 text-center text-sm" style={{ borderColor: 'rgba(26,56,40,0.1)', color: 'rgba(20,40,28,0.72)' }}>
          Brak wizyt pasujących do tego filtra.
        </div>
      )}

      {history && history.totalPages > 1 && (
        <nav className="flex items-center justify-center gap-3" aria-label="Paginacja historii wizyt">
          <button type="button" className="flex h-11 min-w-11 items-center justify-center rounded-full border disabled:opacity-35" disabled={page <= 1 || isFetching} onClick={() => onPage(page - 1)} aria-label="Poprzednia strona">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold" style={{ color: '#1A3828' }}>Strona {history.page} z {history.totalPages}</span>
          <button type="button" className="flex h-11 min-w-11 items-center justify-center rounded-full border disabled:opacity-35" disabled={page >= history.totalPages || isFetching} onClick={() => onPage(page + 1)} aria-label="Następna strona">
            <ChevronRight size={18} />
          </button>
        </nav>
      )}
    </section>
  );
}

function AppointmentCard({
  appointment,
  overview,
  featured = false,
  hasPendingReview,
}: {
  appointment: Appointment;
  overview: AppointmentOverview;
  featured?: boolean;
  hasPendingReview: boolean;
}) {
  const queryClient = useQueryClient();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [cancellationOpen, setCancellationOpen] = useState(false);
  const isFutureActive = ACTIVE_STATUSES.has(appointment.status) && new Date(appointment.date).getTime() > Date.now();
  const statusStyle = STATUS_STYLES[appointment.status] ?? STATUS_STYLES.COMPLETED;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['appointments'] });
  const withdrawReschedule = useMutation({
    mutationFn: () => appointmentsApi.withdrawReschedule(appointment.id),
    onSuccess: () => { refresh(); toast.success('Wniosek o zmianę terminu został wycofany'); },
    onError: (error: any) => toast.error(error?.response?.data?.message ?? 'Nie udało się wycofać wniosku'),
  });
  const withdrawCancellation = useMutation({
    mutationFn: () => appointmentsApi.withdrawCancellation(appointment.id),
    onSuccess: () => { refresh(); toast.success('Wniosek o anulowanie został wycofany'); },
    onError: (error: any) => toast.error(error?.response?.data?.message ?? 'Nie udało się wycofać wniosku'),
  });

  const askWithdrawReschedule = () => {
    if (window.confirm('Wycofać oczekujący wniosek o zmianę terminu?')) withdrawReschedule.mutate();
  };
  const askWithdrawCancellation = () => {
    if (window.confirm('Wycofać oczekujący wniosek o anulowanie?')) withdrawCancellation.mutate();
  };

  return (
    <>
      <article
        className={`overflow-hidden rounded-[24px] border bg-white ${featured ? 'ring-1 ring-[#1A3828]/10' : ''}`}
        style={{
          borderColor: featured ? 'rgba(26,56,40,0.28)' : 'rgba(0,0,0,0.08)',
          boxShadow: featured ? '0 14px 40px rgba(26,56,40,0.10)' : '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        {featured && <div className="h-1.5" style={{ background: '#1A3828' }} />}
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: '#7A4F1D' }}>
                {featured ? 'Najbliższa wizyta' : isFutureActive ? 'Nadchodząca wizyta' : 'Wizyta historyczna'}
              </p>
              <h3 className={`${featured ? 'text-xl sm:text-2xl' : 'text-lg'} mt-1 font-heading font-bold`} style={{ color: '#1A3828' }}>
                {appointment.service.name}
              </h3>
            </div>
            <span className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold" style={statusStyle}>
              {STATUS_LABELS[appointment.status] ?? appointment.status}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-2">
            <div>
              <p className="text-sm font-semibold capitalize" style={{ color: '#1A3828' }}>
                {format(new Date(appointment.date), 'EEEE, d MMMM yyyy', { locale: pl })}
              </p>
              <p className={`${featured ? 'text-3xl' : 'text-2xl'} font-heading font-bold`} style={{ color: '#1A3828' }}>
                {format(new Date(appointment.date), 'HH:mm')}
              </p>
            </div>
            <p className="max-w-xl text-sm leading-6" style={{ color: 'rgba(20,40,28,0.76)' }}>
              {getStatusExplanation(appointment)}
            </p>
          </div>

          <button
            type="button"
            className="mt-4 flex min-h-11 w-full items-center justify-between rounded-xl border px-3 text-sm font-semibold sm:hidden"
            style={{ borderColor: 'rgba(26,56,40,0.14)', color: '#1A3828' }}
            aria-expanded={detailsOpen}
            aria-controls={`appointment-details-${appointment.id}`}
            onClick={() => setDetailsOpen((open) => !open)}
          >
            {detailsOpen ? 'Ukryj szczegóły' : 'Pokaż szczegóły'}
            <ChevronDown size={17} className="transition-transform" style={{ transform: detailsOpen ? 'rotate(180deg)' : 'none' }} />
          </button>

          <div className="hidden sm:block">
            <AppointmentDetails appointment={appointment} />
          </div>
          <div id={`appointment-details-${appointment.id}`} className="sm:hidden">
            <AnimatedCollapse open={detailsOpen}>
              <AppointmentDetails appointment={appointment} />
            </AnimatedCollapse>
          </div>

          {appointment.rescheduleStatus === 'PENDING' && appointment.rescheduleDate && (
            <RequestNotice
              title="Oczekuje zmiana terminu"
              description={`Proponowany termin: ${format(new Date(appointment.rescheduleDate), "d MMMM yyyy 'o' HH:mm", { locale: pl })}`}
              actionLabel="Cofnij wniosek"
              isPending={withdrawReschedule.isPending}
              onAction={askWithdrawReschedule}
            />
          )}
          {appointment.activeCancellationRequest && (
            <RequestNotice
              title="Oczekuje wniosek o anulowanie"
              description="Wizyta pozostaje aktywna do czasu decyzji salonu."
              actionLabel="Cofnij wniosek"
              isPending={withdrawCancellation.isPending}
              onAction={askWithdrawCancellation}
            />
          )}

          {isFutureActive && (
            <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
              <ActionButton icon={<CalendarPlus size={17} />} label="Dodaj do kalendarza" onClick={() => downloadAppointmentIcs(appointment)} />
              <a href={routeUrlFor(appointment)} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-center text-xs font-semibold" style={{ borderColor: 'rgba(26,56,40,0.16)', color: '#1A3828' }}>
                <Navigation size={17} /> Wyznacz trasę
              </a>
              <ActionButton icon={<MessageCircle size={17} />} label="Skontaktuj się" onClick={() => setContactOpen(true)} />
              {!appointment.activeCancellationRequest && appointment.rescheduleStatus !== 'PENDING' && (
                <ActionButton icon={<X size={17} />} label="Poproś o anulowanie" danger onClick={() => setCancellationOpen(true)} />
              )}
            </div>
          )}

          {isFutureActive && !appointment.activeCancellationRequest && appointment.rescheduleStatus !== 'PENDING' && (
            <button type="button" className="mt-2 min-h-11 w-full rounded-xl border text-sm font-semibold" style={{ borderColor: 'rgba(26,56,40,0.18)', color: '#1A3828' }} onClick={() => setRescheduleOpen(true)}>
              Zmień termin
            </button>
          )}
        </div>

        {appointment.status === 'COMPLETED' && (
          <div className="border-t px-5 py-4 sm:px-6" style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
            <PostVisitLinks appointment={appointment} />
            {reviewOpen ? (
              <div className="mt-4">
                <ReviewForm
                  appointmentId={appointment.id}
                  serviceName={appointment.service.name}
                  employeeName={appointment.employee?.name}
                  date={appointment.date}
                  onDone={() => setReviewOpen(false)}
                />
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {hasPendingReview && (
                  <button type="button" onClick={() => setReviewOpen(true)} className="min-h-11 rounded-full border text-sm font-semibold" style={{ borderColor: '#8A5B22', color: '#8A5B22' }}>★ Oceń wizytę</button>
                )}
                <Link to={`/rezerwacja?serviceId=${appointment.serviceId}${appointment.employeeId ? `&employeeId=${appointment.employeeId}` : ''}`} className="flex min-h-11 items-center justify-center rounded-full text-sm font-semibold" style={{ background: '#1A3828', color: '#fff' }}>
                  Rezerwuj znowu
                </Link>
              </div>
            )}
          </div>
        )}
      </article>

      {rescheduleOpen && <RescheduleModal appointment={appointment} open={rescheduleOpen} onClose={() => setRescheduleOpen(false)} />}
      {contactOpen && <ContactSheet overview={overview} open={contactOpen} onClose={() => setContactOpen(false)} />}
      {cancellationOpen && (
        <CancellationSheet
          appointment={appointment}
          overview={overview}
          open={cancellationOpen}
          onClose={() => setCancellationOpen(false)}
        />
      )}
    </>
  );
}

function AppointmentDetails({ appointment }: { appointment: Appointment }) {
  const base = Number(appointment.priceAtBooking);
  const finalPrice = Number(appointment.finalPrice);
  const discounts = Array.isArray(appointment.discountBreakdown) ? appointment.discountBreakdown : [];
  return (
    <div className="mt-4 grid gap-3 border-t pt-4 text-sm sm:grid-cols-2" style={{ borderColor: 'rgba(26,56,40,0.09)', color: 'rgba(20,40,28,0.76)' }}>
      <DetailRow icon={<Clock3 size={17} />} label="Czas trwania" value={`${appointment.durationMinutes} min`} />
      <DetailRow icon={<UserRound size={17} />} label="Pracownik" value={appointment.employee?.name ?? 'Zostanie przypisany'} />
      <DetailRow icon={<MapPin size={17} />} label="Adres" value={appointment.locationAddressAtBooking ?? 'Skontaktuj się z salonem'} />
      <div className="rounded-xl p-3 sm:col-span-2" style={{ background: 'rgba(196,150,90,0.07)' }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold" style={{ color: '#1A3828' }}>Cena zapisana przy rezerwacji</span>
          <div className="flex items-center gap-2">
            {Number.isFinite(base) && Number.isFinite(finalPrice) && finalPrice < base && (
              <span className="line-through" style={{ color: 'rgba(20,40,28,0.58)' }}>{base.toFixed(2)} zł</span>
            )}
            {Number.isFinite(finalPrice) && <strong style={{ color: '#146C35' }}>{finalPrice.toFixed(2)} zł</strong>}
          </div>
        </div>
        {discounts.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs">
            {discounts.map((discount, index) => (
              <li key={`${discount.source}-${index}`} className="flex justify-between gap-3">
                <span>{discount.label}</span><strong>-{Number(discount.amount).toFixed(2)} zł</strong>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs font-semibold" style={{ color: '#7A4F1D' }}>
          {appointment.status === 'COMPLETED'
            ? appointment.loyaltyPointsAwarded != null
              ? `Rzeczywiście naliczono: +${appointment.loyaltyPointsAwarded} pkt`
              : 'Brak zapisanych naliczonych punktów'
            : ACTIVE_STATUSES.has(appointment.status)
              ? 'Punkty zostaną naliczone po zakończeniu wizyty.'
              : 'Za tę wizytę nie naliczono punktów.'}
        </p>
      </div>
      {(appointment.notes || appointment.allergies || appointment.problemDescription || appointment.staffNote || appointment.photoPath) && (
        <div className="space-y-2 rounded-xl border p-3 sm:col-span-2" style={{ borderColor: 'rgba(26,56,40,0.1)' }}>
          {appointment.notes && <p><strong>Uwagi:</strong> {appointment.notes}</p>}
          {appointment.allergies && <p style={{ color: '#9A5B00' }}><strong>Alergie:</strong> {appointment.allergies}</p>}
          {appointment.problemDescription && <p><strong>Opis:</strong> {appointment.problemDescription}</p>}
          {appointment.staffNote && <p><strong>Notatka po wizycie:</strong> {appointment.staffNote}</p>}
          {appointment.photoPath && <img src={appointment.photoPath} alt="Zdjęcie przypisane do wizyty" className="h-24 w-24 rounded-lg object-cover" />}
        </div>
      )}
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border p-3" style={{ borderColor: 'rgba(26,56,40,0.09)' }}>
      <span className="mt-0.5" style={{ color: '#7A4F1D' }}>{icon}</span>
      <div><p className="text-[11px] font-semibold uppercase tracking-wide">{label}</p><p className="mt-0.5 font-medium" style={{ color: '#1A3828' }}>{value}</p></div>
    </div>
  );
}

function ActionButton({ icon, label, onClick, danger = false }: { icon: ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-center text-xs font-semibold" style={{ borderColor: danger ? 'rgba(185,28,28,0.22)' : 'rgba(26,56,40,0.16)', color: danger ? '#B91C1C' : '#1A3828' }}>
      {icon}{label}
    </button>
  );
}

function RequestNotice({ title, description, actionLabel, isPending, onAction }: { title: string; description: string; actionLabel: string; isPending: boolean; onAction: () => void }) {
  return (
    <div className="mt-4 flex flex-col gap-2 rounded-xl border px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'rgba(29,78,216,0.18)', background: 'rgba(59,130,246,0.06)', color: '#1D4ED8' }}>
      <div><p className="font-semibold">{title}</p><p className="text-xs leading-5">{description}</p></div>
      <button type="button" className="min-h-11 shrink-0 rounded-lg border px-3 text-xs font-semibold disabled:opacity-50" disabled={isPending} onClick={onAction}>{isPending ? 'Cofam...' : actionLabel}</button>
    </div>
  );
}

function PostVisitLinks({ appointment }: { appointment: Appointment }) {
  const links = [
    appointment.postVisit.recommendationsCount > 0 && { label: `Zalecenia (${appointment.postVisit.recommendationsCount})`, to: `/user/produkty?appointmentId=${appointment.id}` },
    appointment.postVisit.hasHomecareRoutine && { label: 'Rutyna domowa', to: `/user/rutyna?appointmentId=${appointment.id}` },
    appointment.postVisit.journalPhotoCount > 0 && { label: 'Zdjęcia', to: `/user/dziennik?appointmentId=${appointment.id}` },
    appointment.postVisit.hasPublishedBeautyPlan && { label: 'Plan pielęgnacji', to: '/user/zalecenia' },
  ].filter(Boolean) as Array<{ label: string; to: string }>;
  if (!links.length) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: '#7A4F1D' }}>Materiały po wizycie</p>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => <Link key={link.label} to={link.to} className="flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold" style={{ borderColor: 'rgba(26,56,40,0.16)', color: '#1A3828' }}>{link.label}</Link>)}
      </div>
    </div>
  );
}

function BottomSheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => closeRef.current?.focus());
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', keydown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose, open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="scrollbar-hidden max-h-[100svh] w-full max-w-lg overflow-y-auto rounded-t-[26px] bg-[#F4F9F5] p-3 sm:max-h-[calc(100svh-2rem)] sm:rounded-[26px] sm:p-6" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
        <div className="sticky top-0 z-10 -mx-1 flex items-center justify-between bg-[#F4F9F5] px-1 pb-3">
          <h2 id={titleId} className="font-heading text-xl font-bold" style={{ color: '#1A3828' }}>{title}</h2>
          <button ref={closeRef} type="button" aria-label={`Zamknij: ${title}`} onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-black/5"><X size={19} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ContactSheet({ overview, open, onClose }: { overview: AppointmentOverview; open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} title="Skontaktuj się z salonem" onClose={onClose}>
      <p className="mb-4 text-sm leading-6" style={{ color: 'rgba(20,40,28,0.72)' }}>Wybierz najwygodniejszą formę kontaktu.</p>
      <div className="grid gap-2">
        <a href={`tel:${overview.salonContact.phone}`} className="flex min-h-11 items-center gap-3 rounded-xl border bg-white px-4 font-semibold" style={{ color: '#1A3828' }}><Phone size={18} /> Zadzwoń: {overview.salonContact.phone}</a>
        <Link to="/user/chat" className="flex min-h-11 items-center gap-3 rounded-xl border bg-white px-4 font-semibold" style={{ color: '#1A3828' }}><MessageCircle size={18} /> Otwórz czat</Link>
        <a href={`mailto:${overview.salonContact.email}`} className="flex min-h-11 items-center gap-3 rounded-xl border bg-white px-4 font-semibold" style={{ color: '#1A3828' }}><Mail size={18} /> {overview.salonContact.email}</a>
      </div>
    </BottomSheet>
  );
}

function CancellationSheet({ appointment, overview, open, onClose }: { appointment: Appointment; overview: AppointmentOverview; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const hoursLeft = (new Date(appointment.date).getTime() - Date.now()) / 3_600_000;
  const allowed = hoursLeft >= overview.cancellationPolicy.noticeHours;
  const mutation = useMutation({
    mutationFn: () => appointmentsApi.requestCancellation(appointment.id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Wniosek o anulowanie został wysłany');
      onClose();
    },
    onError: (error: any) => toast.error(error?.response?.data?.message ?? 'Nie udało się wysłać wniosku'),
  });
  return (
    <BottomSheet open={open} title="Wniosek o anulowanie" onClose={onClose}>
      <div className="space-y-4 text-sm" style={{ color: 'rgba(20,40,28,0.76)' }}>
        <div className="rounded-xl border bg-white p-4">
          <p className="font-semibold" style={{ color: '#1A3828' }}>{appointment.service.name}</p>
          <p className="mt-1">{format(new Date(appointment.date), "d MMMM yyyy 'o' HH:mm", { locale: pl })}</p>
        </div>
        <div>
          <p className="leading-6">Wniosek online można złożyć najpóźniej <strong>{overview.cancellationPolicy.noticeHours} godz.</strong> przed wizytą. Wizyta pozostaje aktywna do czasu decyzji salonu.</p>
          <Link to="/regulamin" className="mt-1 inline-flex min-h-11 items-center font-semibold underline">Zobacz regulamin</Link>
        </div>
        {allowed ? (
          <>
            <div>
              <label htmlFor={`cancellation-reason-${appointment.id}`} className="mb-2 block font-semibold" style={{ color: '#1A3828' }}>Powód — opcjonalnie</label>
              <textarea id={`cancellation-reason-${appointment.id}`} value={reason} onChange={(event) => setReason(event.target.value.slice(0, 500))} rows={4} className="w-full rounded-xl border bg-white p-3 outline-none focus:ring-2 focus:ring-[#1A3828]/30" maxLength={500} />
              <p className="mt-1 text-right text-xs">{reason.length}/500</p>
            </div>
            <div className="sticky bottom-0 grid grid-cols-2 gap-2 bg-[#F4F9F5] pt-3">
              <Button type="button" variant="outline" className="min-h-11" onClick={onClose}>Wróć</Button>
              <Button type="button" className="min-h-11" disabled={mutation.isPending} onClick={() => mutation.mutate()} style={{ background: '#B91C1C', color: '#fff' }}>{mutation.isPending ? 'Wysyłam...' : 'Wyślij wniosek'}</Button>
            </div>
          </>
        ) : (
          <div role="alert" className="rounded-xl border p-4" style={{ borderColor: 'rgba(185,28,28,0.2)', background: 'rgba(239,68,68,0.06)', color: '#991B1B' }}>
            <p className="font-semibold">Minął termin na standardowy wniosek online.</p>
            <p className="mt-1 leading-5">Skontaktuj się bezpośrednio z salonem — administrator indywidualnie oceni sytuację.</p>
            <a href={`tel:${overview.salonContact.phone}`} className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 font-semibold"><Phone size={17} /> Zadzwoń do salonu</a>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

type DayStatus = 'off' | 'none' | 'partial' | 'available';

const DAY_DOT: Record<DayStatus, string> = {
  off: '', none: '', partial: 'bg-yellow-400', available: 'bg-green-500',
};

function RescheduleCalendar({ serviceId, employeeId, selected, onSelect }: { serviceId: string; employeeId?: string | null; selected: string | null; onSelect: (date: string) => void }) {
  const today = startOfDay(new Date());
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(addDays(today, 1)));
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth() + 1;
  const { data: availability = {}, isFetching, isError, refetch } = useQuery<Record<string, DayStatus>>({
    queryKey: ['month-availability', year, month, serviceId, employeeId],
    queryFn: () => employeesApi.getMonthAvailability(year, month, serviceId, employeeId),
  });
  const daysInMonth = getDaysInMonth(viewMonth);
  const firstDow = (getDay(viewMonth) + 6) % 7;
  const dayNames = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];
  return (
    <div className="-mx-3 select-none sm:mx-0">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" aria-label="Poprzedni miesiąc" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-accent disabled:opacity-30" onClick={() => setViewMonth((current) => subMonths(current, 1))} disabled={viewMonth <= startOfMonth(today)}><ChevronLeft size={16} /></button>
        <span className="text-sm font-semibold capitalize">{format(viewMonth, 'LLLL yyyy', { locale: pl })}{isFetching && <span className="ml-2 text-xs opacity-50">...</span>}</span>
        <button type="button" aria-label="Następny miesiąc" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-accent" onClick={() => setViewMonth((current) => addMonths(current, 1))}><ChevronRight size={16} /></button>
      </div>
      {isError && <div role="alert" className="mb-3 flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs" style={{ borderColor: 'rgba(185,28,28,0.18)', color: '#991B1B' }}><span>Nie udało się pobrać dostępnych dni.</span><button type="button" className="min-h-11 font-semibold underline" onClick={() => refetch()}>Ponów</button></div>}
      <div className="mb-1 grid grid-cols-7">{dayNames.map((name) => <div key={name} className="py-1 text-center text-[10px] font-medium text-muted-foreground">{name}</div>)}</div>
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: firstDow }).map((_, index) => <div key={`empty-${index}`} />)}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const dayNumber = index + 1;
          const date = `${year}-${String(month).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
          const dayDate = new Date(year, month - 1, dayNumber);
          const isPast = isBefore(dayDate, today);
          const dayStatus = availability[date];
          const disabled = isPast || isFetching || isError || !dayStatus || dayStatus === 'off' || dayStatus === 'none';
          const active = selected === date;
          return <div key={date} className="flex justify-center"><button type="button" disabled={disabled} onClick={() => onSelect(date)} aria-label={`${format(dayDate, 'd MMMM yyyy', { locale: pl })}${disabled ? ', brak terminów' : ', dostępne terminy'}`} className="relative flex h-11 w-full flex-col items-center justify-center rounded-full text-sm disabled:cursor-not-allowed" style={active ? { background: '#1A3828', color: '#fff' } : disabled ? { color: 'rgba(20,40,28,0.25)' } : undefined}><span>{dayNumber}</span>{!isPast && dayStatus && DAY_DOT[dayStatus] && <span className={`absolute bottom-1 h-1 w-1 rounded-full ${DAY_DOT[dayStatus]}`} />}</button></div>;
        })}
      </div>
      <div className="mt-3 flex gap-4 text-[10px] text-muted-foreground"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> wolny</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-400" /> częściowo</span></div>
    </div>
  );
}

function RescheduleModal({ appointment, open, onClose }: { appointment: Appointment; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const { data: slots = [], isFetching, isError, refetch } = useQuery({
    queryKey: ['availability', selectedDate, appointment.serviceId, appointment.employeeId],
    queryFn: () => employeesApi.getAvailability(selectedDate!, appointment.serviceId, appointment.employeeId),
    enabled: Boolean(selectedDate),
  });
  const mutation = useMutation({
    mutationFn: () => appointmentsApi.requestReschedule(appointment.id, `${selectedDate}T${selectedTime}:00`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Wniosek o zmianę terminu został wysłany');
      onClose();
    },
    onError: (error: any) => toast.error(error?.response?.data?.message ?? 'Nie udało się wysłać wniosku'),
  });
  const availableSlots = slots.filter((slot) => slot.available);
  return (
    <BottomSheet open={open} title="Zmień termin wizyty" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm" style={{ color: 'rgba(20,40,28,0.72)' }}>Aktualny termin: <strong style={{ color: '#1A3828' }}>{format(new Date(appointment.date), "d MMMM yyyy 'o' HH:mm", { locale: pl })}</strong></p>
        <p className="rounded-xl border px-3 py-2.5 text-xs leading-5" style={{ background: 'rgba(196,150,90,0.08)', color: '#92400E', borderColor: 'rgba(196,150,90,0.2)' }}>Zmiana terminu wymaga potwierdzenia przez salon. Obecny termin obowiązuje do chwili zatwierdzenia.</p>
        <RescheduleCalendar serviceId={appointment.serviceId} employeeId={appointment.employeeId} selected={selectedDate} onSelect={(date) => { setSelectedDate(date); setSelectedTime(null); }} />
        {selectedDate && <div><p className="mb-2 text-xs" style={{ color: 'rgba(20,40,28,0.72)' }}>Dostępne godziny {isFetching && '— ładowanie...'}</p>{isError && <div role="alert" className="mb-2 flex items-center justify-between rounded-xl border p-3 text-sm" style={{ color: '#991B1B' }}><span>Nie udało się pobrać godzin.</span><button type="button" className="min-h-11 font-semibold underline" onClick={() => refetch()}>Ponów</button></div>}<div className="flex flex-wrap gap-2">{availableSlots.map((slot) => <button type="button" key={slot.time} className="min-h-11 rounded-lg border px-4 text-sm" onClick={() => setSelectedTime(slot.time)} style={selectedTime === slot.time ? { background: '#1A3828', color: '#fff' } : { color: '#1A3828' }}>{slot.time}</button>)}</div>{!isFetching && !isError && availableSlots.length === 0 && <p className="text-sm">Brak wolnych godzin w tym dniu.</p>}</div>}
        <div className="sticky bottom-0 grid grid-cols-2 gap-2 border-t bg-[#F4F9F5] pt-3"><Button type="button" variant="outline" className="min-h-11" onClick={onClose}>Anuluj</Button><Button type="button" className="min-h-11" disabled={!selectedDate || !selectedTime || mutation.isPending || isFetching || isError} onClick={() => mutation.mutate()} style={{ background: '#1A3828', color: '#fff' }}>{mutation.isPending ? 'Wysyłam...' : 'Potwierdź zmianę'}</Button></div>
      </div>
    </BottomSheet>
  );
}
