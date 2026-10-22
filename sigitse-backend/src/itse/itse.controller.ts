import {
  Controller, Get, Post, Body, UseGuards, Req,
  UseInterceptors, UploadedFile, ParseFilePipe,
  MaxFileSizeValidator, FileTypeValidator, Param, ParseIntPipe
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ItseService } from './itse.service';
import { CreateItseRequestDto } from './dto/create-itse-request.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('itse')
export class ItseController {
  constructor(private readonly itseService: ItseService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
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

  create(@Body() createItseRequestDto: CreateItseRequestDto, @Req() req) {
    // Opcional: puedes extraer el ID del usuario autenticado desde req.user
    console.log('Usuario autenticado:', req.user);
    return this.itseService.create(createItseRequestDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.itseService.findAll();
  }
}
