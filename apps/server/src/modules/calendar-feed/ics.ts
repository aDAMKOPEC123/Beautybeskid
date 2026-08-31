export interface IcsEvent {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  location?: string;
  lastModified?: Date;
}

const CRLF = '\r\n';
const MAX_OCTETS = 75;

const pad = (n: number) => String(n).padStart(2, '0');

/** Data w UTC — omija strefy czasowe bez dołączania bloku VTIMEZONE. */
const formatUtc = (d: Date): string =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
  `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

/** Escapowanie wymagane przez RFC 5545 w polach typu TEXT. */
const escapeText = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

/**
 * Zawija linię po 75 bajtach. Liczymy bajty, nie znaki: polskie znaki w UTF-8
 * zajmują dwa bajty, więc limit znakowy przepuściłby linię przekraczającą
 * dozwoloną długość. Iterujemy po punktach kodowych, żeby nigdy nie rozciąć
 * znaku w połowie. Kontynuacja zaczyna się pojedynczą spacją, która sama zabiera
 * jeden bajt — stąd niższy limit dla kolejnych fragmentów.
 */
function foldLine(line: string): string {
  const parts: string[] = [];
  let current = '';
  let bytes = 0;

  for (const ch of line) {
    const chBytes = Buffer.byteLength(ch, 'utf8');
    const limit = parts.length === 0 ? MAX_OCTETS : MAX_OCTETS - 1;
    if (bytes + chBytes > limit) {
      parts.push(current);
      current = ch;
      bytes = chBytes;
    } else {
      current += ch;
      bytes += chBytes;
    }
  }
  parts.push(current);

  return parts.map((part, i) => (i === 0 ? part : ` ${part}`)).join(CRLF);
}

export function buildIcs(events: IcsEvent[], calendarName: string): string {
  const now = formatUtc(new Date());
  const out: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//COSMO//Kalendarz wizyt//PL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    // Podpowiedź dla klienta kalendarza, nie gwarancja — ostatnie słowo ma
    // ustawienie częstotliwości odświeżania po stronie urządzenia.
    'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
    'X-PUBLISHED-TTL:PT15M',
  ];

  for (const e of events) {
    out.push('BEGIN:VEVENT');
    out.push(`UID:${escapeText(e.uid)}`);
    out.push(`DTSTAMP:${now}`);
    out.push(`DTSTART:${formatUtc(e.start)}`);
    out.push(`DTEND:${formatUtc(e.end)}`);
    out.push(`SUMMARY:${escapeText(e.summary)}`);
    if (e.description) out.push(`DESCRIPTION:${escapeText(e.description)}`);
    if (e.location) out.push(`LOCATION:${escapeText(e.location)}`);
    if (e.lastModified) out.push(`LAST-MODIFIED:${formatUtc(e.lastModified)}`);
    out.push('END:VEVENT');
  }

  out.push('END:VCALENDAR');

  return out.map(foldLine).join(CRLF) + CRLF;
}
