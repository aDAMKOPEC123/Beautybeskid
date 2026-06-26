import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import bcrypt from 'bcryptjs';

const addMinutes = (date: Date, minutes: number): Date =>
  new Date(date.getTime() + minutes * 60_000);

const SLOT_INTERVAL_MINUTES = 30;

export interface TimeBlock {
  start: string; // "09:00"
  end: string;   // "13:00"
}

const DEFAULT_TIME_BLOCKS: TimeBlock[] = [{ start: '09:00', end: '18:00' }];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function normalizeDate(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// dayOfWeek: 0=Mon, 1=Tue, ..., 6=Sun (from JS getDay: 0=Sun,1=Mon...)
function getDayOfWeek(date: Date): number {
  return (date.getUTCDay() + 6) % 7;
}

// ─── Employee CRUD ────────────────────────────────────────────────────────────

export const getAllEmployees = async () => {
  return await prisma.employee.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    include: { user: { select: { id: true, email: true, role: true } } },
  });
};

export const getAllEmployeesAdmin = async () => {
  return await prisma.employee.findMany({
    orderBy: { name: 'asc' },
    include: { user: { select: { id: true, email: true, role: true } } },
  });
};

export const getEmployeeById = async (id: string) => {
  const emp = await prisma.employee.findUnique({
    where: { id },
    include: { user: { select: { id: true, email: true, role: true } } },
  });
  if (!emp) throw new AppError('Nie znaleziono pracownika', 404);
  return emp;
};

export const getEmployeeByUserId = async (userId: string) => {
  const emp = await prisma.employee.findUnique({
    where: { userId },
    include: { user: { select: { id: true, email: true, role: true } } },
  });
  if (!emp) throw new AppError('Nie znaleziono konta pracowniczego', 404);
  return emp;
};

export const createEmployee = async (data: {
  name: string;
  bio?: string;
  specialties?: string[];
}) => {
  return await prisma.employee.create({
    data,
    include: { user: { select: { id: true, email: true, role: true } } },
  });
};

export const updateEmployee = async (
  id: string,
  data: { name?: string; bio?: string; specialties?: string[]; isActive?: boolean }
) => {
  return await prisma.employee.update({
    where: { id },
    data,
    include: { user: { select: { id: true, email: true, role: true } } },
  });
};

export const updateEmployeeAvatar = async (id: string, avatarPath: string) => {
  return await prisma.employee.update({
    where: { id },
    data: { avatarPath },
    include: { user: { select: { id: true, email: true, role: true } } },
  });
};

export const deleteEmployee = async (id: string) => {
  return await prisma.employee.update({ where: { id }, data: { isActive: false } });
};

// ─── Account management ───────────────────────────────────────────────────────

export const createEmployeeAccount = async (
  employeeId: string,
  data: { email: string; password?: string }
) => {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw new AppError('Nie znaleziono pracownika', 404);
  if (employee.userId) throw new AppError('Pracownik ma już przypisane konto', 400);

  const email = data.email.trim().toLowerCase();
  if (!email) throw new AppError('Email jest wymagany', 400);

  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    include: { employee: { select: { id: true, name: true } } },
  });

  if (existing?.employee) {
    throw new AppError(`To konto jest juz przypisane do pracownika: ${existing.employee.name}`, 400);
  }

  if (existing) {
    return await prisma.$transaction(async (tx) => {
      // Existing ADMIN accounts keep admin privileges and become linked employee accounts too.
      if (existing.role === 'USER') {
        await tx.user.update({
          where: { id: existing.id },
          data: { role: 'EMPLOYEE' },
        });
      }

      return await tx.employee.update({
        where: { id: employeeId },
        data: { userId: existing.id },
        include: { user: { select: { id: true, email: true, role: true } } },
      });
    });
  }
  if (existing) throw new AppError('Użytkownik z tym adresem email już istnieje', 400);

  if (!data.password || data.password.length < 6) {
    throw new AppError('Haslo jest wymagane dla nowego konta pracownika', 400);
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        name: employee.name,
        role: 'EMPLOYEE',
      },
    });

    const updated = await tx.employee.update({
      where: { id: employeeId },
      data: { userId: user.id },
      include: { user: { select: { id: true, email: true, role: true } } },
    });

    return updated;
  });
};

