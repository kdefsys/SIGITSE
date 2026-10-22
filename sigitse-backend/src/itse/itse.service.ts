import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItseRequestDto } from './dto/create-itse-request.dto';
import { ReviewItseDto } from './dto/review-itse.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class ItseService {
  constructor(private readonly prisma: PrismaService) {}

  // Creando una nueva solicitud ITSE
  async create(dto: CreateItseRequestDto) {
    return this.prisma.itseRequest.create({
      data: {
        title: dto.title,
        description: dto.description,
        userId: dto.userId,
      },
    });
  }

  // Obteniendo todas las solicitudes ITSE con información del usuario
  async findAll() {
    return this.prisma.itseRequest.findMany({
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

  // Obteniendo una solicitud por ID
  async findOne(id: number) {
    return this.prisma.itseRequest.findUnique({
      where: { id },
      include: { user: true },
    });
  }

  async attachDocument(itseRequestId: number, file: Express.Multer.File) {
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

  async reviewRequest(id: number, reviewDto: ReviewItseDto) {
    return this.prisma.itseRequest.update({
      where: { id },
      data: {
        status: reviewDto.action,
      },
    });
  }

  async registerPayment(itseRequestId: number, dto: CreatePaymentDto) {
    return this.prisma.payment.create({
      data: {
        receiptNumber: dto.receiptNumber,
        amount: dto.amount,
        itseRequestId: itseRequestId,
      },
    });
  }
}
