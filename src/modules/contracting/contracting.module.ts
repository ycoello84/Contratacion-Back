import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractingController } from './contracting.controller.js';
import { ContractRequestService } from './services/contract-request.service.js';
import { DatabaseSeederService } from './seeds/database-seeder.service.js';
import { ContractRequest } from './entities/contract-request.entity.js';
import { CommitteeMinute } from './entities/committee-minute.entity.js';
import { CommitteeResolution } from './entities/committee-resolution.entity.js';
import { ContractType } from './entities/contract-type.entity.js';
import { Counterparty } from './entities/counterparty.entity.js';
import { SpecializedArea } from './entities/specialized-area.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContractRequest,
      CommitteeMinute,
      CommitteeResolution,
      ContractType,
      Counterparty,
      SpecializedArea,
    ]),
  ],
  controllers: [ContractingController],
  providers: [ContractRequestService, DatabaseSeederService],
  exports: [ContractRequestService, DatabaseSeederService],
})
export class ContractingModule {}
