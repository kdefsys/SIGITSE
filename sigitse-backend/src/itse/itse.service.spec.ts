import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ItseService } from './itse.service';
import { ReviewAction } from './dto/review-itse.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

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

  describe('findOne access contract', () => {
    const requestId = 12;

    it('allows an administrado to consult their own request', async () => {
      prismaMock.itseRequest.findFirst.mockResolvedValue({
        id: requestId,
        title: 'Local',
        description: 'Inspección',
        status: 'PENDIENTE',
        createdAt: new Date('2026-10-01T12:00:00.000Z'),
        updatedAt: new Date('2026-10-01T12:00:00.000Z'),
        startedAt: new Date('2026-10-01T12:00:00.000Z'),
        dueAt: new Date('2026-10-14T00:00:00.000Z'),
        inspectorId: null,
        user: { id: 5, name: 'Owner', email: 'owner@example.com' },
        inspector: null,
        payment: null,
        documents: [],
        history: [],
      });

      const result = await service.findOne(requestId, 5, Role.ADMINISTRADO);

      expect(prismaMock.itseRequest.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: requestId, userId: 5 } }),
      );
      expect(result).toMatchObject({
        id: requestId,
        startedAt: expect.any(Date),
        dueAt: expect.any(Date),
        user: { id: 5, name: 'Owner', email: 'owner@example.com' },
        documents: [],
        history: [],
      });
      expect(result).not.toHaveProperty('user.password');
    });

    it('allows an inspector to consult a request assigned to them', async () => {
      prismaMock.itseRequest.findFirst.mockResolvedValue({
        id: requestId,
        title: 'Local',
        description: 'Inspección',
        status: 'EN_REVISION',
        createdAt: new Date(),
        updatedAt: new Date(),
        startedAt: new Date(),
        dueAt: new Date(),
        inspectorId: 8,
        user: { id: 5, name: 'Owner', email: 'owner@example.com' },
        inspector: { id: 8, name: 'Inspector', email: 'inspector@example.com' },
        payment: null,
        documents: [],
        history: [],
      });

      await service.findOne(requestId, 8, Role.INSPECTOR);

      expect(prismaMock.itseRequest.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: requestId, inspectorId: 8 } }),
      );
    });

    it('allows a funcionario to consult any request', async () => {
      prismaMock.itseRequest.findFirst.mockResolvedValue({
        id: requestId,
        title: 'Local',
        description: 'Inspección',
        status: 'PENDIENTE',
        createdAt: new Date(),
        updatedAt: new Date(),
        startedAt: new Date(),
        dueAt: new Date(),
        inspectorId: null,
        user: { id: 5, name: 'Owner', email: 'owner@example.com' },
        inspector: null,
        payment: null,
        documents: [],
        history: [],
      });

      await service.findOne(requestId, 99, Role.FUNCIONARIO);

      expect(prismaMock.itseRequest.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: requestId } }),
      );
    });

    it('denies an administrado access to another user request', async () => {
      prismaMock.itseRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(requestId, 6, Role.ADMINISTRADO),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.itseRequest.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: requestId, userId: 6 } }),
      );
    });

    it('denies an inspector access to a request not assigned to them', async () => {
      prismaMock.itseRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(requestId, 9, Role.INSPECTOR),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.itseRequest.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: requestId, inspectorId: 9 } }),
      );
    });
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
          Role.FUNCIONARIO,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(transactionMock.itseRequest.update).not.toHaveBeenCalled();
    },
  );

  it('does not allow an inspector to review documents', async () => {
    prismaMock.itseRequest.findFirst.mockResolvedValue(null);

    await expect(
      service.reviewRequest(
        12,
        { action: ReviewAction.APROBAR },
        8,
        Role.INSPECTOR,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(transactionMock.itseRequest.update).not.toHaveBeenCalled();
  });

  it('records a review observation in the request history', async () => {
    prismaMock.itseRequest.findFirst.mockResolvedValue({ status: 'PENDIENTE' });
    transactionMock.itseRequest.update.mockResolvedValue({
      id: 12,
      status: 'OBSERVADO',
    });
    transactionMock.itseRequestHistory.create.mockResolvedValue({});

    await service.reviewRequest(
      12,
      {
        action: ReviewAction.OBSERVAR,
        observation: 'Adjuntar plano actualizado',
      },
      8,
      Role.FUNCIONARIO,
    );

    expect(transactionMock.itseRequestHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        description: expect.stringContaining(
          'Observación: Adjuntar plano actualizado',
        ),
        fromStatus: 'PENDIENTE',
        toStatus: 'OBSERVADO',
      }),
    });
  });
  it('denies the administrator access to expedientes', async () => {
    await expect(service.findAll(1, Role.ADMIN)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.findOne(12, 1, Role.ADMIN)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prismaMock.itseRequest.findMany).not.toHaveBeenCalled();
    expect(prismaMock.itseRequest.findFirst).not.toHaveBeenCalled();
  });
});
