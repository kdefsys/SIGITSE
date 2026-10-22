import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItseRequestDto } from './dto/create-itse-request.dto';

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
}
