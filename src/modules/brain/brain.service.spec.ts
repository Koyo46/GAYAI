import { Test, TestingModule } from '@nestjs/testing';
import { BrainService } from './brain.service';

describe('BrainService', () => {
  let service: BrainService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BrainService],
    }).compile();

    service = module.get<BrainService>(BrainService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
