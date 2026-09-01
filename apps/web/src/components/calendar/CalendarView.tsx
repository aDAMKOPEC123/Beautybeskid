// apps/web/src/components/calendar/CalendarView.tsx
import { useRef, useState, useCallback, useMemo, useEffect, useLayoutEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import { useIsMobile } from '@/hooks/useIsMobile';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { EventClickArg, DateSelectArg, EventInput } from '@fullcalendar/core';
// Locale trzeba podać obiektem, nie stringiem. FullCalendar szuka kodu w mapie
// zbudowanej z zaimportowanych bundli (queryRawLocale w @fullcalendar/core);
// dla niezarejestrowanego kodu cicho spada na angielski, a ten ma firstDay = 0,
// czyli tydzień od niedzieli — co rozjeżdżało siatkę z paskiem okresu liczącym
// tygodnie od poniedziałku.
import plLocale from '@fullcalendar/core/locales/pl';
import { DateClickArg } from '@fullcalendar/interaction';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { employeesApi, type WeeklyScheduleEntry, type WorkDay } from '@/api/employees.api';
import calendarBlocksApi, { type CalendarBlock } from '@/api/calendar-blocks.api';
import { Calendar, UserPlus, Zap, Lock, Trash2, Settings, Clock, MoreHorizontal } from 'lucide-react';
import { AppointmentCard } from './AppointmentCard';
import { MobileSheet } from './MobileSheet';
import { ClientDrawer } from './ClientDrawer';
import { HappyHourOverlay } from './HappyHourOverlay';
import { AddAppointmentModal } from './AddAppointmentModal';
import { ExternalClientModal } from './ExternalClientModal';
import { HappyHourPanel } from './HappyHourPanel';
import { BlockHoursModal } from './BlockHoursModal';
import { WorkHoursModal } from './WorkHoursModal';
import { AppleCalendarOverlay } from './AppleCalendarOverlay';
import { AppleCalendarSettingsModal } from './AppleCalendarSettingsModal';
import { DAY_WINDOW_START, DAY_WINDOW_END, buildWorkingHourLayer } from './calendarLayers';
import { CalendarLegend } from './CalendarLegend';
import { CalendarPeriodNav } from './CalendarPeriodNav';
import './calendar.css';

// Deterministic color per employee index
const EMPLOYEE_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316'];
function employeeColor(idx: number) { return EMPLOYEE_COLORS[idx % EMPLOYEE_COLORS.length]; }

// Blokady godzin. W widoku zasobów każdy event musi mieć resourceId, więc blokadę
// „cały salon" powielamy na wszystkie kolumny; w widoku tygodnia wystarczy jeden event.
function buildBlockEvents(
  blocks: CalendarBlock[],
  employees: any[],
  isResourceView: boolean,
  zoomedEmployeeId: string | null,
): EventInput[] {
  return blocks.flatMap((b) => {
    const base = {
      start: b.startsAt,
      end: b.endsAt,
      display: 'auto' as const,
      backgroundColor: '#374151',
      borderColor: '#1f2937',
      classNames: ['cosmo-calendar-block'],
      extendedProps: { calendarBlockId: b.id, block: b },
    };
    if (!isResourceView) {
      // Widok pojedynczego (zoomowanego) pracownika — pomiń blokady, które nie dotyczą
      // ani całego salonu, ani akurat tego pracownika (analogicznie do appointmentEvents
      // wyżej w pliku).
      if (
        zoomedEmployeeId &&
        !b.appliesToAll &&
        !b.employees.some((e) => e.id === zoomedEmployeeId)
      ) {
        return [];
      }
      return [{ ...base, id: `blk-${b.id}` }];
    }

    const targetIds = b.appliesToAll
      ? employees.map((e: any) => e.id)
      : b.employees.map((e) => e.id);
    return targetIds.map((empId: string) => ({
      ...base,
      id: `blk-${b.id}-${empId}`,
      resourceId: empId,
    }));
  });
}

type CalView = 'resourceTimeGridDay' | 'timeGridWeek' | 'timeGridDay' | 'listWeek';

// Minimalne wysokości „awaryjne" — używane tylko wtedy, gdy nad i pod punktem
// kliknięcia nie ma nawet tyle miejsca; dalsze pozycje są wtedy dostępne przez
// własne przewijanie kontenera. Chronią przed maxHeight bliskim zeru.
const MIN_SLOT_MENU_HEIGHT = 180; // ok. 4 pozycje + nagłówek z datą
const MIN_BLOCK_POPOVER_HEIGHT = 140; // treść blokady + przycisk usuwania

// Pozycjonuje menu/popover jak systemowe menu kontekstowe: domyślnie pod punktem
// kliknięcia, a gdy pod nim nie ma miejsca na zmierzoną wysokość — odbija w górę,
// tak żeby dolna krawędź elementu znalazła się nad punktem kliknięcia (z marginesem
// od krawędzi okna). maxHeight nigdy nie spada poniżej minHeight.
function computeVerticalFlip(
  anchorY: number,
  naturalHeight: number,
  gapY: number,
  minHeight: number,
): { top: number; maxHeight: number } {
  const MARGIN = 16;
  const spaceBelow = window.innerHeight - anchorY - gapY - MARGIN;
  const spaceAbove = anchorY - gapY - MARGIN;
  if (naturalHeight <= spaceBelow || spaceBelow >= spaceAbove) {
    return { top: anchorY + gapY, maxHeight: Math.max(minHeight, spaceBelow) };
  }
  const maxHeight = Math.max(minHeight, spaceAbove);
  const height = Math.min(naturalHeight, maxHeight);
  return { top: Math.max(MARGIN, anchorY - gapY - height), maxHeight };
}

interface Props {
  appointments: any[];
  services: any[];
  onRefetch: () => void;
}

export function CalendarView({ appointments, services, onRefetch }: Props) {
  const calRef = useRef<FullCalendar>(null);
  const isMobile = useIsMobile();
  // Na telefonie kolumny pracownic są nietrafialne palcem — startujemy od listy.
  const [view, setView] = useState<CalView>(isMobile ? 'listWeek' : 'resourceTimeGridDay');
  const [zoomedEmployeeId, setZoomedEmployeeId] = useState<string | null>(null);
  const [selectedAppt, setSelectedAppt] = useState<any>(null);
  const [addModal, setAddModal] = useState<{ date?: string; time?: string; employeeId?: string } | null>(null);
  const [externalModal, setExternalModal] = useState<{ date?: string; time?: string; employeeId?: string } | null>(null);
  const [hhPanelOpen, setHhPanelOpen] = useState(false);
  const [hhPrefill, setHhPrefill] = useState<{ date: Date; hour: number; minute: number } | null>(null);
  const [slotMenu, setSlotMenu] = useState<{ date: string; time?: string; employeeId?: string; x: number; y: number } | null>(null);
  const [blockModal, setBlockModal] = useState<{ date: string; time?: string; endTime?: string; employeeId?: string; reason?: string } | null>(null);
  const [workHoursModal, setWorkHoursModal] = useState<{ mode: 'add' | 'remove'; date: string; time?: string; employeeId?: string } | null>(null);
  const [blockPopover, setBlockPopover] = useState<{ block: CalendarBlock; x: number; y: number } | null>(null);
  // Pozycja menu godziny / popovera blokady na komputerze liczona z rzeczywistej,
  // zmierzonej wysokości elementu (patrz computeVerticalFlip) — dzięki temu odbicie
  // w górę działa niezależnie od liczby pozycji menu (np. warunkowe „Usuń godziny pracy").
  const slotMenuRef = useRef<HTMLDivElement>(null);
  const [slotMenuLayout, setSlotMenuLayout] = useState<{ top: number; maxHeight: number } | null>(null);
  const blockPopoverRef = useRef<HTMLDivElement>(null);
  const [blockPopoverLayout, setBlockPopoverLayout] = useState<{ top: number; maxHeight: number } | null>(null);
  const [rangeStart, setRangeStart] = useState(new Date());
  const [rangeEnd, setRangeEnd] = useState(new Date());
  const [showHappyHours, setShowHappyHours] = useState(true);
  const [showApple, setShowApple] = useState(true);
  const [showWorkingHours, setShowWorkingHours] = useState(true);
  const [appleSettingsOpen, setAppleSettingsOpen] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);

  useEffect(() => {
    if (!selectedAppt) {
      const timer = setTimeout(() => calRef.current?.getApi().updateSize(), 300);
      return () => clearTimeout(timer);
    }
  }, [selectedAppt]);

  // Mierzy realną wysokość menu godziny (renderowanego bez ograniczenia maxHeight,
  // niewidocznie do czasu pomiaru) i wylicza finalną pozycję przed pierwszym
  // malowaniem klatki — bez tego nie byłoby widać przeskoku, ale i tak liczymy
  // to synchronicznie (useLayoutEffect), żeby mieć pewność.
  useLayoutEffect(() => {
    if (!slotMenu || isMobile) { setSlotMenuLayout(null); return; }
    const el = slotMenuRef.current;
    if (!el) return;
    setSlotMenuLayout(computeVerticalFlip(slotMenu.y, el.scrollHeight, 8, MIN_SLOT_MENU_HEIGHT));
  }, [slotMenu, isMobile]);

  useLayoutEffect(() => {
    if (!blockPopover || isMobile) { setBlockPopoverLayout(null); return; }
    const el = blockPopoverRef.current;
    if (!el) return;
    setBlockPopoverLayout(computeVerticalFlip(blockPopover.y, el.scrollHeight, 6, MIN_BLOCK_POPOVER_HEIGHT));
  }, [blockPopover, isMobile]);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.getAll(),
    staleTime: 10 * 60 * 1000,
  });

  // Fetch weekly schedules for all employees
  const weeklyResults = useQueries({
    queries: employees.map((emp: any) => ({
      queryKey: ['employee-weekly-schedule', emp.id],
      queryFn: () => employeesApi.getWeeklySchedule(emp.id),
      staleTime: 10 * 60 * 1000,
    })),
  });

  // Fetch work day overrides for each employee for the visible month(s)
  const rangeStartMonth = format(rangeStart, 'yyyy-MM');
  const rangeEndMonth = format(rangeEnd, 'yyyy-MM');
  const months = rangeStartMonth === rangeEndMonth
    ? [rangeStartMonth]
    : [rangeStartMonth, rangeEndMonth];

  const workDayResults = useQueries({
    queries: employees.flatMap((emp: any) =>
      months.map((month) => ({
        queryKey: ['employee-schedule', emp.id, month],
        queryFn: () => employeesApi.getSchedule(emp.id, month),
        staleTime: 5 * 60 * 1000,
      }))
    ),
  });

  // Build Maps for quick lookup
  const weeklySchedules = useMemo(() => {
    const map = new Map<string, WeeklyScheduleEntry[]>();
    employees.forEach((emp: any, i: number) => {
      map.set(emp.id, (weeklyResults[i]?.data as WeeklyScheduleEntry[]) ?? []);
    });
    return map;
  }, [employees, weeklyResults]);

  const workDayOverrides = useMemo(() => {
    const map = new Map<string, WorkDay[]>();
    employees.forEach((emp: any, empIdx: number) => {
      const days: WorkDay[] = [];
      months.forEach((_, monthIdx) => {
        const result = workDayResults[empIdx * months.length + monthIdx];
        days.push(...((result?.data as WorkDay[]) ?? []));
      });
      map.set(emp.id, days);
    });
    return map;
  }, [employees, workDayResults, rangeStartMonth, rangeEndMonth]);

  const isResourceView = view === 'resourceTimeGridDay' && !zoomedEmployeeId;

  // Surowa warstwa liczona bezwarunkowo — `slotHasWorkingHours` (menu slotu) musi
  // znać realny grafik niezależnie od tego, czy admin akurat ukrył warstwę wizualną
  // w legendzie. Przełącznik `showWorkingHours` gaci wyłącznie to, co trafia do
  // propa `events` FullCalendara (patrz `visibleWorkingHourEvents` niżej).
  const workingHourEvents = useMemo(
    () => buildWorkingHourLayer(
      employees, weeklySchedules, workDayOverrides,
      rangeStart, rangeEnd, zoomedEmployeeId, isResourceView,
      (empId) => employeeColor(employees.findIndex((e: any) => e.id === empId)),
    ),
    [employees, weeklySchedules, workDayOverrides, rangeStart, rangeEnd, zoomedEmployeeId, isResourceView],
  );

  // To, co faktycznie trafia na siatkę — tu, i tylko tu, obowiązuje przełącznik z legendy.
  const visibleWorkingHourEvents = useMemo(
    () => (showWorkingHours ? workingHourEvents : []),
    [workingHourEvents, showWorkingHours],
  );

  const { data: calendarBlocks = [] } = useQuery({
    queryKey: ['calendar-blocks', rangeStart.toISOString(), rangeEnd.toISOString()],
    queryFn: () => calendarBlocksApi.list(rangeStart.toISOString(), rangeEnd.toISOString()),
    staleTime: 60 * 1000,
  });

  const blockEvents = useMemo(
    () => buildBlockEvents(calendarBlocks, employees, isResourceView, zoomedEmployeeId),
    [calendarBlocks, employees, isResourceView, zoomedEmployeeId],
  );

  // Compute resources (columns) for day view
  const resources = employees.map((emp: any, idx: number) => ({
    id: emp.id,
    title: emp.name,
    color: employeeColor(idx),
  }));

  // Convert appointments to FullCalendar EventInput[]
  const appointmentEvents: EventInput[] = appointments.flatMap((appt: any) => {
    // Filter by zoomed employee when in single-employee day view
    if (zoomedEmployeeId && appt.employeeId !== zoomedEmployeeId) return [];

    const empIdx = employees.findIndex((e: any) => e.id === appt.employeeId);
    const color = empIdx >= 0 ? employeeColor(empIdx) : '#6366f1';

    const durationMs = (appt.service?.durationMinutes ?? 60) * 60 * 1000;
    const start = new Date(appt.date);
    const end = new Date(start.getTime() + durationMs);

    return [{
      id: appt.id,
      resourceId: appt.employeeId ?? undefined,
      start: start.toISOString(),
      end: end.toISOString(),
      backgroundColor: color,
      borderColor: color,
      extendedProps: {
        clientName: appt.user?.name ?? appt.clientName ?? '—',
        serviceName: appt.service?.name ?? '—',
        price: appt.service?.price ?? 0,
        status: appt.status,
        employeeInitials: appt.employee?.name?.substring(0, 1).toUpperCase() ?? '?',
        employeeColor: color,
        hasAllergies: false,
        hasNotes: !!appt.notes || !!appt.staffNote,
        phone: appt.user?.phone ?? appt.clientPhone ?? undefined,
        _raw: appt,
      },
    }];
  });

  const handleEventClick = useCallback((arg: EventClickArg) => {
    setSelectedAppt(arg.event.extendedProps._raw);
  }, []);

  const handleDateClick = useCallback((info: DateClickArg) => {
    if (hhPanelOpen) {
      setHhPrefill({ date: info.date, hour: info.date.getHours(), minute: info.date.getMinutes() });
      return;
    }
    // Single click — show slot action menu
    const date = info.dateStr.includes('T') ? info.dateStr.split('T')[0] : info.dateStr;
    const h = String(info.date.getHours()).padStart(2, '0');
    const m = String(info.date.getMinutes()).padStart(2, '0');
    // Siatka mobilna (timeGridDay bez kolumn zasobów) nie podaje resource — bierzemy
    // wtedy zoomowaną pracownicę, żeby blokady/godziny pracy nie leciały na cały salon.
    const resourceId = (info as any).resource?.id ?? zoomedEmployeeId ?? undefined;
    const x = info.jsEvent?.clientX ?? window.innerWidth / 2;
    const y = info.jsEvent?.clientY ?? window.innerHeight / 2;
    setSlotMenu({ date, time: `${h}:${m}`, employeeId: resourceId, x, y });
  }, [hhPanelOpen, zoomedEmployeeId]);

  const handleDateSelect = useCallback((arg: DateSelectArg) => {
    if (hhPanelOpen) return;
    const date = arg.startStr.split('T')[0];
    const time = arg.startStr.split('T')[1]?.substring(0, 5);
    // Jak wyżej: brak resource w widoku mobilnym → domyślnie zoomowana pracownica.
    const resourceId = (arg as any).resource?.id ?? zoomedEmployeeId ?? undefined;
    const x = (arg as any).jsEvent?.clientX ?? window.innerWidth / 2;
    const y = (arg as any).jsEvent?.clientY ?? window.innerHeight / 2;
    setSlotMenu({ date, time, employeeId: resourceId, x, y });
  }, [hhPanelOpen, zoomedEmployeeId]);

  // Strzałki przesuwają o tydzień także w widoku dnia — prev()/next() skakałyby
  // tam o dobę, a pasek okresu jest zbudowany wokół tygodnia jako jednostki.
  const stepWeek = (weeks: number) => calRef.current?.getApi().incrementDate({ weeks });
  const goToDate = (date: Date) => calRef.current?.getApi().gotoDate(date);

  const switchView = (v: CalView) => {
    setView(v);
    setZoomedEmployeeId(null);
    calRef.current?.getApi().changeView(v);
  };

  // Na telefonie siatka zawsze pokazuje jedną pracownicę — kolumny są za wąskie na dotyk.
  const switchToMobileGrid = () => {
    const targetId = zoomedEmployeeId ?? employees[0]?.id ?? null;
    setZoomedEmployeeId(targetId);
    setView('timeGridDay');
    calRef.current?.getApi().changeView('timeGridDay');
  };

  const zoomToEmployee = (empId: string) => {
    setZoomedEmployeeId(empId);
    setView('timeGridDay');
    calRef.current?.getApi().changeView('timeGridDay');
  };

  const qc = useQueryClient();
  const [removeBlockError, setRemoveBlockError] = useState<string | null>(null);
  const { mutate: removeBlock, isPending: isRemovingBlock } = useMutation({
    mutationFn: (id: string) => calendarBlocksApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar-blocks'] });
      setBlockPopover(null);
      setRemoveBlockError(null);
    },
    onError: (err: any) => {
      setRemoveBlockError(err?.response?.data?.message ?? 'Nie udało się usunąć blokady');
    },
  });

  // Czy kliknięty slot leży w godzinach pracy? Sprawdzamy na surowej, bezwarunkowej
  // warstwie `workingHourEvents` (nie na `visibleWorkingHourEvents`!) — ta odpowiedź
  // steruje widocznością akcji „Usuń godziny pracy" w menu slotu i musi odzwierciedlać
  // realny grafik niezależnie od tego, czy admin akurat schował warstwę wizualną
  // przełącznikiem w legendzie. `workingHourEvents` zawiera obie warstwy (praca +
  // przygaszenie poza pracą), które razem pokrywają całe okno doby — bez filtra po
  // `isWorkingHours` każdy klik trafiłby w jakiś event (praca albo jej brak) i przycisk
  // pokazywałby się zawsze, niezależnie od tego, czy slot faktycznie ma godziny do usunięcia.
  const slotHasWorkingHours = (date: string, time?: string, employeeId?: string): boolean => {
    if (!time) return false;
    const clicked = new Date(`${date}T${time}:00`).getTime();
    return workingHourEvents.some((ev) => {
      if (!ev.extendedProps?.isWorkingHours) return false;
      if (employeeId && ev.resourceId !== employeeId) return false;
      const start = new Date(ev.start as string).getTime();
      const end = new Date(ev.end as string).getTime();
      return clicked >= start && clicked < end;
    });
  };

  const slotMenuItems = slotMenu && (
    <>
      <button
        className="flex min-h-11 md:min-h-9 items-center gap-2.5 w-full text-sm px-2 rounded-lg hover:bg-accent text-left"
        onClick={() => { setAddModal({ date: slotMenu.date, time: slotMenu.time, employeeId: slotMenu.employeeId }); setSlotMenu(null); }}
      >
        <Calendar size={15} className="text-primary" />
        Dodaj wizytę
      </button>
      <button
        className="flex min-h-11 md:min-h-9 items-center gap-2.5 w-full text-sm px-2 rounded-lg hover:bg-accent text-left"
        onClick={() => { setExternalModal({ date: slotMenu.date, time: slotMenu.time, employeeId: slotMenu.employeeId }); setSlotMenu(null); }}
      >
        <UserPlus size={15} className="text-violet-500" />
        Klientka z zewnątrz
      </button>
      <button
        className="flex min-h-11 md:min-h-9 items-center gap-2.5 w-full text-sm px-2 rounded-lg hover:bg-accent text-left"
        onClick={() => {
          const d = slotMenu.time
            ? new Date(`${slotMenu.date}T${slotMenu.time}`)
            : new Date(slotMenu.date);
          setHhPanelOpen(true);
          setHhPrefill({ date: d, hour: d.getHours(), minute: d.getMinutes() });
          setSlotMenu(null);
        }}
      >
        <Zap size={15} className="text-amber-500" />
        Happy Hours
      </button>
      <button
        className="flex min-h-11 md:min-h-9 items-center gap-2.5 w-full text-sm px-2 rounded-lg hover:bg-accent text-left"
        onClick={() => {
          setBlockModal({ date: slotMenu.date, time: slotMenu.time, employeeId: slotMenu.employeeId });
          setSlotMenu(null);
        }}
      >
        <Lock size={15} className="text-gray-600" />
        Zablokuj godziny
      </button>
      <button
        className="flex min-h-11 md:min-h-9 items-center gap-2.5 w-full text-sm px-2 rounded-lg hover:bg-accent text-left"
        onClick={() => {
          setWorkHoursModal({ mode: 'add', date: slotMenu.date, time: slotMenu.time, employeeId: slotMenu.employeeId });
          setSlotMenu(null);
        }}
      >
        <Clock size={15} className="text-green-600" />
        Dodaj godziny pracy
      </button>
      {slotHasWorkingHours(slotMenu.date, slotMenu.time, slotMenu.employeeId) && (
        <button
          className="flex min-h-11 md:min-h-9 items-center gap-2.5 w-full text-sm px-2 rounded-lg hover:bg-accent text-left"
          onClick={() => {
            setWorkHoursModal({ mode: 'remove', date: slotMenu.date, time: slotMenu.time, employeeId: slotMenu.employeeId });
            setSlotMenu(null);
          }}
        >
          <Clock size={15} className="text-red-500" />
          Usuń godziny pracy
        </button>
      )}
    </>
  );

  const blockPopoverContent = blockPopover && (
    <>
      <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
        <Lock size={14} /> Zablokowane
      </p>
      <p className="text-xs text-muted-foreground">
        {new Date(blockPopover.block.startsAt).toLocaleString('pl-PL', {
          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
        })}
        {' – '}
        {new Date(blockPopover.block.endsAt).toLocaleTimeString('pl-PL', {
          hour: '2-digit', minute: '2-digit',
        })}
      </p>
      <p className="mt-1 text-xs">
        {blockPopover.block.appliesToAll
          ? 'Cały salon'
          : blockPopover.block.employees.map((e) => e.name).join(', ')}
      </p>
      {blockPopover.block.reason && (
        <p className="mt-1 text-xs italic text-muted-foreground">{blockPopover.block.reason}</p>
      )}
      {removeBlockError && (
        <p className="mt-1 text-xs font-medium text-red-600">{removeBlockError}</p>
      )}
      <button
        className="mt-3 flex min-h-11 md:min-h-9 w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
        disabled={isRemovingBlock}
        onClick={() => { setRemoveBlockError(null); removeBlock(blockPopover.block.id); }}
      >
        <Trash2 size={13} />
        {isRemovingBlock ? 'Usuwanie…' : 'Usuń blokadę'}
      </button>
    </>
  );

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* Main calendar area */}
      <div className={`cosmo-calendar-scope flex flex-col flex-1 min-h-0 min-w-0 transition-all duration-300 ${
        selectedAppt && hhPanelOpen ? 'md:mr-[640px]' :
        selectedAppt ? 'md:mr-80' :
        hhPanelOpen ? 'md:mr-80' : ''
      }`}>
        {/* Pasek mobilny — cztery cele dotykowe, reszta akcji w arkuszu */}
        <div className="flex items-center gap-1.5 border-b bg-white p-2 md:hidden">
          <div className="flex gap-1.5">
            <button
              onClick={() => { setZoomedEmployeeId(null); switchView('listWeek'); }}
              className={`min-h-11 rounded-lg px-3 text-sm font-medium ${view === 'listWeek' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
            >
              Lista
            </button>
            <button
              onClick={switchToMobileGrid}
              className={`min-h-11 rounded-lg px-3 text-sm font-medium ${view !== 'listWeek' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
            >
              Siatka
            </button>
            <button
              onClick={() => setMobileActionsOpen(true)}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"
              aria-label="Więcej akcji"
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="hidden md:flex items-center gap-2 p-3 border-b bg-white flex-wrap">
          {/* Widoki */}
          <div className="flex items-center gap-1">
            {zoomedEmployeeId && (
              <button
                onClick={() => { setZoomedEmployeeId(null); switchView('resourceTimeGridDay'); }}
                className="rounded-lg bg-secondary px-3 py-1.5 text-sm text-secondary-foreground hover:bg-accent"
              >
                ← Wszyscy
              </button>
            )}
            <button
              onClick={() => switchView('resourceTimeGridDay')}
              className={`rounded-lg px-3 py-1.5 text-sm ${view === 'resourceTimeGridDay' && !zoomedEmployeeId ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-accent'}`}
            >
              Dzień
            </button>
            <button
              onClick={() => switchView('timeGridWeek')}
              className={`rounded-lg px-3 py-1.5 text-sm ${view === 'timeGridWeek' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-accent'}`}
            >
              Tydzień
            </button>
            <button
              onClick={() => switchView('listWeek')}
              className={`rounded-lg px-3 py-1.5 text-sm ${view === 'listWeek' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-accent'}`}
            >
              Lista
            </button>
          </div>

          <span className="h-6 w-px bg-border" aria-hidden />

          {/* Akcje */}
          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => setAddModal({})}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              + Wizyta
            </button>
            <button
              onClick={() => setExternalModal({})}
              className="rounded-lg border border-primary/40 bg-white px-3 py-1.5 text-sm font-medium text-primary hover:bg-secondary"
            >
              + Klientka z zewnątrz
            </button>
            <button
              onClick={() => {
                setHhPanelOpen((v) => !v);
                if (hhPanelOpen) setHhPrefill(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${hhPanelOpen ? 'bg-amber-600 text-white ring-2 ring-amber-300' : 'border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'}`}
            >
              ⭐ Happy Hour
            </button>
            <button
              onClick={() => setShowHappyHours(v => !v)}
              className={`rounded-lg px-3 py-1.5 text-sm ${showHappyHours ? 'bg-secondary text-secondary-foreground' : 'bg-white text-muted-foreground opacity-60'} hover:bg-accent`}
            >
              {showHappyHours ? 'Ukryj HH' : 'Pokaż HH'}
            </button>
            <button
              onClick={() => setShowApple((v) => !v)}
              className={`rounded-lg px-3 py-1.5 text-sm ${showApple ? 'bg-secondary text-secondary-foreground' : 'bg-white text-muted-foreground opacity-60'} hover:bg-accent`}
            >
              {showApple ? 'Ukryj Apple' : 'Pokaż Apple'}
            </button>
            <button
              onClick={() => setAppleSettingsOpen(true)}
              className="rounded-lg bg-secondary px-3 py-1.5 text-sm text-secondary-foreground hover:bg-accent"
              title="Ustawienia kalendarza Apple"
            >
              <Settings size={15} />
            </button>
          </div>
        </div>

        {isMobile && zoomedEmployeeId && employees.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto border-b bg-white px-3 py-2">
            {employees.map((emp: any) => (
              <button
                key={emp.id}
                onClick={() => {
                  setZoomedEmployeeId(emp.id);
                  calRef.current?.getApi().changeView('timeGridDay');
                }}
                className={`min-h-11 shrink-0 rounded-lg px-3 text-sm font-medium ${
                  emp.id === zoomedEmployeeId ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                }`}
              >
                {emp.name}
              </button>
            ))}
          </div>
        )}

        <CalendarPeriodNav
          anchor={rangeStart}
          showDayRow={view === 'resourceTimeGridDay' || view === 'timeGridDay'}
          onPrevWeek={() => stepWeek(-1)}
          onNextWeek={() => stepWeek(1)}
          onToday={() => calRef.current?.getApi().today()}
          onPickDate={goToDate}
        />

        <CalendarLegend
          showWorkingHours={showWorkingHours}
          onToggleWorkingHours={() => setShowWorkingHours((v) => !v)}
          showApple={showApple}
          onToggleApple={() => setShowApple((v) => !v)}
          showHappyHours={showHappyHours}
          onToggleHappyHours={() => setShowHappyHours((v) => !v)}
        />

        {/* FullCalendar */}
        <div
          // min-h-0 pozwala temu dziecku skurczyć się poniżej własnej treści (bez tego
          // flex-1 ma min-height:auto i rozpycha kalendarz poza wysokość strony).
          // overflow-hidden zamiast auto: przy height="100%" FullCalendar robi własny
          // wewnętrzny scroller i trzyma nagłówki kolumn w miejscu — przewijanie naszego
          // diva zabierałoby ze sobą także nazwiska pracownic.
          // Na telefonie kontener nie przycina i nie ogranicza wysokosci: siatka rysuje sie
          // w calosci, a przewija sie cala tresc strony. Na desktopie zostaje wypelnianie
          // ekranu z wewnetrznym scrollerem FullCalendara, ktory trzyma naglowki kolumn.
          className="cosmo-calendar px-1 pb-1 md:min-h-0 md:flex-1 md:overflow-hidden"
          style={hhPanelOpen ? { cursor: 'crosshair' } : undefined}
        >
          <AppleCalendarOverlay
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            employees={employees}
            isResourceView={isResourceView}
            enabled={showApple}
            blocks={calendarBlocks}
          >
            {(appleEvents) => (
              <HappyHourOverlay rangeStart={rangeStart} rangeEnd={rangeEnd}>
                {(bgEvents) => {
                  // FullCalendar v6 has no backgroundEvents prop — merge all events into one array
                  const allEvents: EventInput[] = [
                    ...visibleWorkingHourEvents,
                    ...appleEvents,
                    ...blockEvents,
                    ...appointmentEvents,
                    ...(showHappyHours ? bgEvents : []),
                  ];

                  return (
                    <FullCalendar
                      ref={calRef}
                      plugins={[resourceTimeGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                      schedulerLicenseKey={import.meta.env.VITE_FULLCALENDAR_LICENSE_KEY ?? 'CC-Attribution-NonCommercial-NoDerivatives'}
                      initialView={view}
                      resources={isResourceView ? resources : undefined}
                      events={allEvents}
                      eventContent={(arg) => {
                        if (arg.event.extendedProps.isOffHours) {
                          return <div />;
                        }
                        if (arg.event.extendedProps.isWorkingHours) {
                          return (
                            <div className="cosmo-work-hours-label">
                              Godziny pracy {arg.event.extendedProps.rangeLabel}
                            </div>
                          );
                        }
                        if (arg.event.extendedProps.appleEventId) {
                          const covered = arg.event.extendedProps.appleCovered as boolean;
                          const appleStart = arg.event.extendedProps.appleStart as Date;
                          const appleEnd = arg.event.extendedProps.appleEnd as Date;
                          return (
                            // Warstwa Apple ma zostać przezroczysta dla kliknięć, żeby admin
                            // mógł zaznaczyć godziny pod wydarzeniem — dlatego wrapper gasi
                            // pointer-events, a przywraca je wyłącznie sam badge.
                            <div className="flex items-start gap-1 px-1 pt-0.5" style={{ pointerEvents: 'none' }}>
                              <span className="cosmo-apple-label min-w-0 flex-1 truncate">
                                {arg.event.extendedProps.title}
                              </span>
                              {covered ? (
                                <span
                                  className="mt-px shrink-0 text-gray-400"
                                  role="img"
                                  title="Godziny są już zablokowane"
                                  aria-label="Godziny są już zablokowane"
                                  style={{ pointerEvents: 'auto' }}
                                >
                                  <Lock size={11} />
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  title="Zablokuj te godziny"
                                  aria-label="Zablokuj te godziny"
                                  style={{ pointerEvents: 'auto' }}
                                  className="mt-px shrink-0 rounded px-1 text-[11px] font-bold leading-none text-amber-600 hover:bg-amber-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBlockModal({
                                      date: format(appleStart, 'yyyy-MM-dd'),
                                      time: format(appleStart, 'HH:mm'),
                                      endTime: format(appleEnd, 'HH:mm'),
                                      reason: arg.event.extendedProps.appleTitle as string,
                                    });
                                  }}
                                >
                                  ❗
                                </button>
                              )}
                            </div>
                          );
                        }
                        if (arg.event.extendedProps.calendarBlockId) {
                      const blk = arg.event.extendedProps.block as CalendarBlock;
                      return (
                        <div className="flex h-full items-start gap-1 px-1 py-0.5 text-white">
                          <Lock size={11} className="mt-0.5 shrink-0" />
                          <span className="truncate text-[10px] font-semibold leading-tight">
                            {blk.reason ?? 'Zablokowane'}
                          </span>
                        </div>
                      );
                    }
                    if (arg.event.extendedProps.happyHourId) {
                      const { startTime, endTime, discountType, discountValue } = arg.event.extendedProps;
                      const discountLabel = discountType === 'PERCENTAGE'
                        ? `-${discountValue}%`
                        : `-${discountValue} zł`;
                      return (
                        <div style={{ borderTop: '3px solid #f59e0b', height: '100%', padding: '3px 5px', pointerEvents: 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{
                              background: '#f59e0b', color: 'white',
                              borderRadius: '50%', width: '16px', height: '16px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '9px', fontWeight: 700, flexShrink: 0,
                            }}>H</span>
                            <span style={{ fontSize: '9px', color: '#92400e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {startTime}–{endTime} · {discountLabel}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return <AppointmentCard {...arg} />;
                  }}
                  eventClick={(arg) => {
                    if (arg.event.extendedProps.calendarBlockId) {
                      const rect = (arg.el as HTMLElement).getBoundingClientRect();
                      setBlockPopover({
                        block: arg.event.extendedProps.block as CalendarBlock,
                        x: rect.left,
                        y: rect.bottom,
                      });
                      return;
                    }
                    if (arg.event.extendedProps.happyHourId) return;
                    if (arg.event.extendedProps.appleEventId) return;
                    handleEventClick(arg);
                  }}
                  dateClick={handleDateClick}
                  selectable
                  select={handleDateSelect}
                  slotMinTime={`${DAY_WINDOW_START}:00`}
                  slotMaxTime={`${DAY_WINDOW_END}:00`}
                  // Na telefonie czternaście godzin po pół godziny to 28 wierszy, których
                  // FullCalendar nie ściśnie poniżej minimalnej wysokości — pokazywał więc
                  // trzy godziny i przewijał resztę. Godzinne sloty dają 14 wierszy zamiast
                  // 28, czyli dwukrotnie więcej wysokości na wiersz, i cały dzień mieści się
                  // bez przewijania. Żadna wizyta nie znika: długość slotu wyznacza wyłącznie
                  // linie siatki, a wizyty i tak są rysowane co do minuty.
                  slotDuration={isMobile ? '01:00:00' : '00:30:00'}
                  slotLabelInterval={isMobile ? '01:00:00' : '00:30:00'}
                  // Bez tego kliknięcie w godzinny slot trafiałoby w pełną godzinę i nie dałoby
                  // się na telefonie umówić wizyty na 9:30. Ustawiamy wyłącznie na telefonie —
                  // na desktopie brak tego propa zachowuje dotychczasowe zaokrąglanie do
                  // trzydziestu minut, czyli do długości slotu.
                  snapDuration={isMobile ? '00:15:00' : undefined}
                  slotLaneClassNames={(arg) => [
                    arg.date!.getMinutes() === 0 ? 'cosmo-slot-full' : 'cosmo-slot-half',
                  ]}
                  slotLabelClassNames={(arg) => [
                    arg.date!.getMinutes() === 0 ? 'cosmo-slot-full' : 'cosmo-slot-half',
                  ]}
                  allDaySlot={false}
                  headerToolbar={false}
                  locale={plLocale}
                  // Poniedziałek jako pierwszy dzień jest też zaszyty w calendarWeeks.ts,
                  // więc podajemy go wprost — obie strony muszą się zgadzać niezależnie
                  // od tego, czy bundle locale kiedyś zniknie z importów.
                  firstDay={1}
                  // height="100%" + expandRows sprawia, że siatka wypełnia kontener
                  // zamiast rysować się na stałą wysokość wynikającą z liczby slotów
                  // i zostawiać puste miejsce pod spodem.
                  // "auto" na telefonie: FullCalendar rysuje wszystkie godziny w naturalnej
                  // wysokosci wiersza i nie tworzy wlasnego obszaru przewijania — dzien
                  // oglada sie przewijajac strone, a nie osobne okienko w srodku.
                  height={isMobile ? 'auto' : '100%'}
                  expandRows={!isMobile}
                  datesSet={(info) => {
                    setRangeStart(info.start);
                    setRangeEnd(info.end);
                  }}
                  resourceLabelContent={(arg) => (
                    <div
                      className="flex flex-col items-center cursor-pointer hover:text-indigo-600 py-1"
                      onClick={() => zoomToEmployee(arg.resource.id)}
                    >
                      <div
                        className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center mb-0.5"
                        style={{ background: arg.resource.extendedProps?.color ?? '#6366f1' }}
                      >
                        {arg.resource.title.substring(0, 1)}
                      </div>
                      <div className="text-xs font-medium">{arg.resource.title}</div>
                    </div>
                  )}
                />
                  );
                }}
              </HappyHourOverlay>
            )}
          </AppleCalendarOverlay>
        </div>
      </div>

      {/* Client Drawer */}
      {selectedAppt && (
        <ClientDrawer
          appointment={selectedAppt}
          onClose={() => setSelectedAppt(null)}
        />
      )}

      {/* Add Appointment Modal */}
      {addModal !== null && (
        <AddAppointmentModal
          open
          onClose={() => { setAddModal(null); onRefetch(); }}
          prefillDate={addModal.date}
          prefillTime={addModal.time}
          prefillEmployeeId={addModal.employeeId}
          employees={employees}
          services={services}
        />
      )}

      {/* External Client Modal */}
      {externalModal !== null && (
        <ExternalClientModal
          open
          onClose={() => { setExternalModal(null); onRefetch(); }}
          prefillDate={externalModal.date}
          prefillTime={externalModal.time}
          prefillEmployeeId={externalModal.employeeId}
          employees={employees}
          services={services}
        />
      )}

      {/* Slot action menu */}
      {slotMenu && (isMobile ? (
        <MobileSheet
          open
          onClose={() => setSlotMenu(null)}
          title={`${slotMenu.date}${slotMenu.time ? ` · ${slotMenu.time}` : ''}`}
        >
          {slotMenuItems}
        </MobileSheet>
      ) : (
        <div className="fixed inset-0 z-40" onClick={() => setSlotMenu(null)}>
          <div
            ref={slotMenuRef}
            className="absolute bg-background border border-border rounded-xl shadow-2xl p-2 w-56 z-50 overflow-y-auto"
            style={{
              left: Math.min(slotMenu.x + 8, window.innerWidth - 240),
              top: slotMenuLayout?.top ?? slotMenu.y,
              maxHeight: slotMenuLayout?.maxHeight,
              visibility: slotMenuLayout ? 'visible' : 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs text-muted-foreground px-2 py-1 font-mono border-b mb-1">
              {slotMenu.date}{slotMenu.time ? ` · ${slotMenu.time}` : ''}
            </p>
            {slotMenuItems}
          </div>
        </div>
      ))}

      {blockPopover && (isMobile ? (
        <MobileSheet open onClose={() => { setBlockPopover(null); setRemoveBlockError(null); }} title="Zablokowane">
          {blockPopoverContent}
        </MobileSheet>
      ) : (
        <div className="fixed inset-0 z-40" onClick={() => { setBlockPopover(null); setRemoveBlockError(null); }}>
          <div
            ref={blockPopoverRef}
            className="absolute w-64 rounded-xl border border-border bg-background p-3 shadow-2xl z-50 overflow-y-auto"
            style={{
              left: Math.min(blockPopover.x, window.innerWidth - 280),
              top: blockPopoverLayout?.top ?? blockPopover.y,
              maxHeight: blockPopoverLayout?.maxHeight,
              visibility: blockPopoverLayout ? 'visible' : 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {blockPopoverContent}
          </div>
        </div>
      ))}

      {/* Happy Hour Panel */}
      <HappyHourPanel
        open={hhPanelOpen}
        onClose={() => { setHhPanelOpen(false); setHhPrefill(null); }}
        prefill={hhPrefill}
        employees={employees}
        services={services}
      />

      {blockModal && (
        <BlockHoursModal
          open
          onClose={() => setBlockModal(null)}
          prefill={blockModal}
          employees={employees}
          appointments={appointments}
        />
      )}

      {workHoursModal && (
        <WorkHoursModal
          open
          mode={workHoursModal.mode}
          onClose={() => setWorkHoursModal(null)}
          prefill={{ date: workHoursModal.date, time: workHoursModal.time, employeeId: workHoursModal.employeeId }}
          employees={employees}
          appointments={appointments}
          workDayOverrides={workDayOverrides}
        />
      )}

      <AppleCalendarSettingsModal open={appleSettingsOpen} onClose={() => setAppleSettingsOpen(false)} />

      <MobileSheet open={mobileActionsOpen} onClose={() => setMobileActionsOpen(false)} title="Akcje kalendarza">
        <button
          className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm hover:bg-accent"
          onClick={() => { setAddModal({}); setMobileActionsOpen(false); }}
        >
          <Calendar size={16} className="text-green-600" /> Dodaj wizytę
        </button>
        <button
          className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm hover:bg-accent"
          onClick={() => { setExternalModal({}); setMobileActionsOpen(false); }}
        >
          <UserPlus size={16} className="text-violet-500" /> Klientka z zewnątrz
        </button>
        <button
          className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm hover:bg-accent"
          onClick={() => {
            // Przełącznik, nie tylko otwieranie — to drugie wyjście awaryjne z panelu.
            setHhPanelOpen((v) => !v);
            if (hhPanelOpen) setHhPrefill(null);
            setMobileActionsOpen(false);
          }}
        >
          <Zap size={16} className="text-amber-500" /> {hhPanelOpen ? 'Zamknij Happy Hours' : 'Happy Hours'}
        </button>
        <button
          className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm hover:bg-accent"
          onClick={() => { setShowHappyHours((v) => !v); setMobileActionsOpen(false); }}
        >
          <Zap size={16} className="text-yellow-500" /> {showHappyHours ? 'Ukryj Happy Hours' : 'Pokaż Happy Hours'}
        </button>
        <button
          className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm hover:bg-accent"
          onClick={() => { setShowApple((v) => !v); setMobileActionsOpen(false); }}
        >
          <Calendar size={16} className="text-gray-500" /> {showApple ? 'Ukryj kalendarz Apple' : 'Pokaż kalendarz Apple'}
        </button>
        <button
          className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm hover:bg-accent"
          onClick={() => { setAppleSettingsOpen(true); setMobileActionsOpen(false); }}
        >
          <Settings size={16} className="text-gray-500" /> Ustawienia kalendarza Apple
        </button>
      </MobileSheet>
    </div>
  );
}
