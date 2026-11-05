import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isEmail } from 'class-validator';
import { RequestStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItseRequestDto } from './dto/create-itse-request.dto';
import { ReviewAction, ReviewItseDto } from './dto/review-itse.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { AssignInspectorDto } from './dto/assign-inspector.dto';
import { SaveItseDraftDto } from './dto/save-itse-draft.dto';
import { calculateDueDate, dateOnlyUtc, limaDate } from './business-calendar';
import {
  itseRequestResponseInclude,
  toItseRequestResponseDto,
} from './dto/itse-request-response.dto';
import { ItseRequestStatusSubject } from './observers/itse-request-status.subject';

const HISTORY_ACTION = {
  RECEIVED: 'SOLICITUD_RECIBIDA',
  DOCUMENT_UPLOADED: 'DOCUMENTO_ADJUNTADO',
  PAYMENT_REGISTERED: 'PAGO_REGISTRADO',
  INSPECTOR_ASSIGNED: 'INSPECTOR_ASIGNADO',
  STATUS_CHANGED: 'ESTADO_ACTUALIZADO',
} as const;

@Injectable()
export class ItseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestStatusSubject: ItseRequestStatusSubject,
  ) {}

  async createDraft(dto: SaveItseDraftDto, userId: number) {
    return this.prisma.$transaction(async (transaction) => {
      const request = await transaction.itseRequest.create({
        data: {
          title: dto.title ?? '',
          description: dto.description ?? '',
          userId,
          status: RequestStatus.BORRADOR,
          startedAt: null,
          dueAt: null,
        },
      });
      await transaction.itseRequestHistory.create({
        data: {
          requestId: request.id,
          actorId: userId,
          action: 'BORRADOR_GUARDADO',
          description: 'Se guardó el expediente como borrador.',
          toStatus: RequestStatus.BORRADOR,
        },
      });
      return request;
    });
  }

  async listDrafts(userId: number) {
    const drafts = await this.prisma.itseRequest.findMany({
      where: { userId, status: RequestStatus.BORRADOR },
      include: itseRequestResponseInclude,
      orderBy: { updatedAt: 'desc' },
    });
    return drafts.map(toItseRequestResponseDto);
  }

  async updateDraft(id: number, userId: number, dto: SaveItseDraftDto) {
    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.itseRequest.updateMany({
        where: { id, userId, status: RequestStatus.BORRADOR },
        data: {
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          ...(dto.applicantName !== undefined
            ? { applicantName: dto.applicantName }
            : {}),
          ...(dto.applicantDocumentType !== undefined
            ? { applicantDocumentType: dto.applicantDocumentType }
            : {}),
          ...(dto.applicantDocumentNumber !== undefined
            ? { applicantDocumentNumber: dto.applicantDocumentNumber }
            : {}),
          ...(dto.applicantEmail !== undefined
            ? { applicantEmail: dto.applicantEmail }
            : {}),
          ...(dto.applicantPhone !== undefined
            ? { applicantPhone: dto.applicantPhone }
            : {}),
          ...(dto.establishmentAddress !== undefined
            ? { establishmentAddress: dto.establishmentAddress }
            : {}),
          ...(dto.establishmentDistrict !== undefined
            ? { establishmentDistrict: dto.establishmentDistrict }
            : {}),
        },
      });
      if (result.count === 0) {
        throw new NotFoundException('Borrador no encontrado.');
      }

      await transaction.itseRequestHistory.create({
        data: {
          requestId: id,
          actorId: userId,
          action: 'BORRADOR_ACTUALIZADO',
          description: 'Se actualizaron los datos del borrador.',
          toStatus: RequestStatus.BORRADOR,
        },
      });
      return { id };
    });
  }

  async submitDraft(id: number, userId: number) {
    const draft = await this.prisma.itseRequest.findFirst({
      where: { id, userId, status: RequestStatus.BORRADOR },
      select: {
        id: true,
        title: true,
        description: true,
        applicantName: true,
        applicantDocumentType: true,
        applicantDocumentNumber: true,
        applicantEmail: true,
        applicantPhone: true,
        establishmentAddress: true,
        establishmentDistrict: true,
      },
    });
    if (!draft) {
      throw new NotFoundException('Borrador no encontrado.');
    }
    if (
      ![
        draft.title,
        draft.description,
        draft.applicantName,
        draft.applicantDocumentType,
        draft.applicantDocumentNumber,
        draft.applicantEmail,
        draft.applicantPhone,
        draft.establishmentAddress,
        draft.establishmentDistrict,
      ].every((value) => typeof value === 'string' && value.trim())
    ) {
      throw new BadRequestException(
        'Completa los datos del solicitante y del establecimiento antes de presentar la solicitud.',
      );
    }
    if (!isEmail(draft.applicantEmail?.trim() ?? '')) {
      throw new BadRequestException('Ingresa un correo electrónico válido.');
    }

    const startedAt = new Date();
    const dueAt = await this.calculateDueAt(startedAt);
    await this.prisma.$transaction(async (transaction) => {
      const result = await transaction.itseRequest.updateMany({
        where: { id, userId, status: RequestStatus.BORRADOR },
        data: {
          status: RequestStatus.PENDIENTE,
          startedAt,
          dueAt,
        },
      });
      if (result.count === 0) {
        throw new NotFoundException('Borrador no encontrado.');
      }
      await transaction.itseRequestHistory.create({
        data: {
          requestId: id,
          actorId: userId,
          action: 'SOLICITUD_PRESENTADA',
          description:
            'El administrado presentó la solicitud para su revisión.',
          fromStatus: RequestStatus.BORRADOR,
          toStatus: RequestStatus.PENDIENTE,
        },
      });
    });

    return this.findOne(id, userId, Role.ADMINISTRADO);
  }

  async create(dto: CreateItseRequestDto, userId: number) {
    const startedAt = new Date();
    const dueAt = await this.calculateDueAt(startedAt);

    return this.prisma.$transaction(async (transaction) => {
      const request = await transaction.itseRequest.create({
        data: {
          title: dto.title,
          description: dto.description,
          applicantName: dto.applicantName,
          applicantDocumentType: dto.applicantDocumentType,
          applicantDocumentNumber: dto.applicantDocumentNumber,
          applicantEmail: dto.applicantEmail,
          applicantPhone: dto.applicantPhone,
          establishmentAddress: dto.establishmentAddress,
          establishmentDistrict: dto.establishmentDistrict,
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

  listInspectors() {
    return this.prisma.user.findMany({
      where: { role: Role.INSPECTOR },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async findAll(userId: number, role: Role) {
    if (role === Role.ADMIN)
      throw new ForbiddenException('El administrador solo gestiona cuentas.');
    const where =
      role === Role.FUNCIONARIO
        ? { status: { not: RequestStatus.BORRADOR } }
        : role === Role.INSPECTOR
          ? { inspectorId: userId, status: { not: RequestStatus.BORRADOR } }
          : { userId, status: { not: RequestStatus.BORRADOR } };

    const requests = await this.prisma.itseRequest.findMany({
      where,
      include: itseRequestResponseInclude,
    });

    return requests.map(toItseRequestResponseDto);
  }

  async findOne(id: number, userId: number, role: Role) {
    const where = this.accessWhere(id, userId, role);
    const request = await this.prisma.itseRequest.findFirst({
      where,
      include: itseRequestResponseInclude,
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    return toItseRequestResponseDto(request);
  }

  async canAccessRequest(
    id: number,
    userId: number,
    role: Role,
  ): Promise<boolean> {
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
    if (role !== Role.ADMINISTRADO)
      throw new ForbiddenException(
        'Solo el propietario puede adjuntar documentos.',
      );
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
    if (role !== Role.FUNCIONARIO) {
      throw new ForbiddenException(
        'No tienes permiso para revisar solicitudes.',
      );
    }
    const currentRequest = await this.prisma.itseRequest.findFirst({
      where: this.accessWhere(id, userId, role),
      select: { status: true },
    });
    if (!currentRequest) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    const observation = reviewDto.observation?.trim();
    if (reviewDto.action !== ReviewAction.APROBAR && !observation) {
      throw new BadRequestException(
        'Debes indicar el motivo de la observación o rechazo.',
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      const request = await transaction.itseRequest.update({
        where: this.accessWhere(id, userId, role),
        data: { status: reviewDto.action },
      });
      await this.requestStatusSubject.notify({
        transaction,
        requestId: id,
        actorId: userId,
        action: HISTORY_ACTION.STATUS_CHANGED,
        description: [
          `Estado actualizado de ${currentRequest.status} a ${request.status}.`,
          observation ? `Observación: ${observation}` : null,
        ]
          .filter(Boolean)
          .join(' '),
        fromStatus: currentRequest.status,
        toStatus: request.status,
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
    if (role !== Role.ADMINISTRADO) {
      throw new ForbiddenException('No tienes permiso para registrar pagos.');
    }
    await this.ensureRequestAccess(itseRequestId, userId, role);
    const request = await this.prisma.itseRequest.findFirst({
      where: { id: itseRequestId, status: { not: RequestStatus.BORRADOR } },
      select: { id: true },
    });
    if (!request) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

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
    if (role !== Role.FUNCIONARIO) {
      throw new ForbiddenException(
        'Solo un funcionario puede asignar inspectores.',
      );
    }

    // Validar que el usuario exista y sea INSPECTOR
    const inspector = await this.prisma.user.findUnique({
      where: { id: dto.inspectorId },
    });

    if (!inspector || inspector.role !== 'INSPECTOR') {
      throw new BadRequestException(
        'El usuario seleccionado no tiene el rol de INSPECTOR.',
      );
    }

    const currentRequest = await this.prisma.itseRequest.findUnique({
      where: { id: itseRequestId },
      select: { status: true },
    });
    if (!currentRequest) {
      throw new NotFoundException('Solicitud no encontrada.');
    }
    if (currentRequest.status === RequestStatus.BORRADOR) {
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
    if (role === Role.ADMIN)
      throw new ForbiddenException('El administrador solo gestiona cuentas.');
    if (role === Role.FUNCIONARIO) {
      return { id, status: { not: RequestStatus.BORRADOR } };
    }
    if (role === Role.INSPECTOR) {
      return {
        id,
        inspectorId: userId,
        status: { not: RequestStatus.BORRADOR },
      };
    }
    return { id, userId };
  }

  private async ensureRequestAccess(id: number, userId: number, role: Role) {
    if (!(await this.canAccessRequest(id, userId, role))) {
      throw new NotFoundException('Solicitud no encontrada.');
    }
  }

  private async calculateDueAt(startedAt: Date) {
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
    return calculateDueDate(
      startedAt,
      new Set(holidays.map(({ date }) => date.toISOString().slice(0, 10))),
    );
  }
}
