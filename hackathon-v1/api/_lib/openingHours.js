const OSM_DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function parseMinutes(token) {
  const t = String(token || '').trim();
  const match = t.match(/^(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2] || '0');
  if (hours > 24 || minutes > 59) return null;
  return Math.min(24 * 60, hours * 60 + minutes);
}

function expandDays(spec) {
  if (!spec) return [...OSM_DAYS];
  const parts = spec.split(',').map((p) => p.trim()).filter(Boolean);
  const days = new Set();
  for (const part of parts) {
    if (part === 'PH' || part === 'SH') continue;
    if (part.includes('-')) {
      const [from, to] = part.split('-').map((d) => d.trim());
      const start = OSM_DAYS.indexOf(from);
      const end = OSM_DAYS.indexOf(to);
      if (start < 0 || end < 0) continue;
      let i = start;
      while (true) {
        days.add(OSM_DAYS[i]);
        if (i === end) break;
        i = (i + 1) % 7;
      }
    } else if (OSM_DAYS.includes(part)) {
      days.add(part);
    }
  }
  return [...days];
}

function parseIntervals(times) {
  if (!times || times === 'off' || times === 'closed') return [];
  if (times === 'open' || times === '24/7') return [{ start: 0, end: 24 * 60 }];
  return times.split(',').flatMap((chunk) => {
    const [rawStart, rawEnd] = chunk.split('-').map((s) => s.trim());
    const start = parseMinutes(rawStart);
    const end = parseMinutes(rawEnd);
    if (start == null || end == null) return [];
    if (end <= start) return [{ start, end: end + 24 * 60 }];
    return [{ start, end }];
  });
}

function formatClock(minutes) {
  const normalized = ((minutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  return mins === 0 ? `${h12}:00 ${ampm}` : `${h12}:${String(mins).padStart(2, '0')} ${ampm}`;
}

function formatIntervals(intervals) {
  if (!intervals?.length) return 'Closed';
  if (intervals.length === 1 && intervals[0].start === 0 && intervals[0].end >= 24 * 60) {
    return 'Open 24 hours';
  }
  return intervals.map(({ start, end }) => `${formatClock(start)} – ${formatClock(end)}`).join(', ');
}

export function parseOpeningHours(raw) {
  if (raw == null || raw === '') return null;
  const value = String(raw).trim();
  if (!value) return null;
  if (/^(24\/7|open)$/i.test(value)) {
    const always = OSM_DAYS.reduce((acc, day) => {
      acc[day] = [{ start: 0, end: 24 * 60 }];
      return acc;
    }, {});
    return always;
  }

  const byDay = OSM_DAYS.reduce((acc, day) => {
    acc[day] = null;
    return acc;
  }, {});

  let parsedAny = false;
  const rules = value.split(';').map((r) => r.trim()).filter(Boolean);
  for (const rule of rules) {
    if (/^\d{2}\s+\w{3}/.test(rule) || /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i.test(rule)) {
      continue;
    }
    if (/^(PH|SH)\b/.test(rule)) continue;

    let daysPart = '';
    let timesPart = rule;
    const match = rule.match(/^((?:(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?|(?:PH|SH))(?:\s*,\s*(?:(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?|(?:PH|SH)))*)\s+(.*)$/);
    if (match) {
      daysPart = match[1];
      timesPart = match[2];
    }
    const days = expandDays(daysPart);
    if (days.length === 0) continue;
    const intervals = parseIntervals(timesPart.trim().toLowerCase());
    parsedAny = true;
    for (const day of days) byDay[day] = intervals;
  }

  if (!parsedAny) return null;
  return byDay;
}

export function isOpenAt(byDay, date = new Date()) {
  if (!byDay) return null;
  const osmDay = OSM_DAYS[(date.getDay() + 6) % 7];
  const intervals = byDay[osmDay];
  if (!intervals) return null;
  if (intervals.length === 0) return false;
  const now = date.getHours() * 60 + date.getMinutes();
  return intervals.some(({ start, end }) => {
    if (now >= start && now < end) return true;
    if (end > 24 * 60 && now + 24 * 60 >= start && now + 24 * 60 < end) return true;
    return false;
  });
}

export function weekdayText(byDay) {
  if (!byDay) return [];
  return OSM_DAYS.map((day, i) => `${WEEKDAY_NAMES[i]}: ${formatIntervals(byDay[day] || [])}`);
}

export function openingHoursFromTag(raw, date = new Date()) {
  const byDay = parseOpeningHours(raw);
  if (!byDay) return null;
  const openNow = isOpenAt(byDay, date);
  return {
    open_now: openNow,
    weekday_text: weekdayText(byDay),
  };
}
