import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  ParseFilePipe,
  ParseIntPipe,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ItseService } from './itse.service';
import { CreateItseRequestDto } from './dto/create-itse-request.dto';
import { ReviewItseDto } from './dto/review-itse.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { AssignInspectorDto } from './dto/assign-inspector.dto';
import type { Request } from 'express';
import { ItseRequestAccessGuard } from './guards/itse-request-access.guard';

type AuthenticatedRequest = Request & {
  user: { userId: number; email: string; role: Role };
};

@Controller('itse')
export class ItseController {
  constructor(private readonly itseService: ItseService) {}

  @UseGuards(JwtAuthGuard, ItseRequestAccessGuard)
  @Post(':id/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  async uploadDocument(
    @Param('id', ParseIntPipe) itseRequestId: number,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10 MB
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|pdf)' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.itseService.attachDocument(
      itseRequestId,
      file,
      req.user.userId,
      req.user.role,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Body() createItseRequestDto: CreateItseRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.itseService.create(createItseRequestDto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'INSPECTOR', 'ADMINISTRADO')
  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.itseService.findAll(req.user.userId, req.user.role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'INSPECTOR')
  @Patch(':id/review')
  reviewRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() reviewDto: ReviewItseDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.itseService.reviewRequest(
      id,
      reviewDto,
      req.user.userId,
      req.user.role,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/payment')
  registerPayment(
    @Param('id', ParseIntPipe) itseRequestId: number,
    @Body() dto: CreatePaymentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.itseService.registerPayment(
      itseRequestId,
      dto,
      req.user.userId,
      req.user.role,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/assign-inspector')
  assignInspector(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignInspectorDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.itseService.assignInspector(id, dto, req.user.role);
  }
}
