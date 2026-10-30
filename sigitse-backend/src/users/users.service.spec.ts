import { jest } from '@jest/globals';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const transactionClient = {
    user: {
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  };
  const prismaMock = {
    $transaction: jest.fn(
      async (callback: (transaction: typeof transactionClient) => Promise<unknown>) =>
        callback(transactionClient),
    ),
    user: {
      findMany: jest.fn(),
    },
  };
  const service = new UsersService(prismaMock as unknown as PrismaService);
  const adminUser = { id: 1, name: 'Admin', email: 'admin@example.com', role: Role.ADMIN };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not allow an administrator to remove their own role', async () => {
    expect(() => service.updateRole(1, Role.ADMINISTRADO, 1)).toThrow(ForbiddenException);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('keeps the last administrator from losing the admin role', async () => {
    transactionClient.user.findUnique.mockResolvedValue({ id: 1, role: Role.ADMIN });
    transactionClient.user.count.mockResolvedValue(1);

    await expect(service.updateRole(2, Role.INSPECTOR, 1)).rejects.toThrow(ConflictException);
    expect(transactionClient.user.update).not.toHaveBeenCalled();
  });

  it('updates the role when another administrator remains', async () => {
    const updatedUser = { ...adminUser, role: Role.INSPECTOR };
    transactionClient.user.findUnique.mockResolvedValue({ id: 2, role: Role.ADMIN });
    transactionClient.user.count.mockResolvedValue(2);
    transactionClient.user.update.mockResolvedValue(updatedUser);

    await expect(service.updateRole(2, Role.INSPECTOR, 1)).resolves.toEqual(updatedUser);
    expect(transactionClient.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 2 }, data: { role: Role.INSPECTOR } }),
    );
    expect(prismaMock.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  });
});
