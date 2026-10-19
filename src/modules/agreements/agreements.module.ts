import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract } from '../contracts/entities/contract.entity.js';
import { Meeting } from '../meetings/entities/meeting.entity.js';
import { Worker } from '../workers/entities/worker.entity.js';
import { AgreementsController } from './agreements.controller.js';
import { AgreementsService } from './agreements.service.js';
import { Agreement } from './entities/agreement.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agreement, Meeting, Contract, Worker]),
  ],
  controllers: [AgreementsController],
  providers: [AgreementsService],
  exports: [AgreementsService],
})
export class AgreementsModule {}
