import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItseRequestDto } from './dto/create-itse-request.dto';
import { ReviewItseDto } from './dto/review-itse.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { AssignInspectorDto } from './dto/assign-inspector.dto';
import { calculateDueDate, dateOnlyUtc, limaDate } from './business-calendar';

const HISTORY_ACTION = {
  RECEIVED: 'SOLICITUD_RECIBIDA',
  DOCUMENT_UPLOADED: 'DOCUMENTO_ADJUNTADO',
  PAYMENT_REGISTERED: 'PAGO_REGISTRADO',
  INSPECTOR_ASSIGNED: 'INSPECTOR_ASIGNADO',
  STATUS_CHANGED: 'ESTADO_ACTUALIZADO',
} as const;

@Injectable()
export class ItseService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateItseRequestDto, userId: number) {
    const startedAt = new Date();
    const startDate = new Date(`${limaDate(startedAt)}T00:00:00.000Z`);
    const holidayEnd = new Date(startDate);
    holidayEnd.setUTCDate(holidayEnd.getUTCDate() + 60);
    const holidays = await this.prisma.businessHoliday.findMany({
      where: {
        scope: 'LIMA',
        date: { gte: dateOnlyUtc(startDate), lte: dateOnlyUtc(holidayEnd) },
      },
      select: { date: true },
    });
    const dueAt = calculateDueDate(
      startedAt,
      new Set(holidays.map(({ date }) => date.toISOString().slice(0, 10))),
    );

    return this.prisma.$transaction(async (transaction) => {
      const request = await transaction.itseRequest.create({
        data: {
          title: dto.title,
          description: dto.description,
          userId,
          startedAt,
          dueAt,
        },
      });
      await transaction.itseRequestHistory.create({
        data: {
          requestId: request.id,
          actorId: userId,
          action: HISTORY_ACTION.RECEIVED,
          description: 'Solicitud recibida por el servidor.',
          toStatus: request.status,
        },
      });
      return request;
    });
  }

  async findAll(userId: number, role: Role) {
    const where =
      role === Role.ADMIN
        ? {}
        : role === Role.INSPECTOR
          ? { inspectorId: userId }
          : { userId };

    return this.prisma.itseRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        documents: {
          select: { id: true, originalName: true, mimeType: true, size: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        history: {
          select: {
            id: true,
            action: true,
            description: true,
            fromStatus: true,
            toStatus: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findOne(id: number, userId: number, role: Role) {
    const where = this.accessWhere(id, userId, role);
    const request = await this.prisma.itseRequest.findFirst({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        inspector: { select: { id: true, name: true, email: true } },
        payment: true,
        documents: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            size: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        history: {
          include: { actor: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    return request;
  }

  async canAccessRequest(id: number, userId: number, role: Role): Promise<boolean> {
    const request = await this.prisma.itseRequest.findFirst({
      where: this.accessWhere(id, userId, role),
      select: { id: true },
    });

    return request !== null;
  }

  async attachDocument(
    itseRequestId: number,
    file: Express.Multer.File,
    userId: number,
    role: Role,
  ) {
    await this.ensureRequestAccess(itseRequestId, userId, role);

    return this.prisma.$transaction(async (transaction) => {
      const document = await transaction.document.create({
        data: {
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          path: file.path,
          itseRequestId,
        },
      });
      await transaction.itseRequestHistory.create({
        data: {
          requestId: itseRequestId,
          actorId: userId,
          action: HISTORY_ACTION.DOCUMENT_UPLOADED,
          description: `Se adjuntó el documento ${file.originalname}.`,
        },
      });
      return document;
    });
  }

  async reviewRequest(
    id: number,
    reviewDto: ReviewItseDto,
    userId: number,
    role: Role,
  ) {
    if (role !== Role.ADMIN && role !== Role.INSPECTOR) {
      throw new ForbiddenException('No tienes permiso para revisar solicitudes.');
    }
    const currentRequest = await this.prisma.itseRequest.findFirst({
      where: this.accessWhere(id, userId, role),
      select: { status: true },
    });
    if (!currentRequest) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    return this.prisma.$transaction(async (transaction) => {
      const request = await transaction.itseRequest.update({
        where: { id },
        data: { status: reviewDto.action },
      });
      await transaction.itseRequestHistory.create({
        data: {
          requestId: id,
          actorId: userId,
          action: HISTORY_ACTION.STATUS_CHANGED,
          description: `Estado actualizado de ${currentRequest.status} a ${request.status}.`,
          fromStatus: currentRequest.status,
          toStatus: request.status,
        },
      });
      return request;
    });
  }

  async registerPayment(
    itseRequestId: number,
    dto: CreatePaymentDto,
    userId: number,
    role: Role,
  ) {
    if (role !== Role.ADMIN && role !== Role.ADMINISTRADO) {
      throw new ForbiddenException('No tienes permiso para registrar pagos.');
    }
    await this.ensureRequestAccess(itseRequestId, userId, role);

    return this.prisma.$transaction(async (transaction) => {
      const payment = await transaction.payment.create({
        data: {
          receiptNumber: dto.receiptNumber,
          amount: dto.amount,
          itseRequestId,
        },
      });
      await transaction.itseRequestHistory.create({
        data: {
          requestId: itseRequestId,
          actorId: userId,
          action: HISTORY_ACTION.PAYMENT_REGISTERED,
          description: `Pago registrado con comprobante ${dto.receiptNumber}.`,
        },
      });
      return payment;
    });
  }

  async assignInspector(
    itseRequestId: number,
    dto: AssignInspectorDto,
    role: Role,
    userId: number,
  ) {
    if (role !== Role.ADMIN) {
      throw new ForbiddenException('Solo un administrador puede asignar inspectores.');
    }

    // Validar que el usuario exista y sea INSPECTOR
    const inspector = await this.prisma.user.findUnique({
      where: { id: dto.inspectorId },
    });

    if (!inspector || inspector.role !== 'INSPECTOR') {
      throw new BadRequestException('El usuario seleccionado no tiene el rol de INSPECTOR.');
    }

    const currentRequest = await this.prisma.itseRequest.findUnique({
      where: { id: itseRequestId },
      select: { status: true },
    });
    if (!currentRequest) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    return this.prisma.$transaction(async (transaction) => {
      const request = await transaction.itseRequest.update({
        where: { id: itseRequestId },
        data: { inspectorId: dto.inspectorId, status: 'EN_REVISION' },
      });
      await transaction.itseRequestHistory.create({
        data: {
          requestId: itseRequestId,
          actorId: userId,
          action: HISTORY_ACTION.INSPECTOR_ASSIGNED,
          description: `Inspector ${inspector.name} asignado a la solicitud.`,
          fromStatus: currentRequest.status,
          toStatus: request.status,
        },
      });
      return request;
    });
  }

  async findDocumentForDownload(
    requestId: number,
    documentId: number,
    userId: number,
    role: Role,
  ) {
    await this.ensureRequestAccess(requestId, userId, role);
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, itseRequestId: requestId },
    });
    if (!document) {
      throw new NotFoundException('Documento no encontrado.');
    }
    return document;
  }

  private accessWhere(id: number, userId: number, role: Role) {
    if (role === Role.ADMIN) {
      return { id };
    }
    if (role === Role.INSPECTOR) {
      return { id, inspectorId: userId };
    }
    return { id, userId };
  }

  private async ensureRequestAccess(id: number, userId: number, role: Role) {
    if (!(await this.canAccessRequest(id, userId, role))) {
      throw new NotFoundException('Solicitud no encontrada.');
    }
  }
}
