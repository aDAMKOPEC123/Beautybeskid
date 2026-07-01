import { readFileSync, writeFileSync } from 'fs';

const path = 'C:/Users/Adam/Desktop/strona1/cosmo-app/apps/web/src/api/employees.api.ts';
let content = readFileSync(path, 'utf8');

const marker = `  // ── My schedule (employee self-service) ──────────────────────────────────────`;

const addition = `  upsertWeekForEmployee: async (employeeId: string, days: WeekDayInput[]): Promise<void> => {
    await api.post(\`/employees/\${employeeId}/schedule/week\`, { days });
  },
  blockMonthForEmployee: async (employeeId: string, year: number, month: number): Promise<void> => {
    await api.post(\`/employees/\${employeeId}/schedule/block-month\`, { year, month });
  },

  // ── My schedule (employee self-service) ──────────────────────────────────────`;

const newContent = content.replace(marker, addition);
if (newContent === content) {
  console.log('NO MATCH - marker not found');
  process.exit(1);
}
writeFileSync(path, newContent);
console.log('Done');
