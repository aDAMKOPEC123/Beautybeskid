import { Request, Response, NextFunction } from 'express';
import * as appointmentsService from './appointments.service';
import { processAndSaveImage } from '../../utils/imageProcessor';
import { AppError } from '../../middleware/error.middleware';
import { getIO } from '../../socket';
import { sendPushToAdmins } from '../push/push.service';
import { prisma } from '../../config/prisma';
import { format } from 'date-fns';

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appointment = await appointmentsService.createAppointment(req.user!.id, req.body);
    getIO().to('admin:global').emit('appointment:created', appointment as Record<string, unknown>);
    getIO().to('employee:global').emit('appointment:created', appointment as Record<string, unknown>);
    const appt = appointment as any;
    const creator = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true } });
    void sendPushToAdmins({
      title: 'Nowa wizyta',
      body: `${creator?.name ?? ''} — ${appt.service?.name ?? ''}, ${format(new Date(appt.date), 'HH:mm')}`,
      url: '/admin/wizyty',
    }).then((result) => {
      if (result.attempted > 0 && result.delivered === 0) {
        console.error('Push delivery failed for all admin subscriptions (new appointment)');
      }
    }).catch((error) => {
      console.error('Push delivery failed (new appointment):', error);
    });
    res.status(201).json({ status: 'success', data: { appointment } });
  } catch (error) {
    next(error);
  }
};

export const uploadPhoto = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('Brak pliku zdjęcia', 400);
    const photoPath = await processAndSaveImage(req.file.buffer, 'appointments');
    const appointment = await appointmentsService.uploadAppointmentPhoto(req.params.id, req.user!.id, photoPath);
    res.json({ status: 'success', data: { appointment } });
  } catch (error) {
    next(error);
  }
};

export const getMy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appointments = await appointmentsService.getUserAppointments(req.user!.id);
    res.status(200).json({ status: 'success', data: { appointments } });
  } catch (error) {
    next(error);
  }
};

export const getMyOverview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const overview = await appointmentsService.getUserAppointmentsOverview(req.user!.id);
    res.status(200).json({ status: 'success', data: overview });
  } catch (error) {
    next(error);
  }
};

export const getMyHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawStatus = String(req.query.status ?? 'ALL').toUpperCase();
    const allowed = ['ALL', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as const;
    if (!allowed.includes(rawStatus as (typeof allowed)[number])) {
      throw new AppError('Nieprawidłowy filtr historii wizyt', 400);
    }
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1) {
      throw new AppError('Nieprawidłowa paginacja historii wizyt', 400);
    }
    const history = await appointmentsService.getUserAppointmentHistory(req.user!.id, {
      status: rawStatus as (typeof allowed)[number],
      page,
      limit,
    });
    res.status(200).json({ status: 'success', data: { history } });
  } catch (error) {
    next(error);
  }
};

export const getUpcomingCount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await appointmentsService.getUpcomingCount(req.user!.id);
    res.status(200).json({ status: 'success', data: { count } });
  } catch (error) {
    next(error);
  }
};

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, status, page, limit } = req.query as Record<string, string | undefined>;
    const result = await appointmentsService.getAllAppointments({
      userId,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

export const createAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appointment = await appointmentsService.createAppointmentByAdmin(req.body);
    getIO().to('admin:global').emit('appointment:created', appointment as Record<string, unknown>);
    getIO().to(`user:${(appointment as any).userId}`).emit('appointment:created', appointment as Record<string, unknown>);
    getIO().to('employee:global').emit('appointment:created', appointment as Record<string, unknown>);
    const appt = appointment as any;
    sendPushToAdmins({
      title: 'Nowa wizyta (admin)',
      body: `${appt.user?.name ?? ''} — ${appt.service?.name ?? ''}, ${format(new Date(appt.date), 'HH:mm')}`,
      url: '/admin/wizyty',
    }).catch(() => {});
    res.status(201).json({ status: 'success', data: { appointment } });
  } catch (error) {
    next(error);
  }
};

export const createExternal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appointment = await appointmentsService.createExternalClientAppointment(req.body);
    getIO().to('admin:global').emit('appointment:created', appointment as Record<string, unknown>);
    getIO().to('employee:global').emit('appointment:created', appointment as Record<string, unknown>);
    const appt = appointment as any;
    sendPushToAdmins({
      title: 'Nowa wizyta (zewnętrzna)',
      body: `${appt.user?.name ?? ''} — ${appt.service?.name ?? ''}, ${format(new Date(appt.date), 'HH:mm')}`,
      url: '/admin/wizyty',
    }).catch(() => {});
    res.status(201).json({ status: 'success', data: { appointment } });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await appointmentsService.deleteAppointment(req.params.id);
    getIO().to('admin:global').emit('appointment:deleted', req.params.id);
    getIO().to(`user:${deleted.userId}`).emit('appointment:deleted', req.params.id);
    getIO().to('employee:global').emit('appointment:deleted', req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
    if (!VALID_STATUSES.includes(status)) {
      throw new AppError('Nieprawidłowy status wizyty', 400);
    }
    const appointment = await appointmentsService.updateStatus(req.params.id, status, req.user!.id);
    getIO().to('admin:global').emit('appointment:updated', appointment as Record<string, unknown>);
    getIO().to(`user:${(appointment as any).userId}`).emit('appointment:updated', appointment as Record<string, unknown>);
    getIO().to('employee:global').emit('appointment:updated', appointment as Record<string, unknown>);
    const appt = appointment as any;
    sendPushToAdmins({
      title: 'Wizyta zaktualizowana',
      body: `${appt.user?.name ?? ''} — ${appt.service?.name ?? ''} → ${status}`,
      url: '/admin/wizyty',
    }).catch(() => {});
    res.status(200).json({ status: 'success', data: { appointment } });
  } catch (error) {
    next(error);
  }
};