export const revokeEmployeeAccount = async (employeeId: string) => {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { user: { select: { role: true } } },
  });
  if (!employee) throw new AppError('Nie znaleziono pracownika', 404);
  if (!employee.userId) throw new AppError('Pracownik nie ma przypisanego konta', 400);

  return await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: employee.userId! },
      data: { role: employee.user?.role === 'ADMIN' ? 'ADMIN' : 'USER' },
    });
    return await tx.employee.update({
      where: { id: employeeId },
      data: { userId: null },
      include: { user: { select: { id: true, email: true, role: true } } },
    });
  });
};

// ─── Weekly schedule ──────────────────────────────────────────────────────────

export const getWeeklySchedule = async (employeeId: string) => {
  return await prisma.employeeWeeklySchedule.findMany({
    where: { employeeId },
    orderBy: { dayOfWeek: 'asc' },
  });
};

export const upsertWeeklyDay = async (
  employeeId: string,
  data: { dayOfWeek: number; isWorking: boolean; timeBlocks: TimeBlock[] }
) => {
  if (data.dayOfWeek < 0 || data.dayOfWeek > 6)
    throw new AppError('Nieprawidłowy dzień tygodnia', 400);

  return await prisma.employeeWeeklySchedule.upsert({
    where: { employeeId_dayOfWeek: { employeeId, dayOfWeek: data.dayOfWeek } },
    create: {
      employeeId,
      dayOfWeek: data.dayOfWeek,
      isWorking: data.isWorking,
      timeBlocks: data.timeBlocks as any,
    },
    update: {
      isWorking: data.isWorking,
      timeBlocks: data.timeBlocks as any,
    },
  });
};

// ─── Work days (day-specific overrides) ──────────────────────────────────────

export const getWorkDays = async (employeeId: string, month?: string) => {
  const where: any = { employeeId };
  if (month) {
    const start = new Date(`${month}-01`);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    where.date = { gte: start, lt: end };
  }
  return await prisma.employeeWorkDay.findMany({
    where,
    orderBy: { date: 'asc' },
  });
};

export const upsertWorkDay = async (
  employeeId: string,
  data: {
    date: string;
    isWorking?: boolean;
    timeBlocks?: TimeBlock[];
    note?: string;
  }
) => {
  const normalized = normalizeDate(data.date);
  return await prisma.employeeWorkDay.upsert({
    where: { employeeId_date: { employeeId, date: normalized } },
    create: {
      employeeId,
      date: normalized,
      isWorking: data.isWorking ?? true,
      timeBlocks: (data.timeBlocks ?? null) as any,
      note: data.note ?? null,
    },
    update: {
      isWorking: data.isWorking ?? true,
      timeBlocks: (data.timeBlocks ?? null) as any,
      note: data.note ?? null,
    },
  });
};

export const deleteWorkDay = async (id: string, employeeId: string) => {
  const day = await prisma.employeeWorkDay.findUnique({ where: { id } });
  if (!day) throw new AppError('Nie znaleziono dnia pracy', 404);
  if (day.employeeId !== employeeId) throw new AppError('Brak dostępu', 403);
  return await prisma.employeeWorkDay.delete({ where: { id } });
};

// ─── Availability ─────────────────────────────────────────────────────────────

export interface WorkDayLike {
  isWorking: boolean;
  timeBlocks: unknown;
}

export function resolveEmployeeBlocks(workDay: WorkDayLike | null): TimeBlock[] | null {
  if (!workDay) return null;
  if (!workDay.isWorking) return null;
  const blocks = workDay.timeBlocks as TimeBlock[] | null;
  return blocks && blocks.length > 0 ? blocks : DEFAULT_TIME_BLOCKS;
}

