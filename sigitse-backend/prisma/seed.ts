import { PrismaClient } from '@prisma/client';
import { calculateDueDate, dateOnlyUtc, limaDate } from '../src/itse/business-calendar';

const prisma = new PrismaClient();
const calendarScope = 'LIMA';

function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function dateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function peruHolidays(year: number) {
  const fixedDates: Array<[number, number, string]> = [
    [1, 1, 'Año Nuevo'],
    [5, 1, 'Día del Trabajo'],
    [6, 7, 'Batalla de Arica y Día de la Bandera'],
    [6, 29, 'San Pedro y San Pablo'],
    [7, 23, 'Día de la Fuerza Aérea del Perú'],
    [7, 28, 'Fiestas Patrias'],
    [7, 29, 'Fiestas Patrias'],
    [8, 6, 'Batalla de Junín'],
    [8, 30, 'Santa Rosa de Lima'],
    [10, 8, 'Combate de Angamos'],
    [11, 1, 'Día de Todos los Santos'],
    [12, 8, 'Inmaculada Concepción'],
    [12, 9, 'Batalla de Ayacucho'],
    [12, 25, 'Navidad'],
  ];
  const easter = easterSunday(year);
  const thursday = new Date(easter);
  thursday.setUTCDate(thursday.getUTCDate() - 3);
  const friday = new Date(easter);
  friday.setUTCDate(friday.getUTCDate() - 2);

  return [
    ...fixedDates.map(([month, day, name]) => ({
      date: new Date(Date.UTC(year, month - 1, day)),
      name,
      scope: calendarScope,
    })),
    { date: thursday, name: 'Jueves Santo', scope: calendarScope },
    { date: friday, name: 'Viernes Santo', scope: calendarScope },
  ];
}

async function main() {
  const requests = await prisma.itseRequest.findMany({
    select: { id: true, startedAt: true },
  });
  const requestYears = requests.map(
    ({ startedAt }) => Number(limaDate(startedAt).slice(0, 4)),
  );
  const firstYear = Math.min(2025, ...requestYears);
  const lastYear = Math.max(
    new Date().getUTCFullYear() + 10,
    ...requestYears.map((year) => year + 1),
  );
  const holidays = Array.from(
    { length: lastYear - firstYear + 1 },
    (_, index) => peruHolidays(firstYear + index),
  ).flat();

  await prisma.businessHoliday.createMany({
    data: holidays.map(({ date, name, scope }) => ({
      date: dateOnly(date),
      name,
      scope,
    })),
    skipDuplicates: true,
  });

  for (const request of requests) {
    const startDate = new Date(`${limaDate(request.startedAt)}T00:00:00.000Z`);
    const holidayEnd = new Date(startDate);
    holidayEnd.setUTCDate(holidayEnd.getUTCDate() + 60);
    const requestHolidays = await prisma.businessHoliday.findMany({
      where: {
        scope: calendarScope,
        date: { gte: dateOnlyUtc(startDate), lte: dateOnlyUtc(holidayEnd) },
      },
      select: { date: true },
    });
    const dueAt = calculateDueDate(
      request.startedAt,
      new Set(requestHolidays.map(({ date }) => date.toISOString().slice(0, 10))),
    );
    await prisma.itseRequest.update({
      where: { id: request.id },
      data: { dueAt },
    });
  }
}

main()
  .catch((error: unknown) => {
    console.error('No se pudo cargar el calendario feriado de Lima.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