export const getToday = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { employeeId } = req.query;
    const appointments = await appointmentsService.getTodayAppointments(employeeId as string | undefined);
    res.json({ status: 'success', data: { appointments } });
  } catch (error) {
    next(error);
  }
};

export const updateStaffNote = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appointment = await appointmentsService.updateStaffNote(req.params.id, req.body.staffNote ?? '');
    getIO().to('admin:global').emit('appointment:updated', appointment as Record<string, unknown>);
    getIO().to(`user:${(appointment as any).userId}`).emit('appointment:updated', appointment as Record<string, unknown>);
    getIO().to('employee:global').emit('appointment:updated', appointment as Record<string, unknown>);
    res.json({ status: 'success', data: { appointment } });
  } catch (error) {
    next(error);
  }
};

export const updateTime = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appointment = await appointmentsService.updateAppointmentTime(req.params.id, {
      date: req.body.date,
      customDurationMinutes: req.body.customDurationMinutes,
    });
    getIO().to('admin:global').emit('appointment:updated', appointment as Record<string, unknown>);
    getIO().to('employee:global').emit('appointment:updated', appointment as Record<string, unknown>);
    res.json({ status: 'success', data: { appointment } });
  } catch (error) {
    next(error);
  }
};

export const requestReschedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appointment = await appointmentsService.requestReschedule(req.params.id, req.user!.id, req.body.date);
    getIO().to('admin:global').emit('appointment:updated', appointment as Record<string, unknown>);
    getIO().to('employee:global').emit('appointment:updated', appointment as Record<string, unknown>);
    res.json({ status: 'success', data: { appointment } });
  } catch (error) {
    next(error);
  }
};

export const withdrawReschedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appointment = await appointmentsService.withdrawReschedule(req.params.id, req.user!.id);
    getIO().to('admin:global').emit('appointment:updated', appointment as Record<string, unknown>);
    getIO().to('employee:global').emit('appointment:updated', appointment as Record<string, unknown>);
    getIO().to(`user:${req.user!.id}`).emit('appointment:updated', appointment as Record<string, unknown>);
    res.json({ status: 'success', data: { appointment } });
  } catch (error) {
    next(error);
  }
};

export const requestCancellation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reason = typeof req.body.reason === 'string' ? req.body.reason : undefined;
    const appointment = await appointmentsService.requestCancellation(req.params.id, req.user!.id, reason);
    getIO().to('admin:global').emit('appointment:updated', appointment as Record<string, unknown>);
    getIO().to('employee:global').emit('appointment:updated', appointment as Record<string, unknown>);
    getIO().to(`user:${req.user!.id}`).emit('appointment:updated', appointment as Record<string, unknown>);
    res.status(201).json({ status: 'success', data: { appointment } });
  } catch (error) {
    next(error);
  }
};

export const withdrawCancellation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appointment = await appointmentsService.withdrawCancellation(req.params.id, req.user!.id);
    getIO().to('admin:global').emit('appointment:updated', appointment as Record<string, unknown>);
    getIO().to(`user:${req.user!.id}`).emit('appointment:updated', appointment as Record<string, unknown>);
    res.json({ status: 'success', data: { appointment } });
  } catch (error) {
    next(error);
  }
};

const decideCancellation = (decision: 'APPROVED' | 'REJECTED') =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const decisionNote = typeof req.body.decisionNote === 'string' ? req.body.decisionNote : undefined;
      const appointment = await appointmentsService.decideCancellation(
        req.params.id,
        req.user!.id,
        decision,
        decisionNote,
      );
      getIO().to('admin:global').emit('appointment:updated', appointment as Record<string, unknown>);
      getIO().to('employee:global').emit('appointment:updated', appointment as Record<string, unknown>);
      if ((appointment as any).userId) {
        getIO().to(`user:${(appointment as any).userId}`).emit('appointment:updated', appointment as Record<string, unknown>);
      }
      res.json({ status: 'success', data: { appointment } });
    } catch (error) {
      next(error);
    }
  };

export const approveCancellation = decideCancellation('APPROVED');
export const rejectCancellation = decideCancellation('REJECTED');

export const approveReschedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appointment = await appointmentsService.approveReschedule(req.params.id);
    getIO().to('admin:global').emit('appointment:updated', appointment as Record<string, unknown>);
    getIO().to(`user:${(appointment as any).userId}`).emit('appointment:updated', appointment as Record<string, unknown>);
    res.json({ status: 'success', data: { appointment } });
  } catch (error) {
    next(error);
  }
};

export const rejectReschedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appointment = await appointmentsService.rejectReschedule(req.params.id);
    getIO().to('admin:global').emit('appointment:updated', appointment as Record<string, unknown>);
    getIO().to(`user:${(appointment as any).userId}`).emit('appointment:updated', appointment as Record<string, unknown>);
    res.json({ status: 'success', data: { appointment } });
  } catch (error) {
    next(error);
  }
};

export const getFollowUpReminders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reminders = await appointmentsService.getFollowUpReminders(req.user!.id);
    res.json({ status: 'success', data: { reminders } });
  } catch (err) {
    next(err);
  }
};
