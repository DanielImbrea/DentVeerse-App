/** Local calendar day as YYYY-MM-DD from an ISO timestamp. */
export function toLocalDateKey(iso: string): string {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Inclusive local-day bounds for Supabase range filters (end exclusive). */
export function getLocalDayBounds(dateYmd: string): { startIso: string; endIso: string } {
  const [year, month, day] = dateYmd.split('-').map(Number);
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  const end = new Date(year, month - 1, day + 1, 0, 0, 0, 0);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export function formatDateKeyRo(dateYmd: string, options?: { weekday?: boolean }): string {
  const [year, month, day] = dateYmd.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  return date.toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: options?.weekday ? 'long' : undefined,
  });
}

export function parseDateKey(dateYmd: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateYmd.split('-').map(Number);
  return { year, month, day };
}

/** Days in month grid (Mon-first), including leading/trailing padding. */
export function buildCalendarCells(year: number, month: number): Array<{ day: number; inMonth: boolean; dateKey: string }> {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const daysInMonth = last.getDate();
  // Monday = 0 … Sunday = 6
  const mondayFirstIndex = (first.getDay() + 6) % 7;
  const cells: Array<{ day: number; inMonth: boolean; dateKey: string }> = [];

  for (let i = 0; i < mondayFirstIndex; i++) {
    const prevDay = new Date(year, month - 1, -mondayFirstIndex + i + 1);
    cells.push({
      day: prevDay.getDate(),
      inMonth: false,
      dateKey: toLocalDateKey(prevDay.toISOString()),
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({ day, inMonth: true, dateKey });
  }

  while (cells.length % 7 !== 0) {
    const nextIndex = cells.length - mondayFirstIndex - daysInMonth + 1;
    const nextDay = new Date(year, month, nextIndex);
    cells.push({
      day: nextDay.getDate(),
      inMonth: false,
      dateKey: toLocalDateKey(nextDay.toISOString()),
    });
  }

  return cells;
}
