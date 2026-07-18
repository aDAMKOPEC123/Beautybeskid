import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { trackEvent } from '@/lib/analytics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isBefore,
  startOfToday,
  isSameDay,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Clock, Upload, X, CheckCircle2 } from 'lucide-react';

import ServiceQuiz from '@/components/ServiceQuiz';
import type { ApiQuizResult } from '@/api/quiz.api';
import { servicesApi } from '@/api/services.api';
import { employeesApi } from '@/api/employees.api';
import { appointmentsApi } from '@/api/appointments.api';
import { loyaltyApi } from '@/api/loyalty.api';
import happyHoursApi from '@/api/happy-hours.api';
import { useAuth } from '@/hooks/useAuth';
import { loadTrackedVoucherCodes } from '@/lib/tracked-vouchers';
import { Input } from '@/components/ui/input';
import type { ValidatedVoucher } from '@cosmo/shared';
import { Button } from '@/components/ui/button';
import { ServiceRating } from '@/components/reviews/ServiceRating';
import { PageSEO } from '@/components/shared/SEO';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WizardState {
  service: any | null;
  seriesId: string | null;
  employee: any | null;
  employeeId: string | null;
  date: Date | null;
  time: string | null;
  notes: string;
  allergies: string;
  problemDescription: string;
  photo: File | null;
  couponId: string | null;
  otherRewardId: string | null;
  discountCodeId: string | null;
  voucherId: string | null;
  voucherData: ValidatedVoucher | null;
  appliedHappyHour: any | null;
}

type BookingDraft = Omit<WizardState, 'date' | 'photo'> & {
  date: string | null;
};

const BOOKING_DRAFT_KEY = 'cosmo-booking-draft';

const readBookingDraft = (): BookingDraft | null => {
  try {
    const value = sessionStorage.getItem(BOOKING_DRAFT_KEY);
    return value ? JSON.parse(value) as BookingDraft : null;
  } catch {
    return null;
  }
};

const saveBookingDraft = (state: WizardState) => {
  const { photo: _photo, date, ...draft } = state;
  sessionStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify({ ...draft, date: date?.toISOString() ?? null }));
};

const STEPS = ['Usługa', 'Specjalista', 'Termin', 'Dane', 'Potwierdzenie'];

const promoCountdown = (endDate?: string | null): string | null => {
  if (!endDate) return null;
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
  if (diff < 0) return null;
  if (diff === 0) return 'Ostatni dzień promocji!';
  if (diff === 1) return 'Zostal 1 dzień promocji';
  if (diff <= 4) return `Zostały ${diff} dni promocji`;
  return `Zostało ${diff} dni promocji`;
};

const formatContentLabel = (value?: string | null) => {
  const clean = value?.trim() ?? '';
  return clean ? clean.charAt(0).toLocaleUpperCase('pl-PL') + clean.slice(1) : '';
};

const getServiceDescription = (description?: string | null) => {
  const clean = description?.trim() ?? '';
  const looksLikePlaceholder = clean.length > 16 && !/\s/.test(clean);
  return !clean || looksLikePlaceholder
    ? 'Szczegóły zabiegu omówimy podczas konsultacji.'
    : clean;
};

// ─── Mini Calendar ────────────────────────────────────────────────────────────

