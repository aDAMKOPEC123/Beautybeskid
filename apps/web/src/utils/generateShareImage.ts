// filepath: apps/web/src/utils/generateShareImage.ts

export async function generateShareImage(
  beforeUrl: string,
  afterUrl: string,
  title: string
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const WIDTH = 1200;
  const HEIGHT = 630;
  const PADDING = 40;
  const IMG_GAP = 20;

  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  // Background
  ctx.fillStyle = '#F4F9F5';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Load images
  const [before, after] = await Promise.all([loadImage(beforeUrl), loadImage(afterUrl)]);

  // Draw images side by side
  const imgWidth = (WIDTH - PADDING * 2 - IMG_GAP) / 2;
  const imgHeight = HEIGHT - PADDING * 2 - 100; // space for text

  const imgY = PADDING;

  drawCroppedImage(ctx, before, PADDING, imgY, imgWidth, imgHeight, 16);
  drawCroppedImage(ctx, after, PADDING + imgWidth + IMG_GAP, imgY, imgWidth, imgHeight, 16);

  // "PRZED" / "PO" labels
  ctx.font = 'bold 16px "DM Sans", sans-serif';
  ctx.textAlign = 'center';

  // Before label
  ctx.fillStyle = 'rgba(20, 40, 28, 0.7)';
  ctx.fillRect(PADDING + imgWidth / 2 - 40, imgY + imgHeight - 44, 80, 32);
  roundRect(ctx, PADDING + imgWidth / 2 - 40, imgY + imgHeight - 44, 80, 32, 8);
  ctx.fillStyle = '#fff';
  ctx.fillText('PRZED', PADDING + imgWidth / 2, imgY + imgHeight - 23);

  // After label
  ctx.fillStyle = 'rgba(20, 40, 28, 0.7)';
  roundRect(ctx, PADDING + imgWidth + IMG_GAP + imgWidth / 2 - 40, imgY + imgHeight - 44, 80, 32, 8);
  ctx.fillStyle = '#fff';
  ctx.fillText('PO', PADDING + imgWidth + IMG_GAP + imgWidth / 2, imgY + imgHeight - 23);

  // Title bar
  const textY = imgY + imgHeight + 20;
  ctx.fillStyle = '#1A3828';
  ctx.font = 'bold 24px "Playfair Display", serif';
  ctx.textAlign = 'left';
  ctx.fillText(title, PADDING, textY + 25);

  // COSMO branding
  ctx.fillStyle = '#C4965A';
  ctx.font = 'bold 20px "Playfair Display", serif';
  ctx.textAlign = 'right';
  ctx.fillText('COSMO', WIDTH - PADDING, textY + 25);

  ctx.fillStyle = '#5A7A62';
  ctx.font = '14px "DM Sans", sans-serif';
  ctx.fillText('Salon Kosmetyczny', WIDTH - PADDING, textY + 48);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob!), 'image/png'));
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function drawCroppedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) {
  ctx.save();
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.clip();

  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);

  ctx.restore();
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fill();
}
