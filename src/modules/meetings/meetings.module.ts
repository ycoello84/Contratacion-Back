import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract } from '../contracts/entities/contract.entity.js';
import { Worker } from '../workers/entities/worker.entity.js';
import { Meeting } from './entities/meeting.entity.js';
import { MeetingsController } from './meetings.controller.js';
import { MeetingsService } from './meetings.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Meeting, Contract, Worker])],
  controllers: [MeetingsController],
  providers: [MeetingsService],
  exports: [MeetingsService],
})
export class MeetingsModule {}
