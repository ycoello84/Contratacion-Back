import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ContractsService } from './contracts.service.js';
import { Contract } from './entities/contract.entity.js';
import { Company } from '../companies/entities/company.entity.js';
import { Meeting } from '../meetings/entities/meeting.entity.js';
import { ContractApprovalStatus } from './entities/contract-approval-status.enum.js';
import { ContractType } from './entities/contract-type.enum.js';

const baseCreateDto = {
  contractNumber: 'ECIE 2026-01',
  contractRelationshipType: ContractType.CONTRATO_PRINCIPAL,
  object: 'Objeto de prueba',
  originCompanyId: 1,
  destinationCompanyId: 2,
  startDate: '2026-01-01',
} as any;

const existingContract = {
  id: 10,
  contractNumber: 'ECIE 2026-01',
  contractRelationshipType: ContractType.CONTRATO_PRINCIPAL,
  parentContractId: null,
  object: 'Objeto de prueba',
  originCompanyId: 1,
  destinationCompanyId: 2,
  specializedArea: null,
  value: '1000.00',
  noValueReference: false,
  uebEntryDate: null,
  opinionIssueDate: null,
  startDate: '2026-01-01',
  expirationDate: null,
  ccApprovalStatus: ContractApprovalStatus.PENDIENTE_APROBACION_EMPRESA,
  actCcId: null,
} as unknown as Contract;

function cloneContract() {
  return JSON.parse(JSON.stringify(existingContract)) as Contract;
}

describe('ContractsService', () => {
  let service: ContractsService;

  const mockContractsRepository = {
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    count: vi.fn(),
  };

  const mockCompaniesRepository = {
    findOne: vi.fn(),
  };

  const mockMeetingsRepository = {
    findOne: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractsService,
        {
          provide: getRepositoryToken(Contract),
          useValue: mockContractsRepository,
        },
        {
          provide: getRepositoryToken(Company),
          useValue: mockCompaniesRepository,
        },
        {
          provide: getRepositoryToken(Meeting),
          useValue: mockMeetingsRepository,
        },
      ],
    }).compile();

    service = module.get<ContractsService>(ContractsService);

    vi.resetAllMocks();

    mockCompaniesRepository.findOne.mockResolvedValue({ id: 1, name: 'Empresa' });
    mockContractsRepository.create.mockImplementation((dto: any) => dto);
    mockContractsRepository.save.mockResolvedValue({ id: 1 });
  });

  describe('create', () => {
    it('debería guardar contractValue cuando se envía un valor numérico válido', async () => {
      mockContractsRepository.findOne
        .mockResolvedValueOnce(null) // número de contrato disponible
        .mockResolvedValue(cloneContract()); // findOne(saved.id) final

      const dto = { ...baseCreateDto, contractValue: '15000.50' };

      const result = await service.create(dto);

      expect(mockContractsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ value: '15000.50' }),
      );
      expect(result).toBeDefined();
    });

    it('debería guardar null en contractValue cuando no se envía', async () => {
      mockContractsRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValue(cloneContract());

      const dto = { ...baseCreateDto };

      await service.create(dto);

      expect(mockContractsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ value: null }),
      );
    });

    it('debería guardar null en contractValue cuando se envía undefined explícito', async () => {
      mockContractsRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValue(cloneContract());

      const dto = { ...baseCreateDto, contractValue: undefined };

      await service.create(dto);

      expect(mockContractsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ value: null }),
      );
    });

    it('debería lanzar ConflictException si el número de contrato ya existe', async () => {
      mockContractsRepository.findOne.mockResolvedValueOnce({ id: 5 });

      await expect(service.create(baseCreateDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('debería lanzar NotFoundException si la empresa origen no existe', async () => {
      mockContractsRepository.findOne.mockResolvedValueOnce(null);
      mockCompaniesRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.create(baseCreateDto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    beforeEach(() => {
      mockContractsRepository.findOne.mockResolvedValue(cloneContract());
    });

    it('debería actualizar contractValue cuando se envía', async () => {
      const dto = { contractValue: '25000.00' } as any;

      await service.update(10, dto);

      expect(mockContractsRepository.save).toHaveBeenCalled();
      const saved = mockContractsRepository.save.mock.calls[0][0];
      expect(saved.value).toBe('25000.00');
    });

    it('no debería modificar contractValue cuando no se envía', async () => {
      const dto = { object: 'Nuevo objeto' } as any;

      await service.update(10, dto);

      const saved = mockContractsRepository.save.mock.calls[0][0];
      expect(saved.value).toBe('1000.00');
      expect(saved.object).toBe('Nuevo objeto');
    });

    it('debería permitir establecer contractValue en null', async () => {
      const dto = { contractValue: null } as any;

      await service.update(10, dto);

      const saved = mockContractsRepository.save.mock.calls[0][0];
      expect(saved.value).toBeNull();
    });

    it('debería lanzar NotFoundException si el contrato no existe', async () => {
      mockContractsRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.update(999, { contractValue: '100' } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
