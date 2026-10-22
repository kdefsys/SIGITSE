import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ItseModule } from './itse/itse.module';

@Module({
  imports: [PrismaModule, ItseModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
