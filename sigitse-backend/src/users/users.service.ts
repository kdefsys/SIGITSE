import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const userListSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  listUsers() {
    return this.prisma.user.findMany({
      select: userListSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  updateRole(userId: number, role: Role, actorUserId: number) {
    if (userId === actorUserId && role !== Role.ADMIN) {
      throw new ForbiddenException('No puedes cambiar tu propio rol de administrador');
    }

    return this.prisma.$transaction(
      async (transaction) => {
        const user = await transaction.user.findUnique({
          where: { id: userId },
          select: { id: true, role: true },
        });

        if (!user) {
          throw new NotFoundException('No se encontró el usuario');
        }

        if (user.role === Role.ADMIN && role !== Role.ADMIN) {
          const adminCount = await transaction.user.count({
            where: { role: Role.ADMIN },
          });

          if (adminCount <= 1) {
            throw new ConflictException('No se puede quitar el rol al último administrador');
          }
        }

        return transaction.user.update({
          where: { id: userId },
          data: { role },
          select: userListSelect,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
