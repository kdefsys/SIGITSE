import { Module } from '@nestjs/common';
import { ItseController } from './itse.controller';
import { ItseService } from './itse.service';
import { ItseRequestAccessGuard } from './guards/itse-request-access.guard';

@Module({
  controllers: [ItseController],
  providers: [ItseService, ItseRequestAccessGuard],
})
export class ItseModule {}
