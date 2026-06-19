// filepath: apps/web/src/components/skin-weather/WeatherDayCard.tsx

interface HourlyWeather {
  time: string[];
  temperature_2m: number[];
  uv_index: number[];
  precipitation_probability: number[];
  cloud_cover?: number[];
}

interface WeatherDayCardProps {
  weatherData: { hourly?: HourlyWeather } | null | undefined;
  cityName?: string;
}

interface Column {
  hour: number;
  temp: number | null;
  uv: number | null;
  precip: number;
  cloud: number | undefined;
}

const DISPLAY_HOURS = [6, 8, 10, 12, 13, 15, 17, 19, 21];
const isNight = (hour: number) => hour >= 21 || hour < 6;

function barColor(temp: number | null, isThirteen: boolean): string {
  if (isThirteen) return 'bg-red-500';
  if (temp === null) return 'bg-muted';
  if (temp < 10) return 'bg-indigo-400';
  if (temp < 18) return 'bg-violet-400';
  if (temp < 25) return 'bg-amber-400';
  return 'bg-red-500';
}

function getEmoji(hour: number, uv: number | null, precip: number, cloud: number | undefined): string {
  if (hour === 13 && uv !== null && uv >= 6) return '🌞';
  if (isNight(hour)) return '🌙';
  if (cloud === undefined) return '🌥️';
  if (cloud < 20) return '☀️';
  if (cloud < 50 && precip < 30) return '⛅';
  if (cloud < 50) return '🌦';
  if (cloud < 80 && precip >= 30) return '🌦';
  if (cloud < 80) return '☁️';
  if (precip >= 50) return '🌧️';
  return '🌥️';
}

function uvColor(uv: number | null): string {
  if (uv === null) return 'text-muted-foreground';
  if (uv <= 2) return 'text-green-400';
  if (uv <= 5) return 'text-yellow-400';
  if (uv <= 7) return 'text-orange-400';
  return 'text-red-400';
}

function uvLabel(uv: number | null, hour: number): string {
  if (uv === null || (uv === 0 && isNight(hour))) return '—';
  return 'UV ' + uv;
}

function buildColumns(hourly: HourlyWeather): Column[] {
  const result: Column[] = [];
  for (const hour of DISPLAY_HOURS) {
    const suffix = 'T' + String(hour).padStart(2, '0') + ':00';
    const idx = hourly.time.findIndex((t: string) => t.includes(suffix));
    if (idx === -1) continue;
    result.push({
      hour,
      temp:   hourly.temperature_2m[idx] ?? null,
      uv:     hourly.uv_index[idx] ?? null,
      precip: hourly.precipitation_probability[idx] ?? 0,
      cloud:  hourly.cloud_cover ? hourly.cloud_cover[idx] : undefined,
    });
  }
  return result;
}

export function WeatherDayCard({ weatherData, cityName }: WeatherDayCardProps) {
  const hourly = weatherData?.hourly;
  if (!hourly) return null;

  const columns = buildColumns(hourly);
  if (columns.length === 0) return null;

  const temps = columns.map(c => c.temp).filter((t): t is number => t !== null);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);

  const getBarHeight = (temp: number | null): number => {
    if (temp === null) return 4;
    return 4 + ((temp - minTemp) / Math.max(maxTemp - minTemp, 1)) * 24;
  };

  const col13 = columns.find(c => c.hour === 13);
  const uvMax = Math.max(...columns.map(c => c.uv ?? 0));
  const tempAt13 = col13?.temp ?? temps[Math.floor(temps.length / 2)] ?? null;
  const headerEmoji = col13 ? getEmoji(13, col13.uv, col13.precip, col13.cloud) : '⛅';

  return (
    <div className="weather-day-card rounded-2xl bg-card border border-border/60 overflow-hidden mb-4">
      <div className="flex items-start gap-4 px-4 pt-4 pb-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400/20 to-indigo-500/20 flex items-center justify-center text-2xl flex-shrink-0">
          {headerEmoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums">
              {tempAt13 !== null ? Math.round(tempAt13) + '°' : '—'}
            </span>
            <span className="text-sm text-muted-foreground font-normal">
              {'max '}{temps.length > 0 ? Math.round(Math.max(...temps)) + '°' : '—'}
            </span>
          </div>
          {cityName && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{cityName}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {col13?.cloud !== undefined && (
              <span className="text-[11px] bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-full">
                {'☁ '}{col13.cloud}{'% chmur'}
              </span>
            )}
            {uvMax > 0 && (
              <span className={[
                'text-[11px] px-2 py-0.5 rounded-full font-medium',
                uvMax >= 8 ? 'bg-red-500/20 text-red-400' :
                uvMax >= 6 ? 'bg-orange-500/20 text-orange-400' :
                uvMax >= 3 ? 'bg-yellow-500/20 text-yellow-400' :
                             'bg-green-500/20 text-green-400',
              ].join(' ')}>
                {'UV max '}{uvMax}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-3 pb-4">
        <div className="flex gap-1 items-end mb-1" style={{ height: '32px' }}>
          {columns.map((col, i) => {
            const h = getBarHeight(col.temp);
            const isThirteen = col.hour === 13;
            return (
              <div key={col.hour} className="flex-1 flex items-end justify-center">
                <div
                  className={[
                    'w-full rounded-t-sm animate-barGrow motion-reduce:animate-none',
                    barColor(col.temp, isThirteen),
                    isThirteen ? 'shadow-[0_0_8px_rgba(239,68,68,0.4)]' : '',
                  ].join(' ')}
                  style={{
                    height: h + 'px',
                    transformOrigin: 'bottom',
                    animationDelay: i * 50 + 'ms',
                    animationFillMode: 'both',
                  }}
                />
              </div>
            );
          })}
        </div>

        <div className="flex gap-1 overflow-x-auto w-full [scrollbar-width:none]">
          {columns.map((col, i) => {
            const isThirteen = col.hour === 13;
            return (
              <div
                key={col.hour}
                className={[
                  'flex-shrink-0 min-w-[40px] flex-1 basis-[40px] flex flex-col items-center gap-1 py-2 px-1 rounded-xl',
                  'animate-slideIn motion-reduce:animate-none',
                  isThirteen
                    ? 'bg-gradient-to-b from-indigo-600/80 to-violet-700/80 animate-pulseGlow'
                    : 'hover:bg-muted/30 transition-colors',
                ].join(' ')}
                style={{
                  animationDelay: i * 50 + 'ms',
                  animationFillMode: 'both',
                }}
              >
                <span className="text-[10px] text-muted-foreground">
                  {String(col.hour).padStart(2, '0')}
                </span>
                <span className="text-base leading-none">
                  {getEmoji(col.hour, col.uv, col.precip, col.cloud)}
                </span>
                <span className="text-[11px] font-semibold tabular-nums">
                  {col.temp !== null ? Math.round(col.temp) + '°' : '—'}
                </span>
                <span className={['text-[9px] font-semibold', uvColor(col.uv)].join(' ')}>
                  {uvLabel(col.uv, col.hour)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
