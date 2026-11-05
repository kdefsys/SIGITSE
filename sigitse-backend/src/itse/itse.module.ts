import { Module } from '@nestjs/common';
import { ItseController } from './itse.controller';
import { ItseService } from './itse.service';
import { ItseRequestAccessGuard } from './guards/itse-request-access.guard';
import { ItseRequestHistoryObserver } from './observers/itse-request-history.observer';
import { ItseRequestStatusSubject } from './observers/itse-request-status.subject';

@Module({
  controllers: [ItseController],
  providers: [
    ItseService,
    ItseRequestAccessGuard,
    ItseRequestHistoryObserver,
    {
      provide: ItseRequestStatusSubject,
      useFactory: (historyObserver: ItseRequestHistoryObserver) =>
        new ItseRequestStatusSubject([historyObserver]),
      inject: [ItseRequestHistoryObserver],
    },
  ],
})
export class ItseModule {}