const getAvailabilityForDuration = async (
  date: string,
  duration: number,
  employeeId?: string,
  restrictedEmployeeIds: string[] = [],
): Promise<{ time: string; available: boolean }[]> => {
  const normalized = normalizeDate(date);
  const dayEnd = new Date(normalized);
  dayEnd.setUTCHours(23, 59, 59, 999);

  // When no specific employee is selected, merge availability across all candidate employees.
  // Candidates = employees assigned to the service, or ALL active employees if none assigned.
  if (!employeeId) {
    const candidateIds = restrictedEmployeeIds.length > 0
      ? restrictedEmployeeIds
      : (await prisma.employee.findMany({
          where: { isActive: true },
          select: { id: true },
        })).map((e) => e.id);

    if (candidateIds.length === 0) return [];

    const allSlotSets = await Promise.all(
      candidateIds.map((eid) => getAvailabilityForDuration(date, duration, eid))
    );
    const timeMap = new Map<string, boolean>();
    for (const slotSet of allSlotSets) {
      for (const slot of slotSet) {
        timeMap.set(slot.time, (timeMap.get(slot.time) ?? false) || slot.available);
      }
    }
    return Array.from(timeMap.entries())
      .map(([time, available]) => ({ time, available }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  const workDay = await prisma.employeeWorkDay.findUnique({
    where: { employeeId_date: { employeeId, date: normalized } },
  });

  const resolved = resolveEmployeeBlocks(workDay);
  if (resolved === null) return [];
  const blocks: TimeBlock[] = resolved;

  // Existing appointments
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      date: { gte: normalized, lte: dayEnd },
      status: { in: ['PENDING', 'CONFIRMED'] },
      ...(employeeId ? { employeeId } : {}),
    },
    include: { service: true },
  });

  const now = new Date();
  const slots: { time: string; available: boolean }[] = [];

  for (const block of blocks) {
    const startMinutes = timeToMinutes(block.start);
    const endMinutes = timeToMinutes(block.end);
    let currentMinutes = startMinutes;

    while (currentMinutes + duration <= endMinutes) {
      const slotStart = new Date(normalized);
      slotStart.setHours(Math.floor(currentMinutes / 60), currentMinutes % 60, 0, 0);
      const slotEnd = addMinutes(slotStart, duration);

      const isPast = slotStart <= now;
      const isOccupied = !isPast && existingAppointments.some((apt) => {
        const aptStart = new Date(apt.date);
        const aptEnd = addMinutes(aptStart, apt.service.durationMinutes);
        return slotStart < aptEnd && slotEnd > aptStart;
      });
      const hh = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
      const mm = (currentMinutes % 60).toString().padStart(2, '0');
      slots.push({ time: `${hh}:${mm}`, available: !isPast && !isOccupied });
      currentMinutes += SLOT_INTERVAL_MINUTES;
    }
  }

  return slots;
};

export const getAvailability = async (
  date: string,
  serviceId: string,
  employeeId?: string
): Promise<{ time: string; available: boolean }[]> => {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { durationMinutes: true, employees: { select: { id: true } } },
  });
  if (!service) throw new AppError('Nie znaleziono usługi', 404);

  const restrictedIds = service.employees.map((e) => e.id);
  return getAvailabilityForDuration(date, service.durationMinutes, employeeId, restrictedIds);
};

// ─── Month availability ───────────────────────────────────────────────────────

export type DayStatus = 'off' | 'none' | 'partial' | 'available';

const getMonthAvailabilityFromSlots = async (
  year: number,
  month: number,
  loadSlots: (date: string) => Promise<{ time: string; available: boolean }[]>,
): Promise<Record<string, DayStatus>> => {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end   = new Date(Date.UTC(year, month, 0));
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const days: string[] = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d >= today) days.push(d.toISOString().slice(0, 10));
  }

  const results = await Promise.all(
    days.map(async (dateStr) => {
      const slots = await loadSlots(dateStr);
      const total = slots.length;
      const free  = slots.filter((s) => s.available).length;
      let status: DayStatus;
      if (total === 0)         status = 'off';
      else if (free === 0)     status = 'none';
      else if (free < total)   status = 'partial';
      else                     status = 'available';
      return [dateStr, status] as [string, DayStatus];
    })
  );

  return Object.fromEntries(results);
};

export const getMonthAvailability = async (
  year: number,
  month: number,
  serviceId: string,
  employeeId?: string,
): Promise<Record<string, DayStatus>> =>
  getMonthAvailabilityFromSlots(year, month, (dateStr) => getAvailability(dateStr, serviceId, employeeId));

// ─── Next available slot ──────────────────────────────────────────────────────

export const getNextAvailableSlot = async (): Promise<{ date: string; time: string } | null> => {
  const service = await prisma.service.findFirst({
    where: { isActive: true },
    orderBy: { durationMinutes: 'asc' },
    select: { id: true },
  });
  if (!service) return null;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() + i);
    const dateStr = date.toISOString().slice(0, 10);

    const slots = await getAvailability(dateStr, service.id);
    const first = slots.find((s) => s.available);
    if (first) return { date: dateStr, time: first.time };
  }

  return null;
};

