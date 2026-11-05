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
import { ItseRequestHistoryObserver } from './observers/itse-request-history.observer';
import { ItseRequestStatusSubject } from './observers/itse-request-status.subject';

describe('ItseService', () => {
  let service: ItseService;
  const transactionMock = {
    itseRequest: {
      create: jest.fn<() => Promise<unknown>>(),
      update: jest.fn<() => Promise<unknown>>(),
      updateMany: jest.fn<() => Promise<unknown>>(),
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
        ItseRequestHistoryObserver,
        {
          provide: ItseRequestStatusSubject,
          useFactory: (historyObserver: ItseRequestHistoryObserver) =>
            new ItseRequestStatusSubject([historyObserver]),
          inject: [ItseRequestHistoryObserver],
        },
      ],
    }).compile();

    service = module.get<ItseService>(ItseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a request using the authenticated user ID', async () => {
    const dto = {
      title: 'Request',
      description: 'Details',
      applicantName: 'Maria Example',
      applicantDocumentType: 'DNI',
      applicantDocumentNumber: '12345678',
      applicantEmail: 'maria@example.com',
      applicantPhone: '+51999111222',
      applicantPhoneCountry: 'PE',
      establishmentBusinessName: 'Comercio de prueba',
      establishmentAddress: 'Av. Example 123',
      establishmentDistrict: 'San Miguel',
    };
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

  it('creates a draft without starting its deadline', async () => {
    transactionMock.itseRequest.create.mockResolvedValue({
      id: 21,
      title: '',
      description: '',
      userId: 5,
      status: 'BORRADOR',
      startedAt: null,
      dueAt: null,
    });
    transactionMock.itseRequestHistory.create.mockResolvedValue({});

    await service.createDraft({}, 5);

    expect(transactionMock.itseRequest.create).toHaveBeenCalledWith({
      data: {
        title: '',
        description: '',
        userId: 5,
        status: 'BORRADOR',
        startedAt: null,
        dueAt: null,
      },
    });
    expect(prismaMock.businessHoliday.findMany).not.toHaveBeenCalled();
  });

  it('lists only the authenticated administrado drafts', async () => {
    prismaMock.itseRequest.findMany.mockResolvedValue([]);

    await service.listDrafts(5);

    expect(prismaMock.itseRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 5, status: 'BORRADOR' },
        orderBy: { updatedAt: 'desc' },
      }),
    );
  });

  it('updates only a draft owned by the authenticated administrado', async () => {
    transactionMock.itseRequest.updateMany.mockResolvedValue({ count: 1 });
    transactionMock.itseRequestHistory.create.mockResolvedValue({});

    await service.updateDraft(21, 5, { title: 'Local editado' });

    expect(transactionMock.itseRequest.updateMany).toHaveBeenCalledWith({
      where: { id: 21, userId: 5, status: 'BORRADOR' },
      data: { title: 'Local editado' },
    });
  });

  it('does not allow presenting a draft without required information', async () => {
    prismaMock.itseRequest.findFirst.mockResolvedValue({
      id: 21,
      title: '   ',
      description: 'Descripción',
    });

    await expect(service.submitDraft(21, 5)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prismaMock.businessHoliday.findMany).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('requires a valid applicant email before presenting a draft', async () => {
    prismaMock.itseRequest.findFirst.mockResolvedValue({
      id: 21,
      title: 'Local',
      description: 'Inspección',
      applicantName: 'Maria Example',
      applicantDocumentType: 'DNI',
      applicantDocumentNumber: '12345678',
      applicantEmail: 'not-an-email',
      applicantPhone: '+51999111222',
      applicantPhoneCountry: 'PE',
      establishmentBusinessName: 'Comercio de prueba',
      establishmentAddress: 'Av. Example 123',
      establishmentDistrict: 'San Miguel',
    });

    await expect(service.submitDraft(21, 5)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prismaMock.businessHoliday.findMany).not.toHaveBeenCalled();
  });

  it('starts the nine-business-day deadline only when presenting a draft', async () => {
    prismaMock.itseRequest.findFirst
      .mockResolvedValueOnce({
        id: 21,
        title: 'Local',
        description: 'Inspección',
        applicantName: 'Maria Example',
        applicantDocumentType: 'DNI',
        applicantDocumentNumber: '12345678',
        applicantEmail: 'maria@example.com',
        applicantPhone: '+51999111222',
        applicantPhoneCountry: 'PE',
        establishmentBusinessName: 'Comercio de prueba',
        establishmentAddress: 'Av. Example 123',
        establishmentDistrict: 'San Miguel',
      })
      .mockResolvedValueOnce({
        id: 21,
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
    transactionMock.itseRequest.updateMany.mockResolvedValue({ count: 1 });
    transactionMock.itseRequestHistory.create.mockResolvedValue({});

    await service.submitDraft(21, 5);

    expect(transactionMock.itseRequest.updateMany).toHaveBeenCalledWith({
      where: { id: 21, userId: 5, status: 'BORRADOR' },
      data: expect.objectContaining({
        status: 'PENDIENTE',
        startedAt: expect.any(Date),
        dueAt: expect.any(Date),
      }),
    });
    expect(transactionMock.itseRequestHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fromStatus: 'BORRADOR',
        toStatus: 'PENDIENTE',
        action: 'SOLICITUD_PRESENTADA',
      }),
    });
  });

  it('limits administrado list results to their own requests', async () => {
    prismaMock.itseRequest.findMany.mockResolvedValue([]);

    await service.findAll(5, Role.ADMINISTRADO);

    expect(prismaMock.itseRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 5, status: { not: 'BORRADOR' } },
      }),
    );
  });

  it('limits inspector list results to assigned requests', async () => {
    prismaMock.itseRequest.findMany.mockResolvedValue([]);

    await service.findAll(8, Role.INSPECTOR);

    expect(prismaMock.itseRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { inspectorId: 8, status: { not: 'BORRADOR' } },
      }),
    );
  });

  it('keeps drafts out of the funcionario work queue', async () => {
    prismaMock.itseRequest.findMany.mockResolvedValue([]);

    await service.findAll(9, Role.FUNCIONARIO);

    expect(prismaMock.itseRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: { not: 'BORRADOR' } } }),
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
        expect.objectContaining({
          where: {
            id: requestId,
            inspectorId: 8,
            status: { not: 'BORRADOR' },
          },
        }),
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
        expect.objectContaining({
          where: {
            id: requestId,
            status: { not: 'BORRADOR' },
          },
        }),
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
        expect.objectContaining({
          where: {
            id: requestId,
            inspectorId: 9,
            status: { not: 'BORRADOR' },
          },
        }),
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
