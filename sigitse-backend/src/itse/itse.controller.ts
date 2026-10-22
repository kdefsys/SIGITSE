import {
  Controller, Get, Post, Body, UseGuards, Req,
  UseInterceptors, UploadedFile, ParseFilePipe,
  MaxFileSizeValidator, FileTypeValidator, Param, ParseIntPipe,
  Patch
} from '@nestjs/common';
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


@Controller('itse')
export class ItseController {
  constructor(private readonly itseService: ItseService) {}

  @UseGuards(JwtAuthGuard)
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
  ) {
    return this.itseService.attachDocument(itseRequestId, file);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createItseRequestDto: CreateItseRequestDto, @Req() req: Request) {
    // Opcional: puedes extraer el ID del usuario autenticado desde req.user
    console.log('Usuario autenticado:', req.user);
    return this.itseService.create(createItseRequestDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.itseService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'INSPECTOR')
  @Patch(':id/review')
  reviewRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() reviewDto: ReviewItseDto,
  ) {
    return this.itseService.reviewRequest(id, reviewDto);
  }


  @UseGuards(JwtAuthGuard)
  @Post(':id/payment')
  registerPayment(
    @Param('id', ParseIntPipe) itseRequestId: number,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.itseService.registerPayment(itseRequestId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/assign-inspector')
  assignInspector(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignInspectorDto,
  ) {
    return this.itseService.assignInspector(id, dto);
  }
}