// ─── Week slots count ─────────────────────────────────────────────────────────

// Pure helper — exported for unit testing
export function calculateWeekSlotsCount(scheduledMinutes: number, bookedMinutes: number): number {
  const remaining = Math.max(0, scheduledMinutes - bookedMinutes);
  return Math.floor(remaining / SLOT_INTERVAL_MINUTES);
}

export const getWeekSlotsCount = async (): Promise<{
  count: number;
  availableDays: number;
  weekStart: string;
  weekEnd: string;
}> => {
  const now = new Date();
  // Monday of current ISO week
  const day = now.getUTCDay(); // 0=Sun,1=Mon,...
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() + diffToMonday);
  weekStart.setUTCHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  const service = await prisma.service.findFirst({
    where: { isActive: true },
    orderBy: { durationMinutes: 'asc' },
    select: { id: true },
  });

  const weekDates: string[] = [];
  for (let d = new Date(weekStart); d <= weekEnd; d.setUTCDate(d.getUTCDate() + 1)) {
    weekDates.push(d.toISOString().slice(0, 10));
  }

  const availableDays = service
    ? (await Promise.all(
        weekDates.map(async (dateStr) => {
          const slots = await getAvailability(dateStr, service.id);
          return slots.some((slot) => slot.available);
        }),
      )).filter(Boolean).length
    : 0;

  // Query 1: day-specific overrides this week
  const workDayOverrides = await prisma.employeeWorkDay.findMany({
    where: {
      employee: { isActive: true },
      date: { gte: weekStart, lte: weekEnd },
    },
    select: { isWorking: true, timeBlocks: true, employeeId: true, date: true },
  });

  // Build a set of (employeeId, dayOfWeek) pairs that have overrides
  // so we don't double-count override days vs weekly template days
  const overriddenKeys = new Set(
    workDayOverrides.map((d) => {
      const dow = (d.date.getUTCDay() + 6) % 7; // 0=Mon
      return `${d.employeeId}-${dow}`;
    })
  );

  // Query 2: weekly schedules for all active employees
  const allEmployees = await prisma.employee.findMany({
    where: { isActive: true },
    select: { id: true, weeklySchedule: { where: { isWorking: true }, select: { dayOfWeek: true, timeBlocks: true } } },
  });

  let scheduledMinutes = 0;

  // Sum minutes from weekly schedule (skip days that have an override)
  for (const emp of allEmployees) {
    for (const day of emp.weeklySchedule) {
      if (overriddenKeys.has(`${emp.id}-${day.dayOfWeek}`)) continue;
      const blocks = (day.timeBlocks as unknown as TimeBlock[]) ?? DEFAULT_TIME_BLOCKS;
      for (const block of blocks) {
        scheduledMinutes += timeToMinutes(block.end) - timeToMinutes(block.start);
      }
    }
  }

  // Add minutes from override days
  for (const override of workDayOverrides) {
    if (!override.isWorking) continue;
    const blocks = (override.timeBlocks as unknown as TimeBlock[]) ?? DEFAULT_TIME_BLOCKS;
    for (const block of blocks) {
      scheduledMinutes += timeToMinutes(block.end) - timeToMinutes(block.start);
    }
  }

  // Query 3: booked minutes this week
  const bookedAppointments = await prisma.appointment.findMany({
    where: {
      date: { gte: weekStart, lte: weekEnd },
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
    select: { service: { select: { durationMinutes: true } } },
  });

  const bookedMinutes = bookedAppointments.reduce(
    (sum, apt) => sum + (apt.service?.durationMinutes ?? 0),
    0
  );

  return {
    count: calculateWeekSlotsCount(scheduledMinutes, bookedMinutes),
    availableDays,
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
  };
};

// ─── Employee appointments ────────────────────────────────────────────────────

export const getEmployeeAppointmentsByUserId = async (userId: string) => {
  const employee = await prisma.employee.findUnique({ where: { userId } });
  if (!employee) throw new AppError('Nie znaleziono konta pracowniczego', 404);

  return await prisma.appointment.findMany({
    where: { employeeId: employee.id },
    orderBy: { date: 'asc' },
    include: {
      service: true,
      user: { select: { name: true, email: true, phone: true, cardAllergies: true, cardConditions: true, cardPreferences: true, cardStaffNotes: true } },
    },
  });
};
