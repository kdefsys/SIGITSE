import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ItseService } from './itse.service';
import { CreateItseRequestDto } from './dto/create-itse-request.dto';

@Controller('itse')
export class ItseController {
  constructor(private readonly itseService: ItseService) {}

  @Post()
  create(@Body() createItseRequestDto: CreateItseRequestDto) {
    return this.itseService.create(createItseRequestDto);
  }

  @Get()
  findAll() {
    return this.itseService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.itseService.findOne(id);
  }
}
