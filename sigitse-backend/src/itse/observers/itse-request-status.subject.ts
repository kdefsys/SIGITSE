import type {
  ItseRequestStatusChangedEvent,
  ItseRequestStatusObserver,
} from './itse-request-status.observer';

export class ItseRequestStatusSubject {
  constructor(private readonly observers: ItseRequestStatusObserver[] = []) {}

  subscribe(observer: ItseRequestStatusObserver): void {
    this.observers.push(observer);
  }

  async notify(event: ItseRequestStatusChangedEvent): Promise<void> {
    for (const observer of this.observers) {
      await observer.update(event);
    }
  }
}
