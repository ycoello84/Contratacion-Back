import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AgreementsService } from './agreements.service.js';
import { Agreement } from './entities/agreement.entity.js';
import { Contract } from '../contracts/entities/contract.entity.js';
import { Meeting } from '../meetings/entities/meeting.entity.js';
import { Worker } from '../workers/entities/worker.entity.js';
import { AgreementStatus } from './entities/agreement-status.enum.js';

describe('AgreementsService', () => {
  let service: AgreementsService;

  const mockRepository = {
    create: vi.fn(),
    save: vi.fn(),
    findOne: vi.fn(),
    createQueryBuilder: vi.fn(),
    remove: vi.fn(),
  };

  const mockMeetingsRepository = {
    findOne: vi.fn(),
  };

  const mockContractsRepository = {
    findOne: vi.fn(),
  };

  const mockWorkersRepository = {
    findOne: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgreementsService,
        {
          provide: getRepositoryToken(Agreement),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Meeting),
          useValue: mockMeetingsRepository,
        },
        {
          provide: getRepositoryToken(Contract),
          useValue: mockContractsRepository,
        },
        {
          provide: getRepositoryToken(Worker),
          useValue: mockWorkersRepository,
        },
      ],
    }).compile();

    service = module.get<AgreementsService>(AgreementsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an agreement when inputs are valid', async () => {
      mockRepository.findOne.mockResolvedValue(null); // No duplicate numeroAcuerdo
      mockMeetingsRepository.findOne.mockResolvedValue({ id: 1 });
      mockWorkersRepository.findOne.mockResolvedValue({ id: 2 });
      mockRepository.create.mockReturnValue({
        id: 1,
        numeroAcuerdo: 'Acuerdo 01-2026',
        actaCcId: 1,
        detalle: 'Detalle de prueba',
        responsableId: 2,
        fechaCumplimiento: '2026-12-31',
        estadoCumplimiento: AgreementStatus.PENDIENTE,
      });
      mockRepository.save.mockResolvedValue({ id: 1 });
      mockRepository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 1,
        numeroAcuerdo: 'Acuerdo 01-2026',
      });

      const result = await service.create({
        numeroAcuerdo: 'Acuerdo 01-2026',
        actaCcId: 1,
        detalle: 'Detalle de prueba',
        responsableId: 2,
        fechaCumplimiento: '2026-12-31',
      });

      expect(result).toBeDefined();
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });
});
