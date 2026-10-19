import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '../companies/entities/company.entity.js';
import { Worker } from './entities/worker.entity.js';
import { WorkersController } from './workers.controller.js';
import { WorkersService } from './workers.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Worker, Company])],
  controllers: [WorkersController],
  providers: [WorkersService],
  exports: [WorkersService],
})
export class WorkersModule {}
