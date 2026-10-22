import { Module } from '@nestjs/common';
import { ItseController } from './itse.controller';
import { ItseService } from './itse.service';

@Module({
  controllers: [ItseController],
  providers: [ItseService]
})
export class ItseModule {}
