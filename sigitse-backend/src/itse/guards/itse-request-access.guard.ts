import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ItseService } from '../itse.service';

@Injectable()
export class ItseRequestAccessGuard implements CanActivate {
  constructor(private readonly itseService: ItseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      params: { id: string };
      user: { userId: number; role: Role };
    }>();
    const requestId = Number(request.params.id);

    return (
      Number.isInteger(requestId) &&
      this.itseService.canAccessRequest(requestId, request.user.userId, request.user.role)
    );
  }
}
