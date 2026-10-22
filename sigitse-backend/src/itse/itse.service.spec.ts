import { Test, TestingModule } from '@nestjs/testing';
import { ItseService } from './itse.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ItseService', () => {
  let service: ItseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItseService,
        {
          provide: PrismaService,
          useValue: {}, // Mock de PrismaService
        },
      ],
    }).compile();

    service = module.get<ItseService>(ItseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
