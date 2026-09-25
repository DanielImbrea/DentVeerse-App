/** Parses DD.MM.YYYY into ISO date (YYYY-MM-DD). */
export function parseRomanianDate(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900) return null;

  const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const parsed = new Date(`${iso}T12:00:00`);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() + 1 !== month ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return iso;
}

/** Formats ISO date (YYYY-MM-DD) for display as DD.MM.YYYY. */
export function formatRomanianDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return iso;
  return `${Number(match[3])}.${Number(match[2])}.${match[1]}`;
}

/** Friendly label e.g. „15 martie 1990”. */
export function formatRomanianDateLong(iso: string | null | undefined): string {
  if (!iso) return '';
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return iso;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0);
  return date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function isoDateToLocalDate(iso: string): Date {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0);
}

export function localDateToIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Sensible default when opening the picker (≈30 years ago). */
export function defaultBirthDatePickerValue(): Date {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 30);
  date.setHours(12, 0, 0, 0);
  return date;
}

export const MIN_BIRTH_DATE = new Date(1920, 0, 1, 12, 0, 0);

export function maxBirthDate(): Date {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return today;
}
