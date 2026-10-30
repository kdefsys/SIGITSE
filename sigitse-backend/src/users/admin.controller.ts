import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UsersService } from './users.service';

type AuthenticatedRequest = Request & {
  user: { userId: number; email: string; role: Role };
};

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly usersService: UsersService) {}

  @Get('dashboard')
  @Roles('ADMIN')
  getAdminDashboard() {
    return { message: 'Bienvenido al panel de administración' };
  }

  @Get('users')
  @Roles('ADMIN')
  listUsers() {
    return this.usersService.listUsers();
  }

  @Patch('users/:id/role')
  @Roles('ADMIN')
  updateUserRole(
    @Param('id', ParseIntPipe) userId: number,
    @Body() dto: UpdateUserRoleDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.usersService.updateRole(userId, dto.role, request.user.userId);
  }
}
