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
import { AgreementsService } from './agreements.service.js';
import { CreateAgreementDto } from './dto/create-agreement.dto.js';
import { FindAgreementsQueryDto } from './dto/find-agreements-query.dto.js';
import { UpdateAgreementDto } from './dto/update-agreement.dto.js';
import { Agreement } from './entities/agreement.entity.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../users/entities/user-role.enum.js';

@Controller('agreements')
export class AgreementsController {
  constructor(private readonly agreementsService: AgreementsService) {}

  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  @Post()
  create(@Body() createAgreementDto: CreateAgreementDto): Promise<Agreement> {
    return this.agreementsService.create(createAgreementDto);
  }

  @Get()
  findAll(@Query() query: FindAgreementsQueryDto) {
    return this.agreementsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Agreement> {
    return this.agreementsService.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAgreementDto: UpdateAgreementDto,
  ): Promise<Agreement> {
    return this.agreementsService.update(id, updateAgreementDto);
  }

  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.agreementsService.remove(id);
  }
}
