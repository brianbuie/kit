import { format, formatISO, type DateArg } from 'date-fns';
import formatDuration from 'format-duration';

/**
 * Helpers for formatting dates, times, and numbers as strings
 */
export class Format {
  /**
   * date-fns format() with some shortcuts
   * @param formatStr the format to use
   * @param date the date to format, default `new Date()`
   * @example
   * Format.date('iso') // '2026-04-08T13:56:45Z'
   * Format.date('ymd') // '20260408'
   * Format.date('ymd-hm') // '20260408-1356'
   * Format.date('ymd-hms') // '20260408-135645'
   * Format.date('h:m:s') // '13:56:45'
   * @see more format options https://date-fns.org/v4.1.0/docs/format
   */
  static date = (
    formatStr: 'iso' | 'ymd' | 'ymd-hm' | 'ymd-hms' | 'h:m:s' | string = 'iso',
    d: DateArg<Date> = new Date(),
  ): string => {
    if (formatStr === 'iso') return formatISO(d);
    if (formatStr === 'ymd') return format(d, 'yyyyMMdd');
    if (formatStr === 'ymd-hm') return format(d, 'yyyyMMdd-HHmm');
    if (formatStr === 'ymd-hms') return format(d, 'yyyyMMdd-HHmmss');
    if (formatStr === 'h:m:s') return format(d, 'HH:mm:ss');
    return format(d, formatStr);
  };

  /**
   * Round a number to a specific set of places
   */
  static round = (n: number, places = 0): string => {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: places }).format(n);
  };

  static plural = (amount: number, singular: string, multiple?: string): string => {
    return amount === 1 ? `${amount} ${singular}` : `${amount} ${multiple || singular + 's'}`;
  };

  /**
   * Make millisecond durations actually readable (eg "123ms", "3.56s", "1m 34s", "3h 24m", "2d 4h")
   * @param ms milliseconds
   * @param style 'digital' to output as 'HH:MM:SS'
   * @see details on 'digital' format https://github.com/ungoldman/format-duration
   * @see waiting on `Intl.DurationFormat({ style: 'digital' })` types https://github.com/microsoft/TypeScript/issues/60608
   */
  static ms = (ms: number, style?: 'digital'): string => {
    if (style === 'digital') return formatDuration(ms, { leading: true });
    if (ms < 1000) return `${this.round(ms)}ms`;
    const s = ms / 1000;
    if (s < 60) return `${this.round(s, 2)}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ${Math.floor(s) % 60}s`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ${m % 60}m`;
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h`;
  };

  static bytes = (b: number): string => {
    const labels = ['b', 'KB', 'MB', 'GB', 'TB'];
    let factor = 0;
    while (b >= 1024 && labels[factor + 1]) {
      b = b / 1024;
      factor++;
    }
    return `${this.round(b, 2)} ${labels[factor]}`;
  };
}
