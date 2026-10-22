import { Test, TestingModule } from '@nestjs/testing';
import { ItseController } from './itse.controller';
import { ItseService } from './itse.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ItseController', () => {
  let controller: ItseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ItseController],
      providers: [
        ItseService,
        {
          provide: PrismaService,
          useValue: {}, // Mock del servicio de Prisma para pruebas unitarias
        },
      ],
    }).compile();

    controller = module.get<ItseController>(ItseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
