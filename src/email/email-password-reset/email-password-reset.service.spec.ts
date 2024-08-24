import { Test, TestingModule } from '@nestjs/testing';
import { EmailPasswordResetService } from './email-password-reset.service';

describe('EmailPasswordResetService', () => {
  let service: EmailPasswordResetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailPasswordResetService],
    }).compile();

    service = module.get<EmailPasswordResetService>(EmailPasswordResetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
