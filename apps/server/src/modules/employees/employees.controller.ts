import { Request, Response, NextFunction } from 'express';
import * as employeesService from './employees.service';
import { processAndSaveImage } from '../../utils/imageProcessor';
import { AppError } from '../../middleware/error.middleware';

// ─── Employees CRUD ───────────────────────────────────────────────────────────

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isAdmin = req.user?.role === 'ADMIN';
    const employees = isAdmin
      ? await employeesService.getAllEmployeesAdmin()
      : await employeesService.getAllEmployees();
    res.json({ status: 'success', data: { employees } });
  } catch (err) {
    next(err);
  }
};

export const getNextAvailable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slot = await employeesService.getNextAvailableSlot();
    res.json({ status: 'success', data: { slot } });
  } catch (err) {
    next(err);
  }
};

export const getWeekSlotsCount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await employeesService.getWeekSlotsCount();
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

export const getAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, serviceId, employeeId } = req.query as Record<string, string>;
    if (!date || !serviceId) throw new AppError('Wymagane parametry: date, serviceId', 400);
    const slots = await employeesService.getAvailability(date, serviceId, employeeId);
    res.json({ status: 'success', data: { slots } });
  } catch (err) {
    next(err);
  }
};

export const getMonthAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { year, month, serviceId, employeeId } = req.query as Record<string, string>;
    if (!year || !month || !serviceId) throw new AppError('Wymagane parametry: year, month, serviceId', 400);
    const result = await employeesService.getMonthAvailability(
      Number(year), Number(month), serviceId, employeeId || undefined
    );
    res.json({ status: 'success', data: { availability: result } });
  } catch (err) {
    next(err);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, bio, specialties } = req.body;
    if (!name) throw new AppError('Imię pracownika jest wymagane', 400);
    let parsedSpecialties: string[] = [];
    if (Array.isArray(specialties)) {
      parsedSpecialties = specialties;
    } else if (typeof specialties === 'string') {
      try { parsedSpecialties = JSON.parse(specialties); } catch { parsedSpecialties = []; }
    }
    let employee = await employeesService.createEmployee({ name, bio, specialties: parsedSpecialties });
    if (req.file) {
      const avatarPath = await processAndSaveImage(req.file.buffer, 'employees');
      employee = await employeesService.updateEmployeeAvatar(employee.id, avatarPath);
    }
    res.status(201).json({ status: 'success', data: { employee } });
  } catch (err) {
    next(err);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, bio, specialties, isActive } = req.body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (bio !== undefined) data.bio = bio;
    if (specialties !== undefined) {
      if (Array.isArray(specialties)) {
        data.specialties = specialties;
      } else {
        try { data.specialties = JSON.parse(specialties as string); } catch { data.specialties = []; }
      }
    }
    if (isActive !== undefined) data.isActive = isActive === 'true' || isActive === true;

    let employee = await employeesService.updateEmployee(req.params.id, data);
    if (req.file) {
      const avatarPath = await processAndSaveImage(req.file.buffer, 'employees');
      employee = await employeesService.updateEmployeeAvatar(employee.id, avatarPath);
    }
    res.json({ status: 'success', data: { employee } });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await employeesService.deleteEmployee(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// ─── Account management ───────────────────────────────────────────────────────

export const createAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let { email, password } = req.body;
    // Existing accounts can be linked without a password; new accounts still fail min-length validation in the service.
    if (!password) password = 'x';
    if (!email || !password) throw new AppError('Email i hasło są wymagane', 400);
    const employee = await employeesService.createEmployeeAccount(req.params.id, { email, password });
    res.status(201).json({ status: 'success', data: { employee } });
  } catch (err) {
    next(err);
  }
};

export const revokeAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employee = await employeesService.revokeEmployeeAccount(req.params.id);
    res.json({ status: 'success', data: { employee } });
  } catch (err) {
    next(err);
  }
};

// ─── Work days ────────────────────────────────────────────────────────────────

export const getSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { month } = req.query as Record<string, string>;
    const workDays = await employeesService.getWorkDays(req.params.id, month);
    res.json({ status: 'success', data: { workDays } });
  } catch (err) {
    next(err);
  }
};

export const upsertWorkDay = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workDay = await employeesService.upsertWorkDay(req.params.id, req.body);
    res.json({ status: 'success', data: { workDay } });
  } catch (err) {
    next(err);
  }
};

export const removeWorkDay = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await employeesService.deleteWorkDay(req.params.dayId, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// ─── Employee self-service ────────────────────────────────────────────────────

export const getMySchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employee = await employeesService.getEmployeeByUserId(req.user!.id);
    const { month } = req.query as Record<string, string>;
    const [workDays, weeklySchedule] = await Promise.all([
      employeesService.getWorkDays(employee.id, month),
      employeesService.getWeeklySchedule(employee.id),
    ]);
    res.json({ status: 'success', data: { employee, workDays, weeklySchedule } });
  } catch (err) {
    next(err);
  }
};

export const upsertMyWorkDay = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employee = await employeesService.getEmployeeByUserId(req.user!.id);
    const workDay = await employeesService.upsertWorkDay(employee.id, req.body);
    res.json({ status: 'success', data: { workDay } });
  } catch (err) {
    next(err);
  }
};

export const removeMyWorkDay = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employee = await employeesService.getEmployeeByUserId(req.user!.id);
    await employeesService.deleteWorkDay(req.params.dayId, employee.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const getMyAppointments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appointments = await employeesService.getEmployeeAppointmentsByUserId(req.user!.id);
    res.json({ status: 'success', data: { appointments } });
  } catch (err) {
    next(err);
  }
};

// ─── Weekly schedule (admin) ──────────────────────────────────────────────────

export const upsertEmployeeWeeklyDay = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dayOfWeek, isWorking, timeBlocks } = req.body;
    if (dayOfWeek === undefined) throw new AppError('dayOfWeek jest wymagany', 400);
    const entry = await employeesService.upsertWeeklyDay(req.params.id, {
      dayOfWeek: Number(dayOfWeek),
      isWorking: isWorking ?? true,
      timeBlocks: timeBlocks ?? [{ start: '09:00', end: '18:00' }],
    });
    res.json({ status: 'success', data: { entry } });
  } catch (err) { next(err); }
};

export const getEmployeeWeeklySchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schedule = await employeesService.getWeeklySchedule(req.params.id);
    res.json({ status: 'success', data: { schedule } });
  } catch (err) {
    next(err);
  }
};

// ─── Weekly schedule (self-service) ──────────────────────────────────────────

export const getMyWeeklySchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employee = await employeesService.getEmployeeByUserId(req.user!.id);
    const schedule = await employeesService.getWeeklySchedule(employee.id);
    res.json({ status: 'success', data: { schedule } });
  } catch (err) {
    next(err);
  }
};

export const upsertMyWeeklyDay = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employee = await employeesService.getEmployeeByUserId(req.user!.id);
    const { dayOfWeek, isWorking, timeBlocks } = req.body;
    if (dayOfWeek === undefined) throw new AppError('dayOfWeek jest wymagany', 400);
    const entry = await employeesService.upsertWeeklyDay(employee.id, {
      dayOfWeek: Number(dayOfWeek),
      isWorking: isWorking ?? true,
      timeBlocks: timeBlocks ?? [{ start: '09:00', end: '18:00' }],
    });
    res.json({ status: 'success', data: { entry } });
  } catch (err) {
    next(err);
  }
};
