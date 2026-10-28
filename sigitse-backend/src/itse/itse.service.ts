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

@Injectable()
export class ItseService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateItseRequestDto, userId: number) {
    return this.prisma.itseRequest.create({
      data: {
        title: dto.title,
        description: dto.description,
        userId,
      },
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
      },
    });
  }

  async findOne(id: number, userId: number, role: Role) {
    const where = this.accessWhere(id, userId, role);
    const request = await this.prisma.itseRequest.findFirst({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
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

    return this.prisma.document.create({
      data: {
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        itseRequestId: itseRequestId,
      },
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
    await this.ensureRequestAccess(id, userId, role);

    return this.prisma.itseRequest.update({
      where: { id },
      data: {
        status: reviewDto.action,
      },
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

    return this.prisma.payment.create({
      data: {
        receiptNumber: dto.receiptNumber,
        amount: dto.amount,
        itseRequestId: itseRequestId,
      },
    });
  }

  async assignInspector(itseRequestId: number, dto: AssignInspectorDto, role: Role) {
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

    return this.prisma.itseRequest.update({
      where: { id: itseRequestId },
      data: {
        inspectorId: dto.inspectorId,
        status: 'EN_REVISION',
      },
    });
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
