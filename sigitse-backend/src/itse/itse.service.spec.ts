import { Test, TestingModule } from '@nestjs/testing';
import { ItseService } from './itse.service';

describe('ItseService', () => {
  let service: ItseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ItseService],
    }).compile();

    service = module.get<ItseService>(ItseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
