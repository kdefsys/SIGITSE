import { calculateDueDate, limaDate } from './business-calendar';

describe('Lima business calendar', () => {
  it('counts nine weekdays after the start date and skips seeded holidays', () => {
    const start = new Date('2026-11-02T18:00:00.000Z');
    const holidays = new Set(['2026-11-09']);

    expect(calculateDueDate(start, holidays).toISOString().slice(0, 10)).toBe(
      '2026-11-16',
    );
  });

  it('uses the Lima calendar date when the server timestamp is near midnight UTC', () => {
    expect(limaDate(new Date('2026-11-03T02:00:00.000Z'))).toBe('2026-11-02');
  });
});
