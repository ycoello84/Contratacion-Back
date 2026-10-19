import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateWorkerDto } from './dto/create-worker.dto.js';
import { FindWorkersQueryDto } from './dto/find-workers-query.dto.js';
import { UpdateWorkerDto } from './dto/update-worker.dto.js';
import { Worker } from './entities/worker.entity.js';
import { WorkersService } from './workers.service.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../users/entities/user-role.enum.js';

@Controller('workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  @Post()
  create(@Body() createWorkerDto: CreateWorkerDto): Promise<Worker> {
    return this.workersService.create(createWorkerDto);
  }

  @Get()
  findAll(@Query() query: FindWorkersQueryDto) {
    return this.workersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Worker> {
    return this.workersService.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateWorkerDto: UpdateWorkerDto,
  ): Promise<Worker> {
    return this.workersService.update(id, updateWorkerDto);
  }

  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.workersService.remove(id);
  }
}
