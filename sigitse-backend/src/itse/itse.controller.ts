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
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { createReadStream } from 'fs';
import { extname, resolve } from 'path';
import { ItseService } from './itse.service';
import { CreateItseRequestDto } from './dto/create-itse-request.dto';
import { ReviewItseDto } from './dto/review-itse.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { AssignInspectorDto } from './dto/assign-inspector.dto';
import { SaveItseDraftDto } from './dto/save-itse-draft.dto';
import type { Request } from 'express';
import { ItseRequestAccessGuard } from './guards/itse-request-access.guard';

type AuthenticatedRequest = Request & {
  user: { userId: number; email: string; role: Role };
};

@Controller('itse')
export class ItseController {
  constructor(private readonly itseService: ItseService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, ItseRequestAccessGuard)
  @Roles('ADMINISTRADO')
  @Post(':id/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMINISTRADO')
  @Post()
  create(
    @Body() createItseRequestDto: CreateItseRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.itseService.create(createItseRequestDto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMINISTRADO')
  @Post('drafts')
  createDraft(@Body() dto: SaveItseDraftDto, @Req() req: AuthenticatedRequest) {
    return this.itseService.createDraft(dto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMINISTRADO')
  @Patch(':id/draft')
  updateDraft(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveItseDraftDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.itseService.updateDraft(id, req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMINISTRADO')
  @Post(':id/submit')
  submitDraft(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.itseService.submitDraft(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMINISTRADO')
  @Get('drafts')
  listDrafts(@Req() req: AuthenticatedRequest) {
    return this.itseService.listDrafts(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('FUNCIONARIO', 'INSPECTOR', 'ADMINISTRADO')
  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.itseService.findAll(req.user.userId, req.user.role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('FUNCIONARIO')
  @Get('inspectors')
  listInspectors() {
    return this.itseService.listInspectors();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('FUNCIONARIO', 'INSPECTOR', 'ADMINISTRADO')
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.itseService.findOne(id, req.user.userId, req.user.role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('FUNCIONARIO', 'INSPECTOR', 'ADMINISTRADO')
  @Get(':id/documents/:documentId/download')
  async downloadDocument(
    @Param('id', ParseIntPipe) id: number,
    @Param('documentId', ParseIntPipe) documentId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const document = await this.itseService.findDocumentForDownload(
      id,
      documentId,
      req.user.userId,
      req.user.role,
    );
    const filename = encodeURIComponent(document.originalName);
    return new StreamableFile(
      createReadStream(resolve(process.cwd(), document.path)),
      {
        type: document.mimeType,
        disposition: `attachment; filename*=UTF-8''${filename}`,
      },
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('FUNCIONARIO')
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMINISTRADO')
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
  @Roles('FUNCIONARIO')
  @Patch(':id/assign-inspector')
  assignInspector(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignInspectorDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.itseService.assignInspector(
      id,
      dto,
      req.user.role,
      req.user.userId,
    );
  }
}
