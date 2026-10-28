import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ItseService } from './itse.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('ItseService', () => {
  let service: ItseService;
  const prismaMock = {
    itseRequest: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    document: { create: jest.fn() },
    payment: { create: jest.fn() },
    user: { findUnique: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItseService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<ItseService>(ItseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a request using the authenticated user ID', async () => {
    const dto = { title: 'Request', description: 'Details' };
    prismaMock.itseRequest.create.mockResolvedValue({ id: 12, ...dto, userId: 5 });

    await service.create(dto, 5);

    expect(prismaMock.itseRequest.create).toHaveBeenCalledWith({
      data: { ...dto, userId: 5 },
    });
  });

  it('limits administrado list results to their own requests', async () => {
    prismaMock.itseRequest.findMany.mockResolvedValue([]);

    await service.findAll(5, Role.ADMINISTRADO);

    expect(prismaMock.itseRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 5 } }),
    );
  });

  it('limits inspector list results to assigned requests', async () => {
    prismaMock.itseRequest.findMany.mockResolvedValue([]);

    await service.findAll(8, Role.INSPECTOR);

    expect(prismaMock.itseRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { inspectorId: 8 } }),
    );
  });

  it('does not allow paying for another user request', async () => {
    prismaMock.itseRequest.findFirst.mockResolvedValue(null);

    await expect(
      service.registerPayment(
        12,
        { receiptNumber: 'receipt-1', amount: 25 },
        5,
        Role.ADMINISTRADO,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
  });

  it('does not allow an inspector to review an unassigned request', async () => {
    prismaMock.itseRequest.findFirst.mockResolvedValue(null);

    await expect(
      service.reviewRequest(12, { action: 'APROBADO' }, 8, Role.INSPECTOR),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prismaMock.itseRequest.update).not.toHaveBeenCalled();
  });
});
