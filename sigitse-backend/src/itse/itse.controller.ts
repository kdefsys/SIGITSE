import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { ItseService } from './itse.service';
import { CreateItseRequestDto } from './dto/create-itse-request.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('itse')
export class ItseController {
  constructor(private readonly itseService: ItseService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
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
