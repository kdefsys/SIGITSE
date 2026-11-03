const LIMA_TIME_ZONE = 'America/Lima';

export function limaDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: LIMA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((value) => value.type === type)?.value;
  const year = part('year');
  const month = part('month');
  const day = part('day');

  if (!year || !month || !day) {
    throw new Error('No se pudo determinar la fecha local de Lima.');
  }

  return `${year}-${month}-${day}`;
}

export function calculateDueDate(startedAt: Date, holidayDates: Set<string>): Date {
  const [year, month, day] = limaDate(startedAt).split('-').map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  let businessDays = 0;

  while (businessDays < 9) {
    candidate.setUTCDate(candidate.getUTCDate() + 1);
    const weekday = candidate.getUTCDay();
    const date = candidate.toISOString().slice(0, 10);
    if (weekday !== 0 && weekday !== 6 && !holidayDates.has(date)) {
      businessDays += 1;
    }
  }

  return candidate;
}

export function dateOnlyUtc(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}
