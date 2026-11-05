import { Test, TestingModule } from '@nestjs/testing';
import { ItseController } from './itse.controller';
import { ItseService } from './itse.service';
import { PrismaService } from '../prisma/prisma.service';
import { ItseRequestStatusSubject } from './observers/itse-request-status.subject';

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
        {
          provide: ItseRequestStatusSubject,
          useValue: new ItseRequestStatusSubject(),
        },
      ],
    }).compile();

    controller = module.get<ItseController>(ItseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
