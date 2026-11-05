import { Injectable } from '@nestjs/common';
import type {
  ItseRequestStatusChangedEvent,
  ItseRequestStatusObserver,
} from './itse-request-status.observer';

@Injectable()
export class ItseRequestHistoryObserver implements ItseRequestStatusObserver {
  async update(event: ItseRequestStatusChangedEvent): Promise<void> {
    await event.transaction.itseRequestHistory.create({
      data: {
        requestId: event.requestId,
        actorId: event.actorId,
        action: event.action,
        description: event.description,
        fromStatus: event.fromStatus,
        toStatus: event.toStatus,
      },
    });
  }
}
