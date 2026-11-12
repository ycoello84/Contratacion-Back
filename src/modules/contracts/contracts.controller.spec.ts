import { Test, TestingModule } from '@nestjs/testing';
import { ContractsController } from './contracts.controller.js';
import { ContractsService } from './contracts.service.js';
import { Contract } from './entities/contract.entity.js';
import { ContractType } from './entities/contract-type.enum.js';
import { ContractApprovalStatus } from './entities/contract-approval-status.enum.js';

const createdContract = {
  id: 1,
  contractNumber: 'ECIE 2026-01',
  contractRelationshipType: ContractType.CONTRATO_PRINCIPAL,
  object: 'Objeto',
  originCompanyId: 1,
  destinationCompanyId: 2,
  value: '5000.00',
  ccApprovalStatus: ContractApprovalStatus.PENDIENTE_APROBACION_EMPRESA,
} as Contract;

describe('ContractsController', () => {
  let controller: ContractsController;
  let service: ContractsService;

  const mockService = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    changeStatus: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContractsController],
      providers: [{ provide: ContractsService, useValue: mockService }],
    }).compile();

    controller = module.get<ContractsController>(ContractsController);
    service = module.get<ContractsService>(ContractsService);
    vi.resetAllMocks();
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('debería delegar al service y retornar el contrato creado con contractValue', async () => {
      mockService.create.mockResolvedValue(createdContract);

      const dto = {
        contractNumber: 'ECIE 2026-01',
        contractRelationshipType: ContractType.CONTRATO_PRINCIPAL,
        object: 'Objeto',
        originCompanyId: 1,
        destinationCompanyId: 2,
        contractValue: '5000.00',
        startDate: '2026-01-01',
      } as any;

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(createdContract);
      expect(result.value).toBe('5000.00');
    });
  });

  describe('update', () => {
    it('debería delegar al service con contractValue y retornar el contrato actualizado', async () => {
      const updated = Object.assign({}, createdContract, { value: '9000.00' });
      mockService.update.mockResolvedValue(updated);

      const dto = { contractValue: '9000.00' } as any;

      const result = await controller.update(1, dto);

      expect(service.update).toHaveBeenCalledWith(1, dto);
      expect(result.value).toBe('9000.00');
    });
  });
});
