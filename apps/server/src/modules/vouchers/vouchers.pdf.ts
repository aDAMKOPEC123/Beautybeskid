import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib';

// pdf-lib@1.17.1 types omit characterSpacing; cast to any to use it at runtime
function dt(page: PDFPage, text: string, options: Record<string, unknown>): void {
  (page.drawText as (t: string, o: any) => void)(text, options);
}

const IVORY = rgb(0.957, 0.976, 0.961);
const FOREST = rgb(0.165, 0.361, 0.314);
const OAK = rgb(0.769, 0.588, 0.353);
const ESPRESSO = rgb(0.102, 0.220, 0.157);
const MUTED = rgb(0.353, 0.478, 0.384);
const CREAM = rgb(0.910, 0.953, 0.918);
const GREEN_ACTION = rgb(0.239, 0.478, 0.329);

type VoucherData = {
  id: string;
  type: 'SERVICE' | 'CASH';
  code: string;
  recipientName?: string | null;
  senderName?: string | null;
  message?: string | null;
  validUntil: Date;
  amount?: any;
  service?: { name: string; description?: string | null } | null;
};

function stripDiacritics(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export async function generateVoucherPdf(voucher: VoucherData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 420]);
  const { width, height } = page.getSize();

  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const oblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const leftW = Math.floor(width * 0.62);
  const pad = 28;

  // Left panel — ivory
  page.drawRectangle({ x: 0, y: 0, width: leftW, height, color: IVORY });
  page.drawCircle({ x: -20, y: height + 20, size: 90, color: CREAM });

  // Brand
  dt(page, 'BESKIDSTUDIO', { x: pad, y: height - 38, size: 9, font: bold, color: GREEN_ACTION, characterSpacing: 2 });
  dt(page, 'BeskidStudio By Wiktoria Cwik', { x: pad, y: height - 52, size: 7, font: regular, color: MUTED });

  page.drawLine({ start: { x: pad, y: height - 62 }, end: { x: leftW - pad, y: height - 62 }, thickness: 0.5, color: rgb(0.8, 0.9, 0.83) });

  dt(page, 'VOUCHER PREZENTOWY', { x: pad, y: height - 80, size: 7.5, font: bold, color: OAK, characterSpacing: 2 });

  const toFrom = [
    voucher.recipientName ? `Dla: ${stripDiacritics(voucher.recipientName)}` : null,
    voucher.senderName ? `Od: ${stripDiacritics(voucher.senderName)}` : null,
  ].filter(Boolean).join('  -  ');

  if (toFrom) {
    dt(page, toFrom, { x: pad, y: height - 94, size: 8, font: regular, color: OAK });
  }

  const mainY = toFrom ? height - 138 : height - 128;

  if (voucher.type === 'SERVICE' && voucher.service) {
    const name = stripDiacritics(voucher.service.name);
    const words = name.split(' ');
    let line1 = '';
    let line2 = '';
    for (const w of words) {
      if (bold.widthOfTextAtSize(`${line1} ${w}`.trim(), 22) < leftW - pad * 2) {
        line1 = `${line1} ${w}`.trim();
      } else {
        line2 = `${line2} ${w}`.trim();
      }
    }
    dt(page, line1, { x: pad, y: mainY, size: 22, font: bold, color: ESPRESSO });
    if (line2) dt(page, line2, { x: pad, y: mainY - 26, size: 22, font: bold, color: ESPRESSO });
    const gratisY = line2 ? mainY - 52 : mainY - 30;
    dt(page, 'GRATIS', { x: pad, y: gratisY, size: 13, font: bold, color: GREEN_ACTION, characterSpacing: 3 });
  } else {
    const amountStr = `${Number(voucher.amount).toFixed(0)} zl`;
    dt(page, amountStr, { x: pad, y: mainY, size: 34, font: bold, color: ESPRESSO });
    dt(page, 'VOUCHER GOTOWKOWY', { x: pad, y: mainY - 28, size: 9, font: bold, color: MUTED, characterSpacing: 1.5 });
  }

  if (voucher.message) {
    const msg = stripDiacritics(voucher.message.length > 75 ? `${voucher.message.slice(0, 72)}...` : voucher.message);
    dt(page, `"${msg}"`, { x: pad, y: 118, size: 8, font: oblique, color: MUTED });
  }

  dt(page, 'KOD REALIZACJI', { x: pad, y: 88, size: 6.5, font: bold, color: MUTED, characterSpacing: 1.5 });

  page.drawRectangle({ x: pad, y: 60, width: 172, height: 22, color: CREAM });
  page.drawRectangle({ x: pad, y: 60, width: 172, height: 22, borderColor: rgb(0.7, 0.85, 0.73), borderWidth: 0.5 });
  dt(page, voucher.code, { x: pad + 8, y: 67, size: 10, font: bold, color: ESPRESSO, characterSpacing: 2 });

  const dateStr = voucher.validUntil.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  dt(page, `Wazny do: ${dateStr}`, { x: pad, y: 46, size: 7, font: regular, color: MUTED });

  // Right panel — forest green
  page.drawRectangle({ x: leftW, y: 0, width: width - leftW, height, color: FOREST });

  const cx = leftW + (width - leftW) / 2;
  const cy = height / 2;

  // Decorative dots
  for (let i = -1; i <= 1; i++) {
    page.drawCircle({ x: cx + i * 10, y: cy + 72, size: i === 0 ? 2 : 1.2, color: i === 0 ? OAK : rgb(0.6, 0.45, 0.28) });
  }
  // Monogram circle
  page.drawCircle({ x: cx, y: cy + 42, size: 24, color: FOREST, borderColor: OAK, borderWidth: 0.8 });
  const bsSize = 14;
  const bsW = bold.widthOfTextAtSize('BS', bsSize);
  dt(page, 'BS', { x: cx - bsW / 2, y: cy + 37, size: bsSize, font: bold, color: OAK });
  // Studio name
  const nSize = 7.5;
  dt(page, 'BESKID', { x: cx - bold.widthOfTextAtSize('BESKID', nSize) / 2, y: cy + 6, size: nSize, font: bold, color: IVORY, characterSpacing: 2 });
  dt(page, 'STUDIO', { x: cx - bold.widthOfTextAtSize('STUDIO', nSize) / 2, y: cy - 6, size: nSize, font: bold, color: IVORY, characterSpacing: 2 });
  // "by Wiktoria Cwik"
  const byStr = 'by Wiktoria Cwik';
  const bySize = 6.5;
  dt(page, byStr, { x: cx - oblique.widthOfTextAtSize(byStr, bySize) / 2, y: cy - 22, size: bySize, font: oblique, color: OAK });
  // Separator
  page.drawLine({ start: { x: cx - 28, y: cy - 34 }, end: { x: cx + 28, y: cy - 34 }, thickness: 0.5, color: rgb(0.5, 0.38, 0.22) });
  // URL
  const urlStr = 'kosmetologwiktoriacwik.pl';
  const urlSize = 5.5;
  dt(page, urlStr, { x: cx - regular.widthOfTextAtSize(urlStr, urlSize) / 2, y: cy - 82, size: urlSize, font: regular, color: rgb(0.6, 0.72, 0.64) });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
