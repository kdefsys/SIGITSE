import { Test, TestingModule } from '@nestjs/testing';
import { ItseController } from './itse.controller';

describe('ItseController', () => {
  let controller: ItseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ItseController],
    }).compile();

    controller = module.get<ItseController>(ItseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
