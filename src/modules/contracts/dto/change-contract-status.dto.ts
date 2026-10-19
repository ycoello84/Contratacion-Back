import { IsEnum } from 'class-validator';
import { ContractApprovalStatus } from '../entities/contract-approval-status.enum.js';

export class ChangeContractStatusDto {
  @IsEnum(ContractApprovalStatus, {
    message: 'El estado de aprobación del CC no es válido.',
  })
  ccApprovalStatus: ContractApprovalStatus;
}
