import { describe, expect, it } from 'vitest';
import { isOpenAt, openingHoursFromTag, parseOpeningHours, weekdayText } from './openingHours.js';

function localDate(year, month, day, hour, minute) {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

describe('parseOpeningHours', () => {
  it('treats 24/7 as always open', () => {
    const monday = localDate(2026, 11, 2, 3, 0);
    const parsed = openingHoursFromTag('24/7', monday);
    expect(parsed.open_now).toBe(true);
    expect(parsed.weekday_text).toHaveLength(7);
    expect(parsed.weekday_text[0]).toContain('Open 24 hours');
  });

  it('parses weekday ranges and later-rule overrides', () => {
    const byDay = parseOpeningHours('Mo-Fr 09:00-18:00; Sa 10:00-14:00; Su off');
    expect(isOpenAt(byDay, localDate(2026, 11, 2, 10, 0))).toBe(true);
    expect(isOpenAt(byDay, localDate(2026, 11, 2, 19, 0))).toBe(false);
    expect(isOpenAt(byDay, localDate(2026, 11, 7, 11, 0))).toBe(true);
    expect(isOpenAt(byDay, localDate(2026, 11, 8, 11, 0))).toBe(false);
    expect(weekdayText(byDay)[6]).toBe('Sunday: Closed');
  });

  it('handles overnight intervals', () => {
    const byDay = parseOpeningHours('Mo-Su 22:00-02:00');
    expect(isOpenAt(byDay, localDate(2026, 11, 2, 23, 0))).toBe(true);
    expect(isOpenAt(byDay, localDate(2026, 11, 2, 1, 0))).toBe(true);
    expect(isOpenAt(byDay, localDate(2026, 11, 2, 12, 0))).toBe(false);
  });

  it('returns null for missing or unparseable tags', () => {
    expect(openingHoursFromTag(null)).toBeNull();
    expect(openingHoursFromTag('')).toBeNull();
    expect(openingHoursFromTag('Apr-Oct sunrise-sunset')).toBeNull();
  });
});
