function parseLocal(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDate(iso) {
  if (!iso) return '';
  return parseLocal(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Business days from startIso up to (not including) targetIso
export function businessDayOffset(startIso, targetIso) {
  const start = parseLocal(startIso);
  const end = parseLocal(targetIso);
  if (end <= start) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur < end) {
    cur.setDate(cur.getDate() + 1);
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

// Add `offset` business days to startIso, return ISO string
export function offsetToIso(startIso, offset) {
  if (!startIso || !offset) return startIso;
  const date = parseLocal(startIso);
  let remaining = Math.round(offset);
  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) remaining--;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Format a business-day offset as "MMM D"
export function offsetToDateStr(startIso, offset) {
  if (!startIso && offset === 0) return '';
  const iso = offsetToIso(startIso, offset);
  return iso ? formatDate(iso) : '';
}

// Calendar days from todayIso to targetIso (negative = past)
export function calendarDaysUntil(todayIso, targetIso) {
  return Math.round((parseLocal(targetIso) - parseLocal(todayIso)) / 86400000);
}
