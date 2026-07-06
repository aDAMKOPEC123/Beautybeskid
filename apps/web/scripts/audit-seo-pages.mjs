import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const distDir = path.resolve(process.cwd(), 'dist');
const requiredMeta = [
  'property="og:type"',
  'property="og:site_name"',
  'property="og:title"',
  'property="og:description"',
  'property="og:url"',
  'property="og:image"',
  'property="og:image:alt"',
  'property="og:locale"',
  'name="twitter:card"',
  'name="twitter:title"',
  'name="twitter:description"',
  'name="twitter:image"',
];
const privateRoute = /^\/(?:auth|user|admin|employee|akademia|rezerwacja)(?:\/|$)/;

const listHtml = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listHtml(fullPath) : entry.name.endsWith('.html') ? [fullPath] : [];
  }));
  return nested.flat();
};

const exists = async (filePath) => {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
};

const internalTargetExists = async (href) => {
  const pathname = href.split(/[?#]/, 1)[0];
  if (!pathname || pathname === '/' || privateRoute.test(pathname)) return true;
  const relative = decodeURIComponent(pathname).replace(/^\/+/, '');
  return (await exists(path.join(distDir, relative)))
    || (await exists(path.join(distDir, `${relative}.html`)))
    || (await exists(path.join(distDir, relative, 'index.html')));
};

const failures = [];
const files = await listHtml(distDir);

for (const file of files) {
  const relative = path.relative(distDir, file).replaceAll('\\', '/');
  if (relative === 'spa.html' || relative === 'private-spa.html') continue;

  const html = await readFile(file, 'utf8');
  const noIndex = /<meta name="robots" content="noindex/i.test(html);
  const h1Count = (html.match(/<h1(?:\s|>)/gi) || []).length;

  if (!/<meta name="viewport" content="width=device-width, initial-scale=1(?:\.0)?"/i.test(html)) {
    failures.push(`${relative}: brak poprawnego viewport`);
  }
  if (h1Count !== 1) failures.push(`${relative}: liczba H1 = ${h1Count}`);
  for (const marker of requiredMeta) {
    if (!html.includes(marker)) failures.push(`${relative}: brak ${marker}`);
  }
  if (!/<link rel="canonical" href="https:\/\//i.test(html)) failures.push(`${relative}: brak canonical`);
  if (!/href="mailto:[^"]+"/i.test(html)) failures.push(`${relative}: brak klikalnego e-maila`);

  if (!noIndex) {
    const main = html.match(/<main data-seo-static-content[\s\S]*?<\/main>/i)?.[0] ?? '';
    const visibleText = main
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z#0-9]+;/gi, ' ');
    const wordCount = visibleText.match(/[\p{L}\p{N}][\p{L}\p{N}–-]*/gu)?.length ?? 0;
    if (wordCount < 250) failures.push(`${relative}: tylko ${wordCount} słów widocznej treści`);
  }

  const hrefs = [...html.matchAll(/href="(\/[^"\s]*)"/gi)].map((match) => match[1]);
  for (const href of new Set(hrefs)) {
    if (!(await internalTargetExists(href))) failures.push(`${relative}: niedziałający link ${href}`);
  }
}

if (failures.length) {
  console.error(`SEO audit failed (${failures.length}):\n- ${failures.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log(`SEO audit passed for ${files.length - 2} generated HTML pages.`);
}
