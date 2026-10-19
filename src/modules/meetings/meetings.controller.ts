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
import { CreateMeetingDto } from './dto/create-meeting.dto.js';
import { FindMeetingsQueryDto } from './dto/find-meetings-query.dto.js';
import { UpdateMeetingDto } from './dto/update-meeting.dto.js';
import { Meeting } from './entities/meeting.entity.js';
import { MeetingsService } from './meetings.service.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../users/entities/user-role.enum.js';

@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  @Post()
  create(@Body() createMeetingDto: CreateMeetingDto): Promise<Meeting> {
    return this.meetingsService.create(createMeetingDto);
  }

  @Get()
  findAll(@Query() query: FindMeetingsQueryDto) {
    return this.meetingsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Meeting> {
    return this.meetingsService.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMeetingDto: UpdateMeetingDto,
  ): Promise<Meeting> {
    return this.meetingsService.update(id, updateMeetingDto);
  }

  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.meetingsService.remove(id);
  }
}
