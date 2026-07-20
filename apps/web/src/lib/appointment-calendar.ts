import type { Appointment } from '@cosmo/shared';

const escapeIcs = (value: string) => value
  .replace(/\\/g, '\\\\')
  .replace(/\r?\n/g, '\\n')
  .replace(/,/g, '\\,')
  .replace(/;/g, '\\;');

const toIcsUtc = (date: Date) => date
  .toISOString()
  .replace(/[-:]/g, '')
  .replace(/\.\d{3}Z$/, 'Z');

export const buildAppointmentIcs = (appointment: Appointment) => {
  const start = new Date(appointment.date);
  const end = new Date(start.getTime() + appointment.durationMinutes * 60_000);
  const employee = appointment.employee?.name ? `, ${appointment.employee.name}` : '';
  const location = appointment.locationAddressAtBooking ?? '';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BeskidStudio//Wizyta//PL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:appointment-${escapeIcs(appointment.id)}@kosmetologwiktoriacwik.pl`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeIcs(`BeskidStudio — ${appointment.service.name}`)}`,
    `DESCRIPTION:${escapeIcs(`Wizyta: ${appointment.service.name}${employee}.`)}`,
    `LOCATION:${escapeIcs(location)}`,
    `STATUS:${appointment.status === 'CONFIRMED' ? 'CONFIRMED' : 'TENTATIVE'}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
};

export const downloadAppointmentIcs = (appointment: Appointment) => {
  const blob = new Blob([buildAppointmentIcs(appointment)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `wizyta-${appointment.date.slice(0, 10)}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
