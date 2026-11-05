import { ItseRequestStatusSubject } from './itse-request-status.subject';
import type { ItseRequestStatusChangedEvent } from './itse-request-status.observer';

describe('ItseRequestStatusSubject', () => {
  it('notifies every subscribed observer and waits for their work', async () => {
    const calls: string[] = [];
    const event = {} as ItseRequestStatusChangedEvent;
    const subject = new ItseRequestStatusSubject([
      {
        update: async (receivedEvent) => {
          expect(receivedEvent).toBe(event);
          await Promise.resolve();
          calls.push('first');
        },
      },
    ]);
    subject.subscribe({
      update: async (receivedEvent) => {
        expect(receivedEvent).toBe(event);
        calls.push('second');
      },
    });

    await subject.notify(event);

    expect(calls).toEqual(['first', 'second']);
  });
});
