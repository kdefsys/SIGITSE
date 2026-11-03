import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ItseService } from './itse.service';
import { ReviewAction } from './dto/review-itse.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ItseService', () => {
  let service: ItseService;
  const transactionMock = {
    itseRequest: {
      create: jest.fn<() => Promise<unknown>>(),
      update: jest.fn<() => Promise<unknown>>(),
    },
    itseRequestHistory: { create: jest.fn<() => Promise<unknown>>() },
    document: { create: jest.fn<() => Promise<unknown>>() },
    payment: { create: jest.fn<() => Promise<unknown>>() },
  };
  const prismaMock = {
    itseRequest: {
      findMany: jest.fn<() => Promise<unknown>>(),
      findFirst: jest.fn<() => Promise<unknown>>(),
      findUnique: jest.fn<() => Promise<unknown>>(),
    },
    businessHoliday: { findMany: jest.fn<() => Promise<unknown>>() },
    document: { findFirst: jest.fn<() => Promise<unknown>>() },
    $transaction: jest.fn(
      async (
        callback: (transaction: typeof transactionMock) => Promise<unknown>,
      ) => callback(transactionMock),
    ),
    user: { findUnique: jest.fn<() => Promise<unknown>>() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.businessHoliday.findMany.mockResolvedValue([]);
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
    transactionMock.itseRequest.create.mockResolvedValue({
      id: 12,
      ...dto,
      userId: 5,
      status: 'PENDIENTE',
    });
    transactionMock.itseRequestHistory.create.mockResolvedValue({});

    await service.create(dto, 5);

    expect(transactionMock.itseRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ...dto,
        userId: 5,
        dueAt: expect.any(Date),
      }),
    });
    expect(transactionMock.itseRequestHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        requestId: 12,
        actorId: 5,
        action: 'SOLICITUD_RECIBIDA',
        toStatus: 'PENDIENTE',
      }),
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
    expect(transactionMock.payment.create).not.toHaveBeenCalled();
  });

  it.each([ReviewAction.OBSERVAR, ReviewAction.RECHAZAR])(
    'rejects %s without a nonblank reason',
    async (action) => {
      prismaMock.itseRequest.findFirst.mockResolvedValue({
        status: 'EN_REVISION',
      });
      await expect(
        service.reviewRequest(
          12,
          { action, observation: '   ' },
          8,
          Role.INSPECTOR,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(transactionMock.itseRequest.update).not.toHaveBeenCalled();
    },
  );

  it('does not allow an inspector to review an unassigned request', async () => {
    prismaMock.itseRequest.findFirst.mockResolvedValue(null);

    await expect(
      service.reviewRequest(
        12,
        { action: ReviewAction.APROBAR },
        8,
        Role.INSPECTOR,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(transactionMock.itseRequest.update).not.toHaveBeenCalled();
  });
});
