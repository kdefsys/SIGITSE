import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ItseService } from './itse.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('ItseService', () => {
  let service: ItseService;
  const transactionMock = {
    itseRequest: {
      create: jest.fn(),
      update: jest.fn(),
    },
    itseRequestHistory: { create: jest.fn() },
    document: { create: jest.fn() },
    payment: { create: jest.fn() },
  };
  const prismaMock = {
    itseRequest: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    businessHoliday: { findMany: jest.fn() },
    document: { findFirst: jest.fn() },
    $transaction: jest.fn(
      async (callback: (transaction: typeof transactionMock) => Promise<unknown>) =>
        callback(transactionMock),
    ),
    user: { findUnique: jest.fn() },
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
      data: expect.objectContaining({ ...dto, userId: 5, dueAt: expect.any(Date) }),
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

    it('allows an administrator to consult any request', async () => {
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

      await service.findOne(requestId, 99, Role.ADMIN);

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

  it('does not allow an inspector to review an unassigned request', async () => {
    prismaMock.itseRequest.findFirst.mockResolvedValue(null);

    await expect(
      service.reviewRequest(12, { action: 'APROBADO' }, 8, Role.INSPECTOR),
    ).rejects.toBeInstanceOf(NotFoundException);
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
      { action: 'OBSERVADO', observation: 'Adjuntar plano actualizado' },
      8,
      Role.INSPECTOR,
    );

    expect(transactionMock.itseRequestHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        description: expect.stringContaining('Observación: Adjuntar plano actualizado'),
        fromStatus: 'PENDIENTE',
        toStatus: 'OBSERVADO',
      }),
    });
  });
});
