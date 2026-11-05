import type { Prisma, RequestStatus } from '@prisma/client';

export type ItseRequestStatusChangedEvent = {
  transaction: Pick<Prisma.TransactionClient, 'itseRequestHistory'>;
  requestId: number;
  actorId: number;
  action: string;
  description: string;
  fromStatus: RequestStatus;
  toStatus: RequestStatus;
};

export interface ItseRequestStatusObserver {
  update(event: ItseRequestStatusChangedEvent): Promise<void>;
}
