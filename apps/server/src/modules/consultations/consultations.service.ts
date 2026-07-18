import { prisma } from '../../config/prisma';
import { getIO } from '../../socket';
import { createAndEmitNotification } from '../notifications/notifications.service';
import { sendPushToAdmins } from '../push/push.service';

export const createLead = async (data: {
  name: string;
  email: string;
  phone: string;
  consentContact: boolean;
  consentData: boolean;
}) => {
  const lead = await prisma.consultationLead.create({ data });

  try {
    const io = getIO();
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    const body = `${lead.name} (${lead.phone})`;
    for (const admin of admins) {
      await createAndEmitNotification(io, {
        userId: admin.id,
        type: 'NEW_CONSULTATION',
        title: 'Nowe zapytanie konsultacyjne',
        body,
        url: '/admin/konsultacje',
        audience: 'ADMIN',
      });
    }
    await sendPushToAdmins({
      title: 'Nowe zapytanie konsultacyjne',
      body,
      url: '/admin/konsultacje',
    });
  } catch (err) {
    console.error('Notification delivery failed (consultation):', err);
  }

  return lead;
};

export const getActiveLeads = async () => {
  return await prisma.consultationLead.findMany({
    where: { archived: false },
    orderBy: { createdAt: 'desc' },
  });
};

export const getArchivedLeads = async () => {
  return await prisma.consultationLead.findMany({
    where: { archived: true },
    orderBy: { contactedAt: 'desc' },
  });
};

export const markContacted = async (id: string) => {
  return await prisma.consultationLead.update({
    where: { id },
    data: { contacted: true, archived: true, contactedAt: new Date() },
  });
};

export const deleteLead = async (id: string) => {
  return await prisma.consultationLead.delete({ where: { id } });
};
