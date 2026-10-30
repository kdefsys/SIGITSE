import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ItseModule } from './itse/itse.module';
import { AuthModule } from './auth/auth.module';
import { AdminController } from './users/admin.controller';
import { UsersService } from './users/users.service';

@Module({
  imports: [PrismaModule, ItseModule, AuthModule],
  controllers: [AppController, AdminController],
  providers: [AppService, UsersService],
})
export class AppModule {}
