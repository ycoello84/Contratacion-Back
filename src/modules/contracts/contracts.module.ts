import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '../companies/entities/company.entity.js';
import { Meeting } from '../meetings/entities/meeting.entity.js';
import { ContractsController } from './contracts.controller.js';
import { ContractsService } from './contracts.service.js';
import { Contract } from './entities/contract.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Contract, Company, Meeting])],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