function MiniCalendar({
  selected,
  onSelect,
  serviceId,
  employeeId,
}: {
  selected: Date | null;
  onSelect: (d: Date) => void;
  serviceId: string | null;
  employeeId: string | null;
}) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const today = startOfToday();

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth() + 1;

  const { data: monthAvailability = {} } = useQuery<
    Record<string, 'off' | 'none' | 'partial' | 'available'>
  >({
    queryKey: ['month-availability', year, month, serviceId, employeeId],
    queryFn: () => employeesApi.getMonthAvailability(year, month, serviceId!, employeeId),
    enabled: !!serviceId,
  });

  const days = eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) });
  const firstDayOffset = (getDay(days[0]) + 6) % 7;
  const DAY_NAMES = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setViewMonth((m) => subMonths(m, 1))}
          aria-label="Poprzedni miesiąc"
          className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-black/5 transition-colors"
          style={{ color: '#1A3828' }}
        >
          <ChevronLeft size={18} />
        </button>
        <span className="font-semibold capitalize" style={{ color: '#1A3828' }}>
          {format(viewMonth, 'LLLL yyyy', { locale: pl })}
        </span>
        <button
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          aria-label="Następny miesiąc"
          className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-black/5 transition-colors"
          style={{ color: '#1A3828' }}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-xs font-medium py-1" style={{ color: 'rgba(20,40,28,0.4)' }}>
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: firstDayOffset }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((day) => {
          const isPast = isBefore(day, today);
          const isSelected = selected ? isSameDay(day, selected) : false;
          const isToday = isSameDay(day, today);
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayStatus = isPast ? null : (monthAvailability[dateKey] ?? null);
          const isGreen = dayStatus === 'available' || dayStatus === 'partial';
          const isRed = dayStatus === 'none' || dayStatus === 'off';
          return (
            <button
              key={day.toISOString()}
              disabled={isPast || isRed}
              aria-label={format(day, 'd MMMM yyyy', { locale: pl })}
              aria-pressed={isSelected}
              onClick={() => onSelect(day)}
              className="text-sm rounded-full w-full max-w-9 min-h-9 mx-auto flex items-center justify-center transition-colors"
              style={
                isSelected
                  ? { background: '#1A3828', color: '#fff' }
                  : isToday
                  ? { border: '1.5px solid #C4965A', color: '#C4965A', fontWeight: 700 }
                  : isPast
                  ? { color: 'rgba(20,40,28,0.25)', cursor: 'not-allowed' }
                  : isRed
                  ? { background: 'rgba(26,56,40,0.05)', color: 'rgba(20,40,28,0.35)', cursor: 'not-allowed' }
                  : isGreen
                  ? { background: 'rgba(34,197,94,0.1)', color: '#15803d', cursor: 'pointer' }
                  : { color: '#1A3828', cursor: 'pointer' }
              }
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 1: Wybór usługi ─────────────────────────────────────────────────────

function StepService({
  selected,
  onSelect,
  onAdvanceStep,
  preselectedServiceId,
}: {
  selected: any | null;
  onSelect: (s: any) => void;
  onAdvanceStep: () => void;
  preselectedServiceId?: string | null;
}) {
  const { data: services = [], isLoading } = useQuery<any[]>({
    queryKey: ['services'],
    queryFn: servicesApi.getAll,
  });
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [quizOpen, setQuizOpen] = useState(false);
  const [recommendation, setRecommendation] = useState<ApiQuizResult | null>(null);

  useEffect(() => {
    if (!preselectedServiceId || selected || services.length === 0) return;
    const match = services.find((service: any) => service.id === preselectedServiceId);
    if (!match) return;
    onSelect(match);
    onAdvanceStep();
  }, [preselectedServiceId, selected, services, onSelect, onAdvanceStep]);

  const categories: string[] = Array.from(new Set(services.map((s: any) => s.category))).sort() as string[];
  const filtered = filterCategory ? services.filter((s: any) => s.category === filterCategory) : services;

  const handleQuizAccept = (result: ApiQuizResult) => {
    setRecommendation(result);
    setQuizOpen(false);
    if (result.mainService) {
      // Find matching service in loaded list and pre-select it
      const match = services.find((s: any) => s.id === result.mainService!.id);
      if (match) {
        // Use onSelect() — the existing helper that also clears stale date/time state
        onSelect(match);
        onAdvanceStep(); // advance to Pracownik (employee) step
      }
    }
    // If no mainService: stay on service step (step 0), all services shown, banner visible
  };

  if (isLoading)
    return (
      <div className="text-center py-12 animate-pulse" style={{ color: 'rgba(20,40,28,0.4)' }}>
        Ładowanie usług...
      </div>
    );

  return (
    <div className="space-y-4">
      {/* Quiz trigger */}
      <button
        onClick={() => setQuizOpen(true)}
        className="w-full border border-dashed rounded-xl p-3 text-sm text-center transition-colors hover:bg-amber-50"
        style={{ borderColor: 'rgba(196,150,90,0.4)', color: 'rgba(20,40,28,0.6)' }}
      >
        Nie wiesz, jaki zabieg wybrać?{' '}
        <span className="font-semibold" style={{ color: '#C4965A' }}>
          Rozwiąż krótki quiz →
        </span>
      </button>

      {/* Recommendation banner */}
      {recommendation && (
        <div
          className="rounded-xl p-4 flex items-start justify-between gap-3"
          style={{ background: 'rgba(196,150,90,0.08)', border: '1px solid rgba(196,150,90,0.3)' }}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#C4965A' }}>
              Rekomendacja dla Ciebie
            </p>
            <p className="font-semibold mt-0.5" style={{ color: '#1A3828' }}>{recommendation.title}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(20,40,28,0.6)' }}>{recommendation.subtitle}</p>
          </div>
          <button onClick={() => setRecommendation(null)} style={{ color: 'rgba(20,40,28,0.4)' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Quiz modal */}
      {/* Tour anchor — always in DOM so tour can target it */}
      <div data-tour="service-quiz">
        {quizOpen && <ServiceQuiz onClose={() => setQuizOpen(false)} onAccept={handleQuizAccept} />}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {(['', ...categories] as string[]).map((cat) => (
          <button
            key={cat || '__all__'}
            onClick={() => setFilterCategory(cat)}
            className="px-4 py-1.5 rounded-full text-sm font-medium border transition-colors"
            style={
              filterCategory === cat
                ? { background: '#1A3828', color: '#fff', borderColor: '#1A3828' }
                : { borderColor: 'rgba(0,0,0,0.15)', color: 'rgba(20,40,28,0.7)' }
            }
          >
            {cat ? formatContentLabel(cat) : 'Wszystkie'}
          </button>
        ))}
      </div>

      {/* Service cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((service: any) => {
          const isSelected = selected?.id === service.id;
          return (
            <button
              type="button"
              key={service.id}
              onClick={() => onSelect(service)}
              aria-pressed={isSelected}
              className="w-full rounded-2xl cursor-pointer overflow-hidden text-left transition-all"
              style={{
                background: '#fff',
                border: isSelected
                  ? '1.5px solid #C4965A'
                  : '1px solid rgba(0,0,0,0.08)',
                boxShadow: isSelected
                  ? '0 0 0 3px rgba(196,150,90,0.12)'
                  : '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              {service.imagePath && (
                <div className="h-36 overflow-hidden">
                  <img
                    src={service.imagePath}
                    alt={service.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-tight" style={{ color: '#1A3828' }}>
                    {formatContentLabel(service.name)}
                  </h3>
                  {isSelected && <CheckCircle2 size={18} style={{ color: '#C4965A', flexShrink: 0, marginTop: 2 }} />}
                </div>
                <p className="text-xs line-clamp-2" style={{ color: 'rgba(20,40,28,0.5)' }}>
                  {getServiceDescription(service.description)}
                </p>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(196,150,90,0.1)', color: '#C4965A' }}
                    >
                      <Clock size={11} />
                      {service.durationMinutes} min
                    </span>
                    <ServiceRating avgRating={service.avgRating} reviewCount={service.reviewCount} />
                  </div>
                  {service.promoPrice != null ? (
                    <div className="flex flex-col items-end gap-1">
                      <span className="flex items-center gap-1.5">
                        <span className="text-xs line-through opacity-50">{Number(service.price).toFixed(2)} zł</span>
                        <span className="font-bold" style={{ color: '#dc2626' }}>{service.promoPrice.toFixed(2)} zł</span>
                      </span>
                      {service.promoUsesRemaining != null && (
                        <span
                          className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full text-white"
                          style={{ background: service.promoUsesRemaining <= 3 ? '#dc2626' : '#1A3828' }}
                        >
                          Tylko dla {service.promoUsesRemaining} osób
                        </span>
                      )}
                      {promoCountdown(service.promoEndDate) && (
                        <span className="text-[10px] font-medium" style={{ color: '#C4965A' }}>
                          {promoCountdown(service.promoEndDate)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="font-bold" style={{ color: '#1A3828' }}>
                      {Number(service.price).toFixed(2)} zł
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 2: Wybór pracownika ─────────────────────────────────────────────────

function StepEmployee({
  selected,
  onSelect,
  service,
}: {
  selected: string | null;
  onSelect: (emp: any | null) => void;
  service: any;
}) {
  const { data: employees = [], isLoading } = useQuery<any[]>({
    queryKey: ['employees'],
    queryFn: employeesApi.getAll,
  });

  const filteredEmployees =
    service?.employees?.length > 0
      ? employees.filter((e: any) => service.employees.some((se: any) => se.id === e.id))
      : employees;

  if (isLoading)
    return (
      <div className="text-center py-12 animate-pulse" style={{ color: 'rgba(20,40,28,0.4)' }}>
        Ładowanie pracowników...
      </div>
    );

  const cardStyle = (isSelected: boolean) => ({
    background: '#fff',
    border: isSelected ? '1.5px solid #C4965A' : '1px solid rgba(0,0,0,0.08)',
    boxShadow: isSelected ? '0 0 0 3px rgba(196,150,90,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
    borderRadius: 16,
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  return (
    <div className="space-y-4">
      {filteredEmployees.length === 0 && !isLoading && (
        <div className="text-center py-8 text-sm" style={{ color: 'rgba(20,40,28,0.45)' }}>
          Brak dostępnych pracowników dla tej usługi.
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        {filteredEmployees.map((emp: any) => {
          const isSelected = selected === emp.id;
          return (
            <button
              type="button"
              key={emp.id}
              onClick={() => onSelect(emp)}
              aria-pressed={isSelected}
              className="w-full p-4 flex gap-4 items-start text-left"
              style={cardStyle(isSelected)}
            >
              <div className="w-14 h-14 rounded-full overflow-hidden shrink-0" style={{ background: 'rgba(196,150,90,0.1)' }}>
                {emp.avatarPath ? (
                  <img src={emp.avatarPath} alt={emp.name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl font-bold" style={{ color: '#C4965A' }}>
                    {emp.name?.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold" style={{ color: '#1A3828' }}>{emp.name}</p>
                  {isSelected && <CheckCircle2 size={16} style={{ color: '#C4965A', flexShrink: 0 }} />}
                </div>
                {emp.bio && (
                  <p className="text-sm mt-1 line-clamp-2" style={{ color: 'rgba(20,40,28,0.5)' }}>{emp.bio}</p>
                )}
                {emp.specialties?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {emp.specialties.map((s: string) => (
                      <span
                        key={s}
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(196,150,90,0.1)', color: '#C4965A' }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
                <span
                  className="mt-3 inline-flex min-h-9 items-center rounded-full px-3 text-xs font-semibold"
                  style={isSelected
                    ? { background: '#1A3828', color: '#fff' }
                    : { background: 'rgba(26,56,40,0.07)', color: 'rgba(20,40,28,0.72)' }}
                >
                  {isSelected ? 'Wybrano' : 'Wybierz specjalistę'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 3: Wybór terminu ────────────────────────────────────────────────────

function getHappyHourForSlot(
  time: string,
  date: Date,
  serviceId: string,
  employeeId: string | null,
  activeHappyHours: any[],
): any | null {
  return (
    activeHappyHours.find((hh) => {
      if (!hh.isActive) return false;
      const dateMatch =
        hh.type === 'ONE_TIME'
          ? isSameDay(new Date(hh.date), date)
          : hh.dayOfWeek === date.getDay();
      if (!dateMatch) return false;
      if (time < hh.startTime || time >= hh.endTime) return false;
      if (!hh.isAllServices && !hh.services.some((s: any) => s.id === serviceId)) return false;
      if (
        !hh.isAllEmployees &&
        employeeId &&
        !hh.employees.some((e: any) => e.id === employeeId)
      )
        return false;
      return true;
    }) ?? null
  );
}

function StepDate({
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
  onSelectHappyHour,
  service,
  employeeId,
  activeHappyHours,
}: {
  selectedDate: Date | null;
  selectedTime: string | null;
  onSelectDate: (d: Date) => void;
  onSelectTime: (t: string) => void;
  onSelectHappyHour: (hh: any | null) => void;
  service: any;
  employeeId: string | null;
  activeHappyHours: any[];
}) {
  const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;

  const { data: slots = [], isFetching } = useQuery<{ time: string; available: boolean }[]>({
    queryKey: ['availability', dateStr, service?.id, employeeId],
    queryFn: () => employeesApi.getAvailability(dateStr!, service.id, employeeId),
    enabled: !!dateStr && !!service?.id,
  });

  const handleSlotClick = (time: string) => {
    onSelectTime(time);
    if (selectedDate && service?.id) {
      const hh = getHappyHourForSlot(time, selectedDate, service.id, employeeId, activeHappyHours);
      onSelectHappyHour(hh);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Calendar */}
      <div
        className="rounded-xl p-3 sm:p-5"
        style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}
      >
        <MiniCalendar
          selected={selectedDate}
          onSelect={onSelectDate}
          serviceId={service?.id ?? null}
          employeeId={employeeId}
        />
      </div>

      {/* Time slots */}
      <div>
        {!selectedDate ? (
          <div
            className="flex items-center justify-center h-full text-sm"
            style={{ color: 'rgba(20,40,28,0.45)' }}
          >
            Wybierz dzień, aby zobaczyć dostępne godziny
          </div>
        ) : isFetching ? (
          <div className="text-center animate-pulse py-8" style={{ color: 'rgba(20,40,28,0.45)' }}>
            Sprawdzanie dostępności...
          </div>
        ) : slots.length === 0 ? (
          <div
            className="text-center py-8 rounded-xl"
            style={{ border: '2px dashed rgba(0,0,0,0.1)', color: 'rgba(20,40,28,0.45)' }}
          >
            Brak wolnych terminów w tym dniu.<br />
            <span className="text-sm">Wybierz inny dzień.</span>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium mb-3" style={{ color: 'rgba(20,40,28,0.55)' }}>
              Dostępne godziny — {format(selectedDate, 'EEEE, d MMMM', { locale: pl })}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {slots.map((slot) => {
                const happyHour =
                  slot.available && selectedDate && service?.id
                    ? getHappyHourForSlot(slot.time, selectedDate, service.id, employeeId, activeHappyHours)
                    : null;
                const isHot = !!happyHour;
                return (
                  <button
                    key={slot.time}
                    disabled={!slot.available}
                    onClick={() => slot.available && handleSlotClick(slot.time)}
                    className="py-2 rounded-lg text-sm font-medium border transition-all"
                    style={
                      !slot.available
                        ? { background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)', color: '#DC2626', cursor: 'not-allowed' }
                        : selectedTime === slot.time
                        ? { background: '#1A3828', color: '#fff', borderColor: '#1A3828' }
                        : isHot
                        ? { background: 'rgba(217,119,6,0.08)', borderColor: '#D97706', color: '#92400E' }
                        : { borderColor: 'rgba(0,0,0,0.15)', color: '#1A3828' }
                    }
                  >
                    {isHot ? (
                      <span className="flex flex-col items-center gap-0.5 leading-tight">
                        <span className="text-[10px] font-bold tracking-wide" style={{ color: '#D97706' }}>⭐ HOT</span>
                        <span>{slot.time}</span>
                        <span className="text-[10px]" style={{ color: 'rgba(146,64,14,0.7)', textDecoration: 'line-through' }}>
                          {(service?.promoPrice ?? Number(service?.price)).toFixed(2)} zł
                        </span>
                        <span className="text-[10px] font-bold" style={{ color: '#D97706' }}>
                          {happyHour.discountType === 'PERCENTAGE'
                            ? `${(service?.promoPrice ?? Number(service?.price)) * (1 - Number(happyHour.discountValue) / 100) < 0 ? '0.00' : ((service?.promoPrice ?? Number(service?.price)) * (1 - Number(happyHour.discountValue) / 100)).toFixed(2)} zł`
                            : `${Math.max(0, (service?.promoPrice ?? Number(service?.price)) - Number(happyHour.discountValue)).toFixed(2)} zł`}
                        </span>
                      </span>
                    ) : (
                      slot.time
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 4: Uwagi i zdjęcie ──────────────────────────────────────────────────

function StepNotes({
  notes,
  allergies,
  problemDescription,
  photo,
  onChange,
}: {
  notes: string;
  allergies: string;
  problemDescription: string;
  photo: File | null;
  onChange: (field: string, value: any) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Plik jest za duży (max 5 MB)');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Dozwolone formaty: JPG, PNG, WebP');
      return;
    }
    onChange('photo', file);
  };

  const textareaStyle = {
    border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: 12,
    background: '#F4F9F5',
    outline: 'none',
    width: '100%',
    padding: '8px 12px',
    fontSize: 14,
    resize: 'none' as const,
    fontFamily: 'inherit',
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {[
        { label: 'Dodatkowe uwagi', value: notes, field: 'notes', rows: 3, placeholder: 'Np. preferowana pora dnia, specjalne życzenia...' },
        { label: 'Alergie i przeciwwskazania', value: allergies, field: 'allergies', rows: 2, placeholder: 'Np. alergia na lateks, nikiel, składniki kosmetyczne...' },
        { label: 'Opis problemu / oczekiwania', value: problemDescription, field: 'problemDescription', rows: 3, placeholder: 'Opisz co chcesz osiągnąć lub co Cię niepokoi...' },
      ].map(({ label, value, field, rows, placeholder }) => (
        <div key={field} className="space-y-1">
          <label htmlFor={`booking-${field}`} className="text-sm font-medium" style={{ color: '#1A3828' }}>{label}</label>
          <textarea
            id={`booking-${field}`}
            name={field}
            value={value}
            onChange={(e) => onChange(field, e.target.value)}
            rows={rows}
            placeholder={placeholder}
            style={textareaStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#C4965A'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; }}
          />
        </div>
      ))}

      {/* Photo upload */}
      <div className="space-y-2">
        <label htmlFor="booking-photo" className="text-sm font-medium" style={{ color: '#1A3828' }}>Zdjęcie (opcjonalnie)</label>
        <div
          role={photo ? undefined : 'button'}
          tabIndex={photo ? -1 : 0}
          aria-label={photo ? undefined : 'Dodaj zdjęcie do rezerwacji'}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          onClick={() => !photo && fileRef.current?.click()}
          onKeyDown={(event) => {
            if (!photo && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault();
              fileRef.current?.click();
            }
          }}
          className="rounded-xl p-6 text-center transition-colors"
          style={{
            border: `2px dashed ${dragOver ? '#C4965A' : 'rgba(196,150,90,0.3)'}`,
            background: dragOver ? 'rgba(196,150,90,0.05)' : 'transparent',
            cursor: photo ? 'default' : 'pointer',
          }}
        >
          {photo ? (
            <div className="flex items-center gap-4">
              <img
                src={URL.createObjectURL(photo)}
                alt="Podgląd zdjęcia do rezerwacji"
                className="w-20 h-20 object-cover rounded-lg"
                style={{ border: '1px solid rgba(0,0,0,0.1)' }}
                loading="lazy"
              />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium" style={{ color: '#1A3828' }}>{photo.name}</p>
                <p className="text-xs" style={{ color: 'rgba(20,40,28,0.5)' }}>{(photo.size / 1024).toFixed(0)} KB</p>
              </div>
              <button
                type="button"
                aria-label="Usuń dodane zdjęcie"
                onClick={(e) => { e.stopPropagation(); onChange('photo', null); }}
                className="p-1 rounded transition-opacity hover:opacity-70"
                style={{ color: '#DC2626' }}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload size={24} className="mx-auto" style={{ color: 'rgba(20,40,28,0.35)' }} />
              <p className="text-sm hidden md:block" style={{ color: 'rgba(20,40,28,0.5)' }}>
                Przeciągnij zdjęcie lub{' '}
                <span style={{ color: '#C4965A', textDecoration: 'underline' }}>kliknij tutaj</span>
              </p>
              <p className="text-sm md:hidden" style={{ color: 'rgba(20,40,28,0.5)' }}>
                <span style={{ color: '#C4965A', textDecoration: 'underline' }}>Dotknij tutaj</span>
                {' '}aby dodać zdjęcie
              </p>
              <p className="text-xs" style={{ color: 'rgba(20,40,28,0.4)' }}>JPG, PNG, WebP — max 5 MB</p>
            </div>
          )}
        </div>
        <input
          id="booking-photo"
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>
    </div>
  );
}

// ─── Price helpers ────────────────────────────────────────────────────────────

function calcDiscountedPrice(price: number, reward: any): number {
  if (!reward) return price;
  const discountValue = Number(reward.discountValue ?? 0);
  if (!Number.isFinite(discountValue) || discountValue <= 0) return price;
  if (reward.discountType === 'PERCENTAGE') {
    return Math.max(0, price * (1 - discountValue / 100));
  }
  if (reward.discountType === 'AMOUNT') {
    return Math.max(0, price - discountValue);
  }
  return price;
}

function getCouponCode(code?: string | null): string {
  const value = code?.trim() ?? '';
  if (!value) return '';
  return (value.split('-').pop() || value).trim().toUpperCase();
}

function toValidatedCoupon(coupon: any): ValidatedVoucher | null {
  const reward = coupon?.reward;
  const code = getCouponCode(coupon?.code);
  const discountValue = Number(reward?.discountValue ?? 0);
  if (
    !coupon?.id ||
    !code ||
    (reward.discountType !== 'PERCENTAGE' && reward.discountType !== 'AMOUNT' && reward.discountType !== 'OTHER') ||
    (reward.discountType !== 'OTHER' && (!Number.isFinite(discountValue) || discountValue <= 0))
  ) {
    return null;
  }

  return {
    type: 'COUPON',
    id: coupon.id,
    code,
    discountType: reward.discountType,
    discountValue,
    restrictedToServiceId: null,
  };
}

function formatCouponDiscount(coupon: ValidatedVoucher): string {
  if (coupon.discountType === 'OTHER') return 'Nagroda specjalna';
  return coupon.discountType === 'PERCENTAGE'
    ? `-${coupon.discountValue}%`
    : `-${Number(coupon.discountValue).toFixed(2)} zł`;
}

function voucherTypeLabel(voucher: ValidatedVoucher): string {
  if (voucher.type === 'COUPON') return 'kupon lojalnościowy';
  if (voucher.type === 'VOUCHER_CASH' || voucher.type === 'VOUCHER_SERVICE') return 'voucher';
  return 'kod rabatowy';
}

function couponCountLabel(count: number): string {
  if (count === 1) return 'Masz 1 aktywny kupon lojalnościowy do wykorzystania';
  if (count >= 2 && count <= 4) return `Masz ${count} aktywne kupony lojalnościowe do wykorzystania`;
  return `Masz ${count} aktywnych kuponów lojalnościowych do wykorzystania`;
}

// ─── Step 5: Podsumowanie + Lojalność ────────────────────────────────────────

function StepConfirm({
  state,
  onCouponSelect,
  onOtherRewardSelect,
  onVoucherChange,
  user,
  isAuthenticated,
  preselectedCode,
}: {
  state: WizardState;
  onCouponSelect: (id: string | null) => void;
  onOtherRewardSelect: (id: string | null) => void;
  onVoucherChange: (v: ValidatedVoucher | null) => void;
  user: any;
  isAuthenticated: boolean;
  preselectedCode?: string | null;
}) {
  const [codeInput, setCodeInput] = useState('');
  const [validating, setValidating] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [trackedVoucherCodes] = useState(loadTrackedVoucherCodes);
  const cleanPreselectedCode = getCouponCode(preselectedCode);

  useEffect(() => {
    if (!isAuthenticated || !cleanPreselectedCode || state.voucherData) return;
    setValidating(true);
    loyaltyApi.validateVoucher(cleanPreselectedCode, state.service?.id).then((data) => {
      onVoucherChange(data);
      setCodeInput(data.code);
      toast.success(`Kod ${data.code} został automatycznie zastosowany!`);
    }).catch((e: any) => {
      toast.error(e.response?.data?.message || 'Nie udało się automatycznie zastosować kodu');
    }).finally(() => setValidating(false));
  }, [isAuthenticated, cleanPreselectedCode, state.service?.id]);
  const { data: rewards = [] } = useQuery<any[]>({
    queryKey: ['loyalty', 'rewards'],
    queryFn: loyaltyApi.getRewards,
    enabled: isAuthenticated,
  });
  const { data: activeCoupons = [] } = useQuery<any[]>({
    queryKey: ['loyalty', 'coupons'],
    queryFn: loyaltyApi.getActiveCoupons,
    enabled: isAuthenticated,
  });
  const { data: trackedVouchers = [], isLoading: trackedVouchersLoading } = useQuery<ValidatedVoucher[]>({
    queryKey: ['booking', 'tracked-vouchers', trackedVoucherCodes, state.service?.id],
    queryFn: async () => {
      const results = await Promise.allSettled(
        trackedVoucherCodes.map((code) => loyaltyApi.validateVoucher(code, state.service?.id))
      );

      return results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
    },
    enabled: isAuthenticated && trackedVoucherCodes.length > 0 && Boolean(state.service?.id),
  });

  const basePrice = state.service ? (state.service.promoPrice ?? Number(state.service.price)) : 0;

  function tierOrder(tier?: string) {
    return tier === 'GOLD' ? 3 : tier === 'SILVER' ? 2 : 1;
  }

  let discountedPrice = basePrice;
  if (state.appliedHappyHour) {
    discountedPrice = calcDiscountedPrice(basePrice, state.appliedHappyHour);
  }
  if (state.voucherData) {
    discountedPrice = calcDiscountedPrice(discountedPrice, state.voucherData);
  }

  const hasDiscount = discountedPrice < basePrice;
  const earnedPoints = Math.floor(discountedPrice);

  const handleValidateVoucher = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    if (!isAuthenticated) {
      toast.message('Kod rabatowy zastosujesz po zalogowaniu, przed ostatecznym potwierdzeniem rezerwacji.');
      return;
    }
    setValidating(true);
    try {
      const data = await loyaltyApi.validateVoucher(code, state.service?.id);
      onVoucherChange(data);
      setShowInput(false);
      toast.success(`${data.type === 'COUPON' ? 'Kupon' : 'Kod'} ${data.code} zastosowany!`);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Nieprawidłowy kod');
    } finally {
      setValidating(false);
    }
  };

  const otherRewards = rewards.filter(
    (r: any) =>
      r.isActive &&
      r.discountType === 'OTHER' &&
      Number(r.pointsCost) <= (user?.loyaltyPoints ?? 0) &&
      (!r.requiredTier || tierOrder(user?.loyaltyTier) >= tierOrder(r.requiredTier))
  );
  const activeCouponVouchers = activeCoupons
    .map(toValidatedCoupon)
    .filter((coupon): coupon is ValidatedVoucher => Boolean(coupon));

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Happy Hours banner */}
      {state.appliedHappyHour && (
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: '#fffbeb', border: '1px solid #d97706' }}
        >
          <p className="font-semibold text-sm" style={{ color: '#92400E' }}>
            ⭐ HAPPY HOURS — {state.appliedHappyHour.discountValue}
            {state.appliedHappyHour.discountType === 'PERCENTAGE' ? '%' : ' zł'} RABATU
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#B45309' }}>
            Wybrany termin jest objęty promocją!
          </p>
        </div>
      )}

      {/* Summary card */}
      <div
        className="rounded-[20px] overflow-hidden"
        style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}
      >
        <div className="p-6">
          <h3 className="font-heading font-semibold text-lg mb-4" style={{ color: '#1A3828' }}>
            Podsumowanie rezerwacji
          </h3>
          <div className="text-sm" style={{ borderTop: '1px solid rgba(196,150,90,0.15)' }}>
            {[
              { label: 'Usługa', value: state.service?.name },
              { label: 'Czas trwania', value: state.service?.durationMinutes ? `${state.service.durationMinutes} min` : undefined },
              {
                label: 'Cena',
                valueNode: hasDiscount ? (
                  <>
                    <span className="line-through text-xs mr-2" style={{ color: 'rgba(20,40,28,0.4)' }}>
                      {basePrice.toFixed(2)} zł
                    </span>
                    <span className="font-bold" style={{ color: '#15803D' }}>{discountedPrice.toFixed(2)} zł</span>
                  </>
                ) : (
                  <span className="font-bold" style={{ color: '#1A3828' }}>{basePrice.toFixed(2)} zł</span>
                ),
              },
              { label: 'Pracownik', value: state.employee?.name ?? '—' },
              {
                label: 'Termin',
                value: state.date
                  ? `${format(state.date, 'dd.MM.yyyy', { locale: pl })} o ${state.time}`
                  : '—',
              },
              ...(state.notes ? [{ label: 'Uwagi', value: state.notes }] : []),
              ...(state.photo ? [{ label: 'Zdjęcie', valueNode: <span style={{ color: '#C4965A' }}>✓ Dodano</span> }] : []),
            ].map(({ label, value, valueNode }) => (
              <div
                key={label}
                className="py-2.5 flex justify-between items-center"
                style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}
              >
                <span style={{ color: 'rgba(20,40,28,0.5)' }}>{label}</span>
                {valueNode ?? <span style={{ color: '#1A3828' }}>{value}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {!isAuthenticated && (
        <div className="rounded-xl border border-[#C4965A]/30 bg-[#C4965A]/10 p-4 text-sm text-[#1A3828]">
          <strong>Konto będzie potrzebne dopiero teraz.</strong> Po kliknięciu potwierdzenia zachowamy wybrany termin. Voucher, kod rabatowy lub kupon lojalnościowy zastosujesz po zalogowaniu.
        </div>
      )}

      {/* Voucher section */}
      <div>
        {state.voucherData ? (
          <div
            className="flex items-center justify-between p-3 rounded-lg text-sm"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
          >
            <span>
              <strong className="font-mono tracking-wider" style={{ color: '#1A3828' }}>
                {state.voucherData.code}
              </strong>
              {' — '}
              <span style={{ color: '#15803D' }}>
                {formatCouponDiscount(state.voucherData)}
              </span>
              {' '}
              <span className="text-xs" style={{ color: 'rgba(20,40,28,0.5)' }}>
                ({voucherTypeLabel(state.voucherData)})
              </span>
            </span>
            <button
              onClick={() => { onVoucherChange(null); onCouponSelect(null); setCodeInput(''); setShowInput(false); }}
              className="text-xs ml-4 hover:underline"
              style={{ color: '#DC2626' }}
            >
              Usuń
            </button>
          </div>
        ) : showInput ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Wpisz voucher, kod rabatowy lub kupon lojalnościowy"
                value={codeInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCodeInput(e.target.value.toUpperCase())
                }
                className="uppercase flex-1"
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                  e.key === 'Enter' && handleValidateVoucher()
                }
                autoFocus
              />
              <Button variant="outline" onClick={handleValidateVoucher} disabled={validating || !codeInput.trim()}>
                {validating ? 'Sprawdzam...' : 'Zastosuj'}
              </Button>
            </div>
            <button
              onClick={() => setShowInput(false)}
              className="text-xs hover:underline"
              style={{ color: 'rgba(20,40,28,0.5)' }}
            >
              Anuluj
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowInput(true)}
            className="text-sm hover:underline flex items-center gap-1"
            style={{ color: '#C4965A' }}
          >
            🎟️ Masz voucher, kod rabatowy lub kupon lojalnościowy? Wpisz kod
          </button>
        )}
        {!state.voucherData && trackedVouchersLoading && (
          <p className="mt-3 text-xs" style={{ color: 'rgba(20,40,28,0.5)' }}>
            Sprawdzam Twoje zapisane vouchery...
          </p>
        )}
        {!state.voucherData && trackedVouchers.length > 0 && (
          <div
            className="mt-3 rounded-xl border p-3 text-sm"
            style={{ background: 'rgba(34,197,94,0.05)', borderColor: 'rgba(34,197,94,0.2)' }}
          >
            <p className="font-semibold" style={{ color: '#1A3828' }}>
              Twoje vouchery — wybierz, aby zastosować
            </p>
            <div className="mt-3 space-y-2">
              {trackedVouchers.map((voucher) => (
                <button
                  key={voucher.id}
                  type="button"
                  onClick={() => {
                    onVoucherChange(voucher);
                    setCodeInput(voucher.code);
                    setShowInput(false);
                    toast.success(`Voucher ${voucher.code} zastosowany!`);
                  }}
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2 text-left transition-colors hover:bg-[#F3FAF5]"
                  style={{ borderColor: 'rgba(34,197,94,0.2)' }}
                >
                  <span className="min-w-0">
                    <span className="block text-xs" style={{ color: 'rgba(20,40,28,0.5)' }}>
                      {voucher.type === 'VOUCHER_CASH' ? 'Voucher gotówkowy' : 'Voucher na usługę'}
                    </span>
                    <span className="block truncate font-mono font-bold tracking-wider" style={{ color: '#1A3828' }}>
                      {voucher.code}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold" style={{ color: '#15803D' }}>
                    {formatCouponDiscount(voucher)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        {!state.voucherData && activeCouponVouchers.length > 0 && (
          <div
            className="mt-3 rounded-xl border p-3 text-sm"
            style={{ background: 'rgba(196,150,90,0.06)', borderColor: 'rgba(196,150,90,0.22)' }}
          >
            <p className="font-semibold" style={{ color: '#1A3828' }}>
              {couponCountLabel(activeCouponVouchers.length)}
            </p>
            <div className="mt-3 space-y-2">
              {activeCouponVouchers.map((coupon) => (
                <button
                  key={coupon.id}
                  type="button"
                  onClick={() => {
                    onVoucherChange(coupon);
                    setCodeInput(coupon.code);
                    setShowInput(false);
                    toast.success(`Kupon ${coupon.code} zastosowany!`);
                  }}
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2 text-left transition-colors hover:bg-[#F8F4EC]"
                  style={{ borderColor: 'rgba(196,150,90,0.2)' }}
                >
                  <span className="min-w-0">
                    <span className="block text-xs" style={{ color: 'rgba(20,40,28,0.5)' }}>Kupon lojalnościowy</span>
                    <span className="block truncate font-mono font-bold tracking-wider" style={{ color: '#1A3828' }}>{coupon.code}</span>
                  </span>
                  <span className="shrink-0 font-semibold" style={{ color: '#15803D' }}>
                    {formatCouponDiscount(coupon)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Loyalty section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold" style={{ color: '#1A3828' }}>Program lojalnościowy</h3>
          <span className="text-sm" style={{ color: 'rgba(20,40,28,0.5)' }}>
            Twoje punkty:{' '}
            <strong style={{ color: '#C4965A' }}>{user?.loyaltyPoints ?? 0}</strong>
          </span>
        </div>

        <div
          className="p-3 rounded-lg text-sm"
          style={{ background: 'rgba(196,150,90,0.08)', border: '1px solid rgba(196,150,90,0.2)' }}
        >
          Po zakończeniu wizyty otrzymasz:{' '}
          <strong style={{ color: '#C4965A' }}>+{earnedPoints} pkt</strong>
        </div>

        {otherRewards.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium" style={{ color: '#1A3828' }}>
              Nagrody specjalne (aktywowane przy rezerwacji):
            </p>
            {otherRewards.map((reward: any) => {
              const isChosen = state.otherRewardId === reward.id;
              return (
                <button
                  key={reward.id}
                  onClick={() => onOtherRewardSelect(isChosen ? null : reward.id)}
                  className="w-full text-left p-3 rounded-lg border transition-all text-sm"
                  style={
                    isChosen
                      ? { border: '1.5px solid #C4965A', background: 'rgba(196,150,90,0.05)', boxShadow: '0 0 0 3px rgba(196,150,90,0.1)' }
                      : { borderColor: 'rgba(0,0,0,0.12)' }
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium" style={{ color: '#1A3828' }}>{reward.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(20,40,28,0.5)' }}>{reward.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold" style={{ color: '#C4965A' }}>{reward.pointsCost} pkt</p>
                      {isChosen && (
                        <p className="text-[10px]" style={{ color: '#C4965A' }}>✓ Wybrano</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export const BookingWizard = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const hasUrlParams = searchParams.has('serviceId') || searchParams.has('date');
  const savedDraftRef = useRef<BookingDraft | null>(hasUrlParams ? null : readBookingDraft());
  const savedDraft = savedDraftRef.current;
  const preselectedServiceId = savedDraft?.service?.id ?? searchParams.get('serviceId');
  const preselectedSeriesId = searchParams.get('seriesId');
  const preselectedEmployeeId = searchParams.get('employeeId');
  const preselectedDate = searchParams.get('date'); // yyyy-MM-dd
  const preselectedTime = searchParams.get('time'); // HH:mm
  const preselectedCode = searchParams.get('code');
  const isFullyPreselected = !!preselectedDate && !!preselectedTime;

  const [step, setStep] = useState(() => savedDraft ? 5 : 1);
  const [floatingVisible, setFloatingVisible] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const media = window.matchMedia('(max-width: 1023px)');
    let isIntersecting = false;
    const updateFloatingVisibility = () => setFloatingVisible(media.matches && !isIntersecting);
    const observer = new IntersectionObserver(
      ([entry]) => {
        isIntersecting = entry.isIntersecting;
        updateFloatingVisibility();
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    media.addEventListener('change', updateFloatingVisibility);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', updateFloatingVisibility);
    };
  }, []);

  const [state, setState] = useState<WizardState>(() => savedDraft ? {
    ...savedDraft,
    date: savedDraft.date ? new Date(savedDraft.date) : null,
    photo: null,
  } : {
    service: null,
    seriesId: preselectedSeriesId,
    employee: null,
    employeeId: null,
    date: null,
    time: null,
    notes: '',
    allergies: '',
    problemDescription: '',
    photo: null,
    couponId: null,
    otherRewardId: null,
    discountCodeId: null,
    voucherId: null,
    voucherData: null,
    appliedHappyHour: null,
  });

  const { data: activeHappyHours = [] } = useQuery<any[]>({
    queryKey: ['happy-hours', 'active'],
    queryFn: happyHoursApi.getActive,
  });

  const { data: allEmployees = [] } = useQuery<any[]>({
    queryKey: ['employees'],
    queryFn: employeesApi.getAll,
    enabled: !!preselectedEmployeeId,
  });

  // When pre-filling from URL, set full employee object once employees are loaded
  useEffect(() => {
    if (!preselectedEmployeeId || allEmployees.length === 0 || !state.service) return;
    const emp = allEmployees.find((e: any) => e.id === preselectedEmployeeId);
    if (emp && !state.employee) {
      setState((prev) => ({ ...prev, employee: emp }));
    }
  }, [allEmployees, state.service?.id]);

  const update = useCallback((field: string, value: any) => {
    setState((prev) => ({ ...prev, [field]: value }));
  }, []);

  const selectService = (service: any) => {
    setState((prev) => ({
      ...prev,
      service,
      seriesId: service?.id === preselectedServiceId ? preselectedSeriesId : null,
      employee: null,
      employeeId: isFullyPreselected ? (preselectedEmployeeId ?? null) : null,
      date: isFullyPreselected && preselectedDate ? new Date(preselectedDate) : null,
      time: isFullyPreselected ? (preselectedTime ?? null) : null,
    }));
  };

  const handleServiceAdvance = useCallback(() => {
    trackEvent('booking_started', { service_name: state.service?.name });
    setStep(isFullyPreselected ? 5 : 2);
  }, [isFullyPreselected, state.service?.name]);

  const selectDate = (date: Date) => {
    setState((prev) => ({ ...prev, date, time: null, appliedHappyHour: null }));
  };

  const { mutateAsync: createAppointment, isPending } = useMutation<any, Error, any>({
    mutationFn: appointmentsApi.create,
  });
  const { mutateAsync: activateReward } = useMutation<any, Error, string>({
    mutationFn: (rewardId: string) => loyaltyApi.redeem(rewardId),
  });
  const { mutateAsync: uploadPhoto } = useMutation<any, Error, { id: string; file: File }>({
    mutationFn: ({ id, file }: { id: string; file: File }) => appointmentsApi.uploadPhoto(id, file),
  });

  const canProceed = () => {
    if (step === 1) return !!state.service;
    if (step === 2) return !!state.employeeId;
    if (step === 3) return !!state.date && !!state.time;
    return true;
  };

  const handleConfirm = async () => {
    if (!state.service || !state.date || !state.time) return;

    if (!isAuthenticated) {
      saveBookingDraft(state);
      toast.message('Zaloguj się lub załóż konto, aby potwierdzić wybrany termin.');
      navigate('/auth/login', { state: { from: '/rezerwacja', bookingConfirmation: true } });
      return;
    }

    const [hours, minutes] = state.time.split(':').map(Number);
    const dateTime = new Date(state.date);
    dateTime.setHours(hours, minutes, 0, 0);

    try {
      let finalCouponId = state.couponId;
      if (state.otherRewardId) {
        const coupon = await activateReward(state.otherRewardId);
        finalCouponId = coupon.id;
      }

      const svcPrice = state.service ? (state.service.promoPrice ?? Number(state.service.price)) : 0;
      const priceBeforeVoucher = state.appliedHappyHour
        ? calcDiscountedPrice(svcPrice, state.appliedHappyHour)
        : svcPrice;
      const voucherUsedAmount = state.voucherData?.type === 'VOUCHER_CASH'
        ? Math.min(priceBeforeVoucher, state.voucherData.discountValue)
        : undefined;

      const appointment = await createAppointment({
        serviceId: state.service.id,
        treatmentSeriesId: state.seriesId || undefined,
        employeeId: state.employeeId,
        date: dateTime.toISOString(),
        notes: state.notes || undefined,
        allergies: state.allergies || undefined,
        problemDescription: state.problemDescription || undefined,
        couponId: finalCouponId || undefined,
        discountCodeId: state.discountCodeId || undefined,
        voucherId: state.voucherId || undefined,
        voucherUsedAmount,
        happyHourId: state.appliedHappyHour?.id ?? undefined,
      });

      if (state.photo) {
        await uploadPhoto({ id: appointment.id, file: state.photo }).catch(() =>
          toast.warning('Wizyta zapisana, ale zdjęcie nie zostało wgrane')
        );
      }

      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['loyalty', 'coupons'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['discount-codes', 'welcome'] });
      queryClient.invalidateQueries({ queryKey: ['reminders', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      toast.success('Wizyta została zarezerwowana!');
      sessionStorage.removeItem(BOOKING_DRAFT_KEY);
      trackEvent('booking_completed', {
        service_name: state.service?.name,
        value: Number(state.service?.price) || undefined,
        currency: 'PLN',
      });
      navigate('/user/wizyty', { state: { pwaPromptReason: 'booking-success' } });
    } catch {
      toast.error('Nie udało się zarezerwować wizyty. Spróbuj ponownie.');
    }
  };

  return (
    <>
    <PageSEO
      title="Umów wizytę online | BeskidStudio"
      description="Wybierz usługę, specjalistkę i dogodny termin wizyty w BeskidStudio."
      canonical="/rezerwacja"
      noIndex
    />
    <div className="mx-auto max-w-4xl space-y-8 px-4 animate-enter sm:px-6 lg:px-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 data-tour="booking-wizard" className="w-fit text-3xl font-heading font-bold" style={{ color: '#1A3828' }}>
            Umów wizytę
          </h1>
          <p className="mt-1" style={{ color: 'rgba(20,40,28,0.5)' }}>Wypełnij formularz krok po kroku</p>
        </div>
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((current) => current - 1)}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border border-espresso px-3 py-2 text-xs font-semibold text-espresso transition-colors hover:bg-espresso hover:text-ivory sm:px-4"
            aria-label={`Wróć do kroku ${step - 1}: ${STEPS[step - 2]}`}
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">Cofnij krok</span>
            <span className="sm:hidden">Wróć</span>
          </button>
        )}
      </div>

      {/* Czytelny postęp rezerwacji */}
      <div className="space-y-3">
      <ol className="grid grid-cols-5 gap-1" aria-label={`Krok ${step} z ${STEPS.length}: ${STEPS[step - 1]}`}>
        {STEPS.map((label, idx) => {
          const currentStep = idx + 1;
          const isCurrent = currentStep === step;
          const isComplete = currentStep < step;
          return (
            <li key={label} className="relative flex min-w-0 flex-col items-center gap-2 text-center">
              {idx > 0 && (
                <span
                  aria-hidden
                  className="absolute right-1/2 top-4 h-px w-full"
                  style={{ background: isComplete || isCurrent ? 'rgba(196,150,90,0.65)' : 'rgba(26,56,40,0.14)' }}
                />
              )}
              <span
                className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold"
                style={isCurrent
                  ? { background: '#1A3828', borderColor: '#1A3828', color: '#fff' }
                  : isComplete
                  ? { background: '#C4965A', borderColor: '#C4965A', color: '#fff' }
                  : { background: '#F4F9F5', borderColor: 'rgba(26,56,40,0.18)', color: 'rgba(20,40,28,0.55)' }}
              >
                {isComplete ? <CheckCircle2 size={16} /> : currentStep}
              </span>
              <span
                className="w-full break-words px-0.5 text-[8px] leading-tight font-medium sm:text-[9px]"
                style={{ color: isCurrent ? '#1A3828' : 'rgba(20,40,28,0.45)' }}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
      </div>

      {state.service && step > 1 && (
        <div className="flex flex-col gap-1 rounded-2xl border bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'rgba(26,56,40,0.12)' }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: 'rgba(20,40,28,0.48)' }}>Wybrana usługa</p>
            <p className="mt-1 font-semibold" style={{ color: '#1A3828' }}>{formatContentLabel(state.service.name)}</p>
          </div>
          {state.service.promoPrice != null ? (
            <div className="text-right">
              <p className="font-heading text-lg font-bold">
                <span className="text-sm line-through opacity-50 mr-2">{Number(state.service.price).toFixed(2)} zł</span>
                <span style={{ color: '#dc2626' }}>{state.service.promoPrice.toFixed(2)} zł</span>
              </p>
              {state.service.promoUsesRemaining != null && (
                <p className="mt-1">
                  <span
                    className="text-[9px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full text-white inline-block"
                    style={{ background: state.service.promoUsesRemaining <= 3 ? '#dc2626' : '#1A3828' }}
                  >
                    Tylko dla {state.service.promoUsesRemaining} osób
                  </span>
                </p>
              )}
              {promoCountdown(state.service.promoEndDate) && (
                <p className="text-[10px] font-medium mt-0.5" style={{ color: '#C4965A' }}>
                  {promoCountdown(state.service.promoEndDate)}
                </p>
              )}
            </div>
          ) : (
            <p className="font-heading text-lg font-bold" style={{ color: '#A87538' }}>{Number(state.service.price).toFixed(2)} zł</p>
          )}
        </div>
      )}

      {/* Step content */}
      <div className="min-h-[240px]">
        {step === 1 && (
          <StepService
            selected={state.service}
            onSelect={selectService}
            onAdvanceStep={handleServiceAdvance}
            preselectedServiceId={preselectedServiceId}
          />
        )}
        {step === 2 && (
          <StepEmployee
            selected={state.employeeId}
            onSelect={(emp) => setState((prev) => ({ ...prev, employee: emp, employeeId: emp?.id ?? null }))}
            service={state.service}
          />
        )}
        {step === 3 && (
          <StepDate
            selectedDate={state.date}
            selectedTime={state.time}
            onSelectDate={selectDate}
            onSelectTime={(t) => update('time', t)}
            onSelectHappyHour={(hh) => update('appliedHappyHour', hh)}
            service={state.service}
            employeeId={state.employeeId}
            activeHappyHours={activeHappyHours}
          />
        )}
        {step === 4 && (
          <StepNotes
            notes={state.notes}
            allergies={state.allergies}
            problemDescription={state.problemDescription}
            photo={state.photo}
            onChange={update}
          />
        )}
        {step === 5 && (
          <StepConfirm
            state={state}
            onCouponSelect={(id) => update('couponId', id)}
            onOtherRewardSelect={(id) => update('otherRewardId', id)}
            onVoucherChange={(voucher) => setState(prev => ({
              ...prev,
              couponId: voucher?.type === 'COUPON' ? voucher.id : null,
              discountCodeId: voucher?.type === 'DISCOUNT_CODE' || voucher?.type === 'VOUCHER_SERVICE' ? voucher.id : null,
              voucherId: voucher?.type === 'VOUCHER_CASH' ? voucher.id : null,
              voucherData: voucher,
            }))}
            user={user}
            isAuthenticated={isAuthenticated}
            preselectedCode={preselectedCode}
          />
        )}
      </div>

      {/* Navigation buttons */}
      <div
        ref={navRef}
        className="flex items-center justify-between gap-3 pt-6"
        style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }}
      >
        <button
          onClick={() => (step === 1 ? navigate(isAuthenticated ? '/user/wizyty' : '/') : setStep((s) => s - 1))}
          className="min-h-12 rounded-full px-6 py-3 border border-espresso text-espresso text-xs font-semibold hover:bg-espresso hover:text-ivory transition-colors"
        >
          {step === 1 ? 'Anuluj' : 'Wróć'}
        </button>

        {step < STEPS.length ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canProceed()}
            aria-hidden={floatingVisible && canProceed() ? true : undefined}
            tabIndex={floatingVisible && canProceed() ? -1 : undefined}
            className="min-h-12 rounded-full px-8 py-3 bg-espresso text-ivory text-xs font-semibold hover:bg-espresso/90 transition-colors disabled:opacity-40 sm:w-auto"
          >
            Dalej
          </button>
        ) : (
          <button
            onClick={handleConfirm}
            disabled={isPending || !canProceed()}
            aria-hidden={floatingVisible && canProceed() ? true : undefined}
            tabIndex={floatingVisible && canProceed() ? -1 : undefined}
            className="min-h-12 rounded-full px-8 py-3 bg-espresso text-ivory text-xs font-semibold hover:bg-espresso/90 transition-colors disabled:opacity-40 sm:w-auto"
          >
            {isPending ? 'Rezerwowanie...' : isAuthenticated ? 'Potwierdź rezerwację' : 'Zaloguj się i potwierdź'}
          </button>
        )}
      </div>

      {/* Floating "Dalej" button — mobile only, hides when static nav is visible */}
      {floatingVisible && canProceed() && (
      <div className="fixed bottom-20 inset-x-0 z-50 flex justify-center pointer-events-none lg:hidden">
        <div className="pointer-events-auto flex items-center gap-2">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((current) => current - 1)}
              className="inline-flex min-h-12 items-center gap-1 rounded-full border border-espresso bg-white px-5 py-3.5 text-xs font-semibold text-espresso shadow-lg"
            >
              <ChevronLeft size={16} /> Wróć
            </button>
          )}
          {step < STEPS.length ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="min-h-12 rounded-full px-10 py-3.5 bg-espresso text-ivory text-xs font-semibold shadow-lg"
            >
              Dalej →
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={isPending}
              className="min-h-12 rounded-full px-10 py-3.5 bg-espresso text-ivory text-xs font-semibold shadow-lg disabled:opacity-40"
            >
              {isPending ? 'Rezerwowanie...' : isAuthenticated ? 'Potwierdź →' : 'Zaloguj się →'}
            </button>
          )}
        </div>
      </div>
      )}
    </div>
    </>
  );
};
